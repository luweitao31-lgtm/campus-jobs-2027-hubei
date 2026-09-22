import type { HiringUnit, RecruitmentOpening } from '../lib/types.ts';

export const hubeiRecruitmentSnapshot = { completedAt: '2026-09-22T12:00:00+08:00', jobCount: 2, disclosedHeadcount: 0, undisclosedHeadcountJobCount: 2, hiringUnitCount: 2, scope: '仅收录已核验开放、且具有湖北用人或招聘依据的单位；无法确认当前招聘状态的记录不进入正式岗位库。' };

export const hubeiHiringUnits: HiringUnit[] = [
  { id: 'unit-dfmc', name: '东风汽车集团有限公司', entityKind: '法人', sourceUrl: 'https://www.dfmc.com.cn/zhaopin/xiaoyuanzhaopin.html', verifiedAt: '2026-09-22' },
  { id: 'unit-cmcc-hb', name: '中国移动通信集团湖北有限公司', entityKind: '法人', sourceUrl: 'https://job.10086.cn/', verifiedAt: '2026-09-22' },
];

export const hubeiRecruitmentOpenings: RecruitmentOpening[] = [
  { id: 'hb-2027-dfmc-campus', cohort: 2027, jobId: 'dfmc-campus', jobNumber: '未披露', jobName: '2027届校园招聘岗位', headcount: 0, headcountNote: '若干/未披露', workLocation: '湖北武汉及全国多地', education: '以官方岗位为准', majors: '以官方岗位为准', category: '校园招聘', status: '开放中', deadline: '2099-12-31', officialUrl: 'https://www.dfmc.com.cn/zhaopin/xiaoyuanzhaopin.html', hiringUnitId: 'unit-dfmc', legalEntityId: 'dfmc', source: '湖北企业官方招聘入口', verifiedAt: '2026-09-22' },
  { id: 'hb-2027-cmcc-campus', cohort: 2027, jobId: 'cmcc-hb-campus', jobNumber: '未披露', jobName: '2027届校园招聘岗位', headcount: 0, headcountNote: '若干/未披露', workLocation: '湖北全省', education: '以官方岗位为准', majors: '以官方岗位为准', category: '校园招聘', status: '开放中', deadline: '2099-12-31', officialUrl: 'https://job.10086.cn/', hiringUnitId: 'unit-cmcc-hb', legalEntityId: 'cmcc-hb', source: '中央企业官方招聘系统', verifiedAt: '2026-09-22' },
];
