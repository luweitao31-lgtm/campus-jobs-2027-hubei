import { readFile } from 'node:fs/promises';
import { awards, companies, hubeiHiringUnits, hubeiRecruitmentOpenings, hubeiRecruitmentSnapshot, ownershipCoverageSets, ownershipEdges, ownershipEvidence, ownershipTrees } from '../data/catalog.ts';
import { isAllowedLocationLabel, regionConfig } from '../lib/region.ts';
import type { RecruitmentDirectoryEntry } from '../lib/types.ts';

const directory = JSON.parse(await readFile('data/recruitment-directory.json', 'utf8')) as { totalCount: number; verifiedCount: number; pendingCount: number; hubeiCount: number; hubeiShare: number; foreignCount: number; foreignOpenCount: number; foreignVerifiedCount: number; foreignHubeiCount: number; foreignHubeiShare: number; entries: RecruitmentDirectoryEntry[] };
const registry = JSON.parse(await readFile('data/source-registry.json', 'utf8')) as { sourcePolicy: { targetHubeiShare: number }; excludedSources: string[]; sources: Array<{ id: string; name: string; url: string; collect: boolean; locationScope?: string[] }> };
const errors: string[] = [];
const flatten = (nodes: typeof ownershipTrees): typeof ownershipTrees => nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
const nodes = flatten(ownershipTrees);
const nodeIds = new Set(nodes.map((node) => node.id));
const evidenceIds = new Set(ownershipEvidence.map((item) => item.id));
const unitIds = new Set(hubeiHiringUnits.map((unit) => unit.id));

if (directory.totalCount !== directory.entries.length) errors.push('目录总数与条目数不一致');
const verifiedEntries = directory.entries.filter((entry) => entry.confidence === '已核验');
const pendingEntries = directory.entries.filter((entry) => entry.status === '待确认');
const hubeiEntries = directory.entries.filter((entry) => entry.regionScope === '湖北省内');
const foreignEntries = directory.entries.filter((entry) => entry.nature === '外企');
const foreignHubeiEntries = foreignEntries.filter((entry) => entry.regionScope === '湖北省内');
const foreignOpenEntries = foreignEntries.filter((entry) => entry.status === '开放中');
const foreignVerifiedEntries = foreignEntries.filter((entry) => entry.confidence === '已核验');
if (directory.verifiedCount !== verifiedEntries.length || directory.pendingCount !== pendingEntries.length) errors.push('目录核验状态统计不一致');
if (directory.hubeiCount !== hubeiEntries.length || directory.hubeiShare !== Number((hubeiEntries.length / directory.entries.length).toFixed(4))) errors.push('湖北目录统计不一致');
if (directory.foreignCount !== foreignEntries.length || directory.foreignOpenCount !== foreignOpenEntries.length || directory.foreignVerifiedCount !== foreignVerifiedEntries.length || directory.foreignHubeiCount !== foreignHubeiEntries.length || directory.foreignHubeiShare !== Number((foreignHubeiEntries.length / foreignEntries.length).toFixed(4))) errors.push('外企统计不一致');
if (directory.hubeiShare < regionConfig.localShareTarget) errors.push('主目录湖北占比低于70%');
if (directory.foreignHubeiShare < regionConfig.localShareTarget) errors.push('外企目录湖北占比低于70%');
for (const entry of directory.entries) {
  if (!entry.regionScope) errors.push(`${entry.name} 缺少 regionScope`);
  if (entry.regionScope === '全国可投' && !entry.locations.includes('全国')) errors.push(`${entry.name} 缺少全国可投地点证据`);
  if (entry.regionScope === '湖北省内' && !entry.locations.some((location) => /湖北|武汉|襄阳|宜昌|十堰|荆州|黄石/.test(location))) errors.push(`${entry.name} 缺少湖北地点证据`);
  if (entry.status === '开放中' && entry.confidence !== '已核验') errors.push(`${entry.name} 未核验却标记开放中`);
  if (entry.channel.type === '第三方公告' || entry.channel.type === '第三方汇总') {
    if (entry.confidence !== '待确认') errors.push(`${entry.name} 第三方单来源不得标记已核验`);
  }
}
if (registry.sourcePolicy.targetHubeiShare !== regionConfig.localShareTarget) errors.push('来源策略与地区配置的70%目标不一致');
if (!registry.excludedSources.includes('Offer先生')) errors.push('Offer先生未列入排除来源');
if (registry.sources.length < 20 || registry.sources.filter((source) => source.collect).length < 10) errors.push('湖北来源覆盖不足');
for (const source of registry.sources) {
  if (!source.url.startsWith('http')) errors.push(`${source.id} 缺少有效URL`);
  for (const location of source.locationScope ?? []) if (!isAllowedLocationLabel(location) && location !== '湖北武汉' && location !== '湖北襄阳') errors.push(`${source.id} 含不允许的地点标签 ${location}`);
}
for (const edge of ownershipEdges) {
  if (!nodeIds.has(edge.parentId) || !nodeIds.has(edge.childId)) errors.push(`${edge.id} 指向不存在的节点`);
  if (!edge.evidenceIds.length || edge.evidenceIds.some((id) => !evidenceIds.has(id))) errors.push(`${edge.id} 缺少控制关系证据`);
}
for (const set of ownershipCoverageSets) if (!nodeIds.has(set.parentId) || set.expectedNodeIds.some((id) => !nodeIds.has(id))) errors.push(`${set.id} 覆盖清单引用无效`);
if (hubeiRecruitmentOpenings.length !== hubeiRecruitmentSnapshot.jobCount || hubeiHiringUnits.length !== hubeiRecruitmentSnapshot.hiringUnitCount) errors.push('湖北岗位快照统计不一致');
for (const opening of hubeiRecruitmentOpenings) if (!unitIds.has(opening.hiringUnitId) || !/湖北|武汉|襄阳|宜昌|十堰|荆州|黄石/.test(opening.workLocation)) errors.push(`${opening.id} 用人单位或地域无效`);
for (const award of awards) if (!award.hubeiBasis || !award.sourceUrl) errors.push(`${award.id} 缺少湖北关联依据`);
for (const company of companies) if (company.locations.some((location) => /广西|南宁/.test(location))) errors.push(`${company.name} 含广西地点残留`);

const trackedText = [await readFile('app/page.tsx', 'utf8'), await readFile('app/layout.tsx', 'utf8'), await readFile('lib/career.ts', 'utf8'), await readFile('data/catalog.ts', 'utf8'), JSON.stringify(directory), JSON.stringify(registry)].join('\n');
if (/广西|南宁|邕职/.test(trackedText)) errors.push('湖北核心代码或数据仍含广西/南宁/邕职残留');
if (errors.length) { console.error(errors.map((error) => `- ${error}`).join('\n')); process.exitCode = 1; }
else console.log(`数据校验通过：${directory.totalCount} 家企业，湖北 ${directory.hubeiCount} 家（${Math.round(directory.hubeiShare * 100)}%）；外企 ${directory.foreignCount} 家，湖北 ${directory.foreignHubeiCount} 家（${Math.round(directory.foreignHubeiShare * 100)}%）。`);
