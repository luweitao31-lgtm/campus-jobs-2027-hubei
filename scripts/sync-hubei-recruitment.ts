import { writeFile } from 'node:fs/promises';
import { activeOwnershipData, shanghaiToday } from '../lib/ownership-lifecycle.ts';
import { ownershipTrees } from '../data/catalog.ts';
import { hubeiHiringUnits, hubeiRecruitmentOpenings, hubeiRecruitmentSnapshot } from '../data/hubei-2027-openings.ts';

const unitIds = new Set(hubeiHiringUnits.map((unit) => unit.id));
const errors: string[] = [];
if (hubeiRecruitmentSnapshot.jobCount !== hubeiRecruitmentOpenings.length) errors.push('湖北岗位快照数量不一致');
if (hubeiRecruitmentSnapshot.hiringUnitCount !== hubeiHiringUnits.length) errors.push('湖北用人单位快照数量不一致');
for (const opening of hubeiRecruitmentOpenings) {
  if (!unitIds.has(opening.hiringUnitId)) errors.push(`${opening.id} 缺少对应湖北用人单位`);
  if (!/湖北|武汉|襄阳|宜昌|十堰|荆州|黄石/.test(opening.workLocation)) errors.push(`${opening.id} 不属于湖北范围`);
}
const today = shanghaiToday();
const lifecycle = activeOwnershipData(ownershipTrees, hubeiRecruitmentOpenings, hubeiHiringUnits, today);
const legalNodes = ownershipTrees.flatMap(function walk(node): import('../lib/types.ts').OwnershipNode[] { return [node, ...(node.children ?? []).flatMap(walk)]; });
for (const opening of lifecycle.activeOpenings) {
  const legalNode = legalNodes.find((node) => node.id === opening.legalEntityId);
  if (!legalNode?.recruitmentChannels.some((channel) => channel.url === opening.officialUrl && channel.status === '可投递')) errors.push(`${opening.id} 缺少同一法人的可投递渠道`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), effectiveDate: today, activeOpeningIds: lifecycle.activeOpenings.map((opening) => opening.id), activeHiringUnitIds: lifecycle.activeUnits.map((unit) => unit.id), retired: lifecycle.retired };
  await writeFile('data/ownership-lifecycle.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`湖北央国企有效链校验通过：${lifecycle.activeUnits.length} 个用人单位、${lifecycle.activeOpenings.length} 条有效投递入口；已淘汰 ${lifecycle.retired.length} 条岗位。`);
}
