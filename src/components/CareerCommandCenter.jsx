import {
  Activity,
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Film,
  GraduationCap,
  HeartPulse,
  Map,
  Medal,
  Newspaper,
  Radio,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { buildCommandCenter, CAREER_STAGES } from '../domain/commandCenter';
import { formatRtgDelta, formatRtgValue } from '../domain/rtgProgress';
import wesselPlayerHero from '../assets/dynastyhq-player-wessel-2-transparent.png';
import CareerTransitionPanel from './CareerTransitionPanel';

const panelIcons = {
  map: Map,
  film: Film,
  health: HeartPulse,
  target: Target,
  money: DollarSign,
  playbook: ClipboardList,
  users: Users,
  contract: Briefcase,
  shield: ShieldCheck,
  trophy: Trophy,
  book: BookOpen,
  briefcase: Briefcase,
};

const toneClasses = {
  default: 'text-white',
  gold: 'text-amber-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-red-400',
};

const adviceClasses = {
  info: 'border-blue-500 bg-slate-900/80 text-slate-300',
  success: 'border-emerald-500 bg-emerald-950/40 text-emerald-100',
  warning: 'border-amber-500 bg-amber-950/40 text-amber-100',
  danger: 'border-red-500 bg-red-950/40 text-red-100',
};

const StagePanel = ({ panel }) => {
  const Icon = panelIcons[panel.icon] || Activity;
  return (
    <div className="flex flex-col rounded-xl border border-slate-700/50 bg-slate-900/85 p-5 shadow-2xl backdrop-blur-md">
      <h3 className="flex items-center gap-2 border-b border-slate-700/50 pb-3 text-sm font-black uppercase tracking-wider text-white">
        <Icon size={16} className="text-amber-400" /> {panel.title}
      </h3>
      <div className="mt-3 divide-y divide-slate-800/80 rounded-lg border border-slate-800/50 bg-slate-950/50 px-4 shadow-inner">
        {panel.rows.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</span>
            <span className={`text-right text-xs font-black ${toneClasses[item.tone] || toneClasses.default}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const RecentGames = ({ model }) => {
  const isHighSchool = model.stage === CAREER_STAGES.HIGH_SCHOOL;
  const playerView = model.stage === CAREER_STAGES.COLLEGE;
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-md lg:col-span-2">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold uppercase tracking-wide text-white">
        <Activity size={18} className="text-amber-500" /> {isHighSchool ? 'Verified Tape Evaluations' : 'Verified Season Results'}
      </h3>
      <div className="max-h-[300px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 border-b border-slate-700 bg-slate-900 text-slate-400">
            <tr>
              {isHighSchool
                ? <><th className="pb-2">Game</th><th className="pb-2">Moment results</th><th className="pb-2">Tape Score</th><th className="pb-2">Rating</th></>
                : <><th className="pb-2">Wk</th><th className="pb-2">Opponent</th><th className="pb-2">Result</th><th className="pb-2">Score</th></>}
              {playerView && <><th className="pb-2">Pass</th><th className="pb-2">Rush</th></>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200">
            {!model.recentGames.length && (
              <tr><td colSpan={playerView ? 6 : 4} className="py-8 text-center text-slate-500">No verified result has been published for this season.</td></tr>
            )}
            {model.recentGames.map((game, index) => {
              const evaluation = game.evaluation || {};
              const counts = (evaluation.moments || []).reduce((result, moment) => ({ ...result, [moment.result]: (result[moment.result] || 0) + 1 }), {});
              return <tr key={`${game.season || model.season}-${game.week || index}-${game.opponent || evaluation.gameNumber}`} className="hover:bg-slate-800/30">
                {isHighSchool ? <>
                  <td className="py-3 font-mono text-slate-400">{evaluation.gameNumber || game.week || '—'}/5</td>
                  <td className="py-3 font-bold text-white">{counts.success || 0} successful · {counts.partial || 0} partial · {counts.failed || 0} failed</td>
                  <td className="py-3 font-mono text-blue-300">{evaluation.tapeScoreAfter === '' || evaluation.tapeScoreAfter === undefined ? '—' : Number(evaluation.tapeScoreAfter).toLocaleString()}</td>
                  <td className="py-3 font-black text-amber-400">{evaluation.recruitStarsAfter || '—'}-star</td>
                </> : <>
                <td className="py-3 font-mono text-slate-400">{game.week || '—'}</td>
                <td className="py-3 font-bold text-white">{game.opponent || 'Unknown opponent'}</td>
                <td className={`py-3 font-black ${game.result === 'W' ? 'text-emerald-400' : 'text-red-400'}`}>{game.result || '—'}</td>
                <td className="py-3 font-mono">{game.homeScore !== '' && game.homeScore !== undefined ? `${game.homeScore}-${game.awayScore}` : '—'}</td>
                {playerView && <>
                  <td className="py-3">{game.didPlay === false ? 'DNP' : `${game.passYds || 0}/${game.passTD || 0}`}</td>
                  <td className="py-3 text-amber-400">{game.didPlay === false ? 'DNP' : `${game.rushYds || 0}/${game.rushTD || 0}`}</td>
                </>}
                </>}
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PlayerProgressLedger = ({ model }) => {
  const progress = model.rtgProgress;
  const latest = progress.latest || {};
  const entries = [...(progress.snapshots || [])].reverse().slice(0, 10);
  const currentMetrics = [
    ['Depth Chart', 'rank'],
    ['Coach Trust', 'coachTrust'],
    ['GPA / Energy', 'gpa', 'energy'],
    ['Followers / NIL', 'followers', 'valuation'],
  ];

  return (
    <div className="rounded-xl border border-blue-500/25 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md lg:col-span-2">
      <div className="flex flex-col gap-2 border-b border-slate-700/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide text-white">
            <Activity size={18} className="text-blue-400" /> RTG Performance & Progression
          </h3>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Game statistics, player mechanics, and NIL—preserved together every published week</p>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">{progress.snapshots.length} career snapshot{progress.snapshots.length === 1 ? '' : 's'}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {currentMetrics.map(([label, firstKey, secondKey]) => (
          <div key={label} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="text-[8px] font-black uppercase tracking-widest text-slate-600">Current {label}</div>
            <div className="mt-1 text-sm font-black text-white">
              {formatRtgValue(firstKey, latest[firstKey])}
              {secondKey && <span className="text-slate-600"> / </span>}
              {secondKey && <span className={secondKey === 'valuation' ? 'text-emerald-400' : 'text-white'}>{formatRtgValue(secondKey, latest[secondKey])}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 max-h-[380px] overflow-auto">
        <table className="min-w-[980px] w-full text-left text-xs">
          <thead className="sticky top-0 border-b border-slate-700 bg-slate-900 text-slate-400">
            <tr>
              <th className="pb-2">Week</th><th className="pb-2">Opponent & game line</th><th className="pb-2">Role & trust</th>
              <th className="pb-2">GPA & energy</th><th className="pb-2">Followers & NIL</th><th className="pb-2">Weekly movement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200">
            {!entries.length && (
              <tr><td colSpan="6" className="py-8 text-center text-slate-500">Your current values are visible above. Publish the next week to lock the first permanent RTG/NIL snapshot beside its game stats.</td></tr>
            )}
            {entries.map((entry) => {
              const snapshot = entry.snapshot || {};
              const game = entry.game;
              return (
                <tr key={entry.id} className="align-top hover:bg-slate-800/30">
                  <td className="py-3 font-mono text-slate-400">S{entry.season} · W{entry.week}</td>
                  <td className="py-3">
                    <div className="font-bold text-white">{game?.opponent || 'Weekly update'}</div>
                    <div className="mt-1 text-[10px] text-slate-500">{game ? `${game.result || '—'} · ${game.didPlay === false ? 'DNP' : `${game.passYds || 0} pass / ${game.rushYds || 0} rush`}` : 'No game attached'}</div>
                  </td>
                  <td className="py-3"><div className="font-bold text-amber-300">{formatRtgValue('rank', snapshot.rank)}</div><div className="mt-1 text-slate-500">Trust {formatRtgValue('coachTrust', snapshot.coachTrust)}</div></td>
                  <td className="py-3"><div>{formatRtgValue('gpa', snapshot.gpa)} GPA</div><div className="mt-1 text-slate-500">Energy {formatRtgValue('energy', snapshot.energy)}</div></td>
                  <td className="py-3"><div>{formatRtgValue('followers', snapshot.followers)}</div><div className="mt-1 text-emerald-400">{formatRtgValue('valuation', snapshot.valuation)}</div></td>
                  <td className="py-3">
                    {entry.changes.length ? (
                      <div className="flex max-w-[250px] flex-wrap gap-1.5">
                        {entry.changes.slice(0, 3).map((change) => (
                          <span key={change.key} className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${change.kind === 'number' && change.delta < 0 ? 'border-red-500/30 bg-red-950/20 text-red-300' : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'}`}>
                            {change.label} {formatRtgDelta(change)}
                          </span>
                        ))}
                        {entry.changes.length > 3 && <span className="px-1 py-1 text-[8px] font-bold text-slate-500">+{entry.changes.length - 3} more</span>}
                      </div>
                    ) : <span className="text-[10px] text-slate-600">Career baseline</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">DynastyHQ records what CFB 27 shows and highlights verified movement. It does not invent hidden gameplay bonuses, penalties, deals, or eligibility outcomes.</p>
    </div>
  );
};

