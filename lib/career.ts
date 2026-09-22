import type { CandidateProfile, HiringUnit, JobFamily, JobOpportunity, RecommendationScore, RecruitmentOpening } from './types.ts';

export const defaultCandidateProfile: CandidateProfile = {
  version: 1,
  name: '',
  school: '',
  education: '本科',
  major: '',
  graduationYear: 2027,
  skills: [],
  certificates: [],
  internshipExperiences: [],
  honorItems: [],
  publications: [],
  preferredCities: ['湖北武汉', '湖北全省', '全国'],
  preferredFamilies: ['智能建造相关', '工程技术', '综合职能', '不限专业'],
  avoidHeavyCoding: true,
};

const constructionTerms = ['智能建造', '土木', '建筑', '工程管理', '工程造价', '测绘', '结构', '施工', '项目管理', 'bim', '工程技术'];
const engineeringTerms = ['电气', '机械', '能源', '动力', '环境', '自动化', '安全工程', '材料', '设备', '生产', '运维', '巡检'];
const generalTerms = ['不限专业', '专业不限', '管理培训', '管培', '综合管理', '行政', '运营', '市场', '商务', '采购', '人力'];
const codingTerms = ['软件开发', '算法', '程序开发', '计算机科学', '软件工程', '网络工程', '人工智能', '数据科学'];

const includesAny = (value: string, terms: string[]) => terms.some((term) => value.toLowerCase().includes(term));

const nonEmpty = (value?: string) => Boolean(value?.trim());

export function hasCandidateProfileContent(profile: CandidateProfile) {
  const textFields = [
    profile.name,
    profile.school,
    profile.phone,
    profile.email,
    profile.currentCity,
    profile.nativePlace,
    profile.educationExperience,
    profile.internshipExperience,
    profile.projectExperience,
    profile.campusExperience,
    profile.honors,
    profile.selfSummary,
    profile.resumeFileName,
    profile.resumeImportedAt,
  ];
  const listFields = [
    profile.targetRoles,
    profile.certificates,
    profile.internshipExperiences,
    profile.honorItems,
    profile.publications,
  ];
  return textFields.some(nonEmpty) || listFields.some((items) => items?.some(nonEmpty));
}

export function hasRecommendationProfile(profile: CandidateProfile) {
  const hasCoreIdentity = nonEmpty(profile.name) && nonEmpty(profile.school) && nonEmpty(profile.major);
  if (!hasCoreIdentity) return false;

  const importedResume = nonEmpty(profile.resumeFileName) && nonEmpty(profile.resumeImportedAt);
  const manualMatchingEvidence = Boolean(
    profile.targetRoles?.some(nonEmpty)
    || profile.internshipExperiences?.some(nonEmpty)
    || nonEmpty(profile.internshipExperience)
    || nonEmpty(profile.projectExperience)
    || nonEmpty(profile.educationExperience),
  );
  return importedResume || manualMatchingEvidence;
}

function profileMatchTerms(profile: CandidateProfile) {
  const explicitTerms = [profile.major, ...profile.skills, ...(profile.targetRoles ?? [])]
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
  const profileText = [
    ...explicitTerms,
    ...(profile.internshipExperiences ?? []),
    profile.internshipExperience,
    profile.projectExperience,
    profile.educationExperience,
  ].filter(Boolean).join(' ').toLowerCase();
  const inferredTerms = [...constructionTerms, ...engineeringTerms, ...generalTerms]
    .filter((term) => profileText.includes(term));
  return [...new Set([...explicitTerms, ...inferredTerms])];
}

export function classifyJob(jobName: string, majors: string): JobFamily {
  const text = `${jobName} ${majors}`;
  if (includesAny(text, ['不限专业', '专业不限'])) return '不限专业';
  if (includesAny(text, constructionTerms)) return '智能建造相关';
  if (includesAny(text, engineeringTerms)) return '工程技术';
  if (includesAny(text, generalTerms)) return '综合职能';
  return '其他';
}

