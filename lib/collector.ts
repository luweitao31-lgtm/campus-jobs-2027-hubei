import { detectsHubei, detectsNational, inferRegionScope } from './region.ts';
import type { CompanyNature } from './types.ts';

export function cleanCollectedCompanyName(value: string): string {
  let cleaned = value.normalize('NFKC').replace(/^(?:武汉|湖北武汉|湖北)[丨|·:\s]+/, '').trim();
  const catalogPrefix = /^.+?\s+收录\s+20\d{2}[.-]\d{2}[.-]\d{2}\s+/;
  const fromCatalog = catalogPrefix.test(cleaned);
  cleaned = cleaned.replace(catalogPrefix, '');
  if (fromCatalog) {
    const legalName = cleaned.match(/^(.+?(?:有限责任公司|股份有限公司|有限公司))(?:\s|$)/)?.[1];
    if (legalName) cleaned = legalName;
    else {
      const parts = cleaned.split(/\s+/).filter(Boolean);
      if (parts.length > 1) {
        const last = parts.at(-1)!;
        const lastBase = last.replace(/[（(].*$/, '');
        cleaned = lastBase === parts[0] ? parts[0] : last.startsWith(parts[0]) && last.length > parts[0].length ? last : parts[0];
      }
    }
  }
  cleaned = cleaned.replace(/启动$/, '');
  cleaned = cleaned.replace(/[,，]\s*[A-Za-z][A-Za-z\s.-]*$/, '').replace(/([\u4e00-\u9fff])\s+[A-Z][A-Z\s-]{2,}$/, '$1');
  if (/^(?:大有可为|聚猛士|奔赴|逐梦|智启|职等你)/.test(cleaned) && /[丨|]/.test(cleaned)) cleaned = cleaned.split(/[丨|]/).at(-1)?.trim() ?? cleaned;
  return cleaned.replace(/^[\s·—-]+|[\s·—-]+$/g, '').trim();
}

export function normalizeCompanyName(value: string): string {
  return cleanCollectedCompanyName(value)
    .normalize('NFKC')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[\s·•—-]+/g, '')
    .replace(/有限责任公司$|股份有限公司$|有限公司$/g, '')
    .toLowerCase();
}

export function detectsCohort2027(value: string): boolean {
  return /2027\s*届|2027\s*年(?:度)?(?:联合)?(?:秋季|校园|校招|应届)/i.test(value.normalize('NFKC'));
}

export { detectsHubei, detectsNational, inferRegionScope };

