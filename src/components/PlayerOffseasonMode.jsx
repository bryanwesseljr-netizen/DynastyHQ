import {
  ArrowRight,
  ArrowRightLeft,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDot,
  GraduationCap,
  Headphones,
  Newspaper,
  Radio,
  Sparkles,
  TrendingUp,
  Trophy,
  UserRound,
} from 'lucide-react';
import { buildPlayerOffseasonMode } from '../domain/playerOffseason.js';
import './player-offseason.css';

const formatNumber = (value, fallback = '—') => (
  value === null || value === undefined || value === ''
    ? fallback
    : Number(value).toLocaleString()
);

const formatMovement = (change) => {
  if (!change) return '';
  if (change.kind !== 'number') return `${change.previous} → ${change.current}`;
  const delta = Number(change.delta);
  const value = Math.abs(delta);
  const formatted = change.key === 'gpa' ? value.toFixed(1) : value.toLocaleString();
  return `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${formatted}`;
};

const siteLabel = (site) => site === 'home' ? 'HOME' : site === 'away' ? 'AWAY' : site === 'neutral' ? 'NEUTRAL' : '';

const PhaseRail = ({ model }) => {
  const phases = [
    { number: '01', label: 'Season Review', state: model.seasonComplete ? 'done' : 'current' },
    { number: '02', label: 'Career Decision', state: !model.seasonComplete ? 'waiting' : model.decision.complete ? 'done' : 'current' },
    { number: '03', label: 'Development', state: model.decision.complete ? 'current' : 'waiting' },
    { number: '04', label: 'Next Chapter', state: model.nextSeasonReady ? 'ready' : 'waiting' },
  ];
  return (
    <div className="dhq-player-offseason__rail" aria-label="Offseason chapters">
      {phases.map((phase) => (
        <div className={`dhq-player-offseason__phase is-${phase.state}`} key={phase.number}>
          <span>{phase.state === 'done' ? <Check size={13} /> : phase.number}</span>
          <div><small>{phase.state === 'ready' ? 'READY' : phase.state === 'current' ? 'NOW' : phase.state === 'done' ? 'COMPLETE' : 'LATER'}</small><strong>{phase.label}</strong></div>
        </div>
      ))}
    </div>
  );
};

const SeasonReview = ({ model }) => {
  const line = model.playerLine;
  const lastTeam = model.schedule.lastTeamGame;
  return (
    <section className="dhq-player-offseason__section dhq-player-offseason__review">
      <div className="dhq-player-offseason__section-heading">
        <div><span>01 · SEASON REVIEW</span><h2>What the season became</h2></div>
        <Trophy size={24} />
      </div>

      <div className="dhq-player-offseason__review-grid">
        <article className="dhq-player-offseason__record-card">
          <span>TEAM SEASON</span>
          <strong>{model.teamRecord.wins}-{model.teamRecord.losses}</strong>
          <p>{lastTeam ? `Last saved team result: ${lastTeam.result} ${lastTeam.teamScore}-${lastTeam.opponentScore} vs ${lastTeam.opponent}.` : `Season ${model.season} team record.`}</p>
        </article>
        <article className="dhq-player-offseason__line-card">
          <span>YOUR SEASON</span>
          <strong>{line.appearances} APP{line.appearances === 1 ? '' : 'S'}</strong>
          <div>
            <b>{formatNumber(line.passYds)}<small>PASS YDS</small></b>
            <b>{formatNumber(line.totalTD)}<small>TOTAL TD</small></b>
            <b>{formatNumber(line.rushYds)}<small>RUSH YDS</small></b>
            <b>{formatNumber(line.interceptions)}<small>INT</small></b>
          </div>
        </article>
        <article className="dhq-player-offseason__status-card">
          <span>WHERE YOU FINISH</span>
          <strong>{model.currentStatus.role || 'ROLE NOT SAVED'}</strong>
          <p>{model.currentStatus.coachTrust !== null ? `${formatNumber(model.currentStatus.coachTrust)} Coach Trust` : 'Coach Trust not saved'}{model.currentStatus.overall !== null ? ` · ${model.currentStatus.overall} OVR` : ''}</p>
        </article>
      </div>

      <div className="dhq-player-offseason__season-notes">
        <div>
          <span><TrendingUp size={15} /> HIGH-WATER MARK</span>
          {model.peakPassing ? <><strong>{formatNumber(model.peakPassing.yards)} passing yards vs {model.peakPassing.opponent}</strong><small>Week {model.peakPassing.week}{model.peakPassing.result ? ` · ${model.peakPassing.result}` : ''}</small></> : <strong>No passing appearance saved yet</strong>}
        </div>
        <div>
          <span><Award size={15} /> SEASON HONORS</span>
          {model.awards.length ? <><strong>{model.awards[0].title}</strong><small>{model.awards.length > 1 ? `+${model.awards.length - 1} more saved honor${model.awards.length - 1 === 1 ? '' : 's'}` : model.awards[0].detail || 'Saved to your career history'}</small></> : <><strong>No season honors saved yet</strong><small>Awards and milestones will appear here when they become part of the career.</small></>}
        </div>
      </div>
    </section>
  );
};

