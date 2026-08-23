import { useRef, useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  Camera,
  ChevronRight,
  GraduationCap,
  Map,
  Newspaper,
  Pencil,
  ShieldCheck,
  Star,
  Target,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { CAREER_STAGES } from '../domain/commandCenter';
import { buildDashboardV2 } from '../domain/dashboardV2';
import { normalizePlayerProfile, validatePlayerProfile } from '../domain/playerProfile';
import CareerTransitionPanel from './CareerTransitionPanel';
import '../dashboard-v2.css';

const stageMeta = {
  [CAREER_STAGES.HIGH_SCHOOL]: { label: 'High School Recruit', short: 'High School', Icon: Star },
  [CAREER_STAGES.COLLEGE]: { label: 'College Player', short: 'College Player', Icon: GraduationCap },
  [CAREER_STAGES.OC]: { label: 'Offensive Coordinator', short: 'OC', Icon: Briefcase },
  [CAREER_STAGES.HC]: { label: 'Head Coach', short: 'Head Coach', Icon: ShieldCheck },
  [CAREER_STAGES.RETIRED]: { label: 'Legacy Complete', short: 'Retired', Icon: Trophy },
};

const journeyStages = [
  { id: CAREER_STAGES.HIGH_SCHOOL, label: 'High School' },
  { id: CAREER_STAGES.COLLEGE, label: 'College Player' },
  { id: CAREER_STAGES.OC, label: 'Offensive Coordinator' },
  { id: CAREER_STAGES.HC, label: 'Head Coach' },
];

const numberValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const displayValue = (value, fallback = '—') => (
  value === '' || value === null || value === undefined ? fallback : String(value)
);

const formatNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : '—';
};

const formatPhase = (value) => String(value || 'regular')
  .replace(/[-_]+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const gameScore = (game = {}) => {
  const home = game.homeScore;
  const away = game.awayScore;
  if (home === '' || home === undefined || away === '' || away === undefined) return '';
  return `${home}-${away}`;
};

const generatedArticle = (issue = {}) => (
  (issue.articles || []).find((article) => article?.editorialStatus === 'generated')
  || (issue.articles || [])[0]
  || null
);

const latestIssueFor = (state = {}) => [...(state.newsroomIssues || [])]
  .sort((left, right) => (
    numberValue(left?.season, 1) - numberValue(right?.season, 1)
    || numberValue(left?.week, 0) - numberValue(right?.week, 0)
  ))
  .at(-1) || null;

const DashboardCard = ({
  id,
  title,
  subtitle,
  actionLabel,
  onAction,
  icon: Icon,
  children,
  className = '',
}) => (
  <section id={id} className={`dhq-v2-card ${className}`} data-dashboard-card={id}>
    <div className="dhq-v2-card__header">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon ? <Icon size={14} className="shrink-0 text-slate-500" /> : null}
          <h2>{title}</h2>
        </div>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actionLabel ? (
        <button type="button" onClick={onAction} className="dhq-v2-card__action">
          {actionLabel}<ChevronRight size={12} />
        </button>
      ) : null}
    </div>
    <div className="dhq-v2-card__body">{children}</div>
  </section>
);

const Stat = ({ label, value, emphasis = false, compact = false }) => (
  <div className={`dhq-v2-stat ${compact ? 'dhq-v2-stat--compact' : ''}`}>
    <span>{label}</span>
    <strong className={emphasis ? 'text-amber-300' : ''}>{displayValue(value)}</strong>
  </div>
);

const EmptyBrief = ({ children }) => (
  <div className="dhq-v2-empty">{children}</div>
);

const RecentResults = ({ games = [] }) => {
  if (!games.length) return <EmptyBrief>No results yet. Your first verified game will appear here.</EmptyBrief>;
  return (
    <div className="divide-y divide-white/[0.06]">
      {games.slice(0, 5).map((game, index) => (
        <div key={`${game.season || 1}-${game.week || index}-${game.opponent || index}`} className="dhq-v2-result-row">
          <span className={`dhq-v2-result-badge ${game.result === 'W' ? 'is-win' : game.result === 'L' ? 'is-loss' : ''}`}>{game.result || '—'}</span>
          <div className="min-w-0 flex-1">
            <strong className="block truncate">{game.opponent || `Week ${game.week || '—'}`}</strong>
            <span>Week {game.week ?? '—'}</span>
          </div>
          <div className="text-right">
            <strong>{gameScore(game) || '—'}</strong>
            <span className="block">{game.didPlay === false ? 'DNP' : ''}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const LatestCoverage = ({ state, onNavigate }) => {
  const issue = latestIssueFor(state);
  const article = generatedArticle(issue);
  const isGenerated = Boolean(article?.editorialStatus === 'generated' || issue?.editorialStatus === 'generated');
  if (!issue || !article || !isGenerated) {
    return (
      <EmptyBrief>
        No published story is waiting here. Quiet weeks stay quiet instead of creating filler coverage.
      </EmptyBrief>
    );
  }
  const headline = article.headline || article.title || 'Latest DynastyHQ coverage';
  const outlet = article.outletName || article.publicationName || issue.outletProfile?.localOutletName || 'DynastyHQ Newsroom';
  return (
    <div className="dhq-v2-coverage">
      <span className="dhq-v2-kicker">{outlet}</span>
      <h3>{headline}</h3>
      {article.dek || article.summary ? <p>{article.dek || article.summary}</p> : null}
      <button type="button" onClick={() => onNavigate('newsroom')}>Read coverage <ChevronRight size={12} /></button>
    </div>
  );
};

const Milestones = ({ state }) => {
  const milestones = [...(state.careerMilestones || [])].slice(-5).reverse();
  if (!milestones.length) return <EmptyBrief>Verified career milestones will collect here as the story develops.</EmptyBrief>;
  return (
    <div className="divide-y divide-white/[0.06]">
      {milestones.map((entry, index) => (
        <div key={entry.id || `${entry.type || 'milestone'}-${index}`} className="dhq-v2-list-row">
          <span className="dhq-v2-list-icon"><Award size={13} /></span>
          <div className="min-w-0 flex-1">
            <strong>{entry.title || entry.label || entry.name || String(entry.type || 'Career milestone').replace(/[-_]+/g, ' ')}</strong>
            <span>Season {entry.season || state.currentSeason || 1} · Week {entry.week ?? '—'}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const TrophySnapshot = ({ state }) => {
  const trophies = [...(state.trophies || [])].slice(-5).reverse();
  if (!trophies.length) return <EmptyBrief>Your championships and awards will appear here when they are recorded.</EmptyBrief>;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {trophies.map((entry, index) => (
        <div key={entry.id || `${entry.name || entry.type}-${index}`} className="dhq-v2-trophy">
          <Trophy size={17} />
          <div className="min-w-0"><strong>{entry.name || entry.title || entry.type || 'Trophy'}</strong><span>{entry.season ? `Season ${entry.season}` : 'Career achievement'}</span></div>
        </div>
      ))}
    </div>
  );
};

const TopSchools = ({ state }) => {
  const schools = [...(state.recruiting || [])]
    .filter((entry) => entry?.name)
    .sort((left, right) => numberValue(left.preferenceRank || left.customOrder, 999) - numberValue(right.preferenceRank || right.customOrder, 999))
    .slice(0, 5);
  if (!schools.length) return <EmptyBrief>No Top Schools have been captured yet.</EmptyBrief>;
  return (
    <div className="divide-y divide-white/[0.06]">
      {schools.map((school, index) => (
        <div key={school.id || school.name} className="dhq-v2-school-row">
          <span>#{school.preferenceRank || school.customOrder || index + 1}</span>
          <div className="min-w-0 flex-1"><strong>{school.name}</strong><small>{school.progressStage || 'Recruiting status not captured'}</small></div>
          <em className={school.offered ? 'has-offer' : ''}>{school.offered ? 'Offer' : '—'}</em>
        </div>
      ))}
    </div>
  );
};

const RecruitingSnapshot = ({ state, highSchool = false }) => {
  const schools = (state.recruiting || []).filter((entry) => entry?.name);
  const offers = schools.filter((entry) => entry.offered).length;
  const activeTargets = schools.filter((entry) => numberValue(entry.interest, 0) > 0).length;
  const top = [...schools].sort((left, right) => highSchool
    ? numberValue(left.preferenceRank || left.customOrder, 999) - numberValue(right.preferenceRank || right.customOrder, 999)
    : numberValue(right.interest, 0) - numberValue(left.interest, 0))[0];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Stat label={highSchool ? 'Scholarship Offers' : 'Active Targets'} value={highSchool ? offers : activeTargets} />
        <Stat label={highSchool ? 'Schools Tracked' : 'Verified Offers'} value={highSchool ? schools.length : offers} />
      </div>
      <div className="dhq-v2-feature-row">
        <span>{highSchool ? 'Current status' : 'Board leader'}</span>
        <strong>{highSchool && state.player?.isCommitted ? `Committed · ${state.player.college}` : top?.name || 'Not established'}</strong>
      </div>
    </div>
  );
};

const CareerJourney = ({ stage }) => {
  const activeIndex = stage === CAREER_STAGES.RETIRED
    ? journeyStages.length
    : Math.max(0, journeyStages.findIndex((entry) => entry.id === stage));
  return (
    <section className="dhq-v2-journey" aria-label="Career journey">
      <div className="dhq-v2-journey__header">
        <div><span>Career Journey</span><strong>Player to program leader</strong></div>
        <BookOpen size={16} />
      </div>
      <div className="dhq-v2-journey__track">
        {journeyStages.map((entry, index) => {
          const complete = stage === CAREER_STAGES.RETIRED || index < activeIndex;
          const active = stage !== CAREER_STAGES.RETIRED && index === activeIndex;
          return (
            <div key={entry.id} className={`dhq-v2-journey__step ${complete ? 'is-complete' : ''} ${active ? 'is-active' : ''}`}>
              <span>{complete ? '✓' : active ? '●' : '○'}</span>
              <strong>{entry.label}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const profileFields = [
  ['name', 'Player name'], ['school', 'School'], ['number', 'Jersey number'], ['pos', 'Position'],
  ['height', 'Height'], ['weight', 'Weight'], ['archetype', 'Archetype'],
];

const ProfileEditor = ({ player, onClose, onSave, onRemoveHeadshot, headshotBusy }) => {
  const [draft, setDraft] = useState(() => ({
    name: player.name || '', school: player.school || '', number: player.number || '', pos: player.pos || '',
    height: player.height || '', weight: player.weight || '', archetype: player.archetype || '',
    stars: player.stars || 3, overall: player.overall || 70,
  }));
  const [errors, setErrors] = useState({});
  const submit = (event) => {
    event.preventDefault();
    const nextErrors = validatePlayerProfile(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSave(normalizePlayerProfile(draft));
    onClose();
  };
  return (
    <div className="dhq-v2-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-profile-title">
      <form onSubmit={submit} className="dhq-v2-modal__panel">
        <div className="dhq-v2-modal__header">
          <div><span>Career identity</span><h2 id="dashboard-profile-title">Edit Player Profile</h2></div>
          <button type="button" onClick={onClose} aria-label="Close profile editor"><X size={18} /></button>
        </div>
        <div className="dhq-v2-modal__grid">
          {profileFields.map(([field, label]) => (
            <label key={field}><span>{label}</span><input value={draft[field]} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} />{errors[field] ? <em>{errors[field]}</em> : null}</label>
          ))}
          <label><span>Recruit rating</span><select value={draft.stars} onChange={(event) => setDraft((current) => ({ ...current, stars: event.target.value }))}>{[1,2,3,4,5].map((value) => <option key={value} value={value}>{value}-star</option>)}</select>{errors.stars ? <em>{errors.stars}</em> : null}</label>
          <label><span>Overall</span><input type="number" min="1" max="99" value={draft.overall} onChange={(event) => setDraft((current) => ({ ...current, overall: event.target.value }))} />{errors.overall ? <em>{errors.overall}</em> : null}</label>
        </div>
        <div className="dhq-v2-modal__footer">
          {player.headshot && onRemoveHeadshot ? <button type="button" disabled={headshotBusy} onClick={onRemoveHeadshot} className="danger">Remove headshot</button> : <span />}
          <div><button type="button" onClick={onClose}>Cancel</button><button type="submit" className="primary">Save Profile</button></div>
        </div>
      </form>
    </div>
  );
};

const CareerDashboardV2 = ({
  state,
  onNavigate,
  readOnly = false,
  onBeginCollege,
  onChecklistChange,
  onGraduate,
  onCreateCoachingUniverse,
  onBeginOcCareer,
  onProfileSave,
  onProfileHeadshotUpload,
  onProfileHeadshotRemove,
  profileHeadshotBusy = false,
}) => {
  const model = buildDashboardV2(state);
  const player = state.player || {};
  const coach = state.coach || {};
  const rtg = state.rtg || {};
  const highSchool = state.playerRecruiting?.highSchool || {};
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const headshotInputRef = useRef(null);
  const stage = model.stage;
  const meta = stageMeta[stage] || stageMeta[CAREER_STAGES.COLLEGE];
  const StageIcon = meta.Icon;
  const isPlayerStage = stage === CAREER_STAGES.HIGH_SCHOOL || stage === CAREER_STAGES.COLLEGE;
  const seasonGames = model.seasonGames || [];
  const totalTouchdowns = numberValue(model.totals?.passTD) + numberValue(model.totals?.rushTD);
  const pointsPerGame = seasonGames.length ? (numberValue(model.totals?.points) / seasonGames.length).toFixed(1) : '—';
  const pointsAgainstPerGame = seasonGames.length ? (numberValue(model.totals?.pointsAgainst) / seasonGames.length).toFixed(1) : '—';
  const setup = state.currentWeekSetup || {};
  const currentGame = seasonGames.find((game) => numberValue(game.week, -1) === numberValue(state.currentWeek, -2));
  const recordText = `${model.record?.wins || 0}-${model.record?.losses || 0}`;
  const institution = model.institution;

  const open = (target) => onNavigate?.(target);
  const uploadHeadshot = (file) => {
    if (!readOnly && file && onProfileHeadshotUpload) onProfileHeadshotUpload(file);
  };

  const playerSnapshot = (
    <DashboardCard id="player-snapshot" title="Player Snapshot" subtitle="Role and current RTG status" icon={UserRound} actionLabel="Weekly Agenda" onAction={() => open('dataEntry')}>
      <div className="dhq-v2-player-snapshot">
        <div><span>Depth Chart</span><strong>{rtg.rank || '—'}</strong><small>{player.archetype || 'Quarterback'}</small></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat compact label="Overall" value={player.overall || '—'} />
          <Stat compact label="Coach Trust" value={formatNumber(rtg.coachTrust)} />
          <Stat compact label="Skill Pts" value={displayValue(rtg.skillPoints)} />
          <Stat compact label="GPA" value={rtg.gpa !== '' && rtg.gpa !== undefined ? numberValue(rtg.gpa).toFixed(1) : '—'} />
        </div>
      </div>
    </DashboardCard>
  );

  const currentWeekCard = (
    <DashboardCard id="current-week" title="Current Week" subtitle="Where the active workflow stands" icon={CalendarDays} actionLabel="Open Agenda" onAction={() => open('dataEntry')}>
      <div className="dhq-v2-current-week">
        <div className="dhq-v2-week-number"><span>Week</span><strong>{state.currentWeek ?? model.week}</strong></div>
        <div className="min-w-0 flex-1">
          <span className="dhq-v2-kicker">{setup.type === 'bye' ? 'Bye Week' : 'Game Week'} · {formatPhase(setup.phase || (numberValue(state.currentWeek) === 0 ? 'preseason' : 'regular season'))}</span>
          <h3>{setup.label || setup.customLabel || `Week ${state.currentWeek ?? model.week}`}</h3>
          <p>{currentGame ? `${currentGame.result || 'Result'} ${gameScore(currentGame)} vs ${currentGame.opponent || 'opponent'}` : 'Use Week Setup before playing, then return with verified postgame data.'}</p>
        </div>
      </div>
    </DashboardCard>
  );

  const seasonPerformance = (
    <DashboardCard id="season-performance" title="Season Performance" subtitle={`${seasonGames.length} verified game${seasonGames.length === 1 ? '' : 's'}`} icon={BarChart3}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Pass Yards" value={formatNumber(model.totals?.passYds)} />
        <Stat label="Pass TD" value={formatNumber(model.totals?.passTD)} />
        <Stat label="Rush Yards" value={formatNumber(model.totals?.rushYds)} />
        <Stat label="Rush TD" value={formatNumber(model.totals?.rushTD)} emphasis />
      </div>
    </DashboardCard>
  );

  const recentResults = (
    <DashboardCard id="recent-results" title="Recent Results" subtitle="Latest verified games" icon={Activity} actionLabel="Career Archive" onAction={() => open('chronicle')}>
      <RecentResults games={model.recentGames} />
    </DashboardCard>
  );

  const coverageCard = (
    <DashboardCard id="latest-coverage" title="Latest Coverage" subtitle="Most recent published newsroom story" icon={Newspaper} actionLabel="Newsroom" onAction={() => open('newsroom')}>
      <LatestCoverage state={state} onNavigate={open} />
    </DashboardCard>
  );

  const milestonesCard = (
    <DashboardCard id="milestones" title="Career Milestones" subtitle="Recent verified moments" icon={Award} actionLabel="Legacy" onAction={() => open('trophies')}>
      <Milestones state={state} />
    </DashboardCard>
  );

  const recruitingCard = (highSchoolMode = false) => (
    <DashboardCard id="recruiting-snapshot" title="Recruiting Snapshot" subtitle={highSchoolMode ? 'Offers and college decision' : 'Current board at a glance'} icon={Map} actionLabel="Recruiting" onAction={() => open('recruiting')}>
      <RecruitingSnapshot state={state} highSchool={highSchoolMode} />
    </DashboardCard>
  );

  const cardsForStage = () => {
    if (stage === CAREER_STAGES.HIGH_SCHOOL) {
      return (
        <>
          <DashboardCard id="prospect-snapshot" title="Prospect Snapshot" subtitle="Recruit profile and tape progress" icon={Star} actionLabel="Weekly Agenda" onAction={() => open('dataEntry')}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Recruit Grade" value={`${highSchool.recruitStars || player.stars || 3}-star`} emphasis />
              <Stat label="Tape Score" value={formatNumber(highSchool.tapeScore)} />
              <Stat label="Offers" value={(state.recruiting || []).filter((entry) => entry.offered).length} />
              <Stat label="National Rank" value={highSchool.rankings?.national ? `#${highSchool.rankings.national}` : '—'} />
            </div>
          </DashboardCard>
          {recruitingCard(true)}
          <DashboardCard id="top-schools" title="Top Schools" subtitle="Your current preference order" icon={Target} actionLabel="Recruiting Board" onAction={() => open('recruiting')}><TopSchools state={state} /></DashboardCard>
          {recentResults}
          {coverageCard}
          {milestonesCard}
        </>
      );
    }

    if (stage === CAREER_STAGES.COLLEGE) {
      return <>{playerSnapshot}{currentWeekCard}{seasonPerformance}{recentResults}{coverageCard}{milestonesCard}</>;
    }

    if (stage === CAREER_STAGES.OC) {
      return (
        <>
          <DashboardCard id="program-snapshot" title="Program Snapshot" subtitle="Your current coordinator post" icon={Briefcase} actionLabel="Personnel Office" onAction={() => open('frontOffice')}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat label="Record" value={recordText} /><Stat label="Job Security" value={coach.security !== '' ? `${coach.security}%` : '—'} /><Stat label="Prestige" value={coach.prestige || '—'} emphasis /><Stat label="Season" value={model.season} /></div>
          </DashboardCard>
          <DashboardCard id="offensive-performance" title="Offensive Performance" subtitle="Verified production for your unit" icon={BarChart3}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat label="Points / Game" value={pointsPerGame} emphasis /><Stat label="Pass Yards" value={formatNumber(model.totals?.passYds)} /><Stat label="Rush Yards" value={formatNumber(model.totals?.rushYds)} /><Stat label="Touchdowns" value={totalTouchdowns} /></div>
          </DashboardCard>
          {recentResults}
          {recruitingCard(false)}
          {coverageCard}
          <DashboardCard id="career-outlook" title="Career Outlook" subtitle="Contract and next-step pressure" icon={ShieldCheck} actionLabel="Career Archive" onAction={() => open('chronicle')}>
            <div className="space-y-2"><div className="dhq-v2-feature-row"><span>Program outlook</span><strong>{state.playoffPicture || 'Not established'}</strong></div><div className="dhq-v2-feature-row"><span>Contract</span><strong>Year {coach.contractYear || 1} · {coach.contractRemaining || '—'} remaining</strong></div><div className="dhq-v2-feature-row"><span>Current school</span><strong>{coach.currentSchool || institution}</strong></div></div>
          </DashboardCard>
        </>
      );
    }

    if (stage === CAREER_STAGES.HC) {
      return (
        <>
          <DashboardCard id="program-snapshot" title="Program Snapshot" subtitle="Head coach overview" icon={ShieldCheck} actionLabel="Personnel Office" onAction={() => open('frontOffice')}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat label="Record" value={recordText} /><Stat label="Job Security" value={coach.security !== '' ? `${coach.security}%` : '—'} /><Stat label="Prestige" value={coach.prestige || '—'} emphasis /><Stat label="Budget" value={coach.budget !== '' ? formatNumber(coach.budget) : '—'} /></div>
          </DashboardCard>
          <DashboardCard id="team-performance" title="Team Performance" subtitle="Season-level verified output" icon={BarChart3}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat label="Points / Game" value={pointsPerGame} emphasis /><Stat label="Allowed / Game" value={pointsAgainstPerGame} /><Stat label="Pass Yards" value={formatNumber(model.totals?.passYds)} /><Stat label="Rush Yards" value={formatNumber(model.totals?.rushYds)} /></div>
          </DashboardCard>
          {recentResults}
          {recruitingCard(false)}
          <DashboardCard id="trophy-case" title="Trophy Case" subtitle="Recent program hardware" icon={Trophy} actionLabel="Legacy" onAction={() => open('trophies')}><TrophySnapshot state={state} /></DashboardCard>
          {coverageCard}
        </>
      );
    }

    return (
      <>
        <DashboardCard id="career-resume" title="Career Résumé" subtitle="Final player-to-coach record" icon={Trophy} actionLabel="Legacy" onAction={() => open('trophies')}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat label="Career Record" value={`${model.careerRecord?.wins || 0}-${model.careerRecord?.losses || 0}`} /><Stat label="Chronicle Events" value={(state.careerChronicle || []).length} /><Stat label="Trophies" value={(state.trophies || []).length} emphasis /><Stat label="Milestones" value={(state.careerMilestones || []).length} /></div>
        </DashboardCard>
        <DashboardCard id="career-timeline" title="Career Timeline" subtitle="Latest preserved chapters" icon={BookOpen} actionLabel="Chronicle" onAction={() => open('chronicle')}><Milestones state={{ ...state, careerMilestones: state.careerChronicle || [] }} /></DashboardCard>
        <DashboardCard id="trophy-case" title="Trophy Case" subtitle="Career hardware" icon={Trophy} actionLabel="Legacy" onAction={() => open('trophies')}><TrophySnapshot state={state} /></DashboardCard>
        {coverageCard}
      </>
    );
  };

  return (
    <div id="dynastyhq-command-center" className="dhq-dashboard-v2 relative z-10 mx-auto max-w-[1600px] pb-8 animate-in fade-in" data-dashboard-version="2" data-dashboard-modules={model.moduleIds.join(',')}>
      <section className="dhq-home-banner dhq-v2-identity">
        <div className="dhq-v2-identity__main">
          <div className="dhq-v2-headshot">
            {player.headshot ? <img src={player.headshot} alt={`${player.name || 'Player'} headshot`} /> : <UserRound size={38} />}
            {!readOnly && isPlayerStage ? <button type="button" onClick={() => headshotInputRef.current?.click()} disabled={profileHeadshotBusy} aria-label="Change player headshot"><Camera size={13} /></button> : null}
            <input ref={headshotInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { uploadHeadshot(event.target.files?.[0]); event.target.value = ''; }} />
          </div>
          <div className="min-w-0">
            <span className="dhq-v2-eyebrow"><StageIcon size={12} /> Dashboard · {meta.label}</span>
            <h1>{isPlayerStage ? (player.name || 'Player profile') : (coach.name || player.name || meta.label)}</h1>
            <p>{institution} {isPlayerStage && player.pos ? `· ${player.pos}` : ''} {isPlayerStage && player.number !== '' ? `· #${player.number}` : ''} {isPlayerStage && player.archetype ? `· ${player.archetype}` : ''}</p>
          </div>
        </div>
        <div className="dhq-v2-identity__metrics">
          <Stat compact label="Season" value={model.season} />
          <Stat compact label="Week" value={state.currentWeek ?? model.week} />
          <Stat compact label="Record" value={recordText} />
          <Stat compact label={stage === CAREER_STAGES.COLLEGE ? 'Role' : 'Stage'} value={stage === CAREER_STAGES.COLLEGE ? (rtg.rank || '—') : meta.short} emphasis={stage === CAREER_STAGES.COLLEGE} />
        </div>
        {!readOnly && isPlayerStage && onProfileSave ? <button type="button" className="dhq-v2-edit-profile" onClick={() => setShowProfileEditor(true)}><Pencil size={12} /> Edit profile</button> : null}
      </section>

      <div className="dhq-v2-grid">{cardsForStage()}</div>
      <CareerJourney stage={stage} />

      <div className="dhq-v2-transition">
        <CareerTransitionPanel
          state={state}
          stage={stage}
          readOnly={readOnly}
          onBeginCollege={onBeginCollege}
          onChecklistChange={onChecklistChange}
          onGraduate={onGraduate}
          onCreateCoachingUniverse={onCreateCoachingUniverse}
          onBeginOcCareer={onBeginOcCareer}
        />
      </div>

      {showProfileEditor ? (
        <ProfileEditor
          player={player}
          onClose={() => setShowProfileEditor(false)}
          onSave={onProfileSave}
          onRemoveHeadshot={onProfileHeadshotRemove}
          headshotBusy={profileHeadshotBusy}
        />
      ) : null}
    </div>
  );
};

export default CareerDashboardV2;
