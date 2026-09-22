import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyJob, defaultCandidateProfile, hasCandidateProfileContent, hasRecommendationProfile, recommendOpportunities, scoreOpportunity } from './career.ts';
import type { JobOpportunity } from './types.ts';

const job = (overrides: Partial<JobOpportunity> = {}): JobOpportunity => ({
  id: 'job-1', companyName: '示例建设集团', jobName: '工程项目管理', family: '智能建造相关', workLocation: '湖北武汉',
  education: '大学本科', majors: '智能建造、土木工程、工程管理', headcount: 3, deadline: '2026-10-01',
  officialUrl: 'https://jobs.example.com/1', source: '企业官方招聘系统', verifiedAt: '2026-09-18', status: '开放中', ...overrides,
});

test('识别智能建造、不限专业和综合岗位', () => {
  assert.equal(classifyJob('工程管理岗', '智能建造、土木工程'), '智能建造相关');
  assert.equal(classifyJob('管理培训生', '专业不限'), '不限专业');
  assert.equal(classifyJob('人力资源岗', '工商管理'), '综合职能');
});

test('武汉专业匹配岗位获得可解释高分', () => {
  const score = scoreOpportunity(job(), { ...defaultCandidateProfile, major: '智能建造', skills: ['BIM'] }, new Date('2026-09-18T00:00:00+08:00'));
  assert.ok(score.total >= 90);
  assert.ok(score.reasons.some((reason) => reason.includes('智能建造')));
  assert.equal(score.risks.length, 0);
});

test('高编程岗位降权且硕士门槛阻止本科推荐', () => {
  const coding = scoreOpportunity(job({ jobName: '软件开发工程师', majors: '计算机科学与技术', family: '其他' }), defaultCandidateProfile, new Date('2026-09-18'));
  assert.ok(coding.risks.some((risk) => risk.includes('编程')));
  const results = recommendOpportunities([job({ education: '硕士研究生及以上' })], defaultCandidateProfile, new Date('2026-09-18'));
  assert.equal(results.length, 0);
});

test('推荐排除过期与待确认岗位', () => {
  const results = recommendOpportunities([
    job(),
    job({ id: 'expired', deadline: '2026-09-17' }),
    job({ id: 'pending', status: '待确认' }),
  ], defaultCandidateProfile, new Date('2026-09-18T00:00:00+08:00'));
  assert.deepEqual(results.map((item) => item.job.id), ['job-1']);
});

test('首次进入且简历信息不足时不具备推荐条件', () => {
  assert.equal(hasCandidateProfileContent(defaultCandidateProfile), false);
  assert.equal(hasRecommendationProfile(defaultCandidateProfile), false);
  assert.equal(hasRecommendationProfile({
    ...defaultCandidateProfile,
    name: '张三',
    school: '示例大学',
    major: '智能建造',
  }), false);
});

test('真实候选人信息与默认示例画像可以区分', () => {
  assert.equal(hasCandidateProfileContent({
    ...defaultCandidateProfile,
    resumeFileName: 'resume.pdf',
  }), true);
  assert.equal(hasCandidateProfileContent({
    ...defaultCandidateProfile,
    name: '张三',
  }), true);
});

test('完整 PDF 画像或手动求职画像可以启动推荐', () => {
  assert.equal(hasRecommendationProfile({
    ...defaultCandidateProfile,
    name: '张三',
    school: '示例大学',
    major: '智能建造',
    resumeFileName: 'resume.pdf',
    resumeImportedAt: '2026-09-21T00:00:00.000Z',
  }), true);
  assert.equal(hasRecommendationProfile({
    ...defaultCandidateProfile,
    name: '李四',
    school: '示例大学',
    major: '智能建造',
    targetRoles: ['工程管理岗'],
  }), true);
});

test('简历技能和目标岗位参与岗位匹配评分', () => {
  const profile = {
    ...defaultCandidateProfile,
    major: '工商管理',
    skills: ['BIM'],
    targetRoles: ['工程项目管理'],
  };
  const score = scoreOpportunity(job(), profile, new Date('2026-09-18T00:00:00+08:00'));
  assert.equal(score.match, 35);
  assert.ok(score.reasons.some((reason) => reason.includes('BIM') || reason.includes('工程项目管理')));
});
