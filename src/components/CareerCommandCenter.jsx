import {
  Activity,
  Briefcase,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Film,
  GraduationCap,
  Headphones,
  Map,
  ShieldCheck,
  Target,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';
import { buildCommandCenter, CAREER_STAGES } from '../domain/commandCenter';
import { resolveNewsroomMedia } from '../domain/newsroomMedia';
import wesselPlayerHero from '../assets/dynastyhq-player-wessel-2-transparent.png';
import CareerTransitionPanel from './CareerTransitionPanel';

const toneClasses = {
  default: 'text-white',
  gold: 'text-amber-300',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-red-400',
};

const stageOrder = [
  { id: CAREER_STAGES.HIGH_SCHOOL, label: 'High School', caption: 'Road to Glory', Icon: Film },
  { id: CAREER_STAGES.COLLEGE, label: 'College Player', caption: 'In Progress', Icon: GraduationCap },
  { id: CAREER_STAGES.OC, label: 'Coach', caption: 'In Progress', Icon: Briefcase },
  { id: CAREER_STAGES.HC, label: 'Legacy', caption: 'The Goal', Icon: Trophy },
];

const stageName = {
  [CAREER_STAGES.HIGH_SCHOOL]: 'High School Recruiting',
  [CAREER_STAGES.COLLEGE]: 'Road to Glory',
  [CAREER_STAGES.OC]: 'College Dynasty',
  [CAREER_STAGES.HC]: 'College Dynasty',
  [CAREER_STAGES.RETIRED]: 'Legacy Complete',
};

const roleName = {
  [CAREER_STAGES.HIGH_SCHOOL]: 'High School Quarterback',
  [CAREER_STAGES.COLLEGE]: 'College Quarterback',
  [CAREER_STAGES.OC]: 'Offensive Coordinator',
  [CAREER_STAGES.HC]: 'Head Coach',
  [CAREER_STAGES.RETIRED]: 'Program Legend',
};

const DashboardCard = ({ title, actionLabel, onAction, children, className = '' }) => (
  <section className={`dhq-dashboard-card overflow-hidden ${className}`}>
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
      <h3 className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-100">{title}</h3>
      {actionLabel && (
        <button type="button" onClick={onAction} className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.09em] text-slate-500 transition-colors hover:text-white">
          {actionLabel} <ChevronRight size={11} />
        </button>
      )}
    </div>
    {children}
  </section>
);

