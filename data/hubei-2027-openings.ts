import type { HiringUnit, RecruitmentOpening } from '../lib/types.ts';

export const hubeiRecruitmentSnapshot = { completedAt: '2026-09-23T17:00:00+08:00', jobCount: 2, disclosedHeadcount: 0, undisclosedHeadcountJobCount: 2, hiringUnitCount: 2, scope: '已核验中国电信与中国移动两条央企控制链及其湖北2027校招入口；不代表央企范围完整覆盖。' };

export const hubeiHiringUnits: HiringUnit[] = [
  { id: 'unit-chinatelecom-hubei', name: '中国电信股份有限公司湖北分公司', entityKind: '分公司', legalEntityId: 'chinatelecom-corp', owningLegalEntityName: '中国电信股份有限公司', sourceUrl: 'https://job.lzu.edu.cn/html/74/article/2026/91782.html', verifiedAt: '2026-09-22' },
  { id: 'unit-chinamobile-hubei', name: '中国移动通信集团湖北有限公司', entityKind: '法人', legalEntityId: 'chinamobile-hubei', owningLegalEntityName: '中国移动通信集团湖北有限公司', sourceUrl: 'https://wust.91wllm.cn/campus/view/id/1004787', verifiedAt: '2026-09-23' },
];

export const hubeiRecruitmentOpenings: RecruitmentOpening[] = [
  { id: 'hb-2027-chinatelecom-campus', cohort: 2027, jobId: 'chinatelecom-hubei-campus', jobNumber: '未披露', jobName: '中国电信湖北公司2027校园招聘', headcount: 0, headcountNote: '若干/未披露', workLocation: '湖北武汉及湖北各地市', education: '本科及以上，面向2027届毕业生', majors: '研发、网络、产品、市场及综合支撑等，具体以官方岗位为准', category: '校园招聘', status: '开放中', deadline: '2026-09-30', officialUrl: 'https://job.chinatelecom.com.cn/wt/TELE/web/index#/postinquiry?data=eyJrZXkiOjU4MTYyMywidHlwZSI6IjEiLCJyZWNydWl0UHJvamVjdCI6IiIsInJlY3J1aXRQcm9qZWN0TmFtZSI6IiJ9', hiringUnitId: 'unit-chinatelecom-hubei', legalEntityId: 'chinatelecom-corp', source: '中央企业官方招聘系统', verifiedAt: '2026-09-22' },
  { id: 'hb-2027-chinamobile-campus', cohort: 2027, jobId: 'chinamobile-hubei-campus', jobNumber: '未披露', jobName: '湖北移动2027校园招聘', headcount: 0, headcountNote: '若干/未披露', workLocation: '湖北武汉及湖北各地市', education: '2027届高校毕业生，具体学历要求以岗位为准', majors: '计算机、电子信息、自动化等，具体以官方岗位为准', category: '校园招聘', status: '开放中', deadline: '2026-10-16', officialUrl: 'https://hbydxy.zhaopin.com/post/index.html', hiringUnitId: 'unit-chinamobile-hubei', legalEntityId: 'chinamobile-hubei', source: '中央企业官方招聘系统', verifiedAt: '2026-09-23' },
];
