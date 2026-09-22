import { normalizeCompanyName } from './collector.ts';
import type { RecruitmentAlert, RecruitmentAlertReason, RecruitmentMonitorEntry } from './types.ts';

export function stableAlertHash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

export function recruitmentSignals(html: string, companyName: string): string[] {
  const plain = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .normalize('NFKC');
  const companyTokens = [companyName, normalizeCompanyName(companyName)].filter((item) => item.length >= 2);
  const chunks = plain.split(/[。；;!?！？\n]/).map((item) => item.trim()).filter(Boolean);
  return [...new Set(chunks.filter((chunk) => /2027\s*届|2027\s*年|校园招聘|秋招|校招|招聘公告|招聘简章|开放申请|立即投递/.test(chunk)
    && (companyTokens.some((token) => chunk.includes(token)) || chunks.length < 8))
    .map((chunk) => chunk.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, '').slice(0, 360)))]
    .sort();
}

export function monitorFingerprint(input: { isOpen: boolean; channelUrl: string; signals: string[] }): string {
  return stableAlertHash(`${input.isOpen ? 'open' : 'closed'}|${input.channelUrl}|${input.signals.join('|')}`);
}

export function alertReason(previous: RecruitmentMonitorEntry | undefined, current: RecruitmentMonitorEntry): RecruitmentAlertReason | null {
  if (!previous || !current.isOpen) return null;
  if (!previous.isOpen && current.isOpen) return '招聘已开启';
  if (previous.fingerprint === current.fingerprint) return null;
  return current.signalCount > previous.signalCount ? '新招聘公告' : '招聘内容更新';
}

export function createRecruitmentAlert(current: RecruitmentMonitorEntry, reason: RecruitmentAlertReason, detectedAt: string): RecruitmentAlert {
  return {
    id: `alert-${stableAlertHash(`${current.key}|${current.fingerprint}`)}`,
    module: current.module,
    entityId: current.entityId,
    companyName: current.companyName,
    reason,
    channelLabel: current.channelLabel,
    channelUrl: current.channelUrl,
    sourceUrl: current.sourceUrl,
    detectedAt,
    fingerprint: current.fingerprint,
  };
}

export function unreadAlertsForEntity(alerts: RecruitmentAlert[], readIds: Set<string>, module: RecruitmentAlert['module'], entityId: string): RecruitmentAlert[] {
  return alerts.filter((alert) => alert.module === module && alert.entityId === entityId && !readIds.has(alert.id));
}