const CareerDecision = ({ model, onNavigate, readOnly }) => {
  const decision = model.decision;
  return (
    <section className={`dhq-player-offseason__section dhq-player-offseason__decision is-${decision.state}`}>
      <div className="dhq-player-offseason__section-heading">
        <div><span>02 · CAREER DECISION</span><h2>{decision.headline}</h2></div>
        <ArrowRightLeft size={24} />
      </div>
      <p className="dhq-player-offseason__lead">{model.seasonComplete ? decision.detail : 'The decision desk opens after the saved season schedule closes. Until then, DynastyHQ keeps this choice out of the weekly story.'}</p>

      <div className="dhq-player-offseason__choice-grid">
        <article>
          <UserRound size={19} />
          <span>RETURN</span>
          <strong>{model.school}</strong>
          <p>Stay with the current program and carry this chapter into the next season.</p>
        </article>
        <article>
          <ArrowRightLeft size={19} />
          <span>TRANSFER PORTAL</span>
          <strong>{decision.state === 'exploring' ? 'BOARD OPEN' : decision.state === 'transfer' ? decision.destination : 'EXPLORE OPTIONS'}</strong>
          <p>Use the existing transfer board so every school, fit note, and final destination stays attached to the career timeline.</p>
        </article>
      </div>

      {!readOnly && model.seasonComplete ? (
        <button type="button" className="dhq-player-offseason__primary" onClick={() => onNavigate?.('recruiting')}>
          {decision.state === 'exploring' ? 'OPEN TRANSFER BOARD' : decision.complete ? 'REVIEW CAREER DECISION' : 'OPEN DECISION DESK'} <ArrowRight size={16} />
        </button>
      ) : null}
    </section>
  );
};

const Development = ({ model, onNavigate, readOnly }) => (
  <section className="dhq-player-offseason__section dhq-player-offseason__development">
    <div className="dhq-player-offseason__section-heading">
      <div><span>03 · OFFSEASON DEVELOPMENT</span><h2>Build the next version of your player</h2></div>
      <Sparkles size={24} />
    </div>
    <p className="dhq-player-offseason__lead">This is where offseason improvement becomes part of the story. DynastyHQ compares the next RTG status capture with the player you finished the season as; it does not manufacture an offseason rating jump.</p>

    <div className="dhq-player-offseason__development-grid">
      <div><span>OVERALL</span><strong>{model.currentStatus.overall ?? '—'}</strong><small>Current saved rating</small></div>
      <div><span>COACH TRUST</span><strong>{formatNumber(model.currentStatus.coachTrust)}</strong><small>{model.currentStatus.role || 'Depth chart not saved'}</small></div>
      <div><span>SKILL POINTS</span><strong>{formatNumber(model.currentStatus.skillPoints)}</strong><small>Current saved balance</small></div>
      <div><span>FOLLOWERS</span><strong>{formatNumber(model.currentStatus.followers)}</strong><small>Current saved audience</small></div>
    </div>

    {model.movement.length ? (
      <div className="dhq-player-offseason__movement">
        <span>SEASON MOVEMENT</span>
        {model.movement.map((change) => <div key={change.key}><strong>{change.label}</strong><b>{formatMovement(change)}</b><small>{String(change.current)}</small></div>)}
      </div>
    ) : null}

    {!readOnly && model.seasonComplete ? <button type="button" className="dhq-player-offseason__secondary" onClick={() => onNavigate?.('dataEntry')}>CAPTURE OFFSEASON UPDATE <ChevronRight size={16} /></button> : null}
  </section>
);

const Coverage = ({ model, onNavigate, readOnly }) => {
  const media = model.media;
  if (!media) return (
    <section className="dhq-player-offseason__section dhq-player-offseason__coverage is-empty">
      <div className="dhq-player-offseason__section-heading"><div><span>SEASON COVERAGE</span><h2>The final word is still being written</h2></div><Radio size={24} /></div>
      <p className="dhq-player-offseason__lead">No finished season coverage is attached to the latest saved media week yet. When a Newsroom story or Huddle episode exists, it becomes part of this season review instead of a status message.</p>
    </section>
  );

  return (
    <section className="dhq-player-offseason__section dhq-player-offseason__coverage">
      <div className="dhq-player-offseason__section-heading"><div><span>SEASON COVERAGE</span><h2>How the season was told</h2></div><Radio size={24} /></div>
      <div className="dhq-player-offseason__coverage-grid">
        {media.dynasty.newsroomReady ? <article><Newspaper size={18} /><span>NEWSROOM · W{media.week}</span><strong>{media.dynasty.headline}</strong><p>{media.dynasty.dek || `Coverage from the ${media.opponent || 'latest'} game.`}</p>{!readOnly ? <button type="button" onClick={() => onNavigate?.('newsroom')}>READ COVERAGE <ChevronRight size={14} /></button> : null}</article> : null}
        {media.dynasty.podcastReady ? <article><Headphones size={18} /><span>THE HUDDLE · W{media.week}</span><strong>{media.dynasty.podcastTitle}</strong><p>{media.dynasty.finishedPodcast ? 'Finished episode ready to play.' : 'The episode is part of the season archive.'}</p>{!readOnly ? <button type="button" onClick={() => onNavigate?.('podcast')}>OPEN THE HUDDLE <ChevronRight size={14} /></button> : null}</article> : null}
        {media.official.status === 'captured' && media.official.headline ? <article><Radio size={18} /><span>EA SPORTS NETWORK · W{media.week}</span><strong>{media.official.headline}</strong><p>{media.official.summary || 'Official in-game coverage captured from this season.'}</p></article> : null}
      </div>
    </section>
  );
};

