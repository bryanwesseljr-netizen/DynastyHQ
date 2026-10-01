import {
  Check,
  ChevronRight,
  CloudUpload,
  Image as ImageIcon,
  Play,
} from 'lucide-react';
import footballStadiumBg from '../assets/dynastyhq-football-stadium-bg.webp';
import matchupHelmets from '../assets/matchup-helmets.webp';
import DynamicMatchupHelmets from './DynamicMatchupHelmets.jsx';
import './dynamic-matchup-helmets.css';
import { buildDashboardV2 } from '../domain/dashboardV2';
import { buildGameweekFlow } from '../domain/gameweekFlow';
import { buildGameWeekImmersion } from '../domain/gameWeekImmersion.js';
import { nextScheduledGame } from '../domain/seasonSchedule.js';
import { requestNavigation } from '../domain/navigationBus.js';
import './broadcast-dashboard.css';
import './broadcast-reference.css';
import './game-week-immersion.css';

const numberValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const display = (value, fallback = '—') => (
  value === '' || value === null || value === undefined ? fallback : String(value)
);

const formatNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : '—';
};

const clean = (value) => String(value || '').trim();

const shortName = (value, fallback = 'TEAM') => {
  const text = clean(value) || fallback;
  if (text.length <= 13) return text.toUpperCase();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.at(-1).slice(0, 13).toUpperCase();
  return text.slice(0, 13).toUpperCase();
};

const sortedByWeek = (entries = []) => [...entries].filter(Boolean).sort((left, right) => (
  numberValue(left?.season, 1) - numberValue(right?.season, 1)
  || numberValue(left?.week, 0) - numberValue(right?.week, 0)
));

const gameScore = (game = {}) => {
  if (game.homeScore === '' || game.homeScore === undefined || game.awayScore === '' || game.awayScore === undefined) return '';
  return `${game.homeScore}-${game.awayScore}`;
};

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).format(date);
};

const resolveArticleImage = (article = {}, issue = {}, state = {}) => (
  article.imageUrl
  || article.photoUrl
  || article.media?.url
  || article.assignedMedia?.downloadUrl
  || issue.imageUrl
  || state.outletImages?.local
  || state.outletImages?.broadsheet
  || footballStadiumBg
);

const latestNewsItems = (state = {}) => sortedByWeek(state.newsroomIssues || [])
  .reverse()
  .flatMap((issue) => (issue.articles || []).map((article) => ({ issue, article })))
  .filter(({ article }) => article?.headline || article?.title)
  .slice(0, 3);

const chronicleTitle = (entry = {}) => {
  if (entry.title) return entry.title;
  const game = entry.game || {};
  if (game.opponent) return `Week ${entry.week ?? '—'} ${game.result || ''} vs ${game.opponent}`.replace(/\s+/g, ' ').trim();
  return `Season ${entry.season || 1} · Week ${entry.week ?? '—'}`;
};

const workflowCopy = (flow = {}) => {
  const steps = flow.steps || [];
  const scanComplete = steps.find((step) => step.id === 'logged')?.state === 'complete';
  const confirmComplete = scanComplete || Boolean(flow.wrapUp);
  const publishComplete = Boolean(flow.finalized);
  return [
    { label: 'Capture', detail: 'Upload your game', Icon: ImageIcon, complete: scanComplete },
    { label: 'Confirm', detail: 'Review key plays', Icon: Check, complete: confirmComplete },
    { label: 'Publish', detail: 'Share your story', Icon: CloudUpload, complete: publishComplete },
  ];
};

