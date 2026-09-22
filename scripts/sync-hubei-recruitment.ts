import { hubeiHiringUnits, hubeiRecruitmentOpenings, hubeiRecruitmentSnapshot } from '../data/hubei-2027-openings.ts';

const unitIds = new Set(hubeiHiringUnits.map((unit) => unit.id));
const errors: string[] = [];
if (hubeiRecruitmentSnapshot.jobCount !== hubeiRecruitmentOpenings.length) errors.push('湖北岗位快照数量不一致');
if (hubeiRecruitmentSnapshot.hiringUnitCount !== hubeiHiringUnits.length) errors.push('湖北用人单位快照数量不一致');
for (const opening of hubeiRecruitmentOpenings) {
  if (!unitIds.has(opening.hiringUnitId)) errors.push(`${opening.id} 缺少对应湖北用人单位`);
  if (!/湖北|武汉|襄阳|宜昌|十堰|荆州|黄石/.test(opening.workLocation)) errors.push(`${opening.id} 不属于湖北范围`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`湖北央国企招聘快照校验通过：${hubeiHiringUnits.length} 个用人单位，${hubeiRecruitmentOpenings.length} 条岗位入口。`);
}
