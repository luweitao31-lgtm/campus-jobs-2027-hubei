import test from 'node:test';
import assert from 'node:assert/strict';
import { alertReason, createRecruitmentAlert, monitorFingerprint, recruitmentSignals, unreadAlertsForEntity } from './alerts.ts';
import type { RecruitmentMonitorEntry } from './types.ts';

const makeEntry = (overrides: Partial<RecruitmentMonitorEntry> = {}): RecruitmentMonitorEntry => ({
  key: 'ownership:company-a', module: 'ownership', entityId: 'company-a', companyName: '示例公司', isOpen: true,
  fingerprint: 'same', signalCount: 1, channelLabel: '招聘入口', channelUrl: 'https://jobs.example.com/a',
  sourceUrl: 'https://jobs.example.com/a', checkedAt: '2026-09-11T00:00:00Z', ...overrides,
});

test('首次建立提醒基线且重复内容不触发提醒', () => {
  const current = makeEntry();
  assert.equal(alertReason(undefined, current), null);
  assert.equal(alertReason(current, current), null);
});

test('招聘开启、新公告和内容更新产生不同原因', () => {
  assert.equal(alertReason(makeEntry({ isOpen: false }), makeEntry()), '招聘已开启');
  assert.equal(alertReason(makeEntry(), makeEntry({ fingerprint: 'new', signalCount: 2 })), '新招聘公告');
  assert.equal(alertReason(makeEntry(), makeEntry({ fingerprint: 'changed', signalCount: 1 })), '招聘内容更新');
});

test('招聘信号忽略脚本并生成稳定指纹', () => {
  const html = '<script>示例公司2027届招聘</script><p>示例公司2027届校园招聘正式启动。</p>';
  const signals = recruitmentSignals(html, '示例公司');
  assert.deepEqual(signals, ['示例公司2027届校园招聘正式启动']);
  assert.equal(monitorFingerprint({ isOpen: true, channelUrl: 'https://example.com', signals }), monitorFingerprint({ isOpen: true, channelUrl: 'https://example.com', signals }));
});

test('已读状态按企业清除且新指纹会再次未读', () => {
  const first = createRecruitmentAlert(makeEntry({ fingerprint: 'v1' }), '新招聘公告', '2026-09-11T00:00:00Z');
  const second = createRecruitmentAlert(makeEntry({ fingerprint: 'v2' }), '招聘内容更新', '2026-09-12T00:00:00Z');
  assert.equal(unreadAlertsForEntity([first, second], new Set([first.id]), 'ownership', 'company-a').length, 1);
});
