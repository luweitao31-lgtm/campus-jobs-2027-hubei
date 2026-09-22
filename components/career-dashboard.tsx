'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Award, BriefcaseBusiness, Building2, CalendarClock, CheckCircle2, Download, ExternalLink, FileText, FileUp, LoaderCircle, MapPin, Network, Plus, RotateCcw, Save, Sparkles, Target, Trash2, UserRound } from 'lucide-react';
import { awards, hubeiHiringUnits, hubeiRecruitmentOpenings } from '@/data/catalog';
import { buildJobOpportunities, defaultCandidateProfile, hasCandidateProfileContent, hasRecommendationProfile, recommendOpportunities } from '@/lib/career';
import { parseResumeText } from '@/lib/resume-parser';
import type { ApplicationRecord, ApplicationStage, CandidateProfile, HiringUnit, RecruitmentOpening } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

declare const __PUBLIC_DEPLOYMENT__: boolean;

const storageKey = 'ezhi-career-workspace-v1';
const isPublicDeployment = __PUBLIC_DEPLOYMENT__;
const starterProfile: CandidateProfile = isPublicDeployment ? {
  ...defaultCandidateProfile,
  name: '',
  school: '',
  major: '',
  skills: [],
  certificates: [],
  internshipExperiences: [],
  honorItems: [],
  publications: [],
  preferredCities: [],
  preferredFamilies: [],
  targetRoles: [],
} : defaultCandidateProfile;
const allStages: ApplicationStage[] = ['已收藏', '准备中', '已投递', '笔试', '面试', 'Offer', '已淘汰', '已放弃'];
const jobs = buildJobOpportunities(
  hubeiRecruitmentOpenings as RecruitmentOpening[],
  hubeiHiringUnits as HiringUnit[],
);

type Workspace = { version: 1; profile: CandidateProfile; applications: Record<string, ApplicationRecord> };
type ProfileListKey = 'certificates' | 'internshipExperiences' | 'honorItems' | 'publications';

function splitLegacyExperiences(value = '') {
  const normalized = value.trim();
  if (!normalized) return [];
  const blocks = normalized.split(/\n\s*\n|(?<=。)｜(?=[^｜]{2,80}｜[^｜]{2,40}｜(?:[^｜]{1,20}｜)?(?:19|20)\d{2}[.\-/年])/);
  return blocks.map((block) => block.trim()).filter(Boolean);
}

function normalizeProfile(profile: Partial<CandidateProfile>): CandidateProfile {
  const merged = { ...defaultCandidateProfile, ...profile };
  const structuredExperiences = profile.internshipExperiences?.filter(Boolean) ?? [];
  const structuredHonors = profile.honorItems?.filter(Boolean) ?? [];
  return {
    ...merged,
    internshipExperiences: structuredExperiences.length ? structuredExperiences : splitLegacyExperiences(profile.internshipExperience),
    honorItems: structuredHonors.length ? structuredHonors : splitValues((profile.honors ?? '').replace(/[；;]/g, '，')),
    publications: profile.publications?.filter(Boolean) ?? [],
  };
}

function loadWorkspace(): Workspace {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '') as Partial<Workspace>;
    if (parsed.version === 1 && parsed.profile && parsed.applications) {
      const normalizedProfile = normalizeProfile(parsed.profile);
      return {
        version: 1,
        profile: isPublicDeployment && !hasCandidateProfileContent(normalizedProfile) ? starterProfile : normalizedProfile,
        applications: parsed.applications,
      };
    }
  } catch {
    // A missing or malformed local workspace falls back to the safe starter profile.
  }
  return { version: 1, profile: starterProfile, applications: {} };
}

async function extractPdfText(file: File) {
  const pdfjs = await import('pdfjs-dist');
  const pdfWorker = await import('pdfjs-dist/build/pdf.worker.min.mjs');
  (globalThis as typeof globalThis & { pdfjsWorker?: typeof pdfWorker }).pdfjsWorker = pdfWorker;
  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines: string[] = [];
    let line = '';
    for (const item of content.items) {
      if (!('str' in item)) continue;
      line += `${line ? ' ' : ''}${item.str}`;
      if (item.hasEOL) { lines.push(line); line = ''; }
    }
    if (line) lines.push(line);
    pages.push(lines.join('\n'));
  }
  return pages.join('\n\n');
}

function saveWorkspace(workspace: Workspace) {
  try { localStorage.setItem(storageKey, JSON.stringify(workspace)); } catch { /* Keep the current in-memory state. */ }
}

