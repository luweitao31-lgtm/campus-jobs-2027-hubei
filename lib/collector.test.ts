import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanCollectedCompanyName, detectsCohort2027, detectsHubei, detectsNational, extractRecruitmentLeads, inferCollectedCompanyNature, mergeCandidateLeads, normalizeCompanyName, treeDepth, uniqueByNormalizedName, validateOwnershipCoverage, validateOwnershipTree } from './collector.ts';

test('企业名称归一并去重', () => {
  assert.equal(normalizeCompanyName('中国—东盟信息港股份有限公司'), '中国东盟信息港');
  assert.equal(uniqueByNormalizedName([{ name: '湖北联投集团有限公司' }, { name: '湖北联投集团' }]).length, 1);
});

test('清理聚合平台企业名称中的标签、日期和英文别名', () => {
  assert.equal(cleanCollectedCompanyName('民企 通信 收录 2026.09.08 深圳智界探索科技有限公司'), '深圳智界探索科技有限公司');
  assert.equal(cleanCollectedCompanyName('社会组织 收录 2026.09.10 广州白云机场 广州白云国际机场'), '广州白云机场');
  assert.equal(cleanCollectedCompanyName('银行 收录 2026.09.10 招银理财 招银理财'), '招银理财');
  assert.equal(cleanCollectedCompanyName('政府机关 银行 收录 2026.09.10 宁银消金 宁银消金(宁波银行控股子公司)'), '宁银消金');
  assert.equal(cleanCollectedCompanyName('民企 科技 收录 2026.09.10 伟京电子 伟京电子'), '伟京电子');
  assert.equal(cleanCollectedCompanyName('上市公司 农林牧渔 收录 2026.09.10 晓鸣股份 晓鸣股份(股票代码 300967)'), '晓鸣股份');
  assert.equal(cleanCollectedCompanyName('上市公司 有内推 收录 2026.09.10 上海国际集团 Aster星图国际集团(股票代码:YIBO)'), '上海国际集团');
  assert.equal(cleanCollectedCompanyName('武汉丨中国移动湖北公司'), '中国移动湖北公司');
  assert.equal(cleanCollectedCompanyName('九阳, Joyoung'), '九阳');
});

test('保留聚合来源明确标注的民企和外企性质', () => {
  assert.equal(inferCollectedCompanyNature('民企 科技 收录 2026.09.10 伟京电子', '伟京电子'), '民营企业');
  assert.equal(inferCollectedCompanyNature('外企 地产 收录 2026.09.10 恒隆地产', 'BURBERRY博柏利'), '外企');
  assert.equal(inferCollectedCompanyNature('2027届校园招聘', '未知企业'), '性质待确认');
  assert.equal(inferCollectedCompanyNature('2027届校园招聘', 'Deloitte'), '外企');
  assert.equal(inferCollectedCompanyNature('2027届校园招聘', '德勤华永会计师事务所（特殊普通合伙）北京分所'), '外企');
  assert.equal(inferCollectedCompanyNature('2027届校园招聘', '博世（中国）投资有限公司'), '外企');
  assert.equal(inferCollectedCompanyNature('2027届校园招聘', '中国建筑集团有限公司'), '性质待确认');
});

test('识别 2027 届、湖北与全国地点', () => {
  assert.equal(detectsCohort2027('面向2027届毕业生的秋季校园招聘'), true);
  assert.equal(detectsCohort2027('中国邮政2027年度联合校园招聘'), true);
  assert.equal(detectsCohort2027('2026年社会招聘'), false);
  assert.equal(detectsHubei('工作地点：湖北省武汉市洪山区'), true);
  assert.equal(detectsNational('面向全国多地招聘'), true);
});

test('从聚合页提取、合并并保留明确的公告入口', () => {
  const source = { id: 'jobup', url: 'https://jobup.cn/', role: 'discovery' as const, parser: 'jobup-table' as const };
  const html = '<tr><time dateTime="2026-09-08">09-08</time><strong class="company-name" title="示例科技有限公司">示例科技有限公司</strong><div class="table-clamp" title="互联网"></div><div class="table-clamp job-list" title="管培生"></div><div class="table-clamp" title="湖北武汉、深圳"></div><a href="https://example.com/jobs">投递官网</a><span>2027届</span></tr>';
  const leads = extractRecruitmentLeads(html, source);
  assert.equal(leads.length, 1);
  assert.equal(leads[0].sourceUrl, 'https://jobup.cn/');
  assert.ok(leads[0].locations.includes('湖北武汉'));
  const anchorLeads = extractRecruitmentLeads('<a href="https://example.com/jobs">示例科技2027届校园招聘</a>', { ...source, parser: 'anchor-list' });
  assert.equal(anchorLeads[0].channelUrl, 'https://example.com/jobs');
  const datedLead = extractRecruitmentLeads('<a href="/career/1">09月 10日 示例科技2027届校园招聘</a>', { ...source, parser: 'anchor-list' });
  assert.equal(datedLead[0].companyName, '示例科技');
  const multiCityLead = extractRecruitmentLeads('<a href="/career/2">德勤2027届校园招聘 北京 上海 广州 大连</a>', { ...source, parser: 'anchor-list' });
  assert.deepEqual(multiCityLead[0].locations, ['北京', '上海', '广州', '大连']);
  assert.equal(extractRecruitmentLeads('<a href="/fair/1">武汉大学2027届毕业生秋季双选会</a>', { ...source, parser: 'anchor-list' }).length, 0);
  const merged = mergeCandidateLeads([...leads, { ...leads[0], sourceId: 'second', sourceUrl: 'https://second.example.com' }]);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].sourceIds.sort(), ['jobup', 'second']);
});

