import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { extractRecruitmentLeads, mergeCandidateLeads, normalizeCompanyName } from '../lib/collector.ts';
import { inferRegionScope } from '../lib/region.ts';
import { activeOwnershipData } from '../lib/ownership-lifecycle.ts';
import { alertReason, createRecruitmentAlert, monitorFingerprint, recruitmentSignals } from '../lib/alerts.ts';
import { awards, companies, hubeiHiringUnits, hubeiRecruitmentOpenings, ownershipTrees, recruitmentRecords, sources } from '../data/catalog.ts';
import type { OwnershipNode, RecruitmentAlert, RecruitmentDirectoryEntry, RecruitmentLead, RecruitmentLeadStatus, RecruitmentMonitorEntry } from '../lib/types.ts';

type RegistrySource = {
  id: string;
  name: string;
  url: string;
  expected: string[];
  role: 'discovery' | 'verification';
  authorityTier: 1 | 2 | 3;
  parser: 'jobup-table' | 'jsonld-itemlist' | 'anchor-list' | 'source-company';
  collect: boolean;
  priority: number;
  locationScope?: string[];
  companyName?: string;
  nature?: import('../lib/types.ts').CompanyNature;
};

type Registry = {
  schemaVersion: number;
  sourcePolicy: { dailyQualifiedTarget: number; targetHubeiShare: number; verifiedRule: string; nationalRule: string; failureRule: string };
  excludedSources: string[];
  sources: RegistrySource[];
  curatedOpenings?: Array<{
    id: string;
    companyName: string;
    title: string;
    locations: string[];
    sourceUrl: string;
    channelUrl: string;
    applicationDeadline: string | null;
    deadlineNote: string;
    verifiedAt: string;
    official: boolean;
  }>;
};