export function CareerDashboard() {
  const [workspace, setWorkspace] = useState<Workspace>({ version: 1, profile: starterProfile, applications: {} });
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<'today' | 'applications' | 'profile'>('today');
  const importRef = useRef<HTMLInputElement>(null);
  const resumeRef = useRef<HTMLInputElement>(null);
  const [resumeStatus, setResumeStatus] = useState<{ kind: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ kind: 'idle', message: '' });

  useEffect(() => {
    const hydration = window.setTimeout(() => { setWorkspace(loadWorkspace()); setReady(true); }, 0);
    return () => window.clearTimeout(hydration);
  }, []);
  useEffect(() => { if (ready) saveWorkspace(workspace); }, [ready, workspace]);

  const recommendationProfileReady = !isPublicDeployment || hasRecommendationProfile(workspace.profile);
  const showCandidateDetails = !isPublicDeployment || hasCandidateProfileContent(workspace.profile);
  const recommendations = useMemo(
    () => recommendationProfileReady ? recommendOpportunities(jobs, workspace.profile, new Date(), 10) : [],
    [recommendationProfileReady, workspace.profile],
  );
  const applicationList = useMemo(() => Object.values(workspace.applications).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [workspace.applications]);
  const jobMap = useMemo(() => new Map(jobs.map((job) => [job.id, job])), []);

  const updateProfile = <K extends keyof CandidateProfile>(key: K, value: CandidateProfile[K]) => {
    setWorkspace((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  };
  const updateProfileList = (key: ProfileListKey, items: string[]) => {
    setWorkspace((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [key]: items,
        ...(key === 'internshipExperiences' ? { internshipExperience: items.join('\n\n') } : {}),
        ...(key === 'honorItems' ? { honors: items.join('；') } : {}),
      },
    }));
  };
  const updateApplication = (jobId: string, patch: Partial<ApplicationRecord>) => {
    setWorkspace((current) => {
      const previous = current.applications[jobId] ?? { jobId, stage: '已收藏' as const, nextAction: '', note: '', updatedAt: '' };
      return { ...current, applications: { ...current.applications, [jobId]: { ...previous, ...patch, updatedAt: new Date().toISOString() } } };
    });
  };
  const exportWorkspace = () => {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `鄂职求职数据-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const importWorkspace = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Workspace;
      if (parsed.version !== 1 || !parsed.profile || !parsed.applications) throw new Error('invalid');
      setWorkspace({ ...parsed, profile: normalizeProfile(parsed.profile) });
    } catch { window.alert('导入失败：请选择由本网站导出的求职数据 JSON 文件。'); }
  };
  const importResumePdf = async (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setResumeStatus({ kind: 'error', message: '请选择 PDF 格式的简历。' });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setResumeStatus({ kind: 'error', message: 'PDF 不能超过 15MB，请压缩后重试。' });
      return;
    }
    setResumeStatus({ kind: 'loading', message: '正在本机解析简历，请稍候…' });
    try {
      const text = await extractPdfText(file);
      const parsed = parseResumeText(text);
      if (parsed.detectedFields.length === 0) {
        setResumeStatus({ kind: 'error', message: parsed.warnings[0] ?? '没有识别到可用信息，请确认 PDF 文字可以复制。' });
        return;
      }
      setWorkspace((current) => ({
        ...current,
        profile: {
          ...current.profile,
          ...parsed.profile,
          skills: [...new Set([...current.profile.skills, ...(parsed.profile.skills ?? [])])],
          certificates: [...new Set([...current.profile.certificates, ...(parsed.profile.certificates ?? [])])],
          internshipExperiences: parsed.profile.internshipExperiences?.length
            ? parsed.profile.internshipExperiences
            : current.profile.internshipExperiences,
          honorItems: parsed.profile.honorItems?.length ? parsed.profile.honorItems : current.profile.honorItems,
          resumeFileName: file.name,
          resumeImportedAt: new Date().toISOString(),
        },
      }));
      const suffix = parsed.warnings.length ? `；${parsed.warnings.join('；')}` : '';
      setResumeStatus({ kind: 'success', message: `已从“${file.name}”识别：${parsed.detectedFields.join('、')}${suffix}` });
    } catch {
      setResumeStatus({ kind: 'error', message: 'PDF 解析失败。若文件为扫描件或受密码保护，请先导出为可复制文字的 PDF。' });
    }
  };

  const resetCandidateProfile = () => {
    if (!window.confirm('重置后将清空当前浏览器中的简历识别结果和候选人信息，但不会删除“我的求职”记录。是否继续？')) return;
    setWorkspace((current) => ({ ...current, profile: starterProfile }));
    setResumeStatus({ kind: 'idle', message: '' });
    if (resumeRef.current) resumeRef.current.value = '';
  };

  const activeCount = applicationList.filter((item) => !['Offer', '已淘汰', '已放弃'].includes(item.stage)).length;
  const interviewCount = applicationList.filter((item) => ['笔试', '面试'].includes(item.stage)).length;
  const offerCount = applicationList.filter((item) => item.stage === 'Offer').length;

  return <section aria-labelledby="strategy-title">
    <div className="module-hero mb-5 overflow-hidden rounded-3xl border border-cyan-900/10 p-5 shadow-sm md:p-6">
      <div className="relative z-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-800"><Sparkles className="size-4" />战略规划驾驶舱</div><h2 id="strategy-title" className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">今天，离 Offer 更近一步</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">只把已核验、可投递且与你当前画像匹配的岗位放进今日清单。推荐不是黑箱，每一分都有理由。</p></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric value={String(recommendations.length)} label="今日精选" /><Metric value={String(activeCount)} label="进行中" /><Metric value={String(interviewCount)} label="笔面试" /><Metric value={String(offerCount)} label="Offer" /></div>
      </div>
    </div>

    <div className="mb-4 grid gap-3 md:grid-cols-3">
      <ExpertCard icon={BriefcaseBusiness} title="秋招情报组" detail={`定位 ${jobs.length} 个已核验开放的官方岗位入口`} />
      <ExpertCard icon={Network} title="央国企链组" detail="核验集团、法人主体与实际用人单位" />
      <ExpertCard icon={Award} title="最佳雇主组" detail={`提供 ${awards.length} 条雇主质量与湖北关联证据`} />
    </div>

    <div className="mb-5 flex flex-wrap gap-2 rounded-2xl bg-slate-950 p-2">
      <ViewButton active={view === 'today'} onClick={() => setView('today')} icon={Target}>今日行动</ViewButton>
      <ViewButton active={view === 'applications'} onClick={() => setView('applications')} icon={CheckCircle2}>我的求职 <span className="opacity-60">{applicationList.length}</span></ViewButton>
      <ViewButton active={view === 'profile'} onClick={() => setView('profile')} icon={UserRound}>候选人信息</ViewButton>
    </div>

    {view === 'today' && <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>按匹配度与拿 Offer 可行性排序 · 只展示官方开放岗位</span><span>{recommendationProfileReady ? `画像：${workspace.profile.major} · ${workspace.profile.education}` : '尚未识别到可用于推荐的简历画像'}</span></div>
      <div className="grid gap-4 lg:grid-cols-2">{recommendations.map(({ job, score }, index) => <Card key={job.id} className="list-card-enter overflow-hidden border-0 bg-white shadow-sm ring-1 ring-slate-200/80">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="mb-2 flex flex-wrap gap-1.5"><Badge className="border-0 bg-cyan-50 text-cyan-800">#{index + 1} 今日优先</Badge><Badge variant="outline">{job.family}</Badge><Badge variant="outline">{job.headcount > 0 ? `招 ${job.headcount} 人` : job.headcountNote ?? '人数未披露'}</Badge></div><h3 className="text-lg font-semibold text-slate-950">{job.jobName}</h3><p className="mt-1 text-sm text-slate-600">{job.companyName}</p></div><ScoreRing score={score.total} /></div>
          <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2"><span className="flex items-center gap-1.5"><MapPin className="size-3.5 text-cyan-700" />{job.workLocation}</span><span className="flex items-center gap-1.5"><CalendarClock className="size-3.5 text-cyan-700" />截止 {job.deadline.slice(0, 10)}</span><span className="flex items-center gap-1.5"><Building2 className="size-3.5 text-cyan-700" />{job.education}</span><span className="truncate">核验 {job.verifiedAt}</span></div>
          <p className="mt-3 line-clamp-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">专业要求：{job.majors}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{score.reasons.slice(0, 4).map((reason) => <Badge key={reason} className="border-0 bg-emerald-50 text-emerald-800">{reason}</Badge>)}{score.risks.map((risk) => <Badge key={risk} className="border-0 bg-amber-50 text-amber-800">{risk}</Badge>)}</div>
          <div className="mt-4 grid grid-cols-3 gap-1 text-center text-[0.65rem] text-slate-500 sm:grid-cols-6"><ScorePart label="匹配" value={score.match} max={35} /><ScorePart label="门槛" value={score.reachability} max={20} /><ScorePart label="地点" value={score.location} max={15} /><ScorePart label="时效" value={score.urgency} max={15} /><ScorePart label="可信" value={score.confidence} max={10} /><ScorePart label="雇主" value={score.employerQuality} max={5} /></div>
          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><Button size="sm" variant="outline" onClick={() => updateApplication(job.id, { stage: '已收藏' })}>{workspace.applications[job.id] ? workspace.applications[job.id].stage : '收藏岗位'}</Button><a href={job.officialUrl} target="_blank" rel="noreferrer" onClick={() => updateApplication(job.id, { stage: workspace.applications[job.id]?.stage ?? '准备中' })} className={cn(buttonVariants({ size: 'sm' }), 'bg-slate-950 text-white hover:bg-cyan-700')}>打开官方投递<ExternalLink className="size-3.5" /></a></div>
        </CardContent>
      </Card>)}</div>
      {!recommendations.length && (recommendationProfileReady
        ? <EmptyMessage title="当前没有满足条件的推荐" detail="已根据简历重新匹配，但暂时没有同时满足学历、时效和开放状态的岗位。" />
        : <EmptyMessage title="请先上传或完善简历信息" detail="首次进入不会推荐岗位。请在候选人信息中上传可识别的 PDF 简历，或填写姓名、学校、专业及目标岗位/经历，系统将自动更新今日行动。" />)}
    </div>}

    {view === 'applications' && <div className="space-y-3">{applicationList.map((record) => { const job = jobMap.get(record.jobId); if (!job) return null; return <Card key={record.jobId} className="border-0 bg-white shadow-sm ring-1 ring-slate-200/80"><CardContent className="grid gap-4 p-4 lg:grid-cols-[minmax(240px,1fr)_150px_minmax(180px,1fr)_auto] lg:items-center"><div><h3 className="font-semibold text-slate-950">{job.jobName}</h3><p className="mt-1 text-xs text-slate-500">{job.companyName} · {job.workLocation} · 截止 {job.deadline.slice(0, 10)}</p></div><NativeSelect aria-label={`${job.jobName}进度`} value={record.stage} onChange={(event) => updateApplication(job.id, { stage: event.target.value as ApplicationStage })}>{allStages.map((stage) => <NativeSelectOption key={stage}>{stage}</NativeSelectOption>)}</NativeSelect><Input aria-label={`${job.jobName}下一步行动`} placeholder="下一步，如：今晚完善简历" value={record.nextAction} onChange={(event) => updateApplication(job.id, { nextAction: event.target.value })} /><a href={job.officialUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline' })}>查看岗位<ExternalLink className="size-3.5" /></a></CardContent></Card>; })}{!applicationList.length && <EmptyMessage title="还没有求职记录" detail="从今日行动收藏岗位或打开官方投递入口后，这里会形成你的求职看板。" />}</div>}

    {view === 'profile' && <Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200/80"><CardHeader><CardTitle>候选人信息</CardTitle><CardDescription>导入 PDF 简历可自动补全画像，文件只在当前浏览器中解析，不会上传到服务器；识别结果均可修改。</CardDescription></CardHeader><CardContent className="space-y-5">
      <div className="rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-white p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-800"><FileText className="size-5" /></span><div><p className="text-sm font-semibold text-slate-900">从 PDF 简历完善画像</p><p className="mt-1 text-xs leading-5 text-slate-600">支持文本型 PDF，自动识别基本信息、求职意向、技能证书和经历。扫描件需先 OCR。</p>{workspace.profile.resumeFileName && <p className="mt-1 text-xs text-cyan-800">当前简历：{workspace.profile.resumeFileName} · {workspace.profile.resumeImportedAt?.slice(0, 10)}</p>}</div></div><div className="flex flex-wrap gap-2"><input ref={resumeRef} className="hidden" type="file" accept="application/pdf,.pdf" onChange={(event) => { void importResumePdf(event.target.files?.[0]); event.currentTarget.value = ''; }} />{isPublicDeployment && showCandidateDetails && <Button variant="outline" onClick={resetCandidateProfile}><RotateCcw className="size-4" />重置</Button>}<Button disabled={resumeStatus.kind === 'loading'} onClick={() => resumeRef.current?.click()} className="bg-cyan-700 text-white hover:bg-cyan-800">{resumeStatus.kind === 'loading' ? <LoaderCircle className="size-4 animate-spin" /> : <FileUp className="size-4" />}{resumeStatus.kind === 'loading' ? '正在解析' : '选择 PDF 简历'}</Button></div></div>{resumeStatus.message && <div className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs leading-5 ${resumeStatus.kind === 'success' ? 'bg-emerald-50 text-emerald-800' : resumeStatus.kind === 'error' ? 'bg-amber-50 text-amber-800' : 'bg-white text-slate-600'}`}>{resumeStatus.kind === 'success' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : resumeStatus.kind === 'error' ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" />}<span>{resumeStatus.message}</span></div>}</div>
      {showCandidateDetails && <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="姓名"><Input value={workspace.profile.name} placeholder="你的姓名" onChange={(event) => updateProfile('name', event.target.value)} /></Field><Field label="学校"><Input value={workspace.profile.school} placeholder="毕业院校" onChange={(event) => updateProfile('school', event.target.value)} /></Field><Field label="专业"><Input value={workspace.profile.major} onChange={(event) => updateProfile('major', event.target.value)} /></Field><Field label="学历"><NativeSelect value={workspace.profile.education} onChange={(event) => updateProfile('education', event.target.value as CandidateProfile['education'])}>{['本科', '硕士研究生', '博士研究生'].map((value) => <NativeSelectOption key={value}>{value}</NativeSelectOption>)}</NativeSelect></Field><Field label="毕业年份"><Input value="2027" disabled /></Field><Field label="技术偏好"><label className="flex h-8 items-center gap-2 rounded-md border px-3 text-sm"><input type="checkbox" checked={workspace.profile.avoidHeavyCoding} onChange={(event) => updateProfile('avoidHeavyCoding', event.target.checked)} />弱化高编程岗位</label></Field><Field label="手机号"><Input value={workspace.profile.phone ?? ''} placeholder="用于完善求职档案" onChange={(event) => updateProfile('phone', event.target.value)} /></Field><Field label="邮箱"><Input type="email" value={workspace.profile.email ?? ''} placeholder="name@example.com" onChange={(event) => updateProfile('email', event.target.value)} /></Field><Field label="所在地"><Input value={workspace.profile.currentCity ?? ''} placeholder="当前所在城市" onChange={(event) => updateProfile('currentCity', event.target.value)} /></Field><Field label="籍贯"><Input value={workspace.profile.nativePlace ?? ''} placeholder="籍贯" onChange={(event) => updateProfile('nativePlace', event.target.value)} /></Field><Field label="目标岗位"><Input value={(workspace.profile.targetRoles ?? []).join('，')} placeholder="如：BIM工程师、工程管理岗" onChange={(event) => updateProfile('targetRoles', splitValues(event.target.value))} /></Field></div>
      <div className="grid gap-4 lg:grid-cols-2"><Field label="技能（用逗号分隔）"><Textarea rows={3} value={workspace.profile.skills.join('，')} onChange={(event) => updateProfile('skills', splitValues(event.target.value))} /></Field><RepeatableItems label="证书" itemLabel="证书" addLabel="新增一项证书" items={workspace.profile.certificates} placeholder="如：英语四级" onChange={(items) => updateProfileList('certificates', items)} /></div>
      <Field label="城市偏好（从高到低）"><Input value={workspace.profile.preferredCities.join('，')} onChange={(event) => updateProfile('preferredCities', splitValues(event.target.value))} /></Field>
      <Field label="教育经历详情"><Textarea rows={5} value={workspace.profile.educationExperience ?? ''} placeholder="学校、专业、在校时间、核心课程和专业技能" onChange={(event) => updateProfile('educationExperience', event.target.value)} /></Field>
      <RepeatableItems label="实习 / 工作经历" itemLabel="经历" addLabel="新增一段经历" items={workspace.profile.internshipExperiences ?? []} placeholder="填写公司、岗位、时间、地点和主要成果" multiline onChange={(items) => updateProfileList('internshipExperiences', items)} />
      <div className="grid gap-4 lg:grid-cols-2"><Field label="项目经历"><Textarea rows={6} placeholder="课程设计、BIM、智慧工地等项目" value={workspace.profile.projectExperience ?? ''} onChange={(event) => updateProfile('projectExperience', event.target.value)} /></Field><Field label="校园经历"><Textarea rows={5} value={workspace.profile.campusExperience ?? ''} onChange={(event) => updateProfile('campusExperience', event.target.value)} /></Field></div>
      <RepeatableItems label="荣誉奖项" itemLabel="荣誉" addLabel="新增一项荣誉" items={workspace.profile.honorItems ?? []} placeholder="如：校奖学金" onChange={(items) => updateProfileList('honorItems', items)} />
      <RepeatableItems label="出版物 / 论文" itemLabel="成果" addLabel="新增一项成果" items={workspace.profile.publications ?? []} placeholder="论文题目、作者顺序、发表时间和研究内容" multiline onChange={(items) => updateProfileList('publications', items)} />
      <Field label="自我评价"><Textarea rows={4} value={workspace.profile.selfSummary ?? ''} onChange={(event) => updateProfile('selfSummary', event.target.value)} /></Field>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="flex items-center gap-2 text-xs text-slate-500"><Save className="size-4 text-emerald-600" />修改自动保存在本机，无需账号。</p><div className="flex gap-2"><input ref={importRef} className="hidden" type="file" accept="application/json" onChange={(event) => { void importWorkspace(event.target.files?.[0]); event.currentTarget.value = ''; }} /><Button variant="outline" onClick={() => importRef.current?.click()}><FileUp className="size-4" />导入数据</Button><Button onClick={exportWorkspace} className="bg-slate-950 text-white hover:bg-cyan-700"><Download className="size-4" />导出数据</Button></div></div></>}
    </CardContent></Card>}
  </section>;
}