const NextChapter = ({ model, onNavigate, readOnly }) => {
  const nextSchool = model.decision.destination || model.school;
  return (
    <section className={`dhq-player-offseason__next ${model.nextSeasonReady ? 'is-ready' : ''}`}>
      <div className="dhq-player-offseason__next-copy">
        <span>04 · NEXT CHAPTER</span>
        <h2>{!model.seasonComplete ? 'The next season stays behind the curtain for now' : model.decision.complete ? (model.decision.state === 'transfer' ? `A new chapter waits at ${nextSchool}` : `${model.school} gets another season`) : 'One decision stands between this season and the next'}</h2>
        <p>{!model.seasonComplete ? `Finish Season ${model.season} before DynastyHQ shifts the career forward.` : !model.decision.complete ? 'Record the stay-or-transfer decision first. That keeps the next season from quietly rewriting where this one ended.' : `Season ${model.season} remains archived exactly as it happened. When you are ready, advance the career and import the next schedule.`}</p>
      </div>
      <div className="dhq-player-offseason__next-actions">
        {!readOnly && model.nextSeasonReady ? <button type="button" className="dhq-player-offseason__primary" onClick={() => onNavigate?.('settings')}><CalendarDays size={17} /> OPEN NEXT-SEASON CONTROL</button> : null}
        {!readOnly && model.seasonComplete ? <button type="button" className="dhq-player-offseason__text-action" onClick={() => onNavigate?.('dashboard')}><GraduationCap size={15} /> FINAL PLAYING SEASON? REVIEW CAREER TRANSITION</button> : null}
      </div>
    </section>
  );
};

const PlayerOffseasonMode = ({ state = {}, onNavigate, readOnly = false }) => {
  const model = buildPlayerOffseasonMode(state);
  return (
    <div className="dhq-player-offseason" data-offseason-status={model.status}>
      <header className="dhq-player-offseason__hero">
        <div className="dhq-player-offseason__hero-top">
          <div><span className="dhq-player-offseason__kicker">END OF SEASON · OFFSEASON MODE</span><small>SEASON {model.season} · {model.school.toUpperCase()}</small></div>
          <div className={`dhq-player-offseason__status is-${model.status}`}><CircleDot size={13} />{model.seasonComplete ? 'SEASON COMPLETE' : 'LIVE PREVIEW'}</div>
        </div>
        <h1>{model.headline}</h1>
        <p>{model.dek}</p>
        <div className="dhq-player-offseason__hero-facts">
          <span><b>{model.teamRecord.wins}-{model.teamRecord.losses}</b> TEAM RECORD</span>
          <span><b>{model.playerLine.appearances}</b> APPEARANCES</span>
          <span><b>{model.currentStatus.role || '—'}</b> CURRENT ROLE</span>
          {model.schedule.remaining.length ? <span><b>{model.schedule.remaining.length}</b> GAMES LEFT</span> : null}
        </div>
        <PhaseRail model={model} />
      </header>

      {!model.seasonComplete && model.schedule.remaining.length ? (
        <section className="dhq-player-offseason__waiting">
          <div><CalendarDays size={18} /><span>THE SEASON IS STILL LIVE</span><strong>{model.schedule.remaining.length} saved matchup{model.schedule.remaining.length === 1 ? '' : 's'} remain</strong></div>
          <div className="dhq-player-offseason__remaining">{model.schedule.remaining.slice(0, 4).map((game) => <span key={game.week}>W{game.week} · {game.opponent} <small>{siteLabel(game.homeAway)}</small></span>)}</div>
          {!readOnly ? <button type="button" onClick={() => onNavigate?.('gameHub')}>BACK TO GAME HUB <ChevronRight size={15} /></button> : null}
        </section>
      ) : null}

      <SeasonReview model={model} />
      <CareerDecision model={model} onNavigate={onNavigate} readOnly={readOnly} />
      <Development model={model} onNavigate={onNavigate} readOnly={readOnly} />
      <Coverage model={model} onNavigate={onNavigate} readOnly={readOnly} />
      <NextChapter model={model} onNavigate={onNavigate} readOnly={readOnly} />

      <footer className="dhq-player-offseason__footer">
        <BookOpen size={16} />
        <p><strong>Nothing from Season {model.season} gets rewritten.</strong> Team results stay with the team schedule, your stats stay with your appearances, and the next school or season begins as a new chapter.</p>
      </footer>
    </div>
  );
};

export default PlayerOffseasonMode;
