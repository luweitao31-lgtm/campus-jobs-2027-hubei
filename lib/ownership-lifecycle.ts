import type { HiringUnit, OwnershipNode, RecruitmentOpening } from './types.ts';

export const UNKNOWN_DEADLINE_RECHECK_DAYS = 7;

export function shanghaiToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function ageInDays(verifiedAt: string, today: string): number {
  const start = Date.parse(`${verifiedAt}T00:00:00+08:00`);
  const end = Date.parse(`${today}T00:00:00+08:00`);
  return Math.floor((end - start) / 86_400_000);
}

export function openingRetirementReason(opening: RecruitmentOpening, today: string): string | null {
  if (opening.cohort !== 2027 || opening.status !== '开放中') return '非开放的2027届岗位';
  if (!/^https:\/\//.test(opening.officialUrl)) return '缺少安全的投递链接';
  if (!opening.legalEntityId) return '缺少对应法人节点';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opening.verifiedAt)) return '缺少有效核验日期';
  if (/^\d{4}-\d{2}-\d{2}$/.test(opening.deadline)) return opening.deadline < today ? '投递截止日期已过' : null;
  if (opening.deadline !== '未披露') return '截止日期格式无效';
  const age = ageInDays(opening.verifiedAt, today);
  if (!Number.isFinite(age) || age < 0 || age > UNKNOWN_DEADLINE_RECHECK_DAYS) return '截止日未披露且超过7天未复核';
  return null;
}

export function activeOwnershipData(trees: OwnershipNode[], openings: RecruitmentOpening[], units: HiringUnit[], today: string) {
  const nodeIds = new Set(flatten(trees).map((node) => node.id));
  const unitIds = new Set(units.map((unit) => unit.id));
  const retired = openings.flatMap((opening) => {
    const reason = openingRetirementReason(opening, today)
      ?? (!unitIds.has(opening.hiringUnitId) || !nodeIds.has(opening.legalEntityId!) ? '用人单位或法人节点不存在' : null);
    return reason ? [{ openingId: opening.id, reason }] : [];
  });
  const retiredIds = new Set(retired.map((item) => item.openingId));
  const activeOpenings = openings.filter((opening) => !retiredIds.has(opening.id));
  const activeLegalIds = new Set(activeOpenings.map((opening) => opening.legalEntityId));
  const prune = (node: OwnershipNode): OwnershipNode | null => {
    const children = (node.children ?? []).map(prune).filter((child): child is OwnershipNode => child !== null);
    if (!activeLegalIds.has(node.id) && !children.length) return null;
    const activeUrls = new Set(activeOpenings.filter((opening) => opening.legalEntityId === node.id).map((opening) => opening.officialUrl));
    return { ...node, children, recruitmentChannels: node.recruitmentChannels.filter((channel) => channel.url && activeUrls.has(channel.url)) };
  };
  const activeTrees = trees.map(prune).filter((node): node is OwnershipNode => node !== null);
  const activeUnitIds = new Set(activeOpenings.map((opening) => opening.hiringUnitId));
  return { activeTrees, activeOpenings, activeUnits: units.filter((unit) => activeUnitIds.has(unit.id)), retired };
}

function flatten(nodes: OwnershipNode[]): OwnershipNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
}

export function descendantApplications(node: OwnershipNode, openings: RecruitmentOpening[]): RecruitmentOpening[] {
  const descendants = new Set(flatten([node]).map((item) => item.id));
  return openings.filter((opening) => opening.legalEntityId && descendants.has(opening.legalEntityId));
}