const BroadcastDashboard = ({ state = {}, onNavigate, readOnly = false }) => {
  const model = buildDashboardV2(state);
  const flow = buildGameweekFlow(state);
  const immersion = buildGameWeekImmersion(state, model, flow);
  const player = state.player || {};
  const school = immersion.school;
  const opponent = immersion.opponent;
  // The immersion model already scopes completed games to the current season.
  // Never fall back to a historical game here or an old opponent can leak into Home.
  const latestGame = immersion.latestGame || null;
  // Temporary Home refresh: presentation only. If the latest game is complete,
  // let Home look ahead to the next saved opponent without changing week state,
  // workflow state, Game Hub, or any career data.
  const forwardGame = ['postgame', 'between'].includes(immersion.mode)
    ? nextScheduledGame(state, numberValue(state.currentSeason, immersion.currentSeason || 1))
    : null;
  const forwardOpponent = clean(forwardGame?.opponent);
  const useForwardHero = Boolean(forwardOpponent);
  const newsItems = latestNewsItems(state);
  const chronicle = [...(state.careerChronicle || [])].filter(Boolean).reverse().slice(0, 4);
  const latestPodcast = [...(state.podcastEpisodes || [])].filter(Boolean).reverse().at(0) || null;
  const currentRecord = `${model.record?.wins || 0}-${model.record?.losses || 0}`;
  const record = immersion.mode === 'postgame' && immersion.latestGameRecord
    ? `${immersion.latestGameRecord.wins || 0}-${immersion.latestGameRecord.losses || 0}`
    : currentRecord;
  const compPct = state.rtg?.completionPct || state.rtg?.compPct || model.totals?.completionPct;
  const gameDate = formatDate(latestGame?.publishedAt || latestGame?.date || latestGame?.occurredAt);
  const stageLabel = model.stage === 'OC' ? 'OFFENSIVE COORDINATOR' : model.stage === 'HC' ? 'HEAD COACH' : model.stage === 'Retired' ? 'LEGACY' : display(player.pos, 'PLAYER');
  const open = (target, detail = {}) => {
    if (requestNavigation(target, detail)) return;
    onNavigate?.(target, detail);
  };
  const upcomingSiteLabel = immersion.upcomingGame?.homeAway === 'home'
    ? 'HOME'
    : immersion.upcomingGame?.homeAway === 'away'
      ? 'AWAY'
      : immersion.upcomingGame?.homeAway === 'neutral'
        ? 'NEUTRAL'
        : '';
  const rightTeamMeta = immersion.mode === 'pregame'
    ? (state.currentWeekSetup?.opponentRecord || upcomingSiteLabel || 'UP NEXT')
    : immersion.mode === 'bye'
      ? `WEEK ${immersion.week}`
      : immersion.mode === 'preseason'
        ? `SEASON ${immersion.currentSeason}`
        : immersion.mode === 'offseason'
          ? 'SEASON COMPLETE'
          : (latestGame?.opponentRecord || '—');
  const rightTeamLabel = immersion.mode === 'pregame'
    ? 'NEXT OPPONENT'
    : immersion.mode === 'postgame'
      ? 'FINAL OPPONENT'
      : immersion.mode === 'between'
        ? 'LAST OPPONENT'
        : immersion.mode === 'bye'
          ? 'BYE WEEK'
          : immersion.mode === 'preseason'
            ? 'PRESEASON'
            : immersion.mode === 'offseason'
              ? 'OFFSEASON'
              : 'CURRENT STATE';

  const forwardSiteLabel = forwardGame?.homeAway === 'home'
    ? 'HOME'
    : forwardGame?.homeAway === 'away'
      ? 'AWAY'
      : forwardGame?.homeAway === 'neutral'
        ? 'NEUTRAL'
        : 'UP NEXT';
  const latestScore = latestGame ? gameScore(latestGame) : '';
  const heroKicker = useForwardHero ? `WEEK ${forwardGame.week} · THE NEXT CHAPTER` : immersion.kicker;
  const heroHeadline = useForwardHero
    ? `${clean(school).toUpperCase()} VS ${forwardOpponent.toUpperCase()}`
    : immersion.headline;
  const heroOpponent = useForwardHero ? forwardOpponent : (immersion.heroOpponent || '');
  const heroRightTeam = useForwardHero ? forwardOpponent : (immersion.rightTeamName || opponent);
  const heroRightMeta = useForwardHero ? forwardSiteLabel : rightTeamMeta;
  const heroRightLabel = useForwardHero ? 'NEXT OPPONENT' : rightTeamLabel;
  const heroCenter = useForwardHero ? 'VS' : immersion.center;
  const heroCenterLine = useForwardHero ? `WEEK ${forwardGame.week}` : immersion.centerLine;
  const heroCenterDetail = useForwardHero && latestGame
    ? `LAST: ${clean(latestGame.result).toUpperCase() || 'FINAL'} ${latestScore} VS ${shortName(latestGame.opponent, 'OPPONENT')}`
    : immersion.centerDetail;
  const heroPrimaryLabel = useForwardHero && immersion.mode === 'postgame'
    ? `CONTINUE TO WEEK ${forwardGame.week}`
    : immersion.primaryLabel;
  const heroPrimaryTarget = useForwardHero && immersion.mode === 'postgame'
    ? 'gameHub'
    : immersion.primaryTarget;
  const heroSecondaryLabel = useForwardHero ? 'VIEW LAST GAME' : (immersion.secondaryLabel || 'VIEW WEEK HUB');
  const heroSecondaryTarget = useForwardHero ? 'gameHub' : (immersion.secondaryTarget || 'gameHub');
  const heroSecondaryDetail = useForwardHero && latestGame
    ? {
        season: numberValue(latestGame.season, immersion.currentSeason || 1),
        week: numberValue(latestGame.week, 0),
        publicationId: `season-${numberValue(latestGame.season, immersion.currentSeason || 1)}-week-${numberValue(latestGame.week, 0)}`,
      }
    : {};

  return (
    <div
      id="dynastyhq-command-center"
      className="dhq-broadcast-dashboard relative z-10"
      data-dashboard-version="4"
      data-dashboard-modules={model.moduleIds.join(',')}
      data-game-week-state={immersion.mode}
    >
      <div id="dhq-gameweek-flow-dashboard" hidden />

      <main className="dhq-broadcast-main">
        <section className="dhq-broadcast-hero" aria-labelledby="broadcast-week-title" data-week-state={immersion.mode} data-home-focus={useForwardHero ? 'forward' : 'current'}>
          <div className="dhq-broadcast-hero__angles" aria-hidden="true" />
          <span className="dhq-broadcast-hero__kicker">{heroKicker}</span>
          <h1 id="broadcast-week-title">{heroHeadline}</h1>
          <DynamicMatchupHelmets
            className="dhq-broadcast-helmets"
            homeTeam={school}
            awayTeam={heroOpponent}
            highSchool={model.stage === 'HighSchool'}
          />

          <div className="dhq-broadcast-team dhq-broadcast-team--left">
            <strong>{shortName(school)}</strong>
            <span>{record}</span>
            <small>{model.stage === 'HighSchool' ? 'HIGH SCHOOL' : 'CONFERENCE'}</small>
          </div>
          <div className="dhq-broadcast-team dhq-broadcast-team--right">
            <strong>{shortName(heroRightTeam, 'OPPONENT')}</strong>
            <span>{heroRightMeta}</span>
            <small>{heroRightLabel}</small>
          </div>

          {!useForwardHero && immersion.centerLayout === 'status' ? (
            <div className="dhq-broadcast-season-center" aria-label="Current season status">
              <b>{heroCenter}</b>
              <span>{heroCenterLine}</span>
              <small>{heroCenterDetail}</small>
            </div>
          ) : (
            <div className="dhq-broadcast-versus">
              <b>{heroCenter}</b>
              <span>{heroCenterLine}</span>
              <small>{heroCenterDetail}</small>
            </div>
          )}

          {!readOnly ? (
            <div className="dhq-broadcast-hero__buttons">
              <button type="button" className="dhq-broadcast-primary" onClick={() => open(heroPrimaryTarget)}>
                {heroPrimaryLabel}
                {heroPrimaryTarget === 'importSession' ? <CloudUpload size={16} /> : heroPrimaryTarget === 'gameHub' && useForwardHero ? <Play size={15} /> : immersion.mode === 'pregame' ? <Play size={15} /> : <ChevronRight size={17} />}
              </button>
              <button type="button" className="dhq-broadcast-secondary" onClick={() => open(heroSecondaryTarget, heroSecondaryDetail)}>
                {heroSecondaryLabel}
                {heroSecondaryTarget === 'importSession' ? <CloudUpload size={16} /> : <ChevronRight size={17} />}
              </button>
            </div>
          ) : null}
        </section>

        <section className="dhq-gameweek-immersion" aria-label="Game week immersion" data-week-state={immersion.mode}>
          <article className="dhq-immersion-panel dhq-immersion-previous">
            <span className="dhq-immersion-eyebrow">STORY SO FAR</span>
            <h2>{immersion.previous.title}</h2>
            <p>{immersion.previous.copy}</p>
            <button type="button" onClick={() => open('chronicle')}>OPEN CHRONICLE <ChevronRight size={14} /></button>
          </article>

          <article className="dhq-immersion-panel dhq-immersion-keys">
            <span className="dhq-immersion-eyebrow">{immersion.mode === 'pregame' ? 'UP NEXT' : immersion.mode === 'offseason' ? 'NEXT CHAPTER' : 'WEEK STATE'}</span>
            <h2>{immersion.keysTitle}</h2>
            <div className="dhq-immersion-key-list">
              {immersion.keys.map((key, index) => (
                <div key={`${key.title}-${index}`}>
                  <b>{index + 1}</b>
                  <span><strong>{key.title}</strong><small>{key.detail}</small></span>
                </div>
              ))}
            </div>
          </article>

          <article className="dhq-immersion-panel dhq-immersion-scout">
            <span className="dhq-immersion-eyebrow">{immersion.scout.eyebrow}</span>
            <h2>{shortName(immersion.scout.team, 'OPPONENT')}</h2>
            <div className="dhq-immersion-scout-facts">
              {immersion.scout.facts.length ? immersion.scout.facts.map((fact) => (
                <div key={`${fact.label}-${fact.value}`}><span>{fact.label}</span><strong>{fact.value}</strong></div>
              )) : <div className="dhq-immersion-scout-empty">Verified details pending</div>}
            </div>
            <p>{immersion.scout.note}</p>
            <button type="button" onClick={() => open('gameHub')}>OPEN GAME HUB <ChevronRight size={14} /></button>
          </article>
        </section>

        <section className="dhq-broadcast-cards" aria-label="Career dashboard">
          <article className="dhq-broadcast-card dhq-broadcast-career-card">
            <h2><i />CAREER STATUS</h2>
            <div className="dhq-broadcast-career-main">
              <div className="dhq-broadcast-number-tile">#{display(player.number, '—')}</div>
              <div className="dhq-broadcast-player-copy">
                <strong>{clean(player.name).toUpperCase() || 'PLAYER PROFILE'}</strong>
                <b>{stageLabel} <em>•</em> #{display(player.number, '—')}</b>
                <span>{display(player.height)} <em>•</em> {display(player.weight)}</span>
                <small>{player.classYear || player.year || model.stage}</small>
              </div>
            </div>
            <div className="dhq-broadcast-career-stats">
              <div><b>{display(compPct)}</b><span>COMP %</span></div>
              <div><b>{formatNumber(model.totals?.passYds)}</b><span>YDS</span></div>
              <div><b>{formatNumber(numberValue(model.totals?.passTD) + numberValue(model.totals?.rushTD))}</b><span>TD</span></div>
              <div><b>{formatNumber(model.totals?.interceptions)}</b><span>INT</span></div>
            </div>
            <button className="dhq-broadcast-card-link" type="button" onClick={() => open('career')}>VIEW CAREER <ChevronRight size={16} /></button>
          </article>

          <article className="dhq-broadcast-card dhq-broadcast-result-card">
            <h2><i />LATEST RESULT</h2>
            <span className="dhq-broadcast-week-label">{latestGame ? `WEEK ${latestGame.week ?? '—'}` : 'NO RESULT YET'}</span>
            <div className="dhq-broadcast-result-score">
              <strong>{shortName(school)}</strong><b>{latestGame ? display(latestGame.homeScore) : '—'} {latestGame ? <i>▶</i> : null}</b>
              <strong>{latestGame ? shortName(latestGame.opponent, 'OPPONENT') : 'OPPONENT'}</strong><b>{latestGame ? display(latestGame.awayScore) : '—'}</b>
            </div>
            <p className="dhq-broadcast-result-meta"><em>{latestGame?.result || '—'}</em><span>•</span>{gameDate || `SEASON ${state.currentSeason || 1}`}</p>
            <button className="dhq-broadcast-card-link" type="button" onClick={() => open('chronicle')}>VIEW RECAP <ChevronRight size={16} /></button>
          </article>

          <article className="dhq-broadcast-card dhq-broadcast-news-card">
            <h2><i />NEWSROOM</h2>
            <div className="dhq-broadcast-news-list">
              {newsItems.length ? newsItems.map(({ article, issue }, index) => (
                <button type="button" key={article.id || `${issue.id || issue.publicationId}-${index}`} onClick={() => open('newsroom')}>
                  <img src={resolveArticleImage(article, issue, state)} alt="" />
                  <span><strong>{article.headline || article.title}</strong><small>{formatDate(article.publishedAt || issue.publishedAt) || `WEEK ${issue.week ?? '—'}`}</small></span>
                </button>
              )) : (
                <div className="dhq-broadcast-card-empty">Your next verified story will appear after a published week.</div>
              )}
            </div>
            <button className="dhq-broadcast-card-link" type="button" onClick={() => open('newsroom')}>VIEW ALL NEWS <ChevronRight size={16} /></button>
          </article>

          <article className="dhq-broadcast-card dhq-broadcast-chronicle-card">
            <h2><i />CAREER CHRONICLE</h2>
            <div className="dhq-broadcast-chronicle-list">
              {chronicle.length ? chronicle.map((entry, index) => (
                <div className={`dhq-broadcast-chronicle-row ${index === 0 ? 'is-current' : ''}`} key={entry.id || `${entry.season}-${entry.week}-${index}`}>
                  <span>{entry.season || state.currentSeason || 1}</span><i /><strong>{chronicleTitle(entry)}</strong><b>{gameScore(entry.game || entry) || ''}</b>
                </div>
              )) : <div className="dhq-broadcast-card-empty">Verified career moments will build this timeline.</div>}
            </div>
            <button className="dhq-broadcast-card-link" type="button" onClick={() => open('chronicle')}>VIEW CHRONICLE <ChevronRight size={16} /></button>
          </article>
        </section>

        <section className="dhq-broadcast-lower-row">
          <article className="dhq-broadcast-workflow-card">
            <h2>MY WORKFLOW</h2>
            {workflowCopy(flow).map(({ label, detail, Icon, complete }, index) => (
              <div className="dhq-broadcast-workflow-fragment" key={label}>
                <button type="button" className="dhq-broadcast-workflow-step" onClick={() => open(index === 0 ? 'importSession' : 'gameHub')}>
                  <span className={complete ? 'is-complete' : ''}><Icon size={18} /></span>
                  <p><strong>{label}</strong><small>{detail}</small></p>
                </button>
                {index < 2 ? <i className="dhq-broadcast-flow-arrow">➞</i> : null}
              </div>
            ))}
          </article>

          <article className="dhq-broadcast-podcast-card">
            <div className="dhq-broadcast-podcast-helmet"><img src={matchupHelmets} alt="" /></div>
            <div className="dhq-broadcast-podcast-copy"><span>PODCAST</span><strong>{latestPodcast?.showName || 'THE HUDDLE'}</strong><small>{latestPodcast?.title || 'Insight. Players. Saturdays.'}</small><button type="button" onClick={() => open('podcast')}>{latestPodcast ? 'LISTEN NOW' : 'OPEN STUDIO'} <Play size={9} /></button></div>
            <div className="dhq-broadcast-waveform" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} />)}</div>
            <button type="button" className="dhq-broadcast-microphone" onClick={() => open('podcast')} aria-label="Open podcast"><span /></button>
          </article>
        </section>
      </main>

      <footer className="dhq-broadcast-footer">
        <button type="button" className="dhq-broadcast-logo" onClick={() => open('dashboard')}><span>DYNASTY</span><b>HQ</b></button>
        <p>YOUR CAREER. &nbsp; YOUR LEGACY. &nbsp; <strong>YOUR DYNASTY.</strong></p>
        <div><span>SATURDAY NIGHT</span><strong>FOOTBALL</strong><i /><i /></div>
      </footer>
    </div>
  );
};

export default BroadcastDashboard;