import { useState } from 'react';
import {
  Briefcase,
  CalendarDays,
  ChevronRight,
  Film,
  GraduationCap,
  Headphones,
  Newspaper,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';
import { buildCommandCenter, CAREER_STAGES } from '../domain/commandCenter';
import { resolveNewsroomMedia } from '../domain/newsroomMedia';
import CareerTransitionPanel from './CareerTransitionPanel';

const toneClasses = {
  default: 'text-white',
  gold: 'text-amber-300',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-red-400',
};

const stageOrder = [
  { id: CAREER_STAGES.HIGH_SCHOOL, label: 'High School', caption: 'Recruit', Icon: Film },
  { id: CAREER_STAGES.COLLEGE, label: 'College Player', caption: 'Develop', Icon: GraduationCap },
  { id: CAREER_STAGES.OC, label: 'Coach', caption: 'Lead', Icon: Briefcase },
  { id: CAREER_STAGES.HC, label: 'Legacy', caption: 'The Goal', Icon: Trophy },
];

const stageName = {
  [CAREER_STAGES.HIGH_SCHOOL]: 'High School Recruit',
  [CAREER_STAGES.COLLEGE]: 'College Player',
  [CAREER_STAGES.OC]: 'Offensive Coordinator',
  [CAREER_STAGES.HC]: 'Head Coach',
  [CAREER_STAGES.RETIRED]: 'Legacy Complete',
};

const roleName = {
  [CAREER_STAGES.HIGH_SCHOOL]: 'High School Quarterback',
  [CAREER_STAGES.COLLEGE]: 'College Quarterback',
  [CAREER_STAGES.OC]: 'Offensive Coordinator',
  [CAREER_STAGES.HC]: 'Head Coach',
  [CAREER_STAGES.RETIRED]: 'Program Legend',
};

const DashboardCard = ({ id, title, headerAside, actionLabel, onAction, children, className = '' }) => (
  <section id={id} className={`dhq-dashboard-card flex min-w-0 flex-col overflow-hidden ${className}`}>
    <div className="flex min-h-8 items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-1.5">
      <h3 className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-100">{title}</h3>
      {headerAside}
    </div>
    <div className="min-h-0 flex-1">{children}</div>
    {actionLabel && (
      <div className="flex justify-center border-t border-white/[0.06] px-3 py-1.5">
        <button type="button" onClick={onAction} className="flex min-h-7 items-center justify-center gap-2 rounded border border-slate-700/80 bg-[#0a1c2b]/90 px-4 py-1.5 text-[7px] font-black uppercase tracking-[0.08em] text-slate-200 transition-colors hover:border-amber-400/55 hover:bg-amber-500/10 hover:text-white">
          <span>{actionLabel}</span><ChevronRight size={10} />
        </button>
      </div>
    )}
  </section>
);

const CareerJourney = ({ stage }) => {
  const activeIndex = stage === CAREER_STAGES.RETIRED ? 3 : Math.max(0, stageOrder.findIndex((item) => item.id === stage));
  return (
    <div className="dhq-career-journey relative px-4 py-1">
      {stageOrder.map((item, index) => {
        const reached = index <= activeIndex;
        const active = index === activeIndex;
        return (
          <div key={item.id} className="relative z-10 flex items-center gap-3 py-1.5">
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${active ? 'border-amber-300/70 bg-amber-500/15 text-amber-300' : reached ? 'border-emerald-400/45 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-black/30 text-slate-600'}`}>
              <item.Icon size={12} />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-[8px] font-black uppercase tracking-[0.07em] ${reached ? 'text-slate-100' : 'text-slate-600'}`}>{item.label}</div>
              <div className="mt-0.5 text-[7px] text-slate-500">{active ? 'Current chapter' : item.caption}</div>
            </div>
            {active ? <span className="rounded border border-amber-400/30 bg-amber-500/10 px-1.5 py-1 text-[6px] font-black uppercase tracking-wider text-amber-300">Active</span> : null}
          </div>
        );
      })}
    </div>
  );
};

const EmptyBrief = ({ children }) => <p className="px-5 py-5 text-center text-[9px] leading-relaxed text-slate-500">{children}</p>;

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
  const [showFullSchedule, setShowFullSchedule] = useState(false);
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
    .slice(0, 3);
  const stars = Math.min(5, Math.max(0, Number(highSchool.recruitStars || player.stars) || 0));
  const displayStars = stars || 3;
  const verifiedOffers = (state.recruiting || []).filter((school) => school.offered).length;
  const playerName = player.name || 'Bryan Wessel Jr.';
  const newsroomImage = resolveNewsroomMedia({
    article: leadArticle,
    mediaLibrary: state.newsroomMediaLibrary || [],
    fallbackUrl: state.outletImages?.local || state.outletImages?.broadsheet || '',
  }).url;
  const snapshotMetrics = buildSnapshotMetrics(model, state);
  const profileRole = roleName[model.stage];
  const isCoach = [CAREER_STAGES.OC, CAREER_STAGES.HC].includes(model.stage);
  const phaseSecondary = isCoach ? (coach.currentSchool || model.institution) : (player.school || model.institution);
  const careerTotals = model.careerTotals || {};
  const careerGames = state.gameLogs?.length || 0;
  const championshipCount = (state.trophies || []).filter((entry) => entry.type === 'Championship').length;
  const awardCount = (state.trophies || []).filter((entry) => entry.type === 'Award').length;
  const latestPodcast = (state.podcastEpisodes || []).at(-1) || null;
  const primaryActionLabel = model.primaryAction?.label || (isCoach ? 'Log Program Week' : 'Log Recruiting Week');

  return (
    <div id="dynastyhq-command-center" className="relative z-10 mx-auto max-w-[1600px] pb-5 animate-in fade-in">
      <section className="dhq-home-banner relative overflow-hidden border-b border-slate-700/60 px-5 py-5 sm:px-8 lg:px-14">
        <div className="relative z-10 mx-auto flex max-w-[1500px] flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.13em] text-amber-300">Dynasty HQ Command Center</div>
            <h1 className="mt-1 text-[22px] font-black tracking-tight text-white sm:text-[25px]">Your hub for recruiting, development, and legacy.</h1>
            <p className="mt-1 text-[11px] text-slate-300">Track every decision. Build your legacy. Make history.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {!readOnly ? (
              <button type="button" onClick={() => onNavigate('dataEntry')} className="flex min-h-10 items-center gap-2 rounded border border-amber-400/70 bg-black/35 px-5 py-2 text-[8px] font-black uppercase tracking-[0.08em] text-amber-300 shadow-[0_0_20px_rgba(245,158,11,.08)] transition-colors hover:bg-amber-400 hover:text-slate-950">
                <CalendarDays size={15} /> {primaryActionLabel}
              </button>
            ) : null}
            <button type="button" onClick={() => onNavigate('recruiting')} className="flex min-h-10 items-center gap-2 rounded border border-slate-500/80 bg-[#07111c]/70 px-5 py-2 text-[8px] font-black uppercase tracking-[0.08em] text-slate-100 transition-colors hover:border-amber-400/60 hover:text-amber-300">
              <Users size={15} /> Open Recruiting Board
            </button>
          </div>
        </div>
      </section>

      <div className="dhq-dashboard-grid grid gap-1.5 p-2 sm:px-3 lg:grid-cols-12">
        <DashboardCard id="recruit-command-center" title="Current Phase" headerAside={<span className="rounded border border-emerald-400/35 bg-emerald-500/15 px-2 py-1 text-[6px] font-black uppercase tracking-wider text-emerald-300">Active</span>} className="scroll-mt-20 lg:col-span-4 lg:min-h-[184px]">
          <div className="relative h-full overflow-hidden p-3.5">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_100%_45%,rgba(16,185,129,.15),transparent_70%)]" />
            <div className="relative"><div className="text-[17px] font-black uppercase leading-tight text-white">{stageName[model.stage]}</div><div className="mt-1 text-[9px] text-slate-400">{displayStars}-Star {player.pos || 'Athlete'} · {player.archetype || profileRole}</div></div>
            <div className="relative mt-2 text-[8px] text-slate-500">{phaseSecondary} · Season {model.season}, Week {model.week}</div>
            <div className="relative mt-2.5 flex items-center justify-between border-y border-white/[0.07] py-2">
              <span className="tracking-[0.08em] text-amber-300">{'★'.repeat(displayStars)}<span className="text-slate-700">{'☆'.repeat(5 - displayStars)}</span></span>
              <strong className="text-[13px] text-slate-200">{player.overall || '—'} OVR</strong>
            </div>
            <div className="relative grid grid-cols-3 divide-x divide-white/[0.07] pt-2.5 text-center">
              <div><div className="text-[6px] font-black uppercase text-slate-600">Natl Rank</div><div className="mt-1 text-[11px] font-black text-white">{highSchool.rankings?.national ? `#${highSchool.rankings.national}` : '—'}</div></div>
              <div><div className="text-[6px] font-black uppercase text-slate-600">Position Rank</div><div className="mt-1 text-[11px] font-black text-white">{highSchool.rankings?.position ? `#${highSchool.rankings.position}` : '—'}</div></div>
              <div><div className="text-[6px] font-black uppercase text-slate-600">State Rank</div><div className="mt-1 text-[11px] font-black text-white">{highSchool.rankings?.state ? `#${highSchool.rankings.state}` : '—'}</div></div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Season Snapshot" className="lg:col-span-5 lg:min-h-[184px]">
          <div className="grid h-full grid-cols-2 gap-1.5 p-3 sm:grid-cols-3">
            {snapshotMetrics.slice(0, 6).map((metric) => (
              <div key={metric.label} className="flex min-h-[55px] flex-col items-center justify-center rounded border border-white/[0.07] bg-black/20 px-2 py-1.5 text-center">
                <div className="text-[6px] font-black uppercase tracking-[0.08em] text-slate-500">{metric.label}</div>
                <div className={`mt-1.5 text-lg font-black ${toneClasses[metric.tone] || 'text-white'}`}>{metric.value}</div>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Your Profile" className="lg:col-span-3 lg:min-h-[184px]">
          <div className="flex h-full flex-col p-3.5">
            <div className="flex min-h-0 items-start justify-between gap-3"><div className="min-w-0"><div className="text-[7px] font-black uppercase tracking-wider text-slate-500">Dynasty Leader</div><div className="mt-1 truncate text-[15px] font-black text-white">{playerName}</div><div className="mt-1 text-[8px] leading-relaxed text-slate-400">{profileRole}<br />{model.institution || 'Institution not recorded'}<br />Record: {model.careerRecord?.wins || 0}-{model.careerRecord?.losses || 0}</div></div><div className="relative flex h-[84px] w-[78px] shrink-0 items-end justify-center overflow-hidden rounded border border-slate-500/70 bg-gradient-to-b from-slate-800 to-[#07111b]">{player.headshot ? <img src={player.headshot} alt={`${playerName} headshot`} className="h-full w-full object-cover" /> : <UserRound size={64} strokeWidth={1.1} className="translate-y-2 text-slate-600" aria-label="Player headshot placeholder" />}</div></div>
            <div className="mt-auto grid grid-cols-3 divide-x divide-white/[0.07] border-t border-white/[0.07] pt-2.5 text-center">
              <div><Trophy size={13} className="mx-auto text-slate-400" /><div className="mt-1 text-[6px] uppercase text-slate-600">Titles</div><strong className="text-[10px] text-white">{championshipCount}</strong></div>
              <div><ShieldCheck size={13} className="mx-auto text-slate-400" /><div className="mt-1 text-[6px] uppercase text-slate-600">Awards</div><strong className="text-[10px] text-white">{awardCount}</strong></div>
              <div><Users size={13} className="mx-auto text-slate-400" /><div className="mt-1 text-[6px] uppercase text-slate-600">Offers</div><strong className="text-[10px] text-white">{verifiedOffers}</strong></div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={isCoach ? 'Road to Glory Career' : 'Road to Glory'} headerAside={<span className="rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-1 text-[6px] font-black uppercase text-emerald-300">{isCoach ? 'Complete' : 'Active'}</span>} className="lg:col-span-4 lg:min-h-[142px]">
          <div id="road-to-glory-snapshot" className="grid h-full grid-cols-[94px_1fr] items-center gap-3 p-3">
            <div className="relative flex h-[78px] w-[78px] items-center justify-center rounded-full border-[6px] border-emerald-400/70 border-r-slate-800 text-center"><div><div className="text-[26px] font-black text-white">{player.overall || '—'}</div><div className="text-[7px] font-black uppercase text-slate-500">OVR</div></div></div>
            <div className="space-y-1.5 text-[8px] uppercase"><div className="flex justify-between"><span className="text-slate-500">Games played</span><strong className="text-white">{careerGames}</strong></div><div className="flex justify-between"><span className="text-slate-500">Pass yds</span><strong className="text-white">{numberValue(careerTotals.passYds).toLocaleString()}</strong></div><div className="flex justify-between"><span className="text-slate-500">Rush yds</span><strong className="text-white">{numberValue(careerTotals.rushYds).toLocaleString()}</strong></div><div className="flex justify-between"><span className="text-slate-500">Total TDs</span><strong className="text-white">{numberValue(careerTotals.passTD) + numberValue(careerTotals.rushTD)}</strong></div><div className="flex justify-between"><span className="text-slate-500">Recruit rank</span><strong className="tracking-wider text-amber-300">{'★'.repeat(displayStars)}<span className="text-slate-700">{'☆'.repeat(5 - displayStars)}</span></strong></div></div>
          </div>
        </DashboardCard>

        <DashboardCard title="Career Timeline" actionLabel="View Full Timeline" onAction={() => onNavigate('chronicle')} className="lg:col-span-5 lg:min-h-[142px]">
          <div className="px-3.5 py-1">
            {!model.recentEvents.length && <EmptyBrief>Your first published week or confirmed milestone will begin the permanent career timeline.</EmptyBrief>}
            {model.recentEvents.slice(0, 4).map((event) => (
              <div key={event.id} className="grid grid-cols-[42px_18px_minmax(0,1fr)] items-center gap-2 border-b border-white/[0.06] py-2 last:border-0">
                <div className="text-[8px] font-black text-slate-400">{event.year || `S${event.season || 1}`}</div><div className="flex h-4 w-4 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-950/40 text-[7px] text-emerald-300">•</div><div className="min-w-0"><div className="truncate text-[8px] font-black text-white">{event.title}</div>{event.summary && <div className="mt-0.5 truncate text-[7px] text-slate-500">{event.summary}</div>}</div>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Career Journey" className="lg:col-span-3 lg:min-h-[142px]"><CareerJourney stage={model.stage} /></DashboardCard>

        <DashboardCard title="Newsroom" actionLabel="Open Newsroom" onAction={() => onNavigate('newsroom')} className="lg:col-span-3 lg:min-h-[132px]">
          {leadArticle ? (
            <div className="grid h-full min-h-[92px] gap-2 p-2.5 sm:grid-cols-[0.9fr_1.1fr]">
              <div className="relative min-h-[92px] overflow-hidden rounded border border-white/10 bg-slate-950 text-left">
                {newsroomImage ? <img src={newsroomImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,.22),transparent_42%),linear-gradient(135deg,#18232a,#071015)]" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="relative flex h-full min-h-[92px] flex-col justify-end p-2.5"><div className="text-[6px] font-black uppercase tracking-wider text-emerald-300">{leadArticle.outletName || 'DynastyHQ Newsroom'}</div><div className="mt-1 line-clamp-2 text-[9px] font-black leading-tight text-white">{leadArticle.headline}</div><div className="mt-1 text-[6px] text-slate-400">Season {latestIssue.season || model.season} · Week {latestIssue.week || model.week}</div></div>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {supportingHeadlines.map((article) => <div key={article.id} className="py-2 text-left"><div className="text-[8px] font-black leading-snug text-slate-200">{article.headline}</div><div className="mt-1 text-[6px] text-slate-600">{article.outletName || article.desk || 'Latest edition'}</div></div>)}
                {!supportingHeadlines.length && <EmptyBrief>This verified edition is ready to read.</EmptyBrief>}
              </div>
            </div>
          ) : <div className="flex min-h-[92px] items-center gap-3 px-4 py-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-400"><Newspaper size={20} /></span><p className="text-[8px] leading-relaxed text-slate-400">No edition published yet. Your first verified week will create the lead story and recent headlines.</p></div>}
        </DashboardCard>

        <DashboardCard title="Recruiting Board" actionLabel="Open Recruit Command Center" onAction={() => onNavigate('commandCenter')} className="lg:col-span-3 lg:min-h-[132px]">
          {targetSchools.length ? (
            <div className="min-h-[92px] p-2.5">
              <div className="grid grid-cols-[24px_minmax(0,1fr)_54px_70px_40px] gap-1.5 border-b border-white/[0.07] pb-1.5 text-[6px] font-black uppercase tracking-wider text-slate-600"><span>#</span><span>Target</span><span>Pos</span><span>Status</span><span>Interest</span></div>
              {targetSchools.map((school, index) => {
                const interest = numberValue(school.interest);
                return <div key={school.id || school.name} className="grid grid-cols-[24px_minmax(0,1fr)_54px_70px_40px] items-center gap-1.5 border-b border-white/[0.06] py-1.5 last:border-0"><span className="text-[8px] font-black text-slate-400">{index + 1}</span><span className="truncate text-[8px] font-black text-white">{school.name}</span><span className="truncate text-[7px] text-slate-500">{school.pos || school.position || '—'}</span><span><span className="mb-1 block truncate text-[6px] font-black uppercase text-slate-400">{school.offered ? 'Offer' : model.stage === CAREER_STAGES.HIGH_SCHOOL ? `Choice #${school.preferenceRank || school.customOrder || index + 1}` : 'Tracking'}</span><span className="block h-1 overflow-hidden rounded-full bg-slate-800"><span className={`block h-full ${school.offered ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${school.offered ? 100 : Math.max(8, interest)}%` }} /></span></span><span className={`text-[6px] font-black uppercase ${school.offered || interest >= 60 ? 'text-emerald-300' : interest >= 30 ? 'text-amber-300' : 'text-slate-500'}`}>{school.offered ? 'High' : interest ? `${interest}%` : '—'}</span></div>;
              })}
            </div>
          ) : <div className="flex min-h-[92px] items-center gap-3 px-4 py-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-400"><Users size={20} /></span><p className="text-[8px] leading-relaxed text-slate-400">No verified targets are on the board yet. Open Recruiting to add the first school or prospect.</p></div>}
        </DashboardCard>

        <DashboardCard title="Podcast" actionLabel="Listen to Podcast" onAction={() => onNavigate('podcast')} className="lg:col-span-3 lg:min-h-[132px]">
          <div className="flex min-h-[92px] items-center gap-3 px-4 py-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-black/20 text-slate-300"><Headphones size={22} /></span>
            <div className="min-w-0"><div className="text-[8px] font-black text-slate-200">{latestPodcast?.title || 'Gridiron Grind'}</div><p className="mt-1 text-[8px] leading-relaxed text-slate-400">{latestPodcast ? 'The latest episode and weekly recap are ready.' : 'Listen to the latest episode and weekly recap.'}</p></div>
          </div>
        </DashboardCard>

        <DashboardCard title="Recent Schedule" actionLabel={showFullSchedule ? 'Show Compact Schedule' : 'View Schedule'} onAction={() => setShowFullSchedule((current) => !current)} className="lg:col-span-3 lg:min-h-[132px]">
          <div className="divide-y divide-white/[0.06] px-3 py-1">{model.recentGames.slice(0, showFullSchedule ? 6 : 3).map((game) => <div key={`${game.season}-${game.week}-${game.opponent}`} className="grid grid-cols-[1fr_38px] gap-2 py-1.5 text-[7px]"><span className="min-w-0"><span className="block truncate font-bold text-slate-200">vs {game.opponent || `Tape Game ${game.evaluation?.gameNumber || game.week}`}</span><span className="mt-0.5 block text-[6px] text-slate-600">Week {game.week || '—'}</span></span><span className={`text-right font-black ${game.result === 'W' ? 'text-emerald-300' : game.result === 'L' ? 'text-red-300' : 'text-slate-400'}`}>{game.result || 'Logged'}{game.homeScore !== '' && game.homeScore != null ? <span className="mt-0.5 block text-[6px] text-slate-500">{game.homeScore}-{game.awayScore}</span> : null}</span></div>)}{!model.recentGames.length && <div className="flex min-h-[92px] items-center gap-3 px-1"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-400"><CalendarDays size={20} /></span><p className="text-[8px] text-slate-400">No verified games yet.</p></div>}</div>
        </DashboardCard>

        <details open className="dhq-dashboard-card group lg:col-span-12">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2 text-[8px] font-black uppercase tracking-[0.12em] text-amber-300 hover:text-white"><span>Verified Career Detail</span><ChevronRight size={12} className="transition-transform group-open:rotate-90" /></summary>
          <div className="grid gap-px border-t border-white/[0.07] bg-white/[0.06] md:grid-cols-3">{model.panels.map((panel) => <div key={panel.id} className="bg-black/20 px-5 py-3"><div className="mb-1 text-[8px] font-black uppercase tracking-wider text-emerald-300">{panel.title}</div>{panel.rows.map((row) => <div key={row.label} className="flex justify-between gap-3 py-1 text-[7px]"><span className="uppercase text-slate-500">{row.label}</span><strong className={toneClasses[row.tone] || toneClasses.default}>{row.value}</strong></div>)}</div>)}</div>
        </details>
      </div>

      <div className="mx-2 mt-2 scroll-mt-20 sm:mx-3">
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

    </div>
  );
};

export default CareerCommandCenter;
