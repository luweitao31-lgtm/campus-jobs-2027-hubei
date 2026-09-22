import { readFile, writeFile } from 'node:fs/promises';
import { normalizeCompanyName } from '../lib/collector.ts';

type Lead = {
  id: string;
  companyName: string;
  normalizedCompanyName: string;
  title: string;
  sourceIds: string[];
  sourceUrls: string[];
  channelUrl?: string;
  status: string;
};

type AuditResult = {
  leadId: string;
  companyName: string;
  checkedAt: string;
  result: 'verified' | 'pending' | 'invalid';
  reason: string;
  evidenceUrls: string[];
  officialChannelUrl?: string;
  httpStatus?: number | null;
  finalUrl?: string;
};

const report = JSON.parse(await readFile('data/recruitment-leads.json', 'utf8')) as { leads: Lead[] };
const checkedAt = new Date().toISOString();
let previousResults: AuditResult[] = [];
try {
  const previous = JSON.parse(await readFile('data/recruitment-verification.json', 'utf8')) as { results?: AuditResult[] };
  previousResults = previous.results ?? [];
} catch {
  // The first audit starts without historical decisions.
}
const previousByLeadId = new Map(previousResults.map((item) => [item.leadId, item]));

function decodeEscapedUrl(value: string): string {
  return value
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"');
}

function unwrapNowcoderUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    const target = url.searchParams.get('url');
    return target ? decodeURIComponent(target) : undefined;
  } catch {
    return undefined;
  }
}

function jobupChannels(html: string): Map<string, string> {
  const result = new Map<string, string>();
  const matches = [
    ...html.matchAll(/<strong[^>]*class="company-name"[^>]*title="([^"]+)"[^>]*>/gi),
    ...html.matchAll(/className\\?":\\?"company-name\\?",\\?"title\\?":\\?"([^"\\]+)["\\]/gi),
  ].sort((left, right) => (left.index ?? 0) - (right.index ?? 0));
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? Math.min(html.length, start + 12_000);
    const row = html.slice(start, end);
    const urls = [
      ...[...row.matchAll(/href="(https?:[^"]+)"/gi)].map((item) => item[1]),
      ...[...row.matchAll(/href\\?":\\?"(https?:[^"\\]+(?:\\u0026[^"\\]*)?)["\\]/gi)].map((item) => decodeEscapedUrl(item[1])),
    ];
    const official = urls.find((url) => !/jobup\.cn|mp\.weixin\.qq\.com/i.test(url));
    if (official) result.set(normalizeCompanyName(match[1]), official);
  }
  return result;
}

async function fetchPage(url: string): Promise<{ status: number | null; finalUrl: string; body: string }> {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; CampusRecruitmentAudit/1.0)', accept: 'text/html,application/xhtml+xml' },
    });
    return { status: response.status, finalUrl: response.url, body: (await response.text()).slice(0, 2_000_000) };
  } catch {
    return { status: null, finalUrl: url, body: '' };
  }
}

const jobupHtml = await fetch('https://jobup.cn/', { headers: { 'user-agent': 'Mozilla/5.0' } }).then((response) => response.text());
const jobupChannelByCompany = jobupChannels(jobupHtml);
const invalidNames = /^(?:生力军.?向世界前行|绽放无限可能|驭芯而行.?赴约峰岹)/;
const knownThirdPartyHosts = /(?:jobup\.cn|nowcoder\.com|wondercv\.com|niuqizp\.com)$/i;

const results: AuditResult[] = [];
for (const lead of report.leads) {
  if (lead.status !== '待核验') {
    const previous = previousByLeadId.get(lead.id);
    if (previous) results.push(previous);
    continue;
  }
  if (invalidNames.test(lead.companyName)) {
    results.push({ leadId: lead.id, companyName: lead.companyName, checkedAt, result: 'invalid', reason: '标题口号被误识别为企业名称，需修正原始解析后重新采集。', evidenceUrls: lead.sourceUrls });
    continue;
  }
  let officialChannelUrl = lead.sourceIds.includes('src-jobup') ? jobupChannelByCompany.get(lead.normalizedCompanyName) : undefined;
  if (!officialChannelUrl && lead.sourceIds.includes('src-nowcoder-schedule') && lead.channelUrl) officialChannelUrl = unwrapNowcoderUrl(lead.channelUrl);
  if (!officialChannelUrl && lead.channelUrl) {
    try {
      const host = new URL(lead.channelUrl).hostname;
      if (!knownThirdPartyHosts.test(host)) officialChannelUrl = lead.channelUrl;
    } catch { /* malformed URLs remain pending */ }
  }
  if (!officialChannelUrl) {
    results.push({ leadId: lead.id, companyName: lead.companyName, checkedAt, result: 'pending', reason: '仅找到单一聚合或高校来源，未定位企业官方招聘入口或第二独立来源。', evidenceUrls: lead.sourceUrls });
    continue;
  }
  const page = await fetchPage(officialChannelUrl);
  const normalizedBody = page.body.normalize('NFKC').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const companyTokens = lead.companyName.replace(/[（(].*?[）)]/g, '').split(/集团|股份|有限|公司|分行|中心/).filter((item) => item.length >= 2);
  const companyMatch = companyTokens.some((token) => normalizedBody.includes(token)) || normalizeCompanyName(page.finalUrl).includes(lead.normalizedCompanyName.slice(0, 4));
  const cohortMatch = /2027\s*届|2027\s*(?:校园|校招|应届|毕业生)|27\s*届/.test(normalizedBody);
  if (page.status && page.status >= 200 && page.status < 400 && companyMatch && cohortMatch) {
    results.push({ leadId: lead.id, companyName: lead.companyName, checkedAt, result: 'verified', reason: '企业官方招聘入口可访问，页面同时匹配企业归属与 2027 届招聘语义。', evidenceUrls: [...lead.sourceUrls, page.finalUrl], officialChannelUrl, httpStatus: page.status, finalUrl: page.finalUrl });
  } else {
    const failures = [!page.status || page.status >= 400 ? '官方入口当前不可访问' : '', !companyMatch ? '页面未能确认企业归属' : '', !cohortMatch ? '页面未显示 2027 届招聘语义' : ''].filter(Boolean);
    const rejectedJobupMapping = lead.sourceIds.includes('src-jobup') && !companyMatch;
    results.push({
      leadId: lead.id,
      companyName: lead.companyName,
      checkedAt,
      result: 'pending',
      reason: `${failures.join('；')}，暂不满足核验规则。`,
      evidenceUrls: rejectedJobupMapping ? lead.sourceUrls : [...lead.sourceUrls, page.finalUrl],
      officialChannelUrl: rejectedJobupMapping ? undefined : officialChannelUrl,
      httpStatus: page.status,
      finalUrl: rejectedJobupMapping ? undefined : page.finalUrl,
    });
  }
}
for (const previous of previousResults.filter((item) => item.result === 'invalid')) {
  if (!results.some((item) => item.leadId === previous.leadId)) results.push(previous);
}

const summary = {
  schemaVersion: 1,
  checkedAt,
  total: results.length,
  verified: results.filter((item) => item.result === 'verified').length,
  pending: results.filter((item) => item.result === 'pending').length,
  invalid: results.filter((item) => item.result === 'invalid').length,
  results,
};
await writeFile('data/recruitment-verification.json', `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ...summary, results: results.map(({ companyName, result, reason, officialChannelUrl, httpStatus }) => ({ companyName, result, reason, officialChannelUrl, httpStatus })) }, null, 2));