const LegacyEvents = ({ model }) => (
  <div className="rounded-xl border border-slate-700/50 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-md lg:col-span-2">
    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold uppercase tracking-wide text-white">
      <BookOpen size={18} className="text-amber-500" /> Defining Career Events
    </h3>
    <div className="space-y-3">
      {!model.recentEvents.length && <p className="py-8 text-center text-sm text-slate-500">No verified Chronicle events are available.</p>}
      {model.recentEvents.map((event) => (
        <div key={event.id} className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-4">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">Season {event.season || 1} · Week {event.week || 1}</div>
          <div className="mt-1 text-sm font-black text-white">{event.title}</div>
          {event.summary && <p className="mt-1 text-xs leading-relaxed text-slate-400">{event.summary}</p>}
        </div>
      ))}
    </div>
  </div>
);

const stageOrder = [
  { id: CAREER_STAGES.HIGH_SCHOOL, label: 'High School', caption: 'Recruit', Icon: Film },
  { id: CAREER_STAGES.COLLEGE, label: 'College Player', caption: 'Develop', Icon: GraduationCap },
  { id: CAREER_STAGES.OC, label: 'Coach', caption: 'Lead', Icon: Briefcase },
  { id: CAREER_STAGES.HC, label: 'Legacy', caption: 'The Goal', Icon: Trophy },
];

