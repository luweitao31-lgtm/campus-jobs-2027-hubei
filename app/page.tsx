'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BriefcaseBusiness, Building2, CalendarDays, ChevronRight,
  ExternalLink, FileCheck2, MapPin, Network, RefreshCw, Search, ShieldCheck,
  Globe2, Sparkles, Trophy,
} from 'lucide-react';
import { awards, companies, hubeiHiringUnits, hubeiRecruitmentOpenings, hubeiRecruitmentSnapshot, ownershipCoverageSets, ownershipEdges, ownershipTrees, sources } from '@/data/catalog';
import { regionConfig } from '@/lib/region';
import recruitmentDirectoryData from '@/data/recruitment-directory.json';
import recruitmentLeadReport from '@/data/recruitment-sync.json';
import recruitmentAlertData from '@/data/recruitment-alerts.json';
import sourceRegistry from '@/data/source-registry.json';
import type { OwnershipNode, RecruitmentAlert, RecruitmentDirectoryEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import { CareerDashboard } from '@/components/career-dashboard';

type ModuleId = 'strategy' | 'recruitment' | 'ownership' | 'employers' | 'foreign';
const recruitmentDirectory = recruitmentDirectoryData as { completedAt: string; baselineCount: number; totalCount: number; netNewCount: number; verifiedCount: number; pendingCount: number; hubeiCount: number; hubeiShare: number; foreignCount?: number; foreignVerifiedCount?: number; foreignOpenCount?: number; foreignNewCount?: number; foreignHubeiCount?: number; foreignHubeiShare?: number; entries: RecruitmentDirectoryEntry[] };
const foreignEntries = recruitmentDirectory.entries.filter((item) => item.nature === '外企');
const recruitmentAlerts = (recruitmentAlertData as { alerts: RecruitmentAlert[] }).alerts;
const alertStorageKey = 'ezhi-recruitment-alerts-read-v1';

function saveReadAlertIds(ids: Set<string>) {
  try {
    localStorage.setItem(alertStorageKey, JSON.stringify([...ids]));
  } catch {
    // Storage can be unavailable in private browsing or hardened browsers.
    // The in-memory state still clears the indicator for the current visit.
  }
}

const navigation = [
  { id: 'strategy' as const, index: '00', label: 'Offer 驾驶舱', description: '匹配、行动与投递闭环', stat: '每日精选 10 个', icon: Sparkles },
  { id: 'recruitment' as const, index: '01', label: '秋招情报组', description: '每日追踪 2027 届招聘入口', stat: `${recruitmentDirectory.totalCount} 家企业`, icon: BriefcaseBusiness },
  { id: 'ownership' as const, index: '02', label: '央国企链组', description: '沿法律控制关系逐级核验', stat: `${flattenTree(ownershipTrees).length} 个主体`, icon: Network },
  { id: 'employers' as const, index: '03', label: '最佳雇主组', description: '湖北关联重点雇主', stat: `${awards.length} 条记录`, icon: Trophy },
  { id: 'foreign' as const, index: '专题', label: '外企专题', description: '秋招情报组专题视图', stat: `${foreignEntries.length} 家企业`, icon: Globe2 },
];

const companyMap = new Map(companies.map((company) => [company.id, company]));
const sourceMap = new Map(sources.map((source) => [source.id, source]));
const activeCollectorSources = sourceRegistry.sources.filter((source) => source.collect);
const latestCollectionTime = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(recruitmentLeadReport.completedAt));