test('校验三级控股树并识别循环', () => {
  const valid = { id: 'root', sourceUrl: 'https://example.com', children: [{ id: 'one', sourceUrl: 'https://example.com/1', children: [{ id: 'two', sourceUrl: 'https://example.com/2' }] }] };
  assert.equal(treeDepth(valid), 3);
  assert.deepEqual(validateOwnershipTree(valid), []);
  const cyclic: { id: string; sourceUrl: string; children?: unknown[] } = { id: 'root', sourceUrl: 'x' };
  cyclic.children = [cyclic];
  assert.match(validateOwnershipTree(cyclic as never).join(','), /形成循环/);
});

test('覆盖清单区分已核验与待确认，闭合状态必须可审计', () => {
  const noPublicChannel = [{ label: '暂无独立公开招聘入口', type: '无公开渠道', match: '暂无公开入口', status: '暂无公开入口', verifiedAt: '2026-09-09' }];
  const roots = [{ id: 'root', name: '监管机构', level: 0, sourceUrl: 'https://example.com', children: [{ id: 'group', name: '示例集团', level: 1, sourceUrl: 'https://example.com/group', recruitmentChannels: noPublicChannel, children: [{ id: 'company-a', name: '示例公司甲', level: 2, entityKind: '控股企业', coverageSetId: 'coverage', verificationStatus: '已核验', verifiedAt: '2026-09-08', sourceUrl: 'https://example.com/a', recruitmentChannels: [{ label: '示例公司招聘', type: '公司招聘官网', match: '公司专属', status: '可投递', url: 'https://jobs.example.com/company-a', appliesToCompanyName: '示例公司甲', evidenceUrl: 'https://jobs.example.com/company-a', verifiedAt: '2026-09-09' }] }] }] }];
  const coverage = [{ id: 'coverage', parentId: 'group', targetLevel: 2 as const, officialDisclosedTotal: 1, expectedNodeIds: ['company-a'], pendingNodeIds: [] as string[], completenessStatus: '官方清单已闭合', sourceUrls: ['https://example.com/list'] }, { id: 'company-a-l3', parentId: 'company-a', targetLevel: 3 as const, officialDisclosedTotal: 0, expectedNodeIds: [], pendingNodeIds: [] as string[], completenessStatus: '官方清单已闭合', sourceUrls: ['https://example.com/a'] }];
  assert.deepEqual(validateOwnershipCoverage(roots, coverage), []);
  coverage[0].pendingNodeIds.push('missing');
  assert.match(validateOwnershipCoverage(roots, coverage).join(','), /闭合状态与清单不一致|缺少节点/);
});

test('公司专属招聘链接不能复制母公司通用链接', () => {
  const sharedUrl = 'https://jobs.example.com/';
  const roots = [{ id: 'root', name: '监管机构', level: 0, sourceUrl: 'https://example.com', children: [{ id: 'group', name: '示例集团', level: 1, sourceUrl: 'https://example.com/group', recruitmentChannels: [{ label: '集团招聘', type: '公司招聘官网', match: '公司专属', status: '可投递', url: sharedUrl, appliesToCompanyName: '示例集团', evidenceUrl: sharedUrl, verifiedAt: '2026-09-09' }], children: [{ id: 'child', name: '示例子公司', level: 2, sourceUrl: 'https://example.com/child', recruitmentChannels: [{ label: '子公司招聘', type: '公司招聘官网', match: '公司专属', status: '可投递', url: sharedUrl, appliesToCompanyName: '示例子公司', evidenceUrl: sharedUrl, verifiedAt: '2026-09-09' }] }] }] }];
  assert.match(validateOwnershipCoverage(roots, []).join(','), /公司专属招聘链接与母公司完全相同/);
});

test('集团兜底和已定位单位公告具有不同的渠道语义', () => {
  const roots = [{ id: 'root', name: '监管机构', level: 0, sourceUrl: 'https://example.com', children: [{ id: 'group', name: '示例集团', level: 1, sourceUrl: 'https://example.com/group', recruitmentChannels: [{ label: '集团招聘', type: '公司招聘官网', match: '公司专属', status: '可投递', url: 'https://jobs.example.com/', appliesToCompanyName: '示例集团', evidenceUrl: 'https://jobs.example.com/', verifiedAt: '2026-09-09' }], children: [{ id: 'child', name: '示例子公司', level: 2, sourceUrl: 'https://example.com/child', recruitmentChannels: [{ label: '子公司历史公告', type: '官方招聘公告', match: '单位已定位', status: '已截止', url: 'https://jobs.example.com/posting/1', appliesToCompanyName: '示例子公司', evidenceUrl: 'https://jobs.example.com/posting/1', verifiedAt: '2026-09-09' }, { label: '集团招聘入口', type: '集团通用入口', match: '集团兜底', status: '状态待确认', url: 'https://jobs.example.com/', evidenceUrl: 'https://jobs.example.com/', verifiedAt: '2026-09-09' }] }] }] }];
  const result = validateOwnershipCoverage(roots, []);
  assert.deepEqual(result, []);
});
