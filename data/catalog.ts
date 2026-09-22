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
  { id: 'ev-sasac-central-enterprise-list-2026', title: '国务院国资委央企名录（东风汽车集团有限公司）', publisher: '国务院国资委', url: 'http://wap.sasac.gov.cn/n2588045/n27271785/n27271792/c14159097/content.html', sourceType: '监管披露', verifiedAt: checked },
  { id: 'ev-dfmc-2027-campus-procurement', title: '2027届东风汽车校园招聘及雇主品牌建设项目', publisher: '东风汽车集团股份有限公司人事共享服务中心', url: 'https://etp.dfmc.com.cn/jyxx/004002/004002003/20260909/669b81d4-ce35-451f-8bc7-96e7b810bd66.html', sourceType: '采购公告', verifiedAt: checked },
  { id: 'ev-dfmc-2027-campus-lzu', title: '东风汽车集团有限公司研发总院2027届秋季校园招聘简章', publisher: '兰州大学就业网', url: 'https://job.lzu.edu.cn/html/22/article/2026/91112.html', sourceType: '招聘公告', verifiedAt: checked },
];
const dfmcNode: OwnershipNode = {
  id: 'dfmc', name: '东风汽车集团有限公司', category: '中央企业', level: 1, entityKind: '集团',
  locationTags: ['湖北武汉', '湖北全省', '全国'], controlType: '履行出资人职责', registeredLocation: '湖北省武汉市',
  verifiedAt: checked, verificationStatus: '已核验', coverageSetId: 'coverage-sasac-dfmc',
  relation: '国务院国资委央企名录列示的中央企业', sourceUrl: 'https://www.dfmc.com.cn/',
  recruitmentChannels: [{ label: '东风汽车2027届校园招聘', type: '公司招聘官网', match: '公司专属', status: '可投递', url: 'https://www.dfmc.com.cn/zhaopin/xiaoyuanzhaopin.html', appliesToCompanyName: '东风汽车集团有限公司', evidenceUrl: 'https://job.lzu.edu.cn/html/22/article/2026/91112.html', verifiedAt: checked }],
};
const sasacNode: OwnershipNode = {
  id: 'sasac-central', name: '国务院国有资产监督管理委员会', category: '中央企业监管机构', level: 0, entityKind: '监管机构',
  locationTags: ['全国'], controlType: '履行出资人职责', verifiedAt: checked, verificationStatus: '已核验',
  sourceUrl: ownershipEvidence[0].url, recruitmentChannels: [], children: [dfmcNode],
};
export const ownershipTrees: OwnershipNode[] = [sasacNode];
export const ownershipCoverageSets: OwnershipCoverageSet[] = [
  { id: 'coverage-sasac-dfmc', parentId: 'sasac-central', label: '东风汽车单链核验集', scope: '本次仅核验国务院国资委至东风汽车集团的一条控制链，不代表央企名录完整覆盖', asOf: checked, targetLevel: 1, officialDisclosedTotal: null, expectedNodeIds: ['dfmc'], pendingNodeIds: [], completenessStatus: '官方未披露总数', sourceUrls: [ownershipEvidence[0].url] },
];
export const ownershipEdges: OwnershipEdge[] = [
  { id: 'edge-sasac-dfmc', parentId: 'sasac-central', childId: 'dfmc', controlType: '履行出资人职责', controlBasis: '国务院国资委央企名录列示东风汽车集团有限公司', evidenceIds: ['ev-sasac-central-enterprise-list-2026'], asOf: checked, verificationStatus: '已核验' },
];
export const awards: AwardEntry[] = [
  { id: 'employer-hbjt-2025', companyId: 'hbjt', year: 2025, listName: '湖北重点雇主观察（非评奖）', awardTier: '省属重点企业', hubeiBasis: '湖北省国资委公开省属企业名录', sourceUrl: sources[0].url },
  { id: 'employer-hbui-2025', companyId: 'hbui', year: 2025, listName: '湖北重点雇主观察（非评奖）', awardTier: '省属重点企业', hubeiBasis: '湖北省国资委公开省属企业名录', sourceUrl: sources[0].url },
  { id: 'employer-whmetro-2025', companyId: 'whmetro', year: 2025, listName: '湖北重点雇主观察（非评奖）', awardTier: '武汉市属重点企业', hubeiBasis: '武汉市国资委公开出资企业名单', sourceUrl: sources[1].url },
  { id: 'employer-dfmc-2025', companyId: 'dfmc', year: 2025, listName: '湖北重点雇主观察（非评奖）', awardTier: '在鄂中央企业', hubeiBasis: '湖北省国资委在鄂中央企业公开信息及企业官方校招入口', sourceUrl: sources[0].url },
];
export const latestSync: SyncRun = { completedAt: '2026-09-22T00:00:00+08:00', sourceCount: sources.length, anomalyCount: 0, changedRecords: 0, discoveredLeads: 0, qualifiedLeads: 0, verifiedLeads: 0, hubeiLeads: 0, dailyTarget: 50, status: '部分成功' };
