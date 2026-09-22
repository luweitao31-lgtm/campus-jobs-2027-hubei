import type { HiringUnit, RecruitmentOpening } from '../lib/types.ts';

export const hubeiRecruitmentSnapshot = { completedAt: '2026-09-22T17:00:00+08:00', jobCount: 1, disclosedHeadcount: 0, undisclosedHeadcountJobCount: 1, hiringUnitCount: 1, scope: '首条核验链仅收录国务院国资委至东风汽车集团，以及具有湖北招聘证据的研发总院用人单位；不代表央企范围完整覆盖。' };

export const hubeiHiringUnits: HiringUnit[] = [
  { id: 'unit-dfmc-rd', name: '东风汽车集团有限公司研发总院', entityKind: '本部', legalEntityId: 'dfmc', owningLegalEntityName: '东风汽车集团有限公司', sourceUrl: 'https://job.lzu.edu.cn/html/22/article/2026/91112.html', verifiedAt: '2026-09-22' },
];

export const hubeiRecruitmentOpenings: RecruitmentOpening[] = [
  { id: 'hb-2027-dfmc-rd-campus', cohort: 2027, jobId: 'dfmc-rd-campus', jobNumber: '未披露', jobName: '研发总院2027届秋季校园招聘', headcount: 0, headcountNote: '若干/未披露', workLocation: '湖北武汉', education: '本科及以上，具体以官方岗位为准', majors: '汽车、机械、电气、计算机、材料等，具体以官方岗位为准', category: '校园招聘', status: '开放中', deadline: '2026-11-12', officialUrl: 'https://www.dfmc.com.cn/zhaopin/xiaoyuanzhaopin.html', hiringUnitId: 'unit-dfmc-rd', legalEntityId: 'dfmc', source: '湖北企业官方招聘入口', verifiedAt: '2026-09-22' },
];