const JourneyStrip = ({ stage }) => {
  const activeIndex = stage === CAREER_STAGES.RETIRED ? 3 : Math.max(0, stageOrder.findIndex((item) => item.id === stage));
  return (
    <div className="w-full max-w-[520px]">
      <div className="mb-2 text-[7px] font-black uppercase tracking-[0.18em] text-slate-400">Journey overview</div>
      <div className="flex items-start">
        {stageOrder.map((item, index) => {
          const reached = index <= activeIndex;
          const active = index === activeIndex;
          return (
            <div key={item.id} className="contents">
              <div className="flex w-[76px] shrink-0 flex-col items-center text-center sm:w-[92px]">
                <div className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border ${active ? 'border-amber-300 bg-amber-500/15 text-amber-300 shadow-[0_0_18px_rgba(245,158,11,.28)]' : reached ? 'border-slate-300/60 bg-white/10 text-slate-100' : 'border-slate-700/80 bg-black/50 text-slate-600'}`}>
                  <item.Icon size={17} />
                </div>
                <div className={`mt-1.5 whitespace-nowrap text-[7px] font-black uppercase tracking-[0.05em] ${reached ? 'text-slate-100' : 'text-slate-600'}`}>{item.label}</div>
                <div className="mt-0.5 text-[6px] text-slate-500">{item.caption}</div>
              </div>
              {index < stageOrder.length - 1 && (
                <div className={`mt-[17px] flex min-w-3 flex-1 items-center ${index < activeIndex ? 'text-slate-100' : 'text-slate-700'}`} aria-hidden="true">
                  <span className={`h-px flex-1 ${index < activeIndex ? 'bg-slate-200/80' : 'bg-slate-700/70'}`} />
                  <ChevronRight size={13} strokeWidth={3} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const EmptyBrief = ({ children }) => <p className="px-5 py-8 text-center text-[10px] leading-relaxed text-slate-500">{children}</p>;

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const average = (value, count) => count ? (value / count).toFixed(1) : '—';

const buildSnapshotMetrics = (model, state) => {
  const games = model.seasonGames || [];
  const totals = model.totals || {};
  if (model.stage === CAREER_STAGES.HIGH_SCHOOL) {
    const moments = games.flatMap((game) => game.evaluation?.moments || []);
    return [
      ...model.metrics,
      { label: 'Successful', value: String(moments.filter((moment) => moment.result === 'success').length) },
      { label: 'Partial', value: String(moments.filter((moment) => moment.result === 'partial').length) },
      { label: 'Failed', value: String(moments.filter((moment) => moment.result === 'failed').length) },
      { label: 'Recruit grade', value: `${state.playerRecruiting?.highSchool?.recruitStars || state.player?.stars || 3}-star`, tone: 'gold' },
    ];
  }
  if (model.stage === CAREER_STAGES.COLLEGE) {
    return [
      { label: 'Overall record', value: `${model.record.wins}-${model.record.losses}` },
      { label: 'Games logged', value: String(games.length) },
      { label: 'Pass YPG', value: average(totals.passYds, games.length) },
      { label: 'Rush YPG', value: average(totals.rushYds, games.length) },
      { label: 'Pass TD', value: String(totals.passTD || 0) },
      { label: 'Rush TD', value: String(totals.rushTD || 0) },
      { label: 'Interceptions', value: String(totals.interceptions || 0) },
      { label: 'Coach Trust', value: state.rtg?.coachTrust === '' || state.rtg?.coachTrust == null ? '—' : String(state.rtg.coachTrust), tone: 'gold' },
    ];
  }
  return [
    { label: 'Overall record', value: `${model.record.wins}-${model.record.losses}` },
    { label: 'Games logged', value: String(games.length) },
    { label: 'PPG', value: average(totals.points, games.length) },
    { label: 'Opp PPG', value: average(totals.pointsAgainst, games.length) },
    { label: 'Points for', value: String(totals.points || 0) },
    { label: 'Points against', value: String(totals.pointsAgainst || 0) },
    { label: 'Pass YPG', value: average(totals.passYds, games.length) },
    { label: 'Rush YPG', value: average(totals.rushYds, games.length) },
  ];
};

const CareerCommandCenter = ({
  state,
  onNavigate,
  readOnly = false,
  onBeginCollege,
  onChecklistChange,
  onGraduate,
  onCreateCoachingUniverse,
  onBeginOcCareer,
}) => {
  const model = buildCommandCenter(state);
  const player = state.player || {};
  const coach = state.coach || {};
  const highSchool = state.playerRecruiting?.highSchool || {};
  const latestIssue = (state.newsroomIssues || []).at(-1) || null;
  const leadArticle = latestIssue?.articles?.[0] || null;
  const supportingHeadlines = (latestIssue?.articles || []).slice(1, 4);
  const targetSchools = [...(state.recruiting || [])]
    .filter((entry) => entry?.name)
    .sort((left, right) => model.stage === CAREER_STAGES.HIGH_SCHOOL
      ? numberValue(left.preferenceRank || left.customOrder || 999) - numberValue(right.preferenceRank || right.customOrder || 999)
      : numberValue(right.interest) - numberValue(left.interest))
    .slice(0, 5);
  const stars = Math.min(5, Math.max(0, Number(highSchool.recruitStars || player.stars) || 0));
  const playerName = player.name || 'Bryan Wessel Jr.';
  const quote = state.latestQuote || 'Greatness is earned. Legacy is built.';
  const heroBackground = state.bgDashboard || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1920&q=88';
  const newsroomImage = resolveNewsroomMedia({
    article: leadArticle,
    mediaLibrary: state.newsroomMediaLibrary || [],
    fallbackUrl: state.outletImages?.local || state.outletImages?.broadsheet || '',
  }).url;
  const snapshotMetrics = buildSnapshotMetrics(model, state);
  const latestGame = model.recentGames?.[0] || null;
  const profileRole = roleName[model.stage];
  const isCoach = [CAREER_STAGES.OC, CAREER_STAGES.HC].includes(model.stage);
  const phaseSecondary = isCoach ? (coach.currentSchool || model.institution) : (player.school || model.institution);
  const careerTotals = model.careerTotals || {};
  const careerGames = state.gameLogs?.length || 0;
  const quickActions = [
    { label: 'Add Game Stats', tab: 'dataEntry', Icon: Activity },
    { label: isCoach ? 'Update Roster' : 'Update Progress', tab: isCoach ? 'frontOffice' : 'dataEntry', Icon: UserRound },
    { label: 'Log Recruiting', tab: 'recruiting', Icon: ClipboardList },
    { label: 'Podcast Studio', tab: 'podcast', Icon: Headphones },
  ];
  const centralLinks = isCoach
    ? [
        { label: 'Personnel & NIL Office', description: 'Review roster, staff, and resources', tab: 'frontOffice', Icon: Users },
        { label: 'Offseason War Room', description: 'Plan retention, portal, and needs', tab: 'offseason', Icon: ShieldCheck },
        { label: 'Team Recruiting', description: 'Manage the current prospect board', tab: 'recruiting', Icon: Target },
        { label: 'Legacy Goals', description: 'Review milestones and trophies', tab: 'trophies', Icon: Trophy },
      ]
    : [
        { label: 'Weekly Agenda', description: 'Upload, review, and publish the week', tab: 'dataEntry', Icon: CalendarDays },
        { label: 'Recruiting Board', description: 'Review schools, targets, and offers', tab: 'recruiting', Icon: Map },
        { label: 'Legacy Trophy Case', description: 'Review awards and career achievements', tab: 'trophies', Icon: Trophy },
        { label: 'Gridiron Grind', description: 'Hear the latest weekly episode', tab: 'podcast', Icon: Headphones },
      ];

  return (
    <div className="relative z-10 mx-auto max-w-[1500px] pb-10 animate-in fade-in">
      <section className="dhq-command-hero relative left-1/2 w-screen -translate-x-1/2 overflow-hidden border-b border-white/10 bg-[#03090d]">
        <img src={heroBackground} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center opacity-75 saturate-50" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,6,9,.98)_0%,rgba(1,6,9,.83)_31%,rgba(1,6,9,.12)_54%,rgba(1,6,9,.55)_73%,rgba(1,6,9,.94)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(2,8,12,.99)_0%,rgba(2,8,12,.22)_42%,rgba(2,8,12,.32)_100%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:40px_40px]" />
        <img src={wesselPlayerHero} alt="Wessel, number 2, facing the stadium field" className="pointer-events-none absolute bottom-[-43%] left-[57%] z-[1] hidden h-[145%] -translate-x-1/2 object-contain drop-shadow-[0_30px_36px_rgba(0,0,0,.95)] lg:block" />

        <div className="relative z-[2] mx-auto flex min-h-[650px] max-w-[1500px] flex-col px-5 py-9 sm:px-8 lg:min-h-[510px] lg:px-10 lg:py-12">
          <div className="max-w-[620px] lg:w-[47%]">
            <div className="text-[11px] font-black uppercase tracking-[0.19em] text-slate-300">Welcome to your</div>
            <h1 className="dhq-command-title mt-2 uppercase text-white drop-shadow-[0_6px_18px_rgba(0,0,0,.95)]">
              <span>College Football 27</span><span>Command Center</span>
            </h1>
            <p className="mt-4 max-w-[500px] text-[12px] font-medium leading-relaxed text-slate-300">Your journey. Your legacy. Every play, every decision, tracked from high-school star to college legend to coaching icon.</p>
          </div>

          <div className="mt-8 lg:mt-7"><JourneyStrip stage={model.stage} /></div>
          <button type="button" onClick={() => onNavigate('chronicle')} className="mt-7 flex w-fit items-center gap-6 rounded-sm bg-slate-50 px-5 py-3 text-[9px] font-black uppercase tracking-[0.08em] text-slate-950 transition-colors hover:bg-white">
            View journey timeline <ChevronRight size={14} />
          </button>

          <blockquote className="mt-8 w-full max-w-[330px] self-end rounded-lg border border-white/20 bg-[#071017]/82 px-6 py-5 shadow-2xl backdrop-blur-md lg:absolute lg:right-10 lg:top-[145px] lg:mt-0 lg:w-[24%]">
            <div className="text-4xl font-black leading-none text-slate-400">“</div>
            <p className="-mt-1 text-[17px] font-black uppercase leading-[1.28] tracking-[0.06em] text-slate-100">{quote}</p>
            <div className="mt-4 border-t border-white/10 pt-3 text-right font-[cursive] text-2xl italic text-slate-300">BWJ</div>
          </blockquote>
        </div>
      </section>

      <div id="recruit-command-center" className="scroll-mt-20">
        <CareerTransitionPanel
          state={state}
          stage={model.stage}
          readOnly={readOnly}
          onBeginCollege={onBeginCollege}
          onChecklistChange={onChecklistChange}
          onGraduate={onGraduate}
          onCreateCoachingUniverse={onCreateCoachingUniverse}
          onBeginOcCareer={onBeginOcCareer}
        />
      </div>

      <div className="dhq-dashboard-grid -mt-px grid gap-3 px-3 pt-3 sm:px-5 lg:grid-cols-12 lg:px-8">
        <DashboardCard title="Current Phase" className="lg:col-span-4">
          <div className="relative min-h-[270px] overflow-hidden p-5">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_100%_45%,rgba(16,185,129,.18),transparent_70%)]" />
            <div className="relative flex items-center justify-between gap-3">
              <div><div className="text-xl font-black uppercase text-white">{stageName[model.stage]}</div><div className="mt-1 text-[11px] text-slate-400">{profileRole}</div></div>
              <span className="rounded border border-blue-400/35 bg-blue-500/15 px-2 py-1 text-[7px] font-black uppercase tracking-wider text-blue-200">Active</span>
            </div>
            <div className="relative mt-5 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-emerald-400/40 bg-emerald-950/30 text-2xl font-black text-emerald-300">{phaseSecondary?.[0] || 'D'}</div>
              <div className="min-w-0"><div className="truncate text-[11px] font-black uppercase text-white">{phaseSecondary}</div><div className="mt-1 text-[9px] text-slate-500">Season {model.season} · Week {model.week}</div></div>
            </div>
            <div className="relative mt-5 border-y border-white/[0.07] py-3">
              <div className="text-[8px] font-black uppercase tracking-wider text-slate-500">Latest verified result</div>
              <div className="mt-1 flex items-end justify-between gap-4"><div><div className="text-sm font-black text-white">{latestGame ? `${latestGame.result || '—'} vs ${latestGame.opponent || 'Opponent'}` : 'No result published yet'}</div><div className="mt-1 text-[9px] text-slate-500">{latestGame ? `Week ${latestGame.week || model.week}${latestGame.homeScore !== '' && latestGame.homeScore != null ? ` · ${latestGame.homeScore}-${latestGame.awayScore}` : ''}` : 'Use the Weekly Agenda to add the first update.'}</div></div><div className="text-2xl font-black text-white">{model.record.wins}-{model.record.losses}</div></div>
            </div>
            {!readOnly && <button type="button" onClick={() => onNavigate('dataEntry')} className="relative mt-4 flex w-full items-center justify-between rounded border border-white/10 bg-white/[0.035] px-3 py-2.5 text-[8px] font-black uppercase tracking-wider text-white hover:border-white/25">View weekly agenda <ChevronRight size={13} /></button>}
          </div>
        </DashboardCard>

        <DashboardCard title="Season Snapshot" actionLabel="Full team stats" onAction={() => onNavigate('dataEntry')} className="lg:col-span-5">
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
            {snapshotMetrics.slice(0, 8).map((metric) => (
              <div key={metric.label} className="flex min-h-[94px] flex-col items-center justify-center rounded border border-white/[0.06] bg-black/20 px-2 py-3 text-center">
                <div className="text-[7px] font-black uppercase tracking-[0.09em] text-slate-500">{metric.label}</div>
                <div className={`mt-2 text-2xl font-black ${toneClasses[metric.tone] || 'text-white'}`}>{metric.value}</div>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="My Profile" actionLabel={model.stage === CAREER_STAGES.OC ? 'OC' : model.stage === CAREER_STAGES.HC ? 'HC' : player.pos || 'QB'} className="lg:col-span-3">
          <div className="min-h-[270px] p-5">
            <div className="flex items-start justify-between gap-4"><div><div className="text-xl font-black uppercase leading-tight text-white">{profileRole}</div><div className="mt-1 text-[10px] text-slate-400">{model.institution}</div></div><div className="text-6xl font-black leading-none text-emerald-300/90">{isCoach ? (model.institution?.[0] || 'D') : (player.number || 2)}</div></div>
            <div className="mt-5 space-y-3 border-y border-white/[0.07] py-4 text-[9px]">
              <div className="flex justify-between gap-4"><span className="font-black uppercase text-slate-500">Name</span><span className="text-right font-black text-white">{playerName}</span></div>
              <div className="flex justify-between gap-4"><span className="font-black uppercase text-slate-500">Career record</span><span className="font-black text-white">{model.careerRecord?.wins || 0}-{model.careerRecord?.losses || 0}</span></div>
              <div className="flex justify-between gap-4"><span className="font-black uppercase text-slate-500">Career goals</span><span className="text-right text-slate-300">Build. Recruit. Win.</span></div>
            </div>
            <button type="button" onClick={() => onNavigate('chronicle')} className="mt-4 flex w-full items-center justify-between rounded border border-white/10 bg-white/[0.035] px-3 py-2.5 text-[8px] font-black uppercase tracking-wider text-white hover:border-white/25">Career profile <ChevronRight size={13} /></button>
          </div>
        </DashboardCard>

        <DashboardCard title={isCoach ? 'Road to Glory Career' : 'Road to Glory'} actionLabel={isCoach ? 'Complete' : 'Active'} className="lg:col-span-4" >
          <div id="road-to-glory-snapshot" className="min-h-[260px] p-5">
            <div className="flex items-start justify-between gap-5">
              <div><div className="text-[11px] font-black text-white">{player.pos || 'QB'} <span className="mx-2 text-slate-700">|</span> {player.archetype || 'Dual-Threat'}</div><div className="mt-2 text-[10px] leading-relaxed text-slate-400">{player.school || model.institution}<br />{player.height || 'Height not recorded'} · {player.weight || 'Weight not recorded'}</div></div>
              <div className="text-right"><div className="text-4xl font-black text-white">{player.overall || '—'}</div><div className="text-[7px] font-black uppercase text-slate-500">OVR</div></div>
            </div>
            <div className="mt-6 grid grid-cols-[100px_1fr] items-center gap-5">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-[7px] border-emerald-400/70 border-r-slate-800 text-center"><div><div className="text-2xl font-black text-white">{player.overall || '—'}</div><div className="text-[7px] font-black uppercase text-slate-500">OVR</div></div></div>
              <div className="space-y-2 text-[8px] uppercase"><div className="flex justify-between"><span className="text-slate-500">Games played</span><strong className="text-white">{careerGames}</strong></div><div className="flex justify-between"><span className="text-slate-500">Pass yards</span><strong className="text-white">{numberValue(careerTotals.passYds).toLocaleString()}</strong></div><div className="flex justify-between"><span className="text-slate-500">Rush yards</span><strong className="text-white">{numberValue(careerTotals.rushYds).toLocaleString()}</strong></div><div className="flex justify-between"><span className="text-slate-500">Total TD</span><strong className="text-white">{numberValue(careerTotals.passTD) + numberValue(careerTotals.rushTD)}</strong></div><div className="flex justify-between"><span className="text-slate-500">Recruit rank</span><strong className="tracking-wider text-amber-300">{'★'.repeat(stars)}<span className="text-slate-700">{'☆'.repeat(5 - stars)}</span></strong></div></div>
            </div>
            <button type="button" onClick={() => onNavigate('chronicle')} className="mt-5 flex w-full items-center justify-between rounded border border-white/10 bg-white/[0.035] px-3 py-2.5 text-[8px] font-black uppercase tracking-wider text-white">View RTG career <ChevronRight size={13} /></button>
          </div>
        </DashboardCard>

        <DashboardCard title="Career Timeline" actionLabel="View full timeline" onAction={() => onNavigate('chronicle')} className="lg:col-span-4">
          <div className="min-h-[260px] p-4">
            {!model.recentEvents.length && <EmptyBrief>Your first published week or confirmed milestone will begin the permanent career timeline.</EmptyBrief>}
            <div className="space-y-0.5">
              {model.recentEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="grid grid-cols-[52px_22px_minmax(0,1fr)] items-center gap-2 border-b border-white/[0.06] py-2.5 last:border-0">
                  <div className="text-[9px] font-black text-slate-400">{event.year || `S${event.season || 1}`}</div>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-[8px] font-black text-emerald-300">•</div>
                  <div className="min-w-0"><div className="truncate text-[9px] font-black text-white">{event.title}</div>{event.summary && <div className="mt-0.5 truncate text-[8px] text-slate-500">{event.summary}</div>}</div>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={isCoach ? 'Dynasty Central' : 'Journey Central'} actionLabel="Open hub" onAction={() => onNavigate(isCoach ? 'frontOffice' : 'dataEntry')} className="lg:col-span-4">
          <div id="dynasty-central-snapshot" className="min-h-[260px] divide-y divide-white/[0.06] px-4 py-2">
            {centralLinks.map((item) => (
              <button key={item.label} type="button" onClick={() => onNavigate(item.tab)} className="flex w-full items-center gap-3 py-3 text-left group">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/10 bg-white/[0.04] text-slate-300 group-hover:text-emerald-300"><item.Icon size={15} /></span>
                <span className="min-w-0 flex-1"><span className="block text-[9px] font-black text-white">{item.label}</span><span className="mt-0.5 block truncate text-[8px] text-slate-500">{item.description}</span></span>
              </button>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Newsroom" actionLabel="View all" onAction={() => onNavigate('newsroom')} className="lg:col-span-6">
          {leadArticle ? (
            <div className="grid min-h-[270px] gap-4 p-4 sm:grid-cols-[1.1fr_.9fr]">
              <button type="button" onClick={() => onNavigate('newsroom')} className="group relative min-h-52 overflow-hidden rounded border border-white/10 bg-slate-950 text-left">
                {newsroomImage ? <img src={newsroomImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75 transition-transform duration-500 group-hover:scale-105" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,.22),transparent_42%),linear-gradient(135deg,#18232a,#071015)]" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="relative flex h-full min-h-52 flex-col justify-end p-4"><div className="text-[8px] font-black uppercase tracking-wider text-emerald-300">{leadArticle.outletName || 'DynastyHQ Newsroom'}</div><div className="mt-1 text-base font-black leading-tight text-white">{leadArticle.headline}</div><div className="mt-1 text-[8px] text-slate-400">Season {latestIssue.season || model.season} · Week {latestIssue.week || model.week}</div></div>
              </button>
              <div className="divide-y divide-white/[0.06]">
                {supportingHeadlines.map((article) => <button key={article.id} type="button" onClick={() => onNavigate('newsroom')} className="block w-full py-3 text-left"><div className="text-[9px] font-black leading-snug text-slate-200 hover:text-emerald-300">{article.headline}</div><div className="mt-1 text-[7px] text-slate-600">{article.outletName || article.desk || 'Latest edition'}</div></button>)}
                {!supportingHeadlines.length && <EmptyBrief>This verified edition is ready to read.</EmptyBrief>}
              </div>
            </div>
          ) : <EmptyBrief>No edition published yet. Your first verified week will create the lead story and recent headlines.</EmptyBrief>}
        </DashboardCard>

        <DashboardCard title="Recruiting Board" actionLabel="View board" onAction={() => onNavigate('recruiting')} className="lg:col-span-6">
          {targetSchools.length ? (
            <div className="min-h-[270px] p-4">
              <div className="grid grid-cols-[28px_minmax(0,1fr)_72px_100px_55px] gap-2 border-b border-white/[0.07] pb-2 text-[6px] font-black uppercase tracking-wider text-slate-600"><span>Rank</span><span>Target</span><span>Pos</span><span>Status</span><span>Interest</span></div>
              {targetSchools.map((school, index) => {
                const interest = numberValue(school.interest);
                return <div key={school.id || school.name} className="grid grid-cols-[28px_minmax(0,1fr)_72px_100px_55px] items-center gap-2 border-b border-white/[0.06] py-3 last:border-0"><span className="text-[9px] font-black text-slate-400">{index + 1}</span><span className="truncate text-[9px] font-black text-white">{school.name}</span><span className="text-[8px] text-slate-500">{school.pos || school.position || '—'}</span><span><span className="mb-1 block text-[7px] font-black uppercase text-slate-400">{school.offered ? 'Offer' : model.stage === CAREER_STAGES.HIGH_SCHOOL ? `Choice #${school.preferenceRank || school.customOrder || index + 1}` : 'Tracking'}</span><span className="block h-1.5 overflow-hidden rounded-full bg-slate-800"><span className={`block h-full ${school.offered ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${school.offered ? 100 : Math.max(8, interest)}%` }} /></span></span><span className={`text-[7px] font-black uppercase ${school.offered || interest >= 60 ? 'text-emerald-300' : interest >= 30 ? 'text-amber-300' : 'text-slate-500'}`}>{school.offered ? 'High' : interest ? `${interest}%` : '—'}</span></div>;
              })}
            </div>
          ) : <EmptyBrief>No verified targets are on the board yet. Open Recruiting to add the first school or prospect.</EmptyBrief>}
        </DashboardCard>

        <section className="dhq-dashboard-card grid overflow-hidden lg:col-span-12 lg:grid-cols-[1fr_1.4fr_1.25fr]">
          <div className="flex min-h-36 flex-col justify-center border-b border-white/[0.07] p-5 lg:border-b-0 lg:border-r"><div className="text-3xl font-black leading-none text-slate-400">“</div><p className="mt-1 max-w-xs text-[11px] font-black uppercase leading-relaxed tracking-[0.05em] text-white">{quote}</p><div className="mt-2 font-[cursive] text-xl italic text-slate-400">BWJ</div></div>
          <div className="border-b border-white/[0.07] p-4 lg:border-b-0 lg:border-r"><div className="mb-3 text-[8px] font-black uppercase tracking-wider text-slate-400">Quick Actions</div><div className="grid grid-cols-4 gap-2">{quickActions.map((action) => <button key={action.label} type="button" disabled={readOnly && action.tab === 'dataEntry'} onClick={() => onNavigate(action.tab)} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded border border-white/[0.06] bg-white/[0.025] p-2 text-center text-[7px] font-bold text-slate-300 hover:border-white/20 hover:text-white disabled:opacity-40"><action.Icon size={17} /><span>{action.label}</span></button>)}</div></div>
          <div className="p-4"><div className="mb-2 flex items-center justify-between"><div className="text-[8px] font-black uppercase tracking-wider text-slate-400">Recent Schedule</div><button type="button" onClick={() => onNavigate('chronicle')} className="text-[7px] font-black uppercase text-slate-600 hover:text-white">View history</button></div><div className="divide-y divide-white/[0.06]">{model.recentGames.slice(0, 3).map((game) => <div key={`${game.season}-${game.week}-${game.opponent}`} className="grid grid-cols-[1fr_55px_55px] gap-2 py-2.5 text-[8px]"><span className="truncate font-bold text-slate-200">vs {game.opponent || `Tape Game ${game.evaluation?.gameNumber || game.week}`}</span><span className="text-slate-500">Week {game.week || '—'}</span><span className={`text-right font-black ${game.result === 'W' ? 'text-emerald-300' : game.result === 'L' ? 'text-red-300' : 'text-slate-400'}`}>{game.result || 'Logged'}{game.homeScore !== '' && game.homeScore != null ? ` ${game.homeScore}-${game.awayScore}` : ''}</span></div>)}{!model.recentGames.length && <p className="py-7 text-center text-[9px] text-slate-600">No verified games yet.</p>}</div></div>
        </section>

        <details className="dhq-dashboard-card group lg:col-span-12">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 hover:text-white"><span>Verified career detail</span><ChevronRight size={14} className="transition-transform group-open:rotate-90" /></summary>
          <div className="grid gap-3 border-t border-white/[0.07] p-4 md:grid-cols-3">{model.panels.map((panel) => <div key={panel.id} className="rounded border border-white/[0.07] bg-black/20 p-4"><div className="mb-2 text-[9px] font-black uppercase tracking-wider text-emerald-300">{panel.title}</div>{panel.rows.map((row) => <div key={row.label} className="flex justify-between gap-3 border-t border-white/[0.06] py-2 text-[8px]"><span className="uppercase text-slate-500">{row.label}</span><strong className={toneClasses[row.tone] || toneClasses.default}>{row.value}</strong></div>)}</div>)}</div>
        </details>
      </div>

      <footer className="mx-3 mt-3 flex flex-col items-center justify-between gap-3 border-t border-white/[0.07] px-3 py-6 text-center sm:mx-5 sm:flex-row sm:text-left lg:mx-8">
        <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-[8px] font-black text-slate-400">CF27</span><span className="text-[8px] font-black uppercase tracking-wider text-slate-400">College Football 27 Command Center</span></div>
        <div className="text-[7px] text-slate-600">Fan experience tool · Not affiliated with EA Sports.</div>
        <div className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-500">Built for the ultimate college football experience</div>
      </footer>
    </div>
  );
};

export default CareerCommandCenter;