function splitValues(value: string) { return value.split(/[，,、\n]/).map((item) => item.trim()).filter(Boolean); }
function RepeatableItems({ label, itemLabel, addLabel, items, placeholder, multiline = false, onChange }: { label: string; itemLabel: string; addLabel: string; items: string[]; placeholder: string; multiline?: boolean; onChange: (items: string[]) => void }) {
  const updateItem = (index: number, value: string) => onChange(items.map((item, itemIndex) => itemIndex === index ? value : item));
  const removeItem = (index: number) => onChange(items.filter((_, itemIndex) => itemIndex !== index));
  return <div className="space-y-2"><div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-slate-600">{label}</span><Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, ''])}><Plus className="size-3.5" />{addLabel}</Button></div><div className="grid gap-3 lg:grid-cols-2">{items.map((item, index) => <div key={`${itemLabel}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-700">{itemLabel} {index + 1}</span><Button type="button" size="icon-sm" variant="ghost" aria-label={`删除${itemLabel} ${index + 1}`} onClick={() => removeItem(index)}><Trash2 className="size-3.5 text-slate-500" /></Button></div>{multiline ? <Textarea aria-label={`${itemLabel} ${index + 1}`} rows={5} value={item} placeholder={placeholder} onChange={(event) => updateItem(index, event.target.value)} /> : <Input aria-label={`${itemLabel} ${index + 1}`} value={item} placeholder={placeholder} onChange={(event) => updateItem(index, event.target.value)} />}</div>)}</div>{!items.length && <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500">暂无{label}，点击“{addLabel}”补充。</p>}</div>;
}
function Metric({ value, label }: { value: string; label: string }) { return <div className="metric-card min-w-24 rounded-xl border border-white/80 bg-white/85 px-3 py-2 shadow-sm"><strong className="block text-lg text-slate-950">{value}</strong><span className="text-[0.7rem] text-slate-500">{label}</span></div>; }
function ExpertCard({ icon: Icon, title, detail }: { icon: typeof BriefcaseBusiness; title: string; detail: string }) { return <Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200/80"><CardContent className="flex items-center gap-3 p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800"><Icon className="size-5" /></span><div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div></CardContent></Card>; }
function ViewButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Target; children: React.ReactNode }) { return <Button onClick={onClick} className={active ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200' : 'bg-transparent text-slate-300 hover:bg-white/10 hover:text-white'}><Icon className="size-4" />{children}</Button>; }
function ScoreRing({ score }: { score: number }) { return <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-full border-4 border-cyan-100 bg-cyan-50 text-cyan-900"><strong className="text-lg leading-5">{score}</strong><span className="text-[0.55rem]">匹配分</span></div>; }
function ScorePart({ label, value, max }: { label: string; value: number; max: number }) { return <div className="rounded-lg bg-slate-50 p-1.5"><strong className="block text-xs text-slate-800">{value}/{max}</strong>{label}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-1.5 text-xs font-medium text-slate-600"><span>{label}</span>{children}</label>; }
function EmptyMessage({ title, detail }: { title: string; detail: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><Target className="mx-auto mb-3 size-7 text-slate-400" /><p className="font-medium text-slate-800">{title}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div>; }