export default function Home() {
  const [activeModule, setActiveModule] = useState<ModuleId>('strategy');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState<string>(regionConfig.provinceLabel);
  const [status, setStatus] = useState('全部状态');
  const [nature, setNature] = useState('全部性质');
  const [sourceType, setSourceType] = useState('全部来源');
  const [page, setPage] = useState(1);
  const [readAlertIds, setReadAlertIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(alertStorageKey) ?? '[]');
      if (Array.isArray(saved)) setReadAlertIds(new Set(saved.filter((item): item is string => typeof item === 'string')));
    } catch {
      try {
        localStorage.removeItem(alertStorageKey);
      } catch {
        // Ignore unavailable browser storage and keep the default empty state.
      }
    }
  }, []);

  const unreadFor = (module: RecruitmentAlert['module'], entityId: string) => recruitmentAlerts.filter((alert) => alert.module === module && alert.entityId === entityId && !readAlertIds.has(alert.id));
  const markEntityRead = (module: RecruitmentAlert['module'], entityId: string) => {
    const ids = recruitmentAlerts.filter((alert) => alert.module === module && alert.entityId === entityId).map((alert) => alert.id);
    if (!ids.length) return;
    setReadAlertIds((current) => {
      const next = new Set([...current, ...ids]);
      saveReadAlertIds(next);
      return next;
    });
  };

  const filteredRecruitment = useMemo(() => recruitmentDirectory.entries.filter((item) => {
    const matchesQuery = item.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchesLocation = location === regionConfig.allLocationsLabel || item.locations.includes(location) || (location === regionConfig.provinceLabel && item.regionScope === '湖北省内') || (location === regionConfig.capital && item.locations.some((value) => value.includes(regionConfig.capital)));
    const matchesStatus = status === '全部状态' || item.status === status;
    const matchesNature = nature === '全部性质' || item.nature === nature;
    const matchesSource = sourceType === '全部来源' || (sourceType === '官方/政府' ? item.confidence === '已核验' : sourceType === '求职平台' ? item.channel.type === '第三方公告' : sourceType === '高校就业网' ? item.sourceIds.some((id) => id.includes('gxu') || sourceMap.get(id)?.sourceType === '高校就业网') : item.channel.type === '第三方汇总');
    return matchesQuery && matchesLocation && matchesStatus && matchesNature && matchesSource;
  }), [location, nature, query, sourceType, status]);
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filteredRecruitment.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedRecruitment = filteredRecruitment.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    const modelContext = (document as unknown as { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await modelContext.registerTool({
        name: 'filter_recruitment',
        title: '筛选秋招企业',
        description: '切换到秋招信息，并按企业名称或地点筛选可投递企业。',
        inputSchema: { type: 'object', properties: { query: { type: 'string' }, location: { type: 'string', enum: [regionConfig.provinceLabel, regionConfig.capital, regionConfig.nationalLabel, regionConfig.allLocationsLabel] } }, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input: unknown) => {
          if (!input || typeof input !== 'object') throw new Error('筛选条件必须是对象');
          const value = input as { query?: unknown; location?: unknown };
          if (value.query !== undefined && typeof value.query !== 'string') throw new Error('query 必须是字符串');
          if (value.location !== undefined && ![regionConfig.provinceLabel, regionConfig.capital, regionConfig.nationalLabel, regionConfig.allLocationsLabel].includes(String(value.location) as never)) throw new Error('不支持该地点');
          setActiveModule('recruitment');
          if (typeof value.query === 'string') setQuery(value.query);
          if (typeof value.location === 'string') setLocation(value.location);
          return { module: 'recruitment', query: value.query ?? query, location: value.location ?? location };
        },
      }, { signal: lifecycle.signal });
      await modelContext.registerTool({
        name: 'open_information_module',
        title: '打开信息模块',
        description: '打开Offer驾驶舱、秋招、央国企资金跟踪链、最佳雇主榜单或外企招聘。',
        inputSchema: { type: 'object', properties: { module: { type: 'string', enum: ['strategy', 'recruitment', 'ownership', 'employers', 'foreign'] } }, required: ['module'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input: unknown) => {
          const module = (input as { module?: unknown })?.module;
          if (!['strategy', 'recruitment', 'ownership', 'employers', 'foreign'].includes(String(module))) throw new Error('未知模块');
          setActiveModule(module as ModuleId);
          return { module };
        },
      }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [location, query]);

  return <SidebarProvider>
    <Sidebar className="border-r-0" collapsible="offcanvas">
      <SidebarHeader className="brand-panel px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/20"><Building2 className="size-5" /></div>
          <div><p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-cyan-200">{regionConfig.siteSubtitle}</p><h1 className="text-lg font-semibold tracking-tight text-white">{regionConfig.siteName}</h1></div>
        </div>
      </SidebarHeader>
      <SidebarContent className="brand-panel px-3 pb-2">
        <SidebarNavigation activeModule={activeModule} setActiveModule={setActiveModule} />
      </SidebarContent>
      <SidebarFooter className="brand-panel px-5 py-4"><div className="rounded-xl border border-white/10 bg-white/[0.045] p-3 text-xs leading-5 text-slate-400 shadow-inner shadow-black/10"><div className="mb-1 flex items-center gap-2 font-medium text-slate-200"><ShieldCheck className="size-4 text-cyan-300" /> 公开信息原则</div>只收录公开来源，不绕过登录与验证限制。</div></SidebarFooter>
    </Sidebar>
    <SidebarInset className="min-w-0 bg-[linear-gradient(180deg,#f7fafb_0%,#f2f6f7_100%)]">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 shadow-[0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl md:px-7">
        <div className="flex min-w-0 items-center gap-3"><SidebarTrigger className="md:hidden" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{navigation.find((item) => item.id === activeModule)?.label}</p><p className="hidden text-xs text-slate-500 sm:block">为湖北省 2027 届毕业生整理</p></div></div>
        <div className="flex items-center gap-2 text-xs text-slate-500"><RefreshCw className="size-3.5 text-cyan-700" /><span className="hidden sm:inline">最近采集</span><span className="font-medium text-slate-800">{latestCollectionTime}</span></div>
      </header>
      <div className="mx-auto w-full max-w-[1480px] p-4 md:p-7">
        <div key={activeModule} className="module-enter">
          {activeModule === 'strategy' && <CareerDashboard />}
          {activeModule === 'recruitment' && <RecruitmentPanel rows={pagedRecruitment} filteredCount={filteredRecruitment.length} page={safePage} pageCount={pageCount} setPage={setPage} query={query} setQuery={setQuery} location={location} setLocation={setLocation} status={status} setStatus={setStatus} nature={nature} setNature={setNature} sourceType={sourceType} setSourceType={setSourceType} />}
          {activeModule === 'ownership' && <OwnershipPanel unreadFor={unreadFor} markEntityRead={markEntityRead} />}
          {activeModule === 'employers' && <EmployerPanel unreadFor={unreadFor} markEntityRead={markEntityRead} />}
          {activeModule === 'foreign' && <ForeignPanel />}
        </div>
      </div>
    </SidebarInset>
  </SidebarProvider>;
}

function SidebarNavigation({ activeModule, setActiveModule }: { activeModule: ModuleId; setActiveModule: (module: ModuleId) => void }) {
  const { setOpenMobile } = useSidebar();
  return <SidebarGroup className="h-full min-h-0 p-0"><SidebarGroupContent className="h-full"><SidebarMenu className="grid h-auto gap-2.5">
    {navigation.map((item) => <SidebarMenuItem key={item.id} className="min-h-0"><SidebarMenuButton
      className="group/nav relative h-[104px] items-stretch overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-0 text-slate-200 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-cyan-200/25 hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300 data-active:border-cyan-200/70 data-active:bg-gradient-to-br data-active:from-cyan-200 data-active:to-cyan-300 data-active:text-slate-950 data-active:shadow-[0_14px_30px_rgba(34,211,238,0.17)]"
      isActive={activeModule === item.id}
      onClick={() => { setActiveModule(item.id); setOpenMobile(false); }}
    >
      <div className="flex h-full w-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3"><span className="text-[0.65rem] font-bold tracking-[0.2em] text-cyan-200/70 transition-transform duration-300 group-hover/nav:translate-x-0.5 group-data-active/nav:text-slate-700">{item.index}</span><span className="nav-icon flex size-9 items-center justify-center rounded-xl bg-white/8 text-cyan-200 ring-1 ring-white/10 group-data-active/nav:bg-slate-950/10 group-data-active/nav:text-slate-950 group-data-active/nav:ring-slate-950/10"><item.icon className="size-[1.1rem]" /></span></div>
        <div><strong className="block text-sm leading-5">{item.label}</strong><span className="mt-1 block text-[0.7rem] leading-4 text-slate-400 group-data-active/nav:text-slate-700">{item.description}</span><span className="nav-stat mt-2 inline-flex rounded-full bg-white/8 px-2 py-0.5 text-[0.65rem] font-medium text-cyan-100 group-data-active/nav:bg-slate-950/10 group-data-active/nav:text-slate-800">{item.stat}</span></div>
      </div>
    </SidebarMenuButton></SidebarMenuItem>)}
  </SidebarMenu></SidebarGroupContent></SidebarGroup>;
}

function RecruitmentPanel(props: {
  rows: RecruitmentDirectoryEntry[]; filteredCount: number; page: number; pageCount: number; setPage: (v: number) => void; query: string; setQuery: (v: string) => void;
  location: string; setLocation: (v: string) => void; status: string; setStatus: (v: string) => void;
  nature: string; setNature: (v: string) => void; sourceType: string; setSourceType: (v: string) => void;
}) {
  const { rows, filteredCount, page, pageCount, setPage, query, setQuery, location, setLocation, status, setStatus, nature, setNature, sourceType, setSourceType } = props;
  return <section aria-labelledby="recruitment-title">
    <div className="module-hero group/hero mb-5 flex flex-col justify-between gap-5 overflow-hidden rounded-3xl border border-cyan-900/10 p-5 shadow-sm md:p-6 lg:flex-row lg:items-end">
      <div className="relative z-10 flex items-start gap-4"><div className="hero-icon hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800 ring-1 ring-cyan-800/10 sm:flex"><BriefcaseBusiness className="size-6" /></div><div><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-800"><span className="inline-block size-2 rounded-full bg-cyan-500 shadow-[0_0_0_4px_rgba(6,182,212,0.1)]" />2027 届秋招进行中</div><h2 id="recruitment-title" className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">先看湖北，再看全国</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">只整理湖北省内与全国可投企业，优先展示湖北机会。</p></div></div>
      <div className="relative z-10 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"><Metric value={String(recruitmentDirectory.totalCount)} label="已收集企业" /><Metric value={String(recruitmentDirectory.verifiedCount)} label="已核验" /><Metric value={String(recruitmentDirectory.pendingCount)} label="待确认" warning /><Metric value={`+${recruitmentDirectory.netNewCount}`} label="首次新增" /><Metric value={`${Math.round(recruitmentDirectory.hubeiShare * 100)}%`} label="湖北占比" /></div>
    </div>
    <Card className="mb-4 border-0 bg-slate-950 text-white shadow-sm ring-0"><CardContent className="space-y-3 p-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold">每日湖北优先采集</p><p className="mt-1 text-xs text-slate-400">已登记 {recruitmentLeadReport.counters.sourceCount} 个公开来源；每日有效新增中，湖北线索不得低于 70%。</p></div><div className="flex flex-wrap gap-2"><Badge className="w-fit border-0 bg-white/10 text-slate-100">湖北 {recruitmentLeadReport.counters.hubeiLeads}/{recruitmentLeadReport.counters.qualifiedLeads} · {recruitmentLeadReport.counters.qualifiedLeads ? Math.round(recruitmentLeadReport.counters.hubeiLeads / recruitmentLeadReport.counters.qualifiedLeads * 100) : 0}%</Badge><Badge className={recruitmentLeadReport.targetMet ? 'w-fit border-0 bg-cyan-300 text-slate-950' : 'w-fit border-0 bg-amber-300 text-slate-950'}>{recruitmentLeadReport.targetMet ? '今日达标' : '等待采集'} · {recruitmentLeadReport.counters.qualifiedLeads}/{recruitmentLeadReport.target}</Badge></div></div>
      <Progress value={Math.min(100, (recruitmentLeadReport.counters.qualifiedLeads / recruitmentLeadReport.target) * 100)} className="h-1.5 bg-white/10" />
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">{activeCollectorSources.slice(0, 8).map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-cyan-300">{source.name}<ExternalLink className="ml-1 inline size-3" /></a>)}<span className="text-slate-500">等 {activeCollectorSources.length} 个采集入口</span></div>
    </CardContent></Card>
    <Card className="filter-panel mb-4 border-0 bg-white/90 shadow-sm shadow-slate-200/60 ring-1 ring-slate-200/80"><CardContent className="grid gap-3 py-1 sm:grid-cols-2 xl:grid-cols-[minmax(230px,1fr)_160px_140px_160px_140px]">
      <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input aria-label="搜索企业" className="h-10 pl-9" placeholder="搜索企业名称" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      <FilterSelect label="地点筛选" value={location} setValue={setLocation} options={[regionConfig.provinceLabel, regionConfig.capital, regionConfig.nationalLabel, regionConfig.allLocationsLabel]} />
      <FilterSelect label="招聘状态" value={status} setValue={setStatus} options={['全部状态', '开放中', '待确认', '已结束']} />
      <FilterSelect label="企业性质" value={nature} setValue={setNature} options={['全部性质', '中央企业', '央企子公司', '湖北省属国企', '武汉市属国企', '湖北地市国企', '国有控股', '股份制银行', '民营企业', '外企', '性质待确认']} />
      <FilterSelect label="信息来源" value={sourceType} setValue={setSourceType} options={['全部来源', '官方/政府', '求职平台', '高校就业网', '聚合平台']} />
    </CardContent></Card>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>总库 <strong className="text-slate-800">{recruitmentDirectory.totalCount}</strong> 家 · 当前筛选 <strong className="text-slate-800">{filteredCount}</strong> 家</span><span>聚合平台记录标记为待确认，开放状态以核验来源为准。</span></div>
    <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{rows.length ? rows.map((item, index) => <RecruitmentCard key={item.id} item={item} index={index} />) : <div className="sm:col-span-2 xl:col-span-3 2xl:col-span-4"><EmptyState /></div>}</div>
    {filteredCount > 0 && <Pagination className="mt-6"><PaginationContent><PaginationItem><PaginationPrevious href="#recruitment-title" text="上一页" aria-disabled={page === 1} className={page === 1 ? 'pointer-events-none opacity-40' : ''} onClick={(event) => { event.preventDefault(); setPage(Math.max(1, page - 1)); }} /></PaginationItem><PaginationItem><span className="px-3 text-sm text-slate-600">第 {page} / {pageCount} 页</span></PaginationItem><PaginationItem><PaginationNext href="#recruitment-title" text="下一页" aria-disabled={page === pageCount} className={page === pageCount ? 'pointer-events-none opacity-40' : ''} onClick={(event) => { event.preventDefault(); setPage(Math.min(pageCount, page + 1)); }} /></PaginationItem></PaginationContent></Pagination>}
  </section>;
}

function ForeignPanel() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('全部地区');
  const [status, setStatus] = useState('全部状态');
  const [sourceType, setSourceType] = useState('全部来源');
  const [page, setPage] = useState(1);
  const locations = useMemo(() => [...new Set(foreignEntries.flatMap((item) => item.locations))].sort((a, b) => a.localeCompare(b, 'zh-CN')), []);
  const rows = useMemo(() => foreignEntries.filter((item) => {
    const official = !['第三方公告', '第三方汇总'].includes(item.channel.type);
    return item.name.toLowerCase().includes(query.trim().toLowerCase())
      && (location === '全部地区' || item.locations.includes(location))
      && (status === '全部状态' || item.status === status)
      && (sourceType === '全部来源' || (sourceType === '官方入口' ? official : !official));
  }).sort((left, right) => Number(right.status === '开放中') - Number(left.status === '开放中')
    || Number(right.confidence === '已核验') - Number(left.confidence === '已核验')
    || right.lastVerifiedAt.localeCompare(left.lastVerifiedAt)
    || left.name.localeCompare(right.name, 'zh-CN')), [location, query, sourceType, status]);
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const openCount = recruitmentDirectory.foreignOpenCount ?? foreignEntries.filter((item) => item.status === '开放中').length;
  const verifiedCount = recruitmentDirectory.foreignVerifiedCount ?? foreignEntries.filter((item) => item.confidence === '已核验').length;
  const newCount = recruitmentDirectory.foreignNewCount ?? foreignEntries.filter((item) => item.isFirstExpansion).length;
  return <section aria-labelledby="foreign-title">
    <div className="module-hero group/hero mb-5 flex flex-col justify-between gap-5 overflow-hidden rounded-3xl border border-cyan-900/10 p-5 shadow-sm md:p-6 lg:flex-row lg:items-end">
      <div className="relative z-10 flex items-start gap-4"><div className="hero-icon hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800 ring-1 ring-cyan-800/10 sm:flex"><Globe2 className="size-6" /></div><div><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-800"><span className="inline-block size-2 rounded-full bg-cyan-500 shadow-[0_0_0_4px_rgba(6,182,212,0.1)]" />湖北优先 · 全国可投</div><h2 id="foreign-title" className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">外企 2027 届招聘导航</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">湖北关联外企占比不低于 70%；未确认 2027 招聘状态时保持待确认。</p></div></div>
      <div className="relative z-10 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"><Metric value={String(foreignEntries.length)} label="外企总数" /><Metric value={String(openCount)} label="开放中" /><Metric value={String(verifiedCount)} label="已核验" /><Metric value={`+${newCount}`} label="首次新增" /><Metric value={`${Math.round((recruitmentDirectory.foreignHubeiShare ?? 0) * 100)}%`} label="湖北占比" /></div>
    </div>
    <Card className="filter-panel mb-4 border-0 bg-white/90 shadow-sm shadow-slate-200/60 ring-1 ring-slate-200/80"><CardContent className="grid gap-3 py-1 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_180px_160px_160px]">
      <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input aria-label="搜索外企" className="h-10 pl-9" placeholder="搜索中英文企业名称" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></div>
      <FilterSelect label="工作地点" value={location} setValue={(value) => { setLocation(value); setPage(1); }} options={['全部地区', ...locations]} />
      <FilterSelect label="招聘状态" value={status} setValue={(value) => { setStatus(value); setPage(1); }} options={['全部状态', '开放中', '待确认', '已结束']} />
      <FilterSelect label="来源类型" value={sourceType} setValue={(value) => { setSourceType(value); setPage(1); }} options={['全部来源', '官方入口', '第三方公告']} />
    </CardContent></Card>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>当前筛选 <strong className="text-slate-800">{rows.length}</strong> 家</span><span>最近采集 {latestCollectionTime} · 仅收录湖北省内或全国可投入口</span></div>
    <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{pagedRows.length ? pagedRows.map((item, index) => <RecruitmentCard key={item.id} item={item} index={(safePage - 1) * pageSize + index} foreign />) : <div className="sm:col-span-2 xl:col-span-3 2xl:col-span-4"><EmptyState /></div>}</div>
    {rows.length > 0 && <Pagination className="mt-6"><PaginationContent><PaginationItem><PaginationPrevious href="#foreign-title" text="上一页" aria-disabled={safePage === 1} className={safePage === 1 ? 'pointer-events-none opacity-40' : ''} onClick={(event) => { event.preventDefault(); setPage(Math.max(1, safePage - 1)); }} /></PaginationItem><PaginationItem><span className="px-3 text-sm text-slate-600">第 {safePage} / {pageCount} 页</span></PaginationItem><PaginationItem><PaginationNext href="#foreign-title" text="下一页" aria-disabled={safePage === pageCount} className={safePage === pageCount ? 'pointer-events-none opacity-40' : ''} onClick={(event) => { event.preventDefault(); setPage(Math.min(pageCount, safePage + 1)); }} /></PaginationItem></PaginationContent></Pagination>}
  </section>;
}

