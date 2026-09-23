import assert from 'node:assert/strict';
import test from 'node:test';
import { activeOwnershipData, openingRetirementReason, shanghaiToday } from './ownership-lifecycle.ts';
import { hubeiHiringUnits, hubeiRecruitmentOpenings, ownershipTrees } from '../data/catalog.ts';

test('上海日期跨时区计算，截止日当天仍可展示', () => {
  assert.equal(shanghaiToday(new Date('2026-09-22T16:30:00Z')), '2026-09-23');
  const telecom = hubeiRecruitmentOpenings[0];
  assert.equal(openingRetirementReason(telecom, '2026-09-30'), null);
  assert.equal(openingRetirementReason(telecom, '2026-10-01'), '投递截止日期已过');
});

test('截止日未披露者七天未复核自动退出公开链', () => {
  const mobile = hubeiRecruitmentOpenings[1];
  assert.equal(openingRetirementReason(mobile, '2026-09-30'), null);
  assert.equal(openingRetirementReason(mobile, '2026-10-01'), '截止日未披露且超过7天未复核');
});

test('到期后清除整条无投递入口的公开链，但保留其他有效链', () => {
  const view = activeOwnershipData(ownershipTrees, hubeiRecruitmentOpenings, hubeiHiringUnits, '2026-10-01');
  assert.equal(view.activeOpenings.length, 0);
  assert.equal(view.activeUnits.length, 0);
  assert.equal(view.activeTrees.length, 0);
  assert.equal(view.retired.length, 2);
  const telecomOnly = activeOwnershipData(ownershipTrees, hubeiRecruitmentOpenings, hubeiHiringUnits, '2026-09-23');
  assert.equal(telecomOnly.activeOpenings.length, 2);
  assert.equal(telecomOnly.activeTrees[0].children?.length, 2);
});

test('无有效投递链接者不能进入公开链', () => {
  const openings = [{ ...hubeiRecruitmentOpenings[1], officialUrl: 'http://example.com' }];
  const view = activeOwnershipData(ownershipTrees, openings, hubeiHiringUnits, '2026-09-23');
  assert.equal(view.activeTrees.length, 0);
  assert.equal(view.retired[0].reason, '缺少安全的投递链接');
});
