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
  { id: 'ev-hubei-sasac-list', title: '湖北省属企业公开名录', publisher: '湖北省国资委', url: sources[0].url, sourceType: '监管披露', verifiedAt: checked },
  { id: 'ev-wuhan-sasac-list', title: '武汉市国资委出资企业名单', publisher: '武汉市国资委', url: sources[1].url, sourceType: '监管披露', verifiedAt: checked },
];
const channel = (name: string, url: string) => [{ label: `${name}招聘入口`, type: '集团通用入口' as const, match: '集团兜底' as const, status: '状态待确认' as const, url, verifiedAt: checked }];
const makeNode = (id: string, name: string, level: number, category: string, sourceUrl: string, careerUrl = ''): OwnershipNode => ({ id, name, category, level, entityKind: level === 0 ? '监管机构' : '集团', locationTags: ['湖北全省'], controlType: '履行出资人职责', registeredLocation: level ? '湖北省' : undefined, verifiedAt: checked, verificationStatus: '已核验', sourceUrl, recruitmentChannels: level ? channel(name, careerUrl) : [] });
const hubeiSasac = makeNode('hubei-sasac', '湖北省人民政府国有资产监督管理委员会', 0, '省级监管机构', sources[0].url);
const wuhanSasac = makeNode('wuhan-sasac', '武汉市人民政府国有资产监督管理委员会', 0, '市级监管机构', sources[1].url);
hubeiSasac.children = [makeNode('hbjt', companies[0].name, 1, '湖北省属国企', sources[0].url, companies[0].channels[0].url), makeNode('hbui', companies[1].name, 1, '湖北省属国企', sources[0].url, companies[1].channels[0].url), makeNode('hblv', companies[2].name, 1, '湖北省属国企', sources[0].url, companies[2].channels[0].url), makeNode('cjcy', companies[3].name, 1, '湖北省属国企', sources[0].url, companies[3].channels[0].url)];
wuhanSasac.children = [makeNode('whmetro', companies[5].name, 1, '武汉市属国企', sources[1].url, companies[5].channels[0].url), makeNode('whcf', companies[6].name, 1, '武汉市属国企', sources[1].url, companies[6].channels[0].url)];
export const ownershipTrees: OwnershipNode[] = [hubeiSasac, wuhanSasac];
export const ownershipCoverageSets: OwnershipCoverageSet[] = [
  { id: 'coverage-hubei-sasac', parentId: 'hubei-sasac', label: '湖北省属企业首批核验集', scope: '湖北省国资委公开名录', asOf: checked, targetLevel: 1, officialDisclosedTotal: null, expectedNodeIds: ['hbjt', 'hbui', 'hblv', 'cjcy'], pendingNodeIds: [], completenessStatus: '已核验并持续补充', sourceUrls: [sources[0].url] },
  { id: 'coverage-wuhan-sasac', parentId: 'wuhan-sasac', label: '武汉市属企业首批核验集', scope: '武汉市国资委公开名录', asOf: checked, targetLevel: 1, officialDisclosedTotal: null, expectedNodeIds: ['whmetro', 'whcf'], pendingNodeIds: [], completenessStatus: '已核验并持续补充', sourceUrls: [sources[1].url] },
];
export const ownershipEdges: OwnershipEdge[] = [
  ...hubeiSasac.children!.map((child) => ({ id: `edge-hubei-${child.id}`, parentId: hubeiSasac.id, childId: child.id, controlType: '履行出资人职责' as const, controlBasis: '湖北省国资委公开省属企业名录', evidenceIds: ['ev-hubei-sasac-list'], asOf: checked, verificationStatus: '已核验' as const })),
  ...wuhanSasac.children!.map((child) => ({ id: `edge-wuhan-${child.id}`, parentId: wuhanSasac.id, childId: child.id, controlType: '履行出资人职责' as const, controlBasis: '武汉市国资委公开出资企业名单', evidenceIds: ['ev-wuhan-sasac-list'], asOf: checked, verificationStatus: '已核验' as const })),
];
export const awards: AwardEntry[] = [
  { id: 'employer-hbjt-2025', companyId: 'hbjt', year: 2025, listName: '湖北重点雇主观察（非评奖）', awardTier: '省属重点企业', hubeiBasis: '湖北省国资委公开省属企业名录', sourceUrl: sources[0].url },
  { id: 'employer-hbui-2025', companyId: 'hbui', year: 2025, listName: '湖北重点雇主观察（非评奖）', awardTier: '省属重点企业', hubeiBasis: '湖北省国资委公开省属企业名录', sourceUrl: sources[0].url },
  { id: 'employer-whmetro-2025', companyId: 'whmetro', year: 2025, listName: '湖北重点雇主观察（非评奖）', awardTier: '武汉市属重点企业', hubeiBasis: '武汉市国资委公开出资企业名单', sourceUrl: sources[1].url },
  { id: 'employer-dfmc-2025', companyId: 'dfmc', year: 2025, listName: '湖北重点雇主观察（非评奖）', awardTier: '在鄂中央企业', hubeiBasis: '湖北省国资委在鄂中央企业公开信息及企业官方校招入口', sourceUrl: sources[0].url },
];
export const latestSync: SyncRun = { completedAt: '2026-09-22T00:00:00+08:00', sourceCount: sources.length, anomalyCount: 0, changedRecords: 0, discoveredLeads: 0, qualifiedLeads: 0, verifiedLeads: 0, hubeiLeads: 0, dailyTarget: 50, status: '部分成功' };
