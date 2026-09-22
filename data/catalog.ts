import type { AwardEntry, Company, OwnershipCoverageSet, OwnershipEdge, OwnershipEvidence, OwnershipNode, RecruitmentRecord, SourceEvidence, SyncRun } from '../lib/types.ts';
export { hubeiHiringUnits, hubeiRecruitmentOpenings, hubeiRecruitmentSnapshot } from './hubei-2027-openings.ts';

const checked = '2026-09-22';
export const companies: Company[] = [
  { id: 'hbjt', name: '湖北交通投资集团有限公司', shortName: '湖北交投', nature: '湖北省属国企', locations: ['湖北全省'], channels: [{ id: 'hbjt-home', label: '企业官网', type: '企业官网', url: 'https://www.hbtt.com/' }] },
  { id: 'hbui', name: '湖北联投集团有限公司', shortName: '湖北联投', nature: '湖北省属国企', locations: ['湖北武汉', '湖北全省'], channels: [{ id: 'hbui-home', label: '企业官网', type: '企业官网', url: 'https://www.hbslft.com/' }] },
  { id: 'hblv', name: '湖北文化旅游集团有限公司', shortName: '湖北文旅', nature: '湖北省属国企', locations: ['湖北全省'], channels: [{ id: 'hblv-home', label: '企业官网', type: '企业官网', url: 'https://www.hbwhlyjt.com/' }] },
  { id: 'cjcy', name: '长江产业投资集团有限公司', shortName: '长江产业集团', nature: '湖北省属国企', locations: ['湖北武汉', '湖北全省'], channels: [{ id: 'cjcy-home', label: '企业官网', type: '企业官网', url: 'https://www.cjtouzi.com/' }] },
  { id: 'hbny', name: '湖北能源集团股份有限公司', shortName: '湖北能源', nature: '国有控股', locations: ['湖北武汉', '湖北全省'], channels: [{ id: 'hbny-home', label: '企业官网', type: '企业官网', url: 'https://www.hbny.com.cn/' }] },
  { id: 'whmetro', name: '武汉地铁集团有限公司', shortName: '武汉地铁', nature: '武汉市属国企', locations: ['湖北武汉'], channels: [{ id: 'whmetro-home', label: '企业官网', type: '企业官网', url: 'https://www.wuhanrt.com/' }] },
  { id: 'whcf', name: '武汉城市发展集团有限公司', shortName: '武汉城发', nature: '武汉市属国企', locations: ['湖北武汉'], channels: [{ id: 'whcf-home', label: '企业官网', type: '企业官网', url: 'https://www.whcfs.cn/' }] },
  { id: 'dfmc', name: '东风汽车集团有限公司', shortName: '东风汽车', nature: '中央企业', locations: ['湖北武汉', '湖北全省', '全国'], channels: [{ id: 'dfmc-career', label: '东风校园招聘', type: '企业官网', url: 'https://www.dfmc.com.cn/zhaopin/xiaoyuanzhaopin.html' }] },
  { id: 'fiberhome', name: '中国信息通信科技集团有限公司', shortName: '中国信科', nature: '中央企业', locations: ['湖北武汉', '全国'], channels: [{ id: 'fiberhome-career', label: '集团招聘入口', type: '企业官网', url: 'https://www.cict.com/zpxx' }] },
  { id: 'cmcc-hb', name: '中国移动通信集团湖北有限公司', shortName: '湖北移动', nature: '央企子公司', locations: ['湖北武汉', '湖北全省'], channels: [{ id: 'cmcc-career', label: '中国移动招聘', type: '集团招聘平台', url: 'https://job.10086.cn/' }] },
  { id: 'valeo', name: '法雷奥中国', shortName: '法雷奥', nature: '外企', locations: ['湖北武汉', '全国'], channels: [{ id: 'valeo-career', label: '法雷奥招聘', type: '企业官网', url: 'https://www.valeo.com/cn/找工作/' }] },
  { id: 'honeywell', name: '霍尼韦尔中国', shortName: '霍尼韦尔', nature: '外企', locations: ['湖北武汉', '全国'], channels: [{ id: 'honeywell-career', label: '霍尼韦尔招聘', type: '企业官网', url: 'https://www.honeywell.com.cn/cn/zh/careers' }] },
];

