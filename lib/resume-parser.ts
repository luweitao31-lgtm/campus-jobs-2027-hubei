import type { CandidateProfile } from './types.ts';

export interface ParsedResume {
  profile: Partial<CandidateProfile>;
  detectedFields: string[];
  warnings: string[];
}

const skillDictionary = [
  'BIM', 'Revit', 'AutoCAD', 'CAD', 'Navisworks', '广联达', '品茗', 'SketchUp', 'Lumion',
  '工程管理', '工程造价', '施工组织', '项目管理', '数据分析', 'Excel', 'Power BI', 'Python',
  'GIS', '无人机', '测绘', '数字孪生', '智慧工地', '装配式建筑', '绿色建筑', '智能建造',
  '智能监测', '数字化施工', '人工智能与机器学习', '智能控制', '智能结构检测', '工程经济',
  '有限元分析', '结构建模', 'MATLAB', '功能测试', '产品运营',
];
const certificateDictionary = [
  '英语四级', '英语六级', 'CET-4', 'CET-6', '计算机二级', '普通话', 'BIM一级', 'BIM二级',
  '全国WPS计算机二级', '全国大学生英语竞赛', '一级建造师', '二级建造师', '造价工程师',
];
const sectionAliases: Record<string, string[]> = {
  educationExperience: ['教育经历', '教育背景'],
  internshipExperience: ['实习经历', '工作经历', '实践经历'],
  projectExperience: ['项目经历', '项目经验', '课程设计'],
  campusExperience: ['校园经历', '学生工作', '社团经历'],
  honors: ['荣誉奖项', '奖项荣誉', '获奖情况', '证书荣誉', '荣誉及证书', '荣誉证书'],
  publications: ['出版物', '论文成果', '学术成果'],
  selfSummary: ['自我评价', '个人评价', '个人总结', '自我介绍'],
};

function unique(values: string[]) { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }
function compact(value: string) { return value.replace(/\s+/g, '').toLowerCase(); }

function normalizeResumeText(input: string) {
  return input.replace(/\r/g, '').split('\n').map((rawLine) => {
    const segments = rawLine.replace(/[\uE000-\uF8FF]/g, '').trim().split(/[ \t]{2,}/);
    return segments.map((segment) => segment
      .replace(/(?<=[\u3400-\u9fff])[ \t]+(?=[\u3400-\u9fff])/g, '')
      .replace(/(?<=[\u3400-\u9fff])[ \t]+(?=[：:，。；、])/g, '')
      .replace(/(?<=[：:，。；、])[ \t]+(?=[\u3400-\u9fff])/g, '')
      .replace(/《\s+/g, '《')
      .replace(/\s+》/g, '》')
      .replace(/[ \t]+/g, ' ')
      .trim()).filter(Boolean).join('\t');
  }).filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function repairWrappedLines(lines: string[], preserveCount = 0) {
  const repaired = lines.slice(0, preserveCount);
  for (const line of lines.slice(preserveCount)) {
    const previous = repaired.at(-1);
    const startsNewBullet = /^[^：:\n]{2,24}[：:]/.test(line);
    if (previous && repaired.length > preserveCount && !/[。；.!?！？]$/.test(previous) && !startsNewBullet) repaired[repaired.length - 1] += line;
    else repaired.push(line);
  }
  return repaired;
}

function detectSection(text: string, aliases: string[]) {
  const allHeadings = Object.values(sectionAliases).flat();
  const startPattern = new RegExp(`(?:^|\\n)\\s*(?:${aliases.join('|')})\\s*[：:]?\\s*(?=\\n|$)`, 'i');
  const match = startPattern.exec(text);
  if (!match) return '';
  const remainder = text.slice(match.index + match[0].length);
  const endPattern = new RegExp(`\\n\\s*(?:${allHeadings.filter((heading) => !aliases.includes(heading)).join('|')}|求职意向)\\s*[：:]?\\s*(?=\\n|$)`, 'i');
  const end = endPattern.exec(remainder);
  return (end ? remainder.slice(0, end.index) : remainder).trim().slice(0, 1800);
}

function splitExperienceEntries(value: string) {
  const lines = value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const dateIndexes = lines.map((line, index) => /(?:19|20)\d{2}[.\-/年]\d{1,2}.*(?:至今|(?:19|20)\d{2}[.\-/年]\d{1,2})/.test(line) ? index : -1).filter((index) => index >= 0);
  if (dateIndexes.length <= 1) return value.trim() ? [value.trim()] : [];
  const starts = dateIndexes.map((index) => Math.max(0, index - 2));
  return starts.map((start, index) => {
    const entryLines = lines.slice(start, starts[index + 1] ?? lines.length);
    const dateOffset = entryLines.findIndex((line) => /(?:19|20)\d{2}[.\-/年]\d{1,2}/.test(line));
    const hasLocation = dateOffset >= 0 && /^[\u4e00-\u9fa5]{2,8}$/.test(entryLines[dateOffset + 1] ?? '');
    return repairWrappedLines(entryLines, dateOffset + (hasLocation ? 2 : 1)).join('\n');
  }).filter(Boolean);
}

function splitHonorItems(value: string, certificates: string[]) {
  return unique(value.split(/[、，,；;\n\t]+/).map((item) => item.replace(/[。.]$/, '')))
    .filter((item) => !certificates.some((certificate) => compact(item).includes(compact(certificate)) || compact(certificate).includes(compact(item))));
}

function splitPublications(value: string) {
  const lines = value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const entries: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (/《[^》]+》/.test(line) && current.length) {
      entries.push(repairWrappedLines(current, 1).join('\n'));
      current = [];
    }
    current.push(line);
  }
  if (current.length) entries.push(repairWrappedLines(current, 1).join('\n'));
  return entries;
}

