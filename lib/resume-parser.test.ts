import test from 'node:test';
import assert from 'node:assert/strict';
import { parseResumeText } from './resume-parser.ts';

test('从智能建造简历中提取核心画像和经历', () => {
  const result = parseResumeText(`
张三
电话：13812345678 邮箱：zhangsan@example.com
学校：湖北大学 专业：智能建造 学历：本科
求职意向：工程管理岗、BIM工程师
专业技能
熟练使用 Revit、AutoCAD、广联达和 Excel，了解数字孪生。
项目经历
智慧工地 BIM 协同项目，负责模型碰撞检查与施工进度分析。
实习经历
在示例建设集团项目部参与施工组织与工程管理。
荣誉奖项
英语四级、计算机二级。
自我评价
执行力强，善于跨专业沟通。
  `);
  assert.equal(result.profile.name, '张三');
  assert.equal(result.profile.school, '湖北大学');
  assert.equal(result.profile.major, '智能建造');
  assert.equal(result.profile.phone, '13812345678');
  assert.equal(result.profile.email, 'zhangsan@example.com');
  assert.deepEqual(result.profile.targetRoles, ['工程管理岗', 'BIM工程师']);
  assert.ok(result.profile.skills?.includes('Revit'));
  assert.match(result.profile.projectExperience ?? '', /智慧工地/);
  assert.equal(result.profile.internshipExperiences?.length, 1);
  assert.deepEqual(result.profile.certificates, ['英语四级', '计算机二级']);
  assert.deepEqual(result.profile.honorItems, []);
});

test('扫描版或空白 PDF 文本给出 OCR 提示', () => {
  const result = parseResumeText('个人简历');
  assert.ok(result.warnings.some((warning) => warning.includes('OCR')));
});

test('兼容 PDF.js 在中文字符间插入空格的简历文本', () => {
  const result = parseResumeText(`
陆 炜 涛
智 能 建 造
湖 北武 汉   18577118717   3089253016@qq.com   籍 贯 :   湖 北武 汉
个人 总结
智 能 建 造 专业本科 应 届 生。
教 育 经 历
武汉 轻 工大学
智 能 建 造
2023-09 - 2027-07
本科
实 习 经 历
甲 公司
测试 助 理
2026.08- 至今
武 汉
执行 功 能 测 试。
乙 公司
猎 头 顾 问
2026.04-2026.07
武汉
负责 简 历 筛 选。
丙 公司
运 营 助 理
2025-01 - 2026-02
负责 数 据 分 析。
项 目 经 历
全国大学生 创 新 创 业大 赛
项 目 负 责 人
2024.12-2025.12
学 术 成果 转 化 ： 论文发表于 中 文 核 心 期 刊。
荣 誉 及证 书
校奖 学金   校 优 秀 干 部   CET-4   全国 WPS 计 算 机 二级
出版物
《 测 试 论 文 》   2026.01
第 一 作者。
  `);
  assert.equal(result.profile.name, '陆炜涛');
  assert.equal(result.profile.school, '武汉轻工大学');
  assert.equal(result.profile.currentCity, '湖北武汉');
  assert.equal(result.profile.nativePlace, '湖北武汉');
  assert.equal(result.profile.internshipExperiences?.length, 3);
  assert.deepEqual(result.profile.certificates, ['CET-4', '全国WPS计算机二级']);
  assert.deepEqual(result.profile.honorItems, ['校奖学金', '校优秀干部']);
  assert.match(result.profile.projectExperience ?? '', /学术成果转化/);
  assert.match(result.profile.publications?.[0] ?? '', /《测试论文》/);
});