export function buildJobOpportunities(openings: RecruitmentOpening[], units: HiringUnit[]): JobOpportunity[] {
  const unitMap = new Map(units.map((unit) => [unit.id, unit]));
  return openings.map((opening) => ({
    id: opening.id,
    companyName: unitMap.get(opening.hiringUnitId)?.name ?? '用人单位待确认',
    jobName: opening.jobName,
    family: classifyJob(opening.jobName, opening.majors),
    workLocation: opening.workLocation,
    education: opening.education,
    majors: opening.majors,
    headcount: opening.headcount,
    headcountNote: opening.headcountNote,
    deadline: opening.deadline,
    officialUrl: opening.officialUrl,
    source: opening.source,
    verifiedAt: opening.verifiedAt,
    status: opening.status,
  }));
}

function educationReachable(profile: CandidateProfile, requirement: string) {
  const rank = { '本科': 1, '硕士研究生': 2, '博士研究生': 3 } as const;
  const required = requirement.includes('博士') ? 3 : requirement.includes('硕士') ? 2 : 1;
  return rank[profile.education] >= required;
}

export function scoreOpportunity(job: JobOpportunity, profile: CandidateProfile, now = new Date(), qualityEmployer = false): RecommendationScore {
  const reasons: string[] = [];
  const risks: string[] = [];
  const text = `${job.jobName} ${job.majors}`;
  const unrestricted = includesAny(text, ['不限专业', '专业不限']);
  const matchedProfileTerm = profileMatchTerms(profile).find((term) => text.toLowerCase().includes(term.toLowerCase()));
  const directMajor = Boolean(matchedProfileTerm);
  const familyPreferred = profile.preferredFamilies.includes(job.family);
  let match = unrestricted ? 24 : directMajor ? 35 : familyPreferred ? 21 : 8;
  if (directMajor) reasons.push(`简历关键词“${matchedProfileTerm}”与岗位要求匹配`);
  else if (unrestricted) reasons.push('不限专业，可直接竞争');
  else if (familyPreferred) reasons.push(`属于偏好的${job.family}方向`);
  else risks.push('专业匹配度较弱，投递前需核对资格');
  if (profile.avoidHeavyCoding && includesAny(text, codingTerms)) {
    match = Math.max(0, match - 12);
    risks.push('岗位编程或计算机要求较强');
  }

  const reachable = educationReachable(profile, job.education);
  const reachability = reachable ? 20 : 2;
  if (reachable) reasons.push(`学历满足${job.education}要求`);
  else risks.push(`学历门槛为${job.education}`);

  const wuhan = job.workLocation.includes('武汉');
  const hubei = job.workLocation.includes('湖北');
  const location = wuhan ? 15 : hubei ? 11 : job.workLocation.includes('全国') ? 7 : 4;
  if (wuhan) reasons.push('工作地点在武汉');
  else if (hubei) reasons.push('工作地点在湖北省内');

  const deadline = new Date(job.deadline);
  const days = Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000);
  const urgency = days < 0 ? 0 : days <= 3 ? 15 : days <= 14 ? 13 : 10;
  if (days >= 0 && days <= 7) reasons.push(`距截止仅 ${days} 天，需优先处理`);
  const confidence = job.status === '开放中' && job.officialUrl.startsWith('http') ? 10 : 0;
  const employerQuality = qualityEmployer ? 5 : 3;
  if (confidence) reasons.push('官方招聘系统已核验');
  if (job.headcount >= 3) reasons.push(`计划招聘 ${job.headcount} 人`);

  return {
    total: Math.max(0, Math.min(100, match + reachability + location + urgency + confidence + employerQuality)),
    match, reachability, location, urgency, confidence, employerQuality, reasons, risks,
  };
}

export function recommendOpportunities(jobs: JobOpportunity[], profile: CandidateProfile, now = new Date(), limit = 10) {
  return jobs
    .filter((job) => job.status === '开放中' && Boolean(job.officialUrl) && new Date(job.deadline).getTime() >= now.getTime())
    .map((job) => ({ job, score: scoreOpportunity(job, profile, now) }))
    .filter(({ score }) => score.reachability >= 20)
    .sort((left, right) => right.score.total - left.score.total || new Date(left.job.deadline).getTime() - new Date(right.job.deadline).getTime())
    .slice(0, limit);
}