function detectName(text: string) {
  const labeled = text.match(/姓名\s*[：:]\s*([\u4e00-\u9fa5·]{2,8})/);
  if (labeled) return labeled[1];
  const firstLines = text.split(/\n/).map((line) => line.trim()).filter(Boolean).slice(0, 6);
  return firstLines.find((line) => /^[\u4e00-\u9fa5·]{2,4}$/.test(line) && !/简历|求职|个人/.test(line)) ?? '';
}

function detectSchool(text: string) {
  const labeled = text.match(/(?:毕业院校|学校)\s*[：:]\s*([^\n：:]{2,30}?)(?=\s+(?:专业|学历|学位)[：:]|$)/);
  if (labeled) return labeled[1].trim();
  const candidates = text.match(/[\u4e00-\u9fa5]{2,20}(?:大学|学院)/g) ?? [];
  return candidates.find((value) => !/大学生|全国大学|大学期间|大赛/.test(value)) ?? '';
}

function detectMajor(text: string) {
  const labeled = text.match(/(?:所学专业|专业)\s*[：:]\s*([\u4e00-\u9fa5A-Za-z（）()]{2,24}?)(?=(?:学历|学位)\s*[：:]|\n|$)/);
  if (labeled) return labeled[1].trim();
  const known = ['智能建造', '土木工程', '工程管理', '工程造价', '建筑学', '测绘工程', '城乡规划'];
  return known.find((major) => text.includes(major)) ?? '';
}

function detectEducation(text: string): CandidateProfile['education'] | undefined {
  if (/博士|Ph\.?D/i.test(text)) return '博士研究生';
  if (/硕士|研究生|Master/i.test(text)) return '硕士研究生';
  if (/本科|学士|Bachelor/i.test(text)) return '本科';
  return undefined;
}

export function parseResumeText(input: string): ParsedResume {
  const text = normalizeResumeText(input);
  const warnings: string[] = [];
  if (text.length < 50) warnings.push('可提取文字过少，文件可能是扫描版 PDF，需要先进行 OCR。');

  const profile: Partial<CandidateProfile> = {};
  const name = detectName(text);
  const school = detectSchool(text);
  const major = detectMajor(text);
  const education = detectEducation(text);
  const phone = text.match(/(?<!\d)(?:\+?86[- ]?)?1[3-9]\d{9}(?!\d)/)?.[0]?.replace(/\s|-/g, '').replace(/^\+?86/, '') ?? '';
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';
  const compactText = compact(text);
  const skills = unique(skillDictionary.filter((skill) => compactText.includes(compact(skill))));
  const certificateMatches = unique(certificateDictionary.filter((certificate) => compactText.includes(compact(certificate))));
  const certificates = certificateMatches.filter((certificate) => !certificateMatches.some((other) => other !== certificate && compact(other).includes(compact(certificate))));
  const targetLine = text.match(/(?:求职意向|目标岗位|应聘岗位)\s*[：:]\s*([^\n]{2,80})/)?.[1] ?? '';
  const targetRoles = unique(targetLine.split(/[、，,/|]/));
  const nativePlace = text.match(/籍贯\s*[：:]\s*([\u4e00-\u9fa5]{2,12})/)?.[1] ?? '';
  const contactLine = text.split('\n').find((line) => line.includes(phone));
  const currentCity = contactLine?.match(/^([\u4e00-\u9fa5]{2,12})(?=\s+1[3-9]\d{9})/)?.[1] ?? '';

  if (name) profile.name = name;
  if (school) profile.school = school;
  if (major) profile.major = major;
  if (education) profile.education = education;
  if (phone) profile.phone = phone;
  if (email) profile.email = email;
  if (currentCity) profile.currentCity = currentCity;
  if (nativePlace) profile.nativePlace = nativePlace;
  if (skills.length) profile.skills = skills;
  if (certificates.length) profile.certificates = certificates;
  if (targetRoles.length) profile.targetRoles = targetRoles;

  for (const [key, aliases] of Object.entries(sectionAliases)) {
    const value = detectSection(text, aliases);
    if (!value) continue;
    if (key === 'internshipExperience') {
      profile.internshipExperience = value;
      profile.internshipExperiences = splitExperienceEntries(value);
    } else if (key === 'honors') {
      profile.honorItems = splitHonorItems(value, certificates);
      profile.honors = profile.honorItems.join('；');
    } else if (key === 'publications') {
      profile.publications = splitPublications(value);
    } else if (key === 'projectExperience') {
      profile.projectExperience = repairWrappedLines(value.split(/\n+/), 3).join('\n');
    } else if (key === 'selfSummary') {
      profile.selfSummary = repairWrappedLines(value.split(/\n+/)).join('\n');
    } else {
      (profile as Record<string, unknown>)[key] = value;
    }
  }

  const fieldLabels: Record<string, string> = {
    name: '姓名', school: '学校', major: '专业', education: '学历', phone: '手机号', email: '邮箱', currentCity: '所在地', nativePlace: '籍贯', educationExperience: '教育经历',
    skills: '技能', certificates: '证书', targetRoles: '求职意向', internshipExperience: '实习经历', internshipExperiences: '实习经历',
    projectExperience: '项目经历', campusExperience: '校园经历', honors: '荣誉奖项', honorItems: '荣誉奖项', publications: '出版物', selfSummary: '自我评价',
  };
  const detectedFields = unique(Object.keys(profile).map((key) => fieldLabels[key] ?? key));
  if (!detectedFields.length && !warnings.length) warnings.push('未识别到可用的候选人信息，请确认 PDF 中包含可复制的简历文字。');
  return { profile, detectedFields, warnings };
}