const DashboardCard = ({ title, actionLabel, onAction, children, className = '' }) => (
  <section className={`overflow-hidden rounded-lg border border-slate-700/70 bg-[#07131d]/90 shadow-[0_18px_50px_rgba(0,0,0,0.32)] backdrop-blur-md ${className}`}>
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-slate-800/90 px-4 py-3">
      <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-200">{title}</h3>
      {actionLabel && (
        <button type="button" onClick={onAction} className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.14em] text-slate-500 transition-colors hover:text-amber-400">
          {actionLabel} <ChevronRight size={12} />
        </button>
      )}
    </div>
    {children}
  </section>
);

const JourneyStrip = ({ stage }) => {
  const activeIndex = stage === CAREER_STAGES.RETIRED
    ? 3
    : Math.max(0, stageOrder.findIndex((item) => item.id === stage));

  return (
    <div className="w-full max-w-[500px]">
      <div className="mb-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-slate-400">Journey overview</div>
      <div className="flex items-start">
        {stageOrder.map((item, index) => {
          const reached = index <= activeIndex;
          const active = index === activeIndex;
          return (
            <div key={item.id} className="contents">
              <div className="flex w-[82px] shrink-0 flex-col items-center text-center sm:w-[96px]">
                <div className={`relative z-10 flex h-8 w-8 items-center justify-center border sm:h-9 sm:w-9 ${active ? 'border-amber-300 bg-amber-500/20 text-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.42)] [clip-path:polygon(50%_0,92%_20%,92%_72%,50%_100%,8%_72%,8%_20%)]' : reached ? 'border-slate-300/80 bg-slate-100/10 text-slate-100' : 'border-slate-700 bg-slate-950/70 text-slate-600'}`}>
                  <item.Icon size={active ? 17 : 15} />
                </div>
                <div className={`mt-1.5 whitespace-nowrap text-[7px] font-black uppercase tracking-[0.06em] sm:text-[8px] ${reached ? 'text-slate-100' : 'text-slate-600'}`}>{item.label}</div>
                <div className="mt-0.5 text-[6px] text-slate-500 sm:text-[7px]">{item.caption}</div>
              </div>
              {index < stageOrder.length - 1 && (
                <div className={`mt-4 flex min-w-3 flex-1 items-center ${index < activeIndex ? 'text-slate-200' : 'text-slate-600'}`} aria-hidden="true">
                  <span className={`h-px flex-1 ${index < activeIndex ? 'bg-slate-300/80' : 'bg-slate-700'}`} />
                  <ChevronRight size={13} strokeWidth={2.5} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const EmptyBrief = ({ children }) => <p className="px-4 py-7 text-center text-xs leading-relaxed text-slate-500">{children}</p>;

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
  const highSchool = state.playerRecruiting?.highSchool || {};
  const latestIssue = (state.newsroomIssues || []).at(-1) || null;
  const leadArticle = latestIssue?.articles?.[0] || null;
  const supportingHeadlines = (latestIssue?.articles || []).slice(1, 4);
  const latestEpisode = (state.podcastEpisodes || []).at(-1) || null;
  const latestTrophy = (state.trophies || [])[0] || null;
  const targetSchools = [...(state.recruiting || [])]
    .filter((entry) => entry?.name)
    .sort((left, right) => model.stage === CAREER_STAGES.HIGH_SCHOOL
      ? Number(left.preferenceRank || left.customOrder || 999) - Number(right.preferenceRank || right.customOrder || 999)
      : Number(right.interest || 0) - Number(left.interest || 0))
    .slice(0, 5);
  const stars = Math.min(5, Math.max(0, Number(highSchool.recruitStars || player.stars) || 0));
  const playerName = player.name || 'Dynasty Builder';
  const quote = state.latestQuote || 'The process today builds the legacy tomorrow.';
  const heroBackground = state.bgDashboard || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1920&q=88';
  const quickActions = [
    { label: model.primaryAction.label, tab: model.primaryAction.tab, Icon: CalendarDays },
    { label: model.secondaryAction.label, tab: model.secondaryAction.tab, Icon: Target },
    { label: 'Open the Newsroom', tab: 'newsroom', Icon: Newspaper },
    { label: 'Career Chronicle', tab: 'chronicle', Icon: BookOpen },
  ];

  return (
    <div className="relative z-10 mx-auto max-w-[1700px] space-y-3 pb-20 animate-in fade-in">
      <section className="relative left-1/2 min-h-[620px] w-screen -translate-x-1/2 overflow-hidden border-y border-slate-700/70 bg-[#041019] shadow-[0_24px_80px_rgba(0,0,0,0.55)] lg:h-[300px] lg:min-h-0">
        <img src={heroBackground} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center opacity-70 saturate-75" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,7,11,.98)_0%,rgba(1,7,11,.78)_27%,rgba(1,7,11,.12)_50%,rgba(1,7,11,.62)_73%,rgba(1,7,11,.94)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(2,9,14,.98)_0%,rgba(2,9,14,.30)_31%,transparent_70%,rgba(2,9,14,.18)_100%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="pointer-events-none absolute inset-x-[35%] bottom-0 top-0 hidden bg-[radial-gradient(ellipse_at_50%_28%,rgba(226,232,240,.25),transparent_63%)] lg:block" />
        <img src={wesselPlayerHero} alt="Wessel, number 2, facing the stadium field" className="pointer-events-none absolute left-1/2 top-[-8%] z-[1] hidden h-[210%] -translate-x-1/2 object-contain drop-shadow-[0_24px_26px_rgba(0,0,0,.95)] lg:block" />
        <img src={wesselPlayerHero} alt="" aria-hidden="true" className="pointer-events-none absolute right-[-20%] top-[16%] z-[1] h-[58%] opacity-25 sm:right-[-5%] lg:hidden" />

        <div className="relative z-[2] mx-auto flex min-h-[620px] max-w-[1800px] flex-col px-5 py-7 sm:px-8 lg:h-full lg:min-h-0 lg:px-9 lg:py-5">
          <div className="max-w-[420px] lg:w-[34%] lg:max-w-none">
            <div className="text-[8px] font-black uppercase tracking-[0.34em] text-amber-400">Welcome to your</div>
            <h2 className="dhq-command-title mt-2 uppercase text-slate-100 drop-shadow-[0_5px_14px_rgba(0,0,0,.95)]">
              <span>Dynasty HQ</span><span>Command Center</span>
            </h2>
            <p className="mt-2.5 max-w-[350px] text-[10px] font-medium leading-[1.4] text-slate-300">Track every step of your legacy. From high-school recruit to college player, from coach to champion—this is where greatness is built.</p>
          </div>

          <blockquote className="mt-6 w-full max-w-[305px] self-end border border-slate-500/60 bg-[#06111a]/82 px-4 py-3 shadow-2xl backdrop-blur-md lg:absolute lg:right-9 lg:top-[38px] lg:mt-0 lg:w-[25%]">
            <div className="text-2xl font-black leading-none text-slate-500">“</div>
            <p className="-mt-1 text-[12px] font-black uppercase leading-[1.24] tracking-[0.08em] text-slate-200 xl:text-[13px]">{quote}</p>
            <div className="mt-2 text-right font-[cursive] text-xl italic text-amber-400">DHQ</div>
          </blockquote>

          <div className="mt-auto w-full lg:absolute lg:bottom-[10px] lg:left-9 lg:w-[41%] lg:max-w-[500px]"><JourneyStrip stage={model.stage} /></div>
          {!readOnly && (
            <div className="mt-5 flex w-full gap-2 lg:absolute lg:bottom-[16px] lg:right-9 lg:mt-0 lg:w-[27%] lg:max-w-[390px]">
              <button type="button" onClick={() => onNavigate(model.primaryAction.tab)} className="flex min-h-9 flex-1 items-center justify-center gap-2 rounded-sm bg-amber-500 px-3 py-2 text-[8px] font-black uppercase tracking-[0.08em] text-slate-950 shadow-[0_8px_30px_rgba(245,158,11,.28)] hover:bg-amber-400 xl:text-[9px]">
                <CalendarDays size={13} /> {model.stage === CAREER_STAGES.HIGH_SCHOOL ? 'Log Weekly Agenda' : model.primaryAction.label}
              </button>
              <button type="button" onClick={() => onNavigate(model.secondaryAction.tab)} className="flex min-h-9 flex-1 items-center justify-center gap-2 rounded-sm border border-slate-500 bg-slate-950/70 px-3 py-2 text-[8px] font-black uppercase tracking-[0.08em] text-white hover:border-amber-400/70 xl:text-[9px]">
                <Target size={13} /> {model.stage === CAREER_STAGES.HIGH_SCHOOL ? 'Open Recruiting Board' : model.secondaryAction.label}
              </button>
            </div>
          )}
        </div>
      </section>

      <div id="recruit-command-center" className="scroll-mt-16">
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

      <div className="grid gap-3 xl:grid-cols-12">
        <DashboardCard title="Current Phase" actionLabel="View profile" onAction={() => onNavigate('chronicle')} className="xl:col-span-4">
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-2xl font-black uppercase tracking-tight text-white">{model.stage === CAREER_STAGES.HIGH_SCHOOL ? 'High School Recruit' : model.title}</div>
                <div className="mt-1 text-xs font-bold text-slate-400">{player.pos || 'QB'} · {player.archetype || model.eyebrow}</div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">{player.school || model.institution}{player.height ? ` · ${player.height}` : ''}{player.weight ? ` · ${player.weight}` : ''}</div>
              </div>
              <span className="rounded border border-blue-500/30 bg-blue-950/60 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-blue-300">Active</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-y border-slate-800 py-3">
              <div className="text-lg tracking-[0.08em] text-amber-400">{'★'.repeat(stars)}<span className="text-slate-700">{'☆'.repeat(5 - stars)}</span></div>
              <div className="text-right"><span className="text-xl font-black text-white">{player.overall || '—'}</span><span className="ml-1 text-[9px] font-bold uppercase text-slate-500">OVR</span></div>
            </div>
            <div className="mt-3 grid grid-cols-3 divide-x divide-slate-800 text-center">
              <div><div className="text-[8px] font-black uppercase tracking-wider text-slate-600">National</div><div className="mt-1 text-xs font-black text-white">{highSchool.rankings?.national ? `#${highSchool.rankings.national}` : '—'}</div></div>
              <div><div className="text-[8px] font-black uppercase tracking-wider text-slate-600">Position</div><div className="mt-1 text-xs font-black text-white">{highSchool.rankings?.position ? `#${highSchool.rankings.position}` : (player.nationalQbRank ? `#${player.nationalQbRank}` : '—')}</div></div>
              <div><div className="text-[8px] font-black uppercase tracking-wider text-slate-600">State</div><div className="mt-1 text-xs font-black text-white">{highSchool.rankings?.state ? `#${highSchool.rankings.state}` : '—'}</div></div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Season Snapshot" actionLabel="Full verified detail" onAction={() => onNavigate('dataEntry')} className="xl:col-span-5">
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 xl:grid-cols-2">
            {model.metrics.map((metric) => (
              <div key={metric.label} className="rounded border border-slate-800 bg-slate-950/45 px-3 py-4 text-center">
                <div className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-600">{metric.label}</div>
                <div className={`mt-1 text-xl font-black ${toneClasses[metric.tone] || toneClasses.default}`}>{metric.value}</div>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="My Profile" actionLabel="Career Chronicle" onAction={() => onNavigate('chronicle')} className="xl:col-span-3">
          <div className="p-5">
            <div className="flex items-center gap-3">
              {player.headshot ? <img src={player.headshot} alt={`${playerName} profile`} className="h-14 w-14 rounded border border-slate-600 object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded border border-slate-600 bg-slate-900 text-xl font-black text-amber-400">{player.number || playerName[0]}</div>}
              <div className="min-w-0"><div className="truncate text-lg font-black text-white">{playerName}</div><div className="text-[9px] font-black uppercase tracking-wider text-amber-400">{model.eyebrow}</div><div className="mt-1 truncate text-[9px] text-slate-500">{model.institution}</div></div>
            </div>
            <div className="mt-5 grid grid-cols-3 divide-x divide-slate-800 text-center">
              <div><Trophy size={14} className="mx-auto text-amber-400" /><div className="mt-1 text-lg font-black text-white">{(state.trophies || []).length}</div><div className="text-[7px] font-black uppercase tracking-wider text-slate-600">Trophies</div></div>
              <div><BookOpen size={14} className="mx-auto text-slate-400" /><div className="mt-1 text-lg font-black text-white">{(state.careerChronicle || []).length}</div><div className="text-[7px] font-black uppercase tracking-wider text-slate-600">Events</div></div>
              <div><Newspaper size={14} className="mx-auto text-slate-400" /><div className="mt-1 text-lg font-black text-white">{(state.newsroomIssues || []).length}</div><div className="text-[7px] font-black uppercase tracking-wider text-slate-600">Editions</div></div>
            </div>
          </div>
        </DashboardCard>
      </div>

      <div className="grid gap-3 xl:grid-cols-12">
        <DashboardCard title={model.stage === CAREER_STAGES.HIGH_SCHOOL ? 'Road to Glory' : 'Career Focus'} actionLabel="Open command center" onAction={() => onNavigate(model.secondaryAction.tab)} className="xl:col-span-4">
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-1">
            {model.panels.slice(0, 2).map((panel) => (
              <div key={panel.id} className="rounded border border-slate-800 bg-slate-950/45 p-3">
                <div className="mb-2 text-[9px] font-black uppercase tracking-wider text-amber-400">{panel.title}</div>
                {panel.rows.slice(0, 3).map((item) => <div key={item.label} className="flex justify-between gap-3 border-t border-slate-800/70 py-2 text-[9px]"><span className="font-bold uppercase tracking-wider text-slate-600">{item.label}</span><span className={`text-right font-black ${toneClasses[item.tone] || toneClasses.default}`}>{item.value}</span></div>)}
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Career Timeline" actionLabel="View full timeline" onAction={() => onNavigate('chronicle')} className="xl:col-span-5">
          <div className="p-4">
            {!model.recentEvents.length && <EmptyBrief>Your first verified weekly update or milestone will begin the permanent career timeline.</EmptyBrief>}
            <div className="space-y-1">
              {model.recentEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="grid grid-cols-[62px_20px_minmax(0,1fr)] items-center gap-2 border-b border-slate-800/70 py-2 last:border-0">
                  <div className="text-[9px] font-black text-slate-400">S{event.season || 1} · W{event.week || 1}</div>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-[8px] font-black text-amber-400">{event.type === 'commitment' ? 'C' : '•'}</div>
                  <div className="min-w-0"><div className="truncate text-[10px] font-black text-white">{event.title}</div>{event.summary && <div className="truncate text-[8px] text-slate-600">{event.summary}</div>}</div>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Weekly Priorities" actionLabel="Log weekly agenda" onAction={() => onNavigate('dataEntry')} className="xl:col-span-3">
          <div className="space-y-2 p-4">
            {model.advice.slice(0, 4).map((item, index) => (
              <div key={`${item.title}-${index}`} className={`rounded border-l-2 px-3 py-2.5 text-[9px] leading-relaxed ${adviceClasses[item.tone] || adviceClasses.info}`}>
                <div className="font-black uppercase tracking-wider">{item.title}</div><div className="mt-1 opacity-80">{item.text}</div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <div className="grid gap-3 xl:grid-cols-12">
        <DashboardCard title="Newsroom" actionLabel="View all editions" onAction={() => onNavigate('newsroom')} className="xl:col-span-7">
          {leadArticle ? (
            <div className="grid gap-4 p-4 md:grid-cols-[1.2fr_.8fr]">
              <button type="button" onClick={() => onNavigate('newsroom')} className="relative min-h-44 overflow-hidden rounded border border-slate-700 bg-[radial-gradient(circle_at_25%_20%,rgba(245,158,11,.24),transparent_38%),linear-gradient(135deg,#14202a,#071019)] p-5 text-left">
                <Newspaper size={44} className="absolute right-5 top-5 text-slate-700/60" />
                <div className="relative flex h-full flex-col justify-end"><div className="text-[8px] font-black uppercase tracking-[0.16em] text-amber-400">{leadArticle.outletName || 'DynastyHQ Newsroom'} · Week {latestIssue.week || model.week}</div><div className="mt-2 max-w-lg text-xl font-black leading-tight text-white">{leadArticle.headline}</div>{leadArticle.dek && <div className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-slate-400">{leadArticle.dek}</div>}</div>
              </button>
              <div className="divide-y divide-slate-800">
                {supportingHeadlines.map((article) => <button key={article.id} type="button" onClick={() => onNavigate('newsroom')} className="block w-full py-3 text-left first:pt-1"><div className="text-[8px] font-black uppercase tracking-wider text-slate-600">{article.outletName || article.desk}</div><div className="mt-1 text-[10px] font-black leading-snug text-slate-200 hover:text-amber-400">{article.headline}</div></button>)}
                {!supportingHeadlines.length && <EmptyBrief>This verified edition is ready to read in the Newsroom.</EmptyBrief>}
              </div>
            </div>
          ) : <EmptyBrief>No edition published yet. Publish a verified week to create the first Newsroom front page.</EmptyBrief>}
        </DashboardCard>

        <DashboardCard title="Recruiting Board" actionLabel="View board" onAction={() => onNavigate('recruiting')} className="xl:col-span-5">
          {targetSchools.length ? (
            <div className="p-4">
              <div className="grid grid-cols-[28px_minmax(0,1fr)_70px_64px] gap-2 border-b border-slate-800 pb-2 text-[7px] font-black uppercase tracking-wider text-slate-600"><span>#</span><span>School</span><span>{model.stage === CAREER_STAGES.HIGH_SCHOOL ? 'Preference' : 'Interest'}</span><span>Offer</span></div>
              {targetSchools.map((school, index) => (
                <div key={school.id || school.name} className="grid grid-cols-[28px_minmax(0,1fr)_70px_64px] items-center gap-2 border-b border-slate-800/70 py-2.5 last:border-0">
                  <span className="text-[10px] font-black text-slate-500">{index + 1}</span>
                  <span className="truncate text-[10px] font-black text-white">{school.name}</span>
                  <span className="text-[9px] font-black text-amber-400">{model.stage === CAREER_STAGES.HIGH_SCHOOL ? `#${school.preferenceRank || school.customOrder || index + 1}` : `${Number(school.interest || 0)}%`}</span>
                  <span className={`text-[8px] font-black uppercase ${school.offered ? 'text-emerald-400' : 'text-slate-600'}`}>{school.offered ? 'Verified' : '—'}</span>
                </div>
              ))}
            </div>
          ) : <EmptyBrief>No verified schools are on the board yet. Open Recruiting to build the first list.</EmptyBrief>}
        </DashboardCard>
      </div>

      <div className="grid gap-3 xl:grid-cols-12">
        <DashboardCard title="Gridiron Grind Podcast" actionLabel="Open studio" onAction={() => onNavigate('podcast')} className="xl:col-span-4">
          <div className="flex min-h-36 items-center gap-4 p-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded border border-amber-500/30 bg-[radial-gradient(circle,rgba(245,158,11,.18),transparent_65%)] text-amber-400"><Radio size={34} /></div>
            <div className="min-w-0"><div className="text-[8px] font-black uppercase tracking-wider text-slate-600">Latest episode</div><div className="mt-1 line-clamp-2 text-sm font-black leading-snug text-white">{latestEpisode?.title || latestIssue?.podcastBrief?.title || 'Awaiting the first verified weekly episode'}</div><div className="mt-2 text-[8px] font-bold uppercase tracking-wider text-amber-400">{latestEpisode ? `Season ${latestEpisode.season} · Week ${latestEpisode.week} · ${latestEpisode.audioStatus === 'ready' ? 'Audio ready' : 'Script ready'}` : 'Publish a week to begin'}</div></div>
          </div>
        </DashboardCard>

        <DashboardCard title="Quick Actions" className="xl:col-span-5">
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
            {quickActions.map((action) => <button key={`${action.tab}-${action.label}`} type="button" disabled={readOnly && action.tab === 'dataEntry'} onClick={() => onNavigate(action.tab)} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded border border-slate-800 bg-slate-900/70 p-3 text-center text-[8px] font-black uppercase tracking-wider text-slate-400 transition-colors hover:border-amber-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><action.Icon size={20} /><span>{action.label}</span></button>)}
          </div>
        </DashboardCard>

        <DashboardCard title="Legacy Watch" actionLabel="Trophy case" onAction={() => onNavigate('trophies')} className="xl:col-span-3">
          <div className="flex min-h-36 items-center gap-4 p-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400"><Medal size={30} /></div>
            <div><div className="text-sm font-black text-white">{latestTrophy?.name || 'The legacy is still being built'}</div><div className="mt-1 text-[9px] leading-relaxed text-slate-500">{latestTrophy ? `${latestTrophy.type || 'Achievement'} · ${latestTrophy.year || `Season ${model.season}`}` : `${(state.careerChronicle || []).length} verified career events recorded so far.`}</div></div>
          </div>
        </DashboardCard>
      </div>

      <div className="pt-5">
        <div className="mb-3 flex items-end justify-between gap-4"><div><div className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-400">Verified Detail</div><h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">Current Stage Intelligence</h3></div><div className="hidden text-[8px] font-black uppercase tracking-widest text-slate-600 sm:block">No invented results · Career data only</div></div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {model.panels.map((item) => <StagePanel key={item.id} panel={item} />)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {model.stage === CAREER_STAGES.RETIRED
          ? <LegacyEvents model={model} />
          : (model.stage === CAREER_STAGES.COLLEGE
            ? <PlayerProgressLedger model={model} />
            : <RecentGames model={model} />)}
        <DashboardCard title="Command Center Access" className="lg:col-span-1">
          <div className="space-y-2 p-4">
            <button type="button" onClick={() => onNavigate('recruiting')} className="flex w-full items-center justify-between rounded border border-slate-800 bg-slate-950/50 p-3 text-left"><span className="flex items-center gap-3 text-[10px] font-black text-white"><Map size={15} className="text-amber-400" /> Recruiting Board</span><ChevronRight size={14} className="text-slate-600" /></button>
            <button type="button" onClick={() => onNavigate('chronicle')} className="flex w-full items-center justify-between rounded border border-slate-800 bg-slate-950/50 p-3 text-left"><span className="flex items-center gap-3 text-[10px] font-black text-white"><TrendingUp size={15} className="text-amber-400" /> Career Chronicle</span><ChevronRight size={14} className="text-slate-600" /></button>
            <button type="button" onClick={() => onNavigate('trophies')} className="flex w-full items-center justify-between rounded border border-slate-800 bg-slate-950/50 p-3 text-left"><span className="flex items-center gap-3 text-[10px] font-black text-white"><Trophy size={15} className="text-amber-400" /> Legacy Trophy Case</span><ChevronRight size={14} className="text-slate-600" /></button>
            {!readOnly && <button type="button" onClick={() => onNavigate('settings')} className="flex w-full items-center justify-between rounded border border-slate-800 bg-slate-950/50 p-3 text-left"><span className="flex items-center gap-3 text-[10px] font-black text-white"><Settings size={15} className="text-amber-400" /> Hub Settings</span><ChevronRight size={14} className="text-slate-600" /></button>}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};

export default CareerCommandCenter;