function RecruitmentCard({ item, index, foreign = false }: { item: RecruitmentDirectoryEntry; index: number; foreign?: boolean }) {
  const thirdParty = ['第三方公告', '第三方汇总'].includes(item.channel.type);
  const actionLabel = foreign ? (thirdParty ? '查看招聘公告' : '投递入口') : item.channel.label;
  return <Card style={{ animationDelay: `${Math.min(index, 9) * 36}ms` }} className="company-card list-card-enter group relative h-full min-h-[286px] overflow-hidden border-0 bg-white py-0 shadow-sm ring-1 ring-slate-200/80 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-950/10">
    <div className="company-card-accent absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-cyan-300 to-amber-300" />
    <Building2 className="pointer-events-none absolute -right-5 -top-4 size-28 rotate-6 text-cyan-950/[0.035] transition-transform duration-500 group-hover:-translate-x-1 group-hover:translate-y-1 group-hover:rotate-0" />
    <CardContent className="relative flex h-full min-h-[286px] flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2"><span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-50 to-slate-100 text-cyan-800 ring-1 ring-cyan-100 transition-[transform,background-color] duration-300 group-hover:-rotate-3 group-hover:scale-105 group-hover:bg-cyan-100"><Building2 className="size-5" /></span><Badge variant="outline" className="bg-white/80">{item.nature}</Badge></div>
        <span className="font-mono text-[0.65rem] font-semibold tracking-[0.16em] text-slate-300">{String(index + 1).padStart(2, '0')}</span>
      </div>
      <div className="mt-5 min-w-0">
        <h3 className="line-clamp-2 min-h-12 text-[1.05rem] font-semibold leading-6 text-slate-950">{item.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-1.5"><Badge className={item.status === '开放中' ? 'border-0 bg-cyan-50 text-cyan-800' : 'border-0 bg-amber-50 text-amber-800'}><span className={`mr-1.5 size-1.5 rounded-full ${item.status === '开放中' ? 'bg-cyan-500' : 'bg-amber-500'}`} />{item.status}</Badge><Badge variant="outline" className="bg-white/70">{item.confidence}</Badge>{item.isFirstExpansion && <Badge className="border-0 bg-emerald-50 text-emerald-800">首次扩容</Badge>}</div>
      </div>
      <div className="mt-4 space-y-2 text-xs leading-5 text-slate-500">
        <div className="flex items-start gap-2"><MapPin className="mt-0.5 size-3.5 shrink-0 text-cyan-700" /><span className="line-clamp-2">{item.locations.join(' · ')}</span></div>
        <div className="flex items-start gap-2"><FileCheck2 className="mt-0.5 size-3.5 shrink-0 text-cyan-700" /><span className="line-clamp-2">{item.sourceLabels.join(' · ')}</span></div>
        {foreign && item.deadlineNote && <div className="flex items-start gap-2"><CalendarDays className="mt-0.5 size-3.5 shrink-0 text-cyan-700" /><span className="line-clamp-2">{item.deadlineNote}</span></div>}
      </div>
      {item.confidence === '待确认' && <p className="mt-3 rounded-lg bg-amber-50/80 px-2.5 py-2 text-[0.7rem] leading-4 text-amber-800">招聘状态待确认；不得据此推断当前开放。</p>}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="text-[0.68rem] text-slate-400">核验 {item.lastVerifiedAt.slice(0, 10)}</span>
        <Button nativeButton={false} size="sm" render={<a href={item.channel.url} target="_blank" rel="noreferrer" />} className="group/action shrink-0 rounded-xl bg-slate-950 px-3 text-white shadow-sm transition-[background-color,box-shadow] hover:bg-cyan-700 hover:shadow-md">{actionLabel}<ExternalLink className="size-3.5 transition-transform duration-200 group-hover/action:-translate-y-0.5 group-hover/action:translate-x-0.5" /></Button>
      </div>
    </CardContent>
  </Card>;
}

type AlertUiProps = {
  unreadFor: (module: RecruitmentAlert['module'], entityId: string) => RecruitmentAlert[];
  markEntityRead: (module: RecruitmentAlert['module'], entityId: string) => void;
};

function OwnershipPanel({ unreadFor, markEntityRead }: AlertUiProps) {
  const [query, setQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('湖北全部');
  const [verificationFilter, setVerificationFilter] = useState('全部状态');
  const allNodes = useMemo(() => flattenTree(ownershipTrees), []);
  const verifiedLegalEntities = allNodes.filter((node) => node.level > 0 && node.verificationStatus === '已核验').length;
  const leafLegalEntities = allNodes.filter((node) => node.level > 0 && !node.children?.length).length;
  const pendingRelations = ownershipEdges.filter((edge) => edge.verificationStatus === '待确认').length;
  const allOpenings = hubeiRecruitmentOpenings;
  const openLegalEntityIds = new Set(allOpenings.filter((opening) => opening.status === '开放中' && opening.legalEntityId).map((opening) => opening.legalEntityId));
  const nonLegalHiringUnits = hubeiHiringUnits.filter((unit) => unit.entityKind !== '法人').length;
  const asOf = hubeiRecruitmentSnapshot.completedAt.slice(0, 10);
  const filteredTrees = useMemo(() => ownershipTrees.map((root) => filterOwnershipTree(root, query, locationFilter, verificationFilter)).filter((root): root is OwnershipNode => Boolean(root)), [locationFilter, query, verificationFilter]);
  return <section aria-labelledby="ownership-title"><PanelHeading id="ownership-title" icon={Network} eyebrow="直接法律控制 · 湖北法人口径" title="央国企资金跟踪链" description={`控制关系按真实层级展开；招聘用人关系独立建模。首批定位 ${hubeiRecruitmentSnapshot.hiringUnitCount} 个湖北用人单位、${hubeiRecruitmentSnapshot.jobCount} 条岗位入口，未披露人数不作推算。`} />
    <Card className="filter-panel mb-4 border-0 bg-white/90 shadow-sm ring-1 ring-slate-200/80"><CardContent className="grid gap-3 py-1 lg:grid-cols-[minmax(260px,1fr)_180px_160px]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input aria-label="搜索资金链企业" className="h-10 bg-white pl-9" placeholder="搜索集团、子公司或在鄂主体" value={query} onChange={(e) => setQuery(e.target.value)} /></div><FilterSelect label="所在地" value={locationFilter} setValue={setLocationFilter} options={['湖北全部', '湖北武汉']} /><FilterSelect label="核验状态" value={verificationFilter} setValue={setVerificationFilter} options={['全部状态', '已核验', '待确认']} /></CardContent></Card>
    <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-6"><Metric value={String(verifiedLegalEntities)} label="已核验法人" /><Metric value={String(leafLegalEntities)} label="末级法人" /><Metric value={String(pendingRelations)} label="待确认关系" warning /><Metric value={String(openLegalEntityIds.size)} label="开放招聘主体" /><Metric value={String(nonLegalHiringUnits)} label="非独立用人单位" /><Metric value={asOf} label="数据截至" /></div>
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]"><Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200/80"><CardHeader className="border-b border-slate-100"><CardTitle>湖北央国企控制关系</CardTitle><CardDescription>逐层展开可查看省属、市属主体和已定位的2027岗位</CardDescription></CardHeader><CardContent className="space-y-3 pt-1">{filteredTrees.length ? filteredTrees.map((root) => <TreeNode key={root.id} node={root} depth={0} unreadFor={unreadFor} markEntityRead={markEntityRead} />) : <EmptyState />}</CardContent></Card>
      <Card className="h-fit border-0 bg-slate-950 text-white ring-0"><CardHeader><CardTitle>可审计覆盖清单</CardTitle><CardDescription className="text-slate-400">不再用已发现数量冒充完整率。</CardDescription></CardHeader><CardContent className="max-h-[680px] space-y-3 overflow-y-auto">{ownershipCoverageSets.map((set) => <div key={set.id} className="rounded-xl bg-white/5 p-3"><div className="flex items-start justify-between gap-2"><span className="text-xs text-slate-200">{set.label}</span><Badge className={set.completenessStatus === '官方清单已闭合' ? 'border-0 bg-emerald-400/15 text-emerald-200' : 'border-0 bg-amber-400/15 text-amber-200'}>{set.completenessStatus}</Badge></div><p className="mt-2 text-xs text-slate-400">已核验 {set.expectedNodeIds.length} 家 · 待确认 {set.pendingNodeIds.length} 家{set.officialDisclosedTotal === null ? ' · 官方未披露总数' : ` · 官方披露 ${set.officialDisclosedTotal} 家`}</p></div>)}<p className="text-xs leading-5 text-slate-400">招聘公告中的“所属单位”仅作候选发现；未取得股权或实际控制证据前均标记待确认。</p></CardContent></Card>
    </div>
  </section>;
}

function TreeNode({ node, depth, unreadFor, markEntityRead }: { node: OwnershipNode; depth: number } & AlertUiProps) {
  const [open, setOpen] = useState(node.level < 2);
  const edge = ownershipEdges.find((item) => item.childId === node.id);
  const coverage = ownershipCoverageSets.find((item) => item.parentId === node.id && item.targetLevel === node.level + 1);
  const hasChildren = Boolean(node.children?.length) || Boolean(coverage);
  const activeChannel = node.recruitmentChannels.find((channel) => channel.url && channel.status !== '已截止' && channel.match !== '暂无公开入口');
  const historicalChannel = node.recruitmentChannels.find((channel) => channel.url && channel.status === '已截止');
  const isFallbackChannel = activeChannel?.match === '集团兜底';
  const channelCheckedAt = activeChannel?.verifiedAt ?? historicalChannel?.verifiedAt ?? node.recruitmentChannels[0]?.verifiedAt;
  const unreadAlerts = unreadFor('ownership', node.id);
  const openingCount = hubeiRecruitmentOpenings.filter((opening) => opening.legalEntityId === node.id && opening.status === '开放中').length;
  const isLeafLegalEntity = node.level > 0 && !node.children?.length;
  const depthAccent = depth === 0 ? 'border-l-slate-700' : depth === 1 ? 'border-l-cyan-600' : depth === 2 ? 'border-l-cyan-300' : 'border-l-amber-300';
  return <Collapsible open={open} onOpenChange={setOpen} className={depth ? 'ownership-branch ml-4 border-l border-cyan-200/80 pl-4 sm:ml-5' : ''}>
    <div className={`tree-node group/tree relative mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 border-l-[3px] ${depthAccent} bg-slate-50/80 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:bg-white hover:shadow-md hover:shadow-slate-200/60`}>
      {unreadAlerts.length > 0 && <span className="alert-pulse absolute right-2 top-2 z-10 size-2.5 rounded-full bg-red-500 shadow-[0_2px_8px_rgba(239,68,68,0.55)] ring-2 ring-white" role="status"><span className="sr-only">{node.name}有新的招聘信息</span></span>}
      {hasChildren ? <CollapsibleTrigger className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-[background-color,color,transform] duration-200 hover:bg-white hover:text-cyan-700 active:scale-95" aria-label={open ? '收起下级主体' : '展开下级主体'}><ChevronRight className={`size-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} /></CollapsibleTrigger> : <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-semibold text-cyan-700 transition-colors group-hover/tree:bg-cyan-50">L{node.level}</span>}
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><strong className="text-sm text-slate-950">{node.name}</strong><Badge variant="outline">L{node.level}</Badge>{node.level > 0 && <Badge className="border-0 bg-slate-100 text-slate-700">受控法人</Badge>}{isLeafLegalEntity && <Badge className="border-0 bg-violet-50 text-violet-800">末级法人</Badge>}{openingCount > 0 && <Badge className="border-0 bg-emerald-50 text-emerald-800">2027开放岗位 {openingCount}</Badge>}{node.locationTags.some((tag) => tag.includes('武汉')) && <Badge className="border-0 bg-cyan-50 text-cyan-800">武汉</Badge>}{node.verificationStatus === '待确认' && <Badge className="border-0 bg-amber-50 text-amber-800">待确认</Badge>}{isFallbackChannel && <Badge className="border-0 bg-amber-50 text-amber-800">未定位到本公司</Badge>}{coverage && <Badge variant="outline">直属 {coverage.expectedNodeIds.length}核验/{coverage.pendingNodeIds.length}待确认</Badge>}</div><span className="mt-1 block text-xs leading-5 text-slate-500">{node.category} · {edge?.controlType ?? node.controlType}{edge?.directOwnershipPercent !== undefined ? ` ${edge.directOwnershipPercent}%` : ''}{edge?.aggregateOwnershipPercent !== undefined ? `（合计${edge.aggregateOwnershipPercent}%）` : ''}{node.relation ? ` · ${node.relation}` : ''}</span><span className="block text-xs text-slate-400">{node.registeredLocation ? `注册地 ${node.registeredLocation} · ` : ''}{node.unifiedSocialCreditCode ? `统一社会信用代码 ${node.unifiedSocialCreditCode} · ` : node.level >= 3 ? '统一社会信用代码待补 · ' : ''}{node.locationTags.join(' · ')} · 核验 {node.verifiedAt}</span>{node.level > 0 && <span className="mt-1 block text-xs text-slate-500">招聘渠道：{activeChannel ? `${activeChannel.type} · ${activeChannel.match} · ${activeChannel.status}` : '未发现开放岗位'}{channelCheckedAt ? ` · 核验 ${channelCheckedAt}` : ''}{historicalChannel && <>{' · '}<a className="text-cyan-700 underline-offset-2 hover:underline" href={historicalChannel.url} target="_blank" rel="noreferrer">招聘证据（已截止）</a></>}</span>}</div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1"><Button nativeButton={false} size="icon-sm" variant="ghost" render={<a href={node.sourceUrl} target="_blank" rel="noreferrer" aria-label={`查看${node.name}关系来源`} />} className="transition-transform hover:-translate-y-0.5"><FileCheck2 className="size-4" /></Button>{activeChannel?.url ? <Button nativeButton={false} size="sm" variant="outline" render={<a href={activeChannel.url} target="_blank" rel="noreferrer" onClick={() => markEntityRead('ownership', node.id)} aria-label={`${node.name}${isFallbackChannel ? '集团招聘入口' : '招聘入口'}`} />} className="group/action">{isFallbackChannel ? '集团招聘入口' : '招聘入口'}<ExternalLink className="size-3.5 transition-transform duration-200 group-hover/action:-translate-y-0.5 group-hover/action:translate-x-0.5" /></Button> : node.level > 0 ? <span className="rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-500">暂无公开招聘入口</span> : null}</div>
    </div>
    {hasChildren && <CollapsibleContent className="tree-content-motion space-y-2">{node.children?.map((child) => <TreeNode key={child.id} node={child} depth={depth + 1} unreadFor={unreadFor} markEntityRead={markEntityRead} />)}{coverage && !node.children?.length && <div className="ml-5 rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">三级子夹层已建立：已核验 0 家、待确认 0 家；{coverage.completenessStatus}，等待直接控制证据。</div>}</CollapsibleContent>}
  </Collapsible>;
}

function EmployerPanel({ unreadFor, markEntityRead }: AlertUiProps) {
  const [year, setYear] = useState('全部年度');
  const [query, setQuery] = useState('');
  const rows = awards.flatMap((award) => { const company = companyMap.get(award.companyId); return company ? [{ award, company }] : []; }).filter(({ award, company }) => (year === '全部年度' || String(award.year) === year) && `${company.name}${company.shortName}`.toLowerCase().includes(query.toLowerCase()));
  return <section aria-labelledby="employer-title"><PanelHeading id="employer-title" icon={Trophy} eyebrow="湖北关联证据" title="最佳雇主组" description="仅收录具有湖北总部、机构、岗位或招聘覆盖证据的重点雇主；观察名单不冒充外部评奖。" />
    <Card className="filter-panel mb-4 border-0 bg-white/90 shadow-sm ring-1 ring-slate-200/80"><CardContent className="flex flex-col gap-3 py-1 sm:flex-row"><div className="w-full sm:w-48"><FilterSelect label="榜单年度" value={year} setValue={setYear} options={['全部年度', '2025', '2024', '2023', '2022', '2021']} /></div><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input aria-label="搜索上榜企业" className="h-8 bg-white pl-9" placeholder="搜索上榜企业" value={query} onChange={(e) => setQuery(e.target.value)} /></div><div className="self-center text-xs text-slate-500 sm:ml-auto">当前展示 <strong className="text-slate-800">{rows.length}</strong> 条榜单记录</div></CardContent></Card>
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{rows.map(({ award, company }, index) => { const unreadAlerts = unreadFor('employers', company.id); return <Card key={award.id} style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }} className="list-card-enter group relative overflow-hidden border-0 bg-white shadow-sm ring-1 ring-slate-200/80 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70">{unreadAlerts.length > 0 && <span className="alert-pulse absolute right-3 top-3 z-10 size-2.5 rounded-full bg-red-500 shadow-[0_2px_8px_rgba(239,68,68,0.55)] ring-2 ring-white" role="status"><span className="sr-only">{company.name}有新的招聘信息</span></span>}<div className="employer-accent absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-cyan-400" /><CardHeader className="pr-9 pt-7"><div className="trophy-icon mb-3 flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 ring-1 ring-amber-200/70"><Trophy className="size-5" /></div><CardTitle className="leading-6">{company.name}</CardTitle><CardDescription>{award.listName} · {award.awardTier}</CardDescription><CardAction><Badge className="border-amber-200 bg-amber-50 text-amber-800" variant="outline">{award.year}</Badge></CardAction></CardHeader><CardContent><p className="mb-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 transition-colors duration-200 group-hover:bg-cyan-50/60">湖北关联：{award.hubeiBasis}</p><div className="grid grid-cols-2 gap-2"><Button nativeButton={false} variant="outline" render={<a href={award.sourceUrl} target="_blank" rel="noreferrer" />} className="group/action">依据来源<FileCheck2 className="size-4 transition-transform duration-200 group-hover/action:-translate-y-0.5" /></Button><Button nativeButton={false} render={<a href={company.channels[0].url} target="_blank" rel="noreferrer" onClick={() => markEntityRead('employers', company.id)} />} className="group/action bg-slate-950 text-white hover:bg-cyan-700">投递入口<ExternalLink className="size-4 transition-transform duration-200 group-hover/action:-translate-y-0.5 group-hover/action:translate-x-0.5" /></Button></div></CardContent></Card>; })}</div>
  </section>;
}