export const sources: SourceEvidence[] = [
  { id: 'src-hubei-sasac', title: '湖北省国资委公共企事业单位信息公开', publisher: '湖北省国资委', url: 'http://gzw.hubei.gov.cn/zfxxgk/fdzdgknr/ggqsydwxxgk/', sourceType: '政府平台', lastCheckedAt: checked, health: '正常' },
  { id: 'src-wuhan-sasac', title: '武汉市国资委出资企业名单', publisher: '武汉市国资委', url: 'https://gzw.wuhan.gov.cn/ztzl_69/ssqymd/', sourceType: '政府平台', lastCheckedAt: checked, health: '正常' },
  { id: 'src-91wllm', title: '湖北24365大学生就业服务平台', publisher: '湖北高校就业网络联盟', url: 'https://www.91wllm.cn/', sourceType: '高校就业网', lastCheckedAt: checked, health: '正常' },
  { id: 'src-public-jobs', title: '中国公共招聘网名企招聘', publisher: '人力资源和社会保障部', url: 'http://job.mohrss.gov.cn/zdqyzpxx/index.jhtml', sourceType: '政府平台', lastCheckedAt: checked, health: '正常' },
  { id: 'src-dfmc-career', title: '东风汽车校园人才招聘', publisher: '东风汽车集团有限公司', url: 'https://www.dfmc.com.cn/zhaopin/xiaoyuanzhaopin.html', sourceType: '企业官方', lastCheckedAt: checked, health: '正常' },
  { id: 'src-cmcc-career', title: '中国移动招聘网站', publisher: '中国移动', url: 'https://job.10086.cn/', sourceType: '企业官方', lastCheckedAt: checked, health: '正常' },
  { id: 'src-valeo-career', title: '法雷奥招聘', publisher: '法雷奥', url: 'https://www.valeo.com/cn/找工作/', sourceType: '企业官方', lastCheckedAt: checked, health: '正常' },
  { id: 'src-honeywell-career', title: '霍尼韦尔招聘', publisher: '霍尼韦尔中国', url: 'https://www.honeywell.com.cn/cn/zh/careers', sourceType: '企业官方', lastCheckedAt: checked, health: '正常' },
];

export const recruitmentRecords: RecruitmentRecord[] = [
  { id: 'rec-dfmc-2027', companyId: 'dfmc', cohort: 2027, status: '开放中', locations: ['湖北武汉', '全国'], sourceIds: ['src-dfmc-career'], firstSeenAt: checked, lastVerifiedAt: checked, confidence: '已核验', regionScope: '湖北省内' },
  { id: 'rec-cmcc-hb-2027', companyId: 'cmcc-hb', cohort: 2027, status: '开放中', locations: ['湖北全省'], sourceIds: ['src-cmcc-career'], firstSeenAt: checked, lastVerifiedAt: checked, confidence: '已核验', regionScope: '湖北省内' },
];