export function uniqueByNormalizedName<T extends { name: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = normalizeCompanyName(row.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type CollectableSource = {
  id: string;
  url: string;
  name?: string;
  role?: 'discovery' | 'verification';
  parser?: 'jobup-table' | 'jsonld-itemlist' | 'anchor-list' | 'source-company';
  locationScope?: string[];
  companyName?: string;
  nature?: CompanyNature;
};

export type CandidateLead = {
  companyName: string;
  title: string;
  sourceId: string;
  sourceUrl: string;
  channelUrl?: string;
  publishedAt?: string;
  locations: string[];
  natureHint?: CompanyNature;
  applicationDeadline?: string;
  deadlineNote?: string;
};

const privateCompanyNames = /^(?:百度|贝壳|滴滴|奔图科技|碧桂园服务|海大集团|好未来学而思励步|恒安集团|恒生电子|华为数字能源|金发科技|精智达|九阳|快手|零跑汽车|拼多多|神州信息|水羊|水羊集团|伟京电子|未岚大陆|小红书|小米集团|晓鸣股份|携程集团|新东方华南区|信也科技|元琛科技|自变量机器人|最右|FunPlus|vivo|DolphinDB智臾科技|GBASE南大通用|紫光青藤|众安保险|字节跳动)$/i;
const foreignCompanyAliases = [
  'ABB', '埃森哲', 'Accenture', '阿迪达斯', 'adidas', '亚马逊', 'Amazon', '苹果', 'Apple',
  '阿斯利康', 'AstraZeneca', '巴斯夫', 'BASF', '拜耳', 'Bayer', '宝马', 'BMW', '博世', '博世中国', 'Bosch',
  'BURBERRY博柏利', '博柏利', 'Burberry', '嘉吉', 'Cargill', '思科', 'Cisco', '可口可乐', 'Coca-Cola',
  '戴尔', 'Dell', '德勤', 'Deloitte', '陶氏', 'Dow', '安永', 'EY', '爱立信', 'Ericsson',
  '通用电气', 'GE', '葛兰素史克', 'GSK', '谷歌', 'Google', '汉高', 'Henkel', '惠普', 'HP',
  '汇丰', 'HSBC', 'IBM', '宜家', 'IKEA', '英特尔', 'Intel', '强生', 'Johnson & Johnson',
  '毕马威', 'KPMG', '欧莱雅', "L'Oreal", '玛氏', 'Mars', '默沙东', 'MSD', '微软', 'Microsoft',
  '雀巢', 'Nestle', '耐克', 'Nike', '诺华', 'Novartis', '英伟达', 'NVIDIA', '甲骨文', 'Oracle',
  '百事', 'PepsiCo', '辉瑞', 'Pfizer', '普华永道', 'PwC', '宝洁', 'P&G', '罗氏', 'Roche',
  '三星', '三星显示', 'Samsung', '施耐德电气', 'Schneider Electric', '西门子', 'Siemens',
  '索尼', 'Sony', '渣打', 'Standard Chartered', '特斯拉', 'Tesla', '联合利华', 'Unilever',
  '大众汽车', 'Volkswagen', '沃尔沃', 'Volvo', '沃尔玛', 'Walmart', '赛诺菲', 'Sanofi',
].map(normalizeCompanyName);
const foreignCompanyNames = new Set(foreignCompanyAliases);
const foreignLegalNamePrefixes = /^(?:德勤|安永|毕马威|普华永道|博世|西门子|施耐德电气|联合利华|宝洁|欧莱雅|雀巢|玛氏|默沙东|辉瑞|罗氏|诺华|赛诺菲|巴斯夫|拜耳|英特尔|微软|亚马逊|三星|宝马|大众汽车|沃尔沃|特斯拉|宜家|沃尔玛)/i;

export function inferCollectedCompanyNature(rawText: string, companyName: string): '外企' | '民营企业' | '性质待确认' {
  const normalizedName = normalizeCompanyName(companyName);
  if (/(?:^|\s)外企(?:\s|$)/.test(rawText) || foreignCompanyNames.has(normalizedName) || foreignLegalNamePrefixes.test(normalizedName)) return '外企';
  if (/(?:^|\s)民企(?:\s|$)/.test(rawText) || privateCompanyNames.test(companyName)) return '民营企业';
  return '性质待确认';
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function cleanText(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ').replace(/\\[nrt]/g, ' ').replace(/\\"/g, '"'))
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value || /^(?:javascript:|#)/i.test(value)) return undefined;
  try {
    return new URL(decodeHtml(value.replace(/\\u0026/g, '&').replace(/\\\//g, '/')), baseUrl).toString();
  } catch {
    return undefined;
  }
}

function inferLocations(value: string, fallback: string[] = []): string[] {
  const locations = new Set(fallback);
  if (/武汉/.test(value)) locations.add('湖北武汉');
  if (detectsHubei(value)) locations.add('湖北全省');
  if (/全国|多地|各地/.test(value)) locations.add('全国');
  for (const city of ['北京', '上海', '广州', '深圳', '天津', '重庆', '杭州', '南京', '苏州', '成都', '武汉', '襄阳', '宜昌', '十堰', '荆州', '黄石', '西安', '大连', '青岛', '厦门', '宁波', '长沙', '郑州', '合肥', '沈阳', '哈尔滨']) {
    if (value.includes(city)) locations.add(city);
  }
  return [...locations];
}

function companyFromTitle(value: string): string {
  return cleanText(value)
    .replace(/^\d{1,2}月\s*\d{1,2}日\s*/, '')
    .replace(/[｜|].*$/, '')
    .replace(/(?:2027|27)\s*届?.*$/, '')
    .replace(/(?:秋季|春季)?校园招聘.*$/, '')
    .replace(/(?:秋招|春招|校招|实习生招聘|招聘简章|招聘公告).*$/, '')
    .replace(/[：:·—-]+$/, '')
    .trim();
}

export function extractJobupLeads(html: string, source: CollectableSource): CandidateLead[] {
  const matches = [
    ...html.matchAll(/<strong[^>]*class="company-name"[^>]*title="([^"]+)"[^>]*>/gi),
    ...html.matchAll(/className\\?":\\?"company-name\\?",\\?"title\\?":\\?"([^"\\]+)["\\]/gi),
  ];
  return matches.flatMap((match) => {
    const rawCompanyName = cleanText(match[1]);
    const companyName = cleanCollectedCompanyName(rawCompanyName);
    if (!companyName || companyName.length > 80) return [];
    const start = match.index ?? 0;
    const context = html.slice(Math.max(0, start - 500), start + 3600);
    if (!/(?:2027\s*届|27\s*秋招|2027\s*校园)/i.test(cleanText(context))) return [];
    const titles = [...context.matchAll(/class="table-clamp[^"']*"[^>]*title="([^"]+)"/gi)].map((item) => cleanText(item[1]));
    const date = context.match(/(?:dateTime|title)="(20\d{2}-\d{2}-\d{2})"/i)?.[1]
      ?? context.match(/(?:dateTime|title)\\?":\\?"(20\d{2}-\d{2}-\d{2})/i)?.[1];
    return [{
      companyName,
      title: `${companyName}2027届校园招聘`,
      sourceId: source.id,
      sourceUrl: source.url,
      publishedAt: date,
      locations: inferLocations(titles.slice(0, 5).join(' '), source.locationScope),
      natureHint: source.nature ?? inferCollectedCompanyNature(rawCompanyName, companyName),
    }];
  });
}

export function extractJsonLdLeads(html: string, source: CollectableSource): CandidateLead[] {
  const leads: CandidateLead[] = [];
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const payload = JSON.parse(decodeHtml(match[1]));
      const graph = Array.isArray(payload?.['@graph']) ? payload['@graph'] : [payload];
      for (const list of graph.filter((item: { '@type'?: string }) => item?.['@type'] === 'ItemList')) {
        for (const entry of list.itemListElement ?? []) {
          const item = entry.item ?? entry;
          const title = cleanText(item.name ?? entry.name ?? '');
          const companyName = cleanCollectedCompanyName(companyFromTitle(title));
          if (!companyName || !detectsCohort2027(title)) continue;
          leads.push({ companyName, title, sourceId: source.id, sourceUrl: source.url, channelUrl: absoluteUrl(item.url ?? entry.url, source.url), locations: inferLocations(`${title} ${item.description ?? ''}`, source.locationScope), natureHint: source.nature ?? inferCollectedCompanyNature(title, companyName) });
        }
      }
    } catch {
      // Invalid JSON-LD is ignored; the source health result still records the page.
    }
  }
  return leads;
}

export function extractAnchorLeads(html: string, source: CollectableSource): CandidateLead[] {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].flatMap((match) => {
    const title = cleanText(match[2]);
    const companyName = cleanCollectedCompanyName(companyFromTitle(title));
    const channelUrl = absoluteUrl(match[1], source.url);
    if (!channelUrl || !detectsCohort2027(title) || /双选会|招聘会|就业服务攻坚|招聘活动/.test(title) || companyName.length < 2 || companyName.length > 80) return [];
    return [{ companyName, title, sourceId: source.id, sourceUrl: source.url, channelUrl, locations: inferLocations(title, source.locationScope), natureHint: source.nature ?? inferCollectedCompanyNature(title, companyName) }];
  });
}

export function extractSourceCompanyLead(html: string, source: CollectableSource): CandidateLead[] {
  if (!source.companyName || !detectsCohort2027(cleanText(html))) return [];
  return [{
    companyName: source.companyName,
    title: `${source.companyName}2027届校园招聘`,
    sourceId: source.id,
    sourceUrl: source.url,
    channelUrl: source.url,
    locations: source.locationScope ?? ['全国'],
    natureHint: source.nature ?? '性质待确认',
  }];
}

export function extractRecruitmentLeads(html: string, source: CollectableSource): CandidateLead[] {
  if (source.parser === 'source-company') return extractSourceCompanyLead(html, source);
  if (source.parser === 'jobup-table') return extractJobupLeads(html, source);
  if (source.parser === 'jsonld-itemlist') return [...extractJsonLdLeads(html, source), ...extractAnchorLeads(html, source)];
  return extractAnchorLeads(html, source);
}

export function mergeCandidateLeads(rows: CandidateLead[]): Array<CandidateLead & { sourceIds: string[]; sourceUrls: string[] }> {
  const merged = new Map<string, CandidateLead & { sourceIds: string[]; sourceUrls: string[] }>();
  for (const row of rows) {
    const key = normalizeCompanyName(row.companyName);
    if (!key) continue;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, { ...row, sourceIds: [row.sourceId], sourceUrls: [row.sourceUrl] });
      continue;
    }
    current.sourceIds = [...new Set([...current.sourceIds, row.sourceId])];
    current.sourceUrls = [...new Set([...current.sourceUrls, row.sourceUrl])];
    current.locations = [...new Set([...current.locations, ...row.locations])];
    current.channelUrl ??= row.channelUrl;
    current.publishedAt ??= row.publishedAt;
    current.applicationDeadline ??= row.applicationDeadline;
    current.deadlineNote ??= row.deadlineNote;
    if (current.natureHint === '性质待确认' && row.natureHint !== '性质待确认') current.natureHint = row.natureHint;
  }
  return [...merged.values()];
}

export type TreeLike = {
  id: string;
  name?: string;
  level?: number;
  entityKind?: string;
  coverageSetId?: string;
  verificationStatus?: string;
  verifiedAt?: string;
  recruitmentChannels?: OwnershipRecruitmentChannelLike[];
  unifiedSocialCreditCode?: string;
  registeredLocation?: string;
  sourceUrl?: string;
  children?: TreeLike[];
};

export type OwnershipRecruitmentChannelLike = {
  label?: string;
  type?: string;
  match?: string;
  status?: string;
  url?: string;
  appliesToCompanyName?: string;
  evidenceUrl?: string;
  verifiedAt?: string;
};

export type CoverageLike = {
  id: string;
  parentId: string;
  targetLevel: number;
  officialDisclosedTotal: number | null;
  expectedNodeIds: string[];
  pendingNodeIds: string[];
  completenessStatus: string;
  sourceUrls: string[];
};

export type OwnershipEvidenceLike = { id: string; sourceType: string };
export type OwnershipEdgeLike = { parentId: string; childId: string; evidenceIds: string[]; verificationStatus: string };

export function validateOwnershipTree(root: TreeLike): string[] {
  const errors: string[] = [];
  const path = new Set<string>();
  const ids = new Set<string>();
  const visit = (node: TreeLike, parent?: TreeLike) => {
    if (!node.id) errors.push('存在缺少 id 的节点');
    if (!node.sourceUrl) errors.push(`${node.id || '未知节点'} 缺少来源`);
    if (ids.has(node.id)) errors.push(`${node.id} 重复出现`);
    ids.add(node.id);
    if (parent?.level !== undefined && node.level !== undefined && node.level !== parent.level + 1) errors.push(`${node.id} 层级与父节点不连续`);
    if (path.has(node.id)) {
      errors.push(`${node.id} 形成循环`);
      return;
    }
    path.add(node.id);
    node.children?.forEach((child) => visit(child, node));
    path.delete(node.id);
  };
  visit(root);
  return errors;
}

export function flattenOwnershipTrees(roots: TreeLike[]): TreeLike[] {
  return roots.flatMap((root) => [root, ...flattenOwnershipTrees(root.children ?? [])]);
}

export function validateOwnershipCoverage(roots: TreeLike[], sets: CoverageLike[], edges: OwnershipEdgeLike[] = [], evidence: OwnershipEvidenceLike[] = []): string[] {
  const errors: string[] = [];
  const nodes = flattenOwnershipTrees(roots);
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const parentMap = new Map<string, TreeLike>();
  const indexParents = (parent: TreeLike) => parent.children?.forEach((child) => { parentMap.set(child.id, parent); indexParents(child); });
  roots.forEach(indexParents);
  const names = new Set<string>();
  for (const node of nodes) {
    const normalizedName = node.name ? normalizeCompanyName(node.name) : '';
    if (normalizedName && names.has(normalizedName)) errors.push(`${node.name} 名称重复`);
    if (normalizedName) names.add(normalizedName);
    if (node.entityKind === '分支机构') errors.push(`${node.id} 分支机构不能计入法律控制树`);
    const needsMainlandCreditCode = node.registeredLocation !== '香港';
    if ((node.level ?? 0) >= 3 && node.verificationStatus === '已核验' && node.entityKind !== '监管机构' && ((!node.unifiedSocialCreditCode && needsMainlandCreditCode) || !node.registeredLocation)) errors.push(`${node.id} 已核验深层法人缺少统一社会信用代码或注册地`);
    if ((node.level ?? 0) > 0 && !node.recruitmentChannels?.length) errors.push(`${node.id} 缺少招聘渠道状态`);
    for (const channel of node.recruitmentChannels ?? []) {
      if (!channel.label || !channel.type || !channel.match || !channel.status || !channel.verifiedAt) errors.push(`${node.id} 招聘渠道字段不完整`);
      if (channel.match === '暂无公开入口') {
        if (channel.url || channel.status !== '暂无公开入口' || channel.type !== '无公开渠道') errors.push(`${node.id} 暂无入口状态与链接不一致`);
        continue;
      }
      if (!channel.url || !channel.url.startsWith('https://')) errors.push(`${node.id} 招聘渠道不是有效 HTTPS 链接`);
      if ((channel.match === '公司专属' || channel.match === '单位已定位') && (!channel.evidenceUrl || channel.appliesToCompanyName !== node.name)) errors.push(`${node.id} 专属招聘渠道缺少公司归属证据`);
      if (channel.match === '集团兜底' && channel.type !== '集团通用入口') errors.push(`${node.id} 集团兜底渠道类型错误`);
      const parent = parentMap.get(node.id);
      const parentUrls = new Set(parent?.recruitmentChannels?.map((item) => item.url).filter(Boolean));
      if (channel.url && parentUrls.has(channel.url) && channel.match === '公司专属') errors.push(`${node.id} 公司专属招聘链接与母公司完全相同`);
    }
  }
  for (const set of sets) {
    const parent = nodeMap.get(set.parentId);
    if (!parent) {
      errors.push(`${set.id} 缺少父节点`);
      continue;
    }
    if (set.completenessStatus === '官方清单已闭合' && (set.officialDisclosedTotal !== set.expectedNodeIds.length || set.pendingNodeIds.length)) errors.push(`${set.id} 闭合状态与清单不一致`);
    if (!set.sourceUrls.length) errors.push(`${set.id} 缺少覆盖来源`);
    const actualIds = (parent.children ?? []).filter((node) => node.coverageSetId === set.id).map((node) => node.id).sort();
    const listedIds = [...set.expectedNodeIds, ...set.pendingNodeIds].sort();
    if (actualIds.join('|') !== listedIds.join('|')) errors.push(`${set.id} 节点与覆盖清单不一致`);
    for (const id of listedIds) {
      const node = nodeMap.get(id);
      if (!node) {
        errors.push(`${set.id} 缺少节点 ${id}`);
        continue;
      }
      if (node.level !== set.targetLevel) errors.push(`${id} 不是目标层级主体`);
      if (set.expectedNodeIds.includes(id) && node.verificationStatus !== '已核验') errors.push(`${id} 尚未核验`);
      if (set.pendingNodeIds.includes(id) && node.verificationStatus !== '待确认') errors.push(`${id} 应标记待确认`);
      if (!node.verifiedAt || !node.sourceUrl || !node.recruitmentChannels?.length) errors.push(`${id} 缺少核验日期、证据或招聘渠道状态`);
    }
  }
  const evidenceMap = new Map(evidence.map((item) => [item.id, item]));
  if (edges.length) {
    const incoming = new Map<string, number>();
    for (const edge of edges) {
      const parent = nodeMap.get(edge.parentId);
      const child = nodeMap.get(edge.childId);
      if (!parent || !child) { errors.push(`${edge.parentId}→${edge.childId} 缺少节点`); continue; }
      if ((parent.level ?? -1) + 1 !== child.level) errors.push(`${edge.childId} 所有权边层级不连续`);
      incoming.set(edge.childId, (incoming.get(edge.childId) ?? 0) + 1);
      if (!edge.evidenceIds.length || edge.evidenceIds.some((id) => !evidenceMap.has(id))) errors.push(`${edge.childId} 缺少有效关系证据`);
      if (edge.verificationStatus === '已核验' && edge.evidenceIds.every((id) => evidenceMap.get(id)?.sourceType === '招聘公告')) errors.push(`${edge.childId} 不能仅用招聘公告证明控制关系`);
    }
    for (const node of nodes.filter((item) => item.level !== 0)) if (incoming.get(node.id) !== 1) errors.push(`${node.id} 必须且只能有一条直接父边`);
    for (const node of nodes.filter((item) => (item.level ?? 0) >= 2 && item.children?.length)) {
      if (!sets.some((set) => set.parentId === node.id && set.targetLevel === (node.level ?? 0) + 1)) errors.push(`${node.id} 缺少直属子公司覆盖清单`);
    }
  }
  return errors;
}

export function treeDepth(root: TreeLike): number {
  return 1 + Math.max(0, ...(root.children ?? []).map(treeDepth));
}