function FilterSelect({ label, value, setValue, options }: { label: string; value: string; setValue: (v: string) => void; options: string[] }) { return <NativeSelect aria-label={label} className="interactive-field w-full" value={value} onChange={(e) => setValue(e.target.value)}>{options.map((option) => <NativeSelectOption key={option}>{option}</NativeSelectOption>)}</NativeSelect>; }
function PanelHeading({ id, icon: Icon, eyebrow, title, description }: { id: string; icon: typeof Trophy; eyebrow: string; title: string; description: string }) { return <div className="module-hero group/hero relative mb-5 overflow-hidden rounded-3xl border border-cyan-900/10 p-5 shadow-sm md:p-6"><div className="relative z-10 flex items-start gap-4"><div className="hero-icon hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800 ring-1 ring-cyan-800/10 sm:flex"><Icon className="size-6" /></div><div><p className="mb-2 text-sm font-semibold text-cyan-800">{eyebrow}</p><h2 id={id} className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p></div></div></div>; }
function Metric({ value, label, warning = false }: { value: string; label: string; warning?: boolean }) { return <div className="metric-card min-w-20 rounded-xl border border-white/80 bg-white/85 px-3 py-2 shadow-sm backdrop-blur"><strong className={warning ? 'block text-lg leading-6 text-amber-600' : 'block text-lg leading-6 text-slate-950'}>{value}</strong><span className="text-[0.7rem] text-slate-500">{label}</span></div>; }
function EmptyState() { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><CalendarDays className="mx-auto mb-3 size-7 text-slate-400" /><p className="font-medium text-slate-800">没有符合条件的企业</p><p className="mt-1 text-sm text-slate-500">换一个筛选条件后再试。</p></div>; }
function flattenTree(nodes: OwnershipNode[]): OwnershipNode[] { return nodes.flatMap((node) => [node, ...flattenTree(node.children ?? [])]); }
function filterOwnershipTree(node: OwnershipNode, query: string, location: string, verification: string): OwnershipNode | null {
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = !normalizedQuery || `${node.name}${node.category}${node.relation ?? ''}`.toLowerCase().includes(normalizedQuery);
  const matchesLocation = location === '湖北全部' || (location === '湖北武汉' && node.locationTags.some((tag) => tag.includes('武汉')));
  const matchesVerification = verification === '全部状态' || node.verificationStatus === verification;
  const children = (node.children ?? []).map((child) => filterOwnershipTree(child, query, location, verification)).filter((child): child is OwnershipNode => Boolean(child));
  return (matchesQuery && matchesLocation && matchesVerification) || children.length ? { ...node, children } : null;
}