export const ownershipEvidence: OwnershipEvidence[] = [
  { id: 'ev-sasac-central-enterprise-list-2026', title: '国务院国资委央企名录（中国电信集团有限公司）', publisher: '国务院国资委', url: 'http://wap.sasac.gov.cn/n2588045/n27271785/n27271792/c14159097/content.html', sourceType: '监管披露', verifiedAt: checked },
  { id: 'ev-chinatelecom-2025-annual-report', title: '中国电信股份有限公司2025年年度报告', publisher: '中国电信股份有限公司', url: 'https://www.chinatelecom-h.com/sc/ir/report/annual2025_ashare.pdf', sourceType: '企业年报', verifiedAt: checked },
  { id: 'ev-chinatelecom-hubei-2027-campus', title: '中国电信湖北公司2027校园招聘火热进行中', publisher: '兰州大学就业网', url: 'https://job.lzu.edu.cn/html/74/article/2026/91782.html', sourceType: '招聘公告', verifiedAt: checked },
];
const chinatelecomCorpNode: OwnershipNode = {
  id: 'chinatelecom-corp', name: '中国电信股份有限公司', category: '央企控股上市公司', level: 2, entityKind: '控股企业',
  locationTags: ['湖北全省', '全国'], controlType: '控股', ownershipPercent: 63.9, registeredLocation: '北京市',
  verifiedAt: checked, verificationStatus: '已核验', relation: '中国电信集团有限公司持有约63.90%已发行股本',
  sourceUrl: ownershipEvidence[1].url,
  recruitmentChannels: [{ label: '中国电信湖北公司2027年度校园招聘', type: '集团招聘系统单位页', match: '单位已定位', status: '可投递', url: 'https://job.chinatelecom.com.cn/wt/TELE/web/index#/postinquiry?data=eyJrZXkiOjU4MTYyMywidHlwZSI6IjEiLCJyZWNydWl0UHJvamVjdCI6IiIsInJlY3J1aXRQcm9qZWN0TmFtZSI6IiJ9', appliesToCompanyName: '中国电信股份有限公司湖北分公司', evidenceUrl: 'https://job.lzu.edu.cn/html/74/article/2026/91782.html', verifiedAt: checked }],
};
const chinatelecomGroupNode: OwnershipNode = {
  id: 'chinatelecom-group', name: '中国电信集团有限公司', category: '中央企业', level: 1, entityKind: '集团',
  locationTags: ['全国'], controlType: '履行出资人职责', registeredLocation: '北京市', verifiedAt: checked,
  verificationStatus: '已核验', coverageSetId: 'coverage-sasac-chinatelecom', relation: '国务院国资委央企名录列示的中央企业',
  sourceUrl: 'https://www.chinatelecom.com.cn/', recruitmentChannels: [], children: [chinatelecomCorpNode],
};
const sasacNode: OwnershipNode = {
  id: 'sasac-central', name: '国务院国有资产监督管理委员会', category: '中央企业监管机构', level: 0, entityKind: '监管机构',
  locationTags: ['全国'], controlType: '履行出资人职责', verifiedAt: checked, verificationStatus: '已核验',
  sourceUrl: ownershipEvidence[0].url, recruitmentChannels: [], children: [chinatelecomGroupNode],
};
export const ownershipTrees: OwnershipNode[] = [sasacNode];
export const ownershipCoverageSets: OwnershipCoverageSet[] = [
  { id: 'coverage-sasac-chinatelecom', parentId: 'sasac-central', label: '中国电信单链核验集', scope: '本次仅核验国务院国资委至中国电信的一条控制链，不代表央企名录完整覆盖', asOf: checked, targetLevel: 1, officialDisclosedTotal: null, expectedNodeIds: ['chinatelecom-group'], pendingNodeIds: [], completenessStatus: '官方未披露总数', sourceUrls: [ownershipEvidence[0].url] },
  { id: 'coverage-chinatelecom-listed', parentId: 'chinatelecom-group', label: '中国电信股份控制关系核验', scope: '依据中国电信股份有限公司2025年年度报告核验控股股东及持股比例', asOf: checked, targetLevel: 2, officialDisclosedTotal: 1, expectedNodeIds: ['chinatelecom-corp'], pendingNodeIds: [], completenessStatus: '官方清单已闭合', sourceUrls: [ownershipEvidence[1].url] },
];
export const ownershipEdges: OwnershipEdge[] = [
  { id: 'edge-sasac-chinatelecom', parentId: 'sasac-central', childId: 'chinatelecom-group', controlType: '履行出资人职责', controlBasis: '国务院国资委央企名录列示中国电信集团有限公司', evidenceIds: ['ev-sasac-central-enterprise-list-2026'], asOf: checked, verificationStatus: '已核验' },
  { id: 'edge-chinatelecom-group-corp', parentId: 'chinatelecom-group', childId: 'chinatelecom-corp', controlType: '控股', directOwnershipPercent: 63.9, controlBasis: '中国电信股份有限公司2025年年度报告披露中国电信集团持有约63.90%已发行股本', evidenceIds: ['ev-chinatelecom-2025-annual-report'], asOf: checked, verificationStatus: '已核验' },
];
export const awards: AwardEntry[] = [
  { id: 'employer-hbjt-2025', companyId: 'hbjt', year: 2025, listName: '湖北重点雇主观察（非评奖）', awardTier: '省属重点企业', hubeiBasis: '湖北省国资委公开省属企业名录', sourceUrl: sources[0].url },
  { id: 'employer-hbui-2025', companyId: 'hbui', year: 2025, listName: '湖北重点雇主观察（非评奖）', awardTier: '省属重点企业', hubeiBasis: '湖北省国资委公开省属企业名录', sourceUrl: sources[0].url },
  { id: 'employer-whmetro-2025', companyId: 'whmetro', year: 2025, listName: '湖北重点雇主观察（非评奖）', awardTier: '武汉市属重点企业', hubeiBasis: '武汉市国资委公开出资企业名单', sourceUrl: sources[1].url },
  { id: 'employer-dfmc-2025', companyId: 'dfmc', year: 2025, listName: '湖北重点雇主观察（非评奖）', awardTier: '在鄂中央企业', hubeiBasis: '湖北省国资委在鄂中央企业公开信息及企业官方校招入口', sourceUrl: sources[0].url },
];
export const latestSync: SyncRun = { completedAt: '2026-09-22T00:00:00+08:00', sourceCount: sources.length, anomalyCount: 0, changedRecords: 0, discoveredLeads: 0, qualifiedLeads: 0, verifiedLeads: 0, hubeiLeads: 0, dailyTarget: 50, status: '部分成功' };