const write = process.argv.includes('--write');
const registryPath = path.resolve('data/source-registry.json');
const healthPath = path.resolve('data/source-health.json');
const leadsPath = path.resolve('data/recruitment-leads.json');
const syncPath = path.resolve('data/recruitment-sync.json');
const directoryPath = path.resolve('data/recruitment-directory.json');
const ownershipChannelHealthPath = path.resolve('data/ownership-channel-health.json');
const verificationPath = path.resolve('data/recruitment-verification.json');
const alertPath = path.resolve('data/recruitment-alerts.json');
const monitorStatePath = path.resolve('data/recruitment-monitor-state.json');
const registry = JSON.parse(await readFile(registryPath, 'utf8')) as Registry;
const completedAt = new Date().toISOString();
const shanghaiDate = (value: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const collectionDate = shanghaiDate(completedAt);
const activeOwnership = activeOwnershipData(ownershipTrees, hubeiRecruitmentOpenings, hubeiHiringUnits, collectionDate);

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

async function parallelMap<T, R>(rows: T[], limit: number, task: (row: T) => Promise<R>): Promise<R[]> {
  const results = Array.from({ length: rows.length }) as R[];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, rows.length) }, async () => {
    while (cursor < rows.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(rows[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

const sourceResults = await parallelMap(registry.sources, 6, async (source) => {
  const started = Date.now();
  try {
    const response = await fetch(source.url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
      headers: {
        'user-agent': 'HubeiCampusInfoBot/1.0 (+public-source-check; no-login; contact=site-owner)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    const html = await response.text();
    const matched = source.expected.some((pattern) => new RegExp(pattern, 'i').test(html));
    const health = !response.ok ? '异常' : matched ? '正常' : '内容待确认';
    const candidates = source.collect && response.ok && matched ? extractRecruitmentLeads(html, source) : [];
    return {
      source,
      candidates,
      health: {
        id: source.id,
        name: source.name,
        checkedAt: completedAt,
        httpStatus: response.status,
        health,
        elapsedMs: Date.now() - started,
        extractedLeads: candidates.length,
      },
    };
  } catch (error) {
    return {
      source,
      candidates: [],
      health: {
        id: source.id,
        name: source.name,
        checkedAt: completedAt,
        httpStatus: null,
        health: '异常',
        elapsedMs: Date.now() - started,
        extractedLeads: 0,
        message: error instanceof Error ? error.message : '未知错误',
      },
    };
  }
});

const flattenOwnershipNodes = (nodes: OwnershipNode[]): OwnershipNode[] => nodes.flatMap((node) => [node, ...flattenOwnershipNodes(node.children ?? [])]);
const ownershipChannelBindings = flattenOwnershipNodes(activeOwnership.activeTrees).flatMap((node) => node.recruitmentChannels
  .filter((channel) => Boolean(channel.url))
  .map((channel) => ({ nodeId: node.id, companyName: node.name, channel })));
const uniqueOwnershipChannelUrls = [...new Set(ownershipChannelBindings.map((item) => item.channel.url as string))];
const ownershipChannelFetches = await parallelMap(uniqueOwnershipChannelUrls, 4, async (url) => {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      redirect: 'follow', signal: AbortSignal.timeout(15_000),
      headers: { 'user-agent': 'HubeiCampusInfoBot/1.0 (+public-source-check; no-login; contact=site-owner)', accept: 'text/html,application/xhtml+xml' },
    });
    return { url, ok: response.ok, httpStatus: response.status, html: await response.text(), elapsedMs: Date.now() - started };
  } catch (error) {
    return { url, ok: false, httpStatus: null, html: '', elapsedMs: Date.now() - started, message: error instanceof Error ? error.message : '未知错误' };
  }
});
const ownershipFetchByUrl = new Map(ownershipChannelFetches.map((item) => [item.url, item]));
const ownershipChannelChecks = ownershipChannelBindings.map(({ nodeId, companyName, channel }) => {
  const result = ownershipFetchByUrl.get(channel.url as string);
  const normalizedHtml = result?.html.replace(/\s+/g, '') ?? '';
  const normalizedCompanyName = companyName.replace(/\s+/g, '');
  const companyNamedOnPage = channel.match === '集团兜底' || normalizedHtml.includes(normalizedCompanyName);
  return {
    nodeId, companyName, label: channel.label, url: channel.url, match: channel.match, declaredStatus: channel.status,
    checkedAt: completedAt, httpStatus: result?.httpStatus ?? null,
    health: !result?.ok ? '异常' : companyNamedOnPage ? '正常' : '可访问，归属需人工复核',
    elapsedMs: result?.elapsedMs ?? 0,
  };
});

const sourceById = new Map(registry.sources.map((source) => [source.id, source]));
const curatedOpeningById = new Map((registry.curatedOpenings ?? []).map((opening) => [opening.id, opening]));
const curatedCandidates = (registry.curatedOpenings ?? [])
  .filter((opening) => !opening.applicationDeadline || opening.applicationDeadline >= collectionDate)
  .map((opening) => ({
    companyName: opening.companyName,
    title: opening.title,
    sourceId: opening.id,
    sourceUrl: opening.sourceUrl,
    channelUrl: opening.channelUrl,
    publishedAt: opening.verifiedAt,
    locations: opening.locations,
    natureHint: '外企' as const,
    applicationDeadline: opening.applicationDeadline ?? undefined,
    deadlineNote: opening.deadlineNote,
  }));
const rawCandidates = [...sourceResults.flatMap((result) => result.candidates), ...curatedCandidates];
const mergedCandidates = mergeCandidateLeads(rawCandidates);
let previousLeads: RecruitmentLead[] = [];
try {
  const previous = JSON.parse(await readFile(leadsPath, 'utf8')) as { leads?: RecruitmentLead[] };
  previousLeads = previous.leads ?? [];
} catch {
  // The first run starts without historical candidates.
}
const previousByName = new Map(previousLeads.map((lead) => [lead.normalizedCompanyName, lead]));

let verificationResults: Array<{ leadId: string; result: 'verified' | 'pending' | 'invalid'; evidenceUrls: string[]; officialChannelUrl?: string }> = [];
try {
  const verification = JSON.parse(await readFile(verificationPath, 'utf8')) as { results?: typeof verificationResults };
  verificationResults = verification.results ?? [];
} catch {
  // Verification evidence is optional on the first collection run.
}
const verificationByLeadId = new Map(verificationResults.map((item) => [item.leadId, item]));
const invalidLeadIds = new Set(verificationResults.filter((item) => item.result === 'invalid').map((item) => item.leadId));

const allLeads: RecruitmentLead[] = mergedCandidates.flatMap((candidate) => {
  const normalizedCompanyName = normalizeCompanyName(candidate.companyName);
  if (normalizedCompanyName.length < 2 || candidate.sourceUrls.length === 0) return [];
  const sourceRoles = candidate.sourceIds.map((id) => sourceById.get(id)?.role ?? (curatedOpeningById.get(id)?.official ? 'verification' : 'discovery'));
  let status: RecruitmentLeadStatus = '待核验';
  if (sourceRoles.includes('verification')) status = '官方确认';
  else if (new Set(candidate.sourceIds).size >= 2) status = '双来源确认';
  const fingerprint = `2027-${hash(normalizedCompanyName)}`;
  const previous = previousByName.get(normalizedCompanyName);
  const id = previous?.id ?? `lead-${hash(normalizedCompanyName)}`;
  const verification = verificationByLeadId.get(id);
  if (verification?.result === 'invalid') return [];
  if (verification?.result === 'verified') status = '官方确认';
  return [{
    id,
    companyName: candidate.companyName,
    normalizedCompanyName,
    title: candidate.title,
    cohort: 2027 as const,
    locations: candidate.locations,
    sourceIds: candidate.sourceIds,
    sourceUrls: [...new Set([...candidate.sourceUrls, ...(verification?.result === 'verified' ? verification.evidenceUrls : [])])],
    channelUrl: verification?.result === 'verified' ? verification.officialChannelUrl ?? candidate.channelUrl : candidate.channelUrl,
    publishedAt: candidate.publishedAt,
    applicationDeadline: candidate.applicationDeadline,
    deadlineNote: candidate.deadlineNote,
    discoveredAt: previous?.discoveredAt ?? completedAt,
    lastSeenAt: completedAt,
    status,
    nature: candidate.natureHint ?? '性质待确认',
    fingerprint,
    regionScope: inferRegionScope(candidate.locations.join(' '))!,
  }];
}).filter((lead) => Boolean(lead.regionScope)).sort((left, right) => Number(right.regionScope === '湖北省内') - Number(left.regionScope === '湖北省内') || (right.publishedAt ?? '').localeCompare(left.publishedAt ?? '') || left.companyName.localeCompare(right.companyName, 'zh-CN'));

const target = registry.sourcePolicy.dailyQualifiedTarget;
const hubeiTarget = Math.ceil(target * registry.sourcePolicy.targetHubeiShare);
const hubeiCandidates = allLeads.filter((lead) => lead.regionScope === '湖北省内');
const nationalCandidates = allLeads.filter((lead) => lead.regionScope === '全国可投');
const leads = [...hubeiCandidates.slice(0, hubeiTarget), ...nationalCandidates.slice(0, Math.max(0, target - hubeiTarget))];

const verifiedLeads = leads.filter((lead) => lead.status !== '待核验').length;
const hubeiLeads = leads.filter((lead) => lead.regionScope === '湖北省内').length;
const privateForeignLeads = leads.filter((lead) => lead.nature === '民营企业' || lead.nature === '外企').length;
const foreignQualifiedLeads = leads.filter((lead) => lead.nature === '外企').length;
const foreignCandidateLeads = allLeads.filter((lead) => lead.nature === '外企').length;
const foreignVerifiedLeads = leads.filter((lead) => lead.nature === '外企' && lead.status !== '待核验').length;
const foreignNewLeads = leads.filter((lead) => lead.nature === '外企' && !previousByName.has(lead.normalizedCompanyName)).length;
const privateForeignShare = leads.length ? privateForeignLeads / leads.length : 0;
const anomalyCount = sourceResults.filter((result) => result.health.health === '异常').length;
const ownershipChannelAnomalyCount = ownershipChannelChecks.filter((item) => item.health === '异常').length;
const targetMet = leads.length >= target && hubeiLeads >= hubeiTarget;
const report = {
  schemaVersion: 2,
  mode: write ? 'write' : 'dry-run',
  completedAt,
  target,
  targetMet,
  counters: {
    sourceCount: registry.sources.length,
    healthySourceCount: sourceResults.filter((result) => result.health.health === '正常').length,
    anomalyCount,
    rawLeads: rawCandidates.length,
    qualifiedLeads: leads.length,
    verifiedLeads,
    pendingLeads: leads.length - verifiedLeads,
    hubeiLeads,
    privateForeignLeads,
    privateForeignShare,
    hubeiTarget,
    foreignCandidateLeads,
    foreignQualifiedLeads,
    foreignVerifiedLeads,
    foreignNewLeads,
    ownershipChannelsChecked: ownershipChannelChecks.length,
    ownershipChannelAnomalyCount,
  },
  sources: sourceResults.map((result) => result.health),
  leads,
  warnings: [
    ...(leads.length >= target ? [] : [`本次仅获得 ${leads.length} 条有效线索，低于每日 ${target} 条目标；保留上一版正式数据。`]),
    ...(hubeiLeads < hubeiTarget ? [`本次湖北线索仅 ${hubeiLeads} 条，低于每日 ${hubeiTarget} 条配额；保留上一版正式数据。`] : []),
    ...(anomalyCount ? [`${anomalyCount} 个采集来源访问异常；缺失企业沿用上一版有效记录。`] : []),
    ...(ownershipChannelAnomalyCount ? [`${ownershipChannelAnomalyCount} 条资金链招聘渠道访问异常；保留原渠道状态并等待复核。`] : []),
  ],
};

const companyById = new Map(companies.map((company) => [company.id, company]));
const evidenceById = new Map(sources.map((source) => [source.id, source]));
const sourceNameById = new Map([
  ...registry.sources.map((source) => [source.id, source.name] as const),
  ...(registry.curatedOpenings ?? []).map((opening) => [opening.id, opening.title] as const),
]);
const directory = new Map<string, RecruitmentDirectoryEntry>();
let previousDirectoryEntries: RecruitmentDirectoryEntry[] = [];
try {
  const previousDirectory = JSON.parse(await readFile(directoryPath, 'utf8')) as { entries?: RecruitmentDirectoryEntry[] };
  previousDirectoryEntries = previousDirectory.entries ?? [];
} catch {
  // The first collection run starts without a published directory snapshot.
}
try {
  const publishedDirectory = JSON.parse(execFileSync('git', ['show', 'HEAD:data/recruitment-directory.json'], { encoding: 'utf8' })) as { entries?: RecruitmentDirectoryEntry[] };
  const previousNames = new Set(previousDirectoryEntries.map((entry) => entry.normalizedCompanyName));
  previousDirectoryEntries.push(...(publishedDirectory.entries ?? []).filter((entry) => !previousNames.has(entry.normalizedCompanyName)));
} catch {
  // A repository snapshot is optional; the current on-disk directory remains the fallback.
}
for (const record of recruitmentRecords) {
  const company = companyById.get(record.companyId);
  if (!company) continue;
  const normalizedCompanyName = normalizeCompanyName(company.name);
  directory.set(normalizedCompanyName, {
    id: record.id,
    name: company.name,
    normalizedCompanyName,
    nature: company.nature,
    locations: record.locations,
    status: record.status,
    confidence: record.confidence,
    channel: { label: company.channels[0].label, type: company.channels[0].type, url: company.channels[0].url },
    sourceIds: record.sourceIds,
    sourceLabels: record.sourceIds.map((id) => evidenceById.get(id)?.publisher ?? sourceNameById.get(id) ?? id),
    firstSeenAt: record.firstSeenAt,
    lastVerifiedAt: record.lastVerifiedAt,
    isFirstExpansion: false,
    regionScope: record.regionScope,
  });
}
for (const lead of leads) {
  if (directory.has(lead.normalizedCompanyName)) continue;
  const sourceUrl = lead.sourceUrls[0];
  const officialSource = lead.sourceIds.map((id) => sourceById.get(id)).find((source) => source?.role === 'verification' && source.authorityTier === 1);
  const curatedOfficial = lead.sourceIds.map((id) => curatedOpeningById.get(id)).find((opening) => opening?.official);
  const channelUrl = officialSource?.url ?? curatedOfficial?.channelUrl ?? lead.channelUrl ?? sourceUrl;
  if (!channelUrl) continue;
  const directChannel = Boolean(lead.channelUrl);
  const officialChannel = Boolean(officialSource || curatedOfficial);
  directory.set(lead.normalizedCompanyName, {
    id: lead.id,
    name: lead.companyName,
    normalizedCompanyName: lead.normalizedCompanyName,
    nature: lead.nature,
    locations: lead.locations.length ? lead.locations : ['地点待确认'],
    status: lead.status === '待核验' ? '待确认' : '开放中',
    confidence: lead.status === '待核验' ? '待确认' : '已核验',
    channel: { label: officialChannel ? '投递入口' : directChannel ? '查看招聘公告' : '第三方当日汇总', type: officialChannel ? '企业官网' : directChannel ? '第三方公告' : '第三方汇总', url: channelUrl },
    sourceIds: lead.sourceIds,
    sourceLabels: lead.sourceIds.map((id) => sourceNameById.get(id) ?? id),
    firstSeenAt: lead.discoveredAt,
    lastVerifiedAt: lead.lastSeenAt,
    isFirstExpansion: true,
    applicationDeadline: lead.applicationDeadline,
    deadlineNote: lead.deadlineNote,
    regionScope: lead.regionScope,
  });
}
let retainedPreviousCount = 0;
for (const previousEntry of previousDirectoryEntries) {
  if (directory.has(previousEntry.normalizedCompanyName) || invalidLeadIds.has(previousEntry.id) || /收录\s+20\d{2}[.-]\d{2}[.-]\d{2}/.test(previousEntry.name)) continue;
  const deadlineExpired = previousEntry.applicationDeadline && previousEntry.applicationDeadline < collectionDate;
  directory.set(previousEntry.normalizedCompanyName, deadlineExpired
    ? { ...previousEntry, status: '已结束', lastVerifiedAt: completedAt }
    : previousEntry);
  retainedPreviousCount += 1;
}
const directoryEntries = [...directory.values()].filter((entry) => Boolean(entry.regionScope)).sort((left, right) => Number(right.regionScope === '湖北省内') - Number(left.regionScope === '湖北省内') || Number(right.confidence === '已核验') - Number(left.confidence === '已核验') || left.name.localeCompare(right.name, 'zh-CN'));
const hubeiCount = directoryEntries.filter((entry) => entry.regionScope === '湖北省内').length;
const foreignEntries = directoryEntries.filter((entry) => entry.nature === '外企');
const foreignHubeiCount = foreignEntries.filter((entry) => entry.regionScope === '湖北省内').length;
const directoryReport = {
  schemaVersion: 1,
  completedAt,
  baselineCount: recruitmentRecords.length,
  totalCount: directoryEntries.length,
  netNewCount: directoryEntries.length - recruitmentRecords.length,
  verifiedCount: directoryEntries.filter((entry) => entry.confidence === '已核验').length,
  pendingCount: directoryEntries.filter((entry) => entry.confidence === '待确认').length,
  hubeiCount,
  hubeiShare: directoryEntries.length ? hubeiCount / directoryEntries.length : 0,
  foreignCount: foreignEntries.length,
  foreignOpenCount: directoryEntries.filter((entry) => entry.nature === '外企' && entry.status === '开放中').length,
  foreignVerifiedCount: directoryEntries.filter((entry) => entry.nature === '外企' && entry.confidence === '已核验').length,
  foreignNewCount: directoryEntries.filter((entry) => entry.nature === '外企' && shanghaiDate(entry.firstSeenAt) === collectionDate).length,
  foreignHubeiCount,
  foreignHubeiShare: foreignEntries.length ? foreignHubeiCount / foreignEntries.length : 0,
  retainedPreviousCount,
  entries: directoryEntries,
};
(report.counters as unknown as Record<string, number>).foreignDirectoryCount = directoryReport.foreignCount;
(report.counters as unknown as Record<string, number>).foreignDirectoryVerifiedCount = directoryReport.foreignVerifiedCount;
(report.counters as unknown as Record<string, number>).foreignDirectoryNewCount = directoryReport.foreignNewCount;

let previousMonitorEntries: RecruitmentMonitorEntry[] = [];
let previousAlerts: RecruitmentAlert[] = [];
try {
  const snapshot = JSON.parse(await readFile(monitorStatePath, 'utf8')) as { entries?: RecruitmentMonitorEntry[] };
  previousMonitorEntries = snapshot.entries ?? [];
} catch {
  // The first successful run establishes a baseline without creating alerts.
}
try {
  const alertSnapshot = JSON.parse(await readFile(alertPath, 'utf8')) as { alerts?: RecruitmentAlert[] };
  previousAlerts = alertSnapshot.alerts ?? [];
} catch {
  // No prior alerts exist on the first run.
}
const previousMonitorByKey = new Map(previousMonitorEntries.map((entry) => [entry.key, entry]));
const monitorEntries: RecruitmentMonitorEntry[] = [];
let alertMonitorAnomalyCount = 0;

for (const node of flattenOwnershipNodes(activeOwnership.activeTrees)) {
  const channel = node.recruitmentChannels.find((item) => item.url && item.status !== '已截止' && (item.match === '公司专属' || item.match === '单位已定位'));
  if (!channel?.url) continue;
  const key = `ownership:${node.id}`;
  const result = ownershipFetchByUrl.get(channel.url);
  if (!result?.ok) {
    alertMonitorAnomalyCount += 1;
    const previous = previousMonitorByKey.get(key);
    if (previous) monitorEntries.push({ ...previous, checkedAt: completedAt });
    continue;
  }
  const signals = recruitmentSignals(result.html, node.name);
  const isOpen = channel.status === '可投递' || signals.length > 0;
  monitorEntries.push({
    key, module: 'ownership', entityId: node.id, companyName: node.name, isOpen,
    fingerprint: monitorFingerprint({ isOpen, channelUrl: channel.url, signals }), signalCount: signals.length,
    channelLabel: channel.label, channelUrl: channel.url, sourceUrl: channel.evidenceUrl ?? channel.url, checkedAt: completedAt,
  });
}

const awardCompanyIds = [...new Set(awards.map((award) => award.companyId))];
for (const companyId of awardCompanyIds) {
  const company = companyById.get(companyId);
  if (!company?.channels[0]) continue;
  const names = new Set([normalizeCompanyName(company.name), normalizeCompanyName(company.shortName)]);
  const matchingLead = allLeads
    .filter((lead) => names.has(lead.normalizedCompanyName) && lead.status !== '待核验')
    .sort((left, right) => {
      const leftOfficial = Number(left.sourceIds.some((id) => sourceById.get(id)?.role === 'verification'));
      const rightOfficial = Number(right.sourceIds.some((id) => sourceById.get(id)?.role === 'verification'));
      return rightOfficial - leftOfficial
        || Number(Boolean(right.channelUrl)) - Number(Boolean(left.channelUrl))
        || (right.publishedAt ?? '').localeCompare(left.publishedAt ?? '')
        || left.id.localeCompare(right.id);
    })[0];
  const channel = company.channels[0];
  const isOpen = Boolean(matchingLead);
  const officialSource = matchingLead?.sourceIds
    .map((id) => sourceById.get(id))
    .find((source) => source?.role === 'verification');
  const monitoredChannelUrl = officialSource?.url ?? matchingLead?.channelUrl ?? channel.url;
  const signals = matchingLead
    ? officialSource
      ? [`${officialSource.id}|2027|${officialSource.url}`]
      : [`${matchingLead.fingerprint}|${matchingLead.publishedAt ?? ''}|${monitoredChannelUrl}`]
    : [];
  monitorEntries.push({
    key: `employers:${company.id}`, module: 'employers', entityId: company.id, companyName: company.name, isOpen,
    fingerprint: monitorFingerprint({ isOpen, channelUrl: monitoredChannelUrl, signals }), signalCount: signals.length,
    channelLabel: channel.label, channelUrl: monitoredChannelUrl,
    sourceUrl: officialSource?.url ?? matchingLead?.sourceUrls[0] ?? channel.url, checkedAt: completedAt,
  });
}

const baselineInitialized = previousMonitorEntries.length > 0;
const newAlerts = baselineInitialized ? monitorEntries.flatMap((current) => {
  const reason = alertReason(previousMonitorByKey.get(current.key), current);
  return reason ? [createRecruitmentAlert(current, reason, completedAt)] : [];
}) : [];
const alertCutoff = Date.now() - 120 * 24 * 60 * 60 * 1000;
const alertById = new Map(previousAlerts.filter((alert) => Date.parse(alert.detectedAt) >= alertCutoff).map((alert) => [alert.id, alert]));
for (const alert of newAlerts) alertById.set(alert.id, alert);
const activeAlerts = [...alertById.values()].sort((left, right) => right.detectedAt.localeCompare(left.detectedAt));
const alertReport = {
  schemaVersion: 1,
  completedAt,
  baselineInitialized: true,
  newAlertCount: newAlerts.length,
  activeAlertCount: activeAlerts.length,
  monitorAnomalyCount: alertMonitorAnomalyCount,
  alerts: activeAlerts,
};
(report.counters as unknown as Record<string, number>).alertsCreated = newAlerts.length;
(report.counters as unknown as Record<string, number>).activeAlerts = activeAlerts.length;
(report.counters as unknown as Record<string, number>).alertMonitorAnomalyCount = alertMonitorAnomalyCount;
if (alertMonitorAnomalyCount) report.warnings.push(`${alertMonitorAnomalyCount} 个招聘提醒监控入口异常；沿用上一版监控状态。`);

if (write) {
  await Promise.all([
    writeFile(healthPath, `${JSON.stringify({ schemaVersion: 2, completedAt, results: report.sources }, null, 2)}\n`, 'utf8'),
    writeFile(leadsPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
    writeFile(syncPath, `${JSON.stringify({ schemaVersion: 1, completedAt, target, targetMet, counters: report.counters, warnings: report.warnings }, null, 2)}\n`, 'utf8'),
    ...(targetMet && directoryReport.pendingCount === 0 && directoryReport.hubeiShare >= 0.7 && directoryReport.foreignHubeiShare >= 0.7
      ? [writeFile(directoryPath, `${JSON.stringify(directoryReport, null, 2)}\n`, 'utf8')]
      : []),
    writeFile(ownershipChannelHealthPath, `${JSON.stringify({ schemaVersion: 1, completedAt, results: ownershipChannelChecks }, null, 2)}\n`, 'utf8'),
    writeFile(alertPath, `${JSON.stringify(alertReport, null, 2)}\n`, 'utf8'),
    writeFile(monitorStatePath, `${JSON.stringify({ schemaVersion: 1, completedAt, entries: monitorEntries }, null, 2)}\n`, 'utf8'),
  ]);
}

console.log(JSON.stringify({ ...report, directory: { ...directoryReport, entries: directoryEntries.slice(0, 10) }, leads: report.leads.slice(0, 10), previewOnly: report.leads.length > 10 }, null, 2));
if (sourceResults.every((result) => result.health.health === '异常')) process.exitCode = 1;
else if (!targetMet) process.exitCode = 2;
