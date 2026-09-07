import {
  Check,
  ChevronRight,
  CloudUpload,
  Image as ImageIcon,
  Play,
} from 'lucide-react';
import footballStadiumBg from '../assets/dynastyhq-football-stadium-bg.webp';
import matchupHelmets from '../assets/matchup-helmets.webp';
import { buildDashboardV2 } from '../domain/dashboardV2';
import { buildGameweekFlow } from '../domain/gameweekFlow';
import './broadcast-dashboard.css';
import './broadcast-reference.css';

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

const currentOpponent = (state = {}) => {
  const setup = state.currentWeekSetup || {};
  const draftGame = state.weeklyAgendaDraft?.newGame || state.weeklyAgendaDraft?.game || {};
  return clean(setup.opponent || draftGame.opponent) || 'NEXT OPPONENT';
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
  const player = state.player || {};
  const school = clean(model.institution || player.college || player.school) || 'YOUR PROGRAM';
  const opponent = currentOpponent(state);
  const latestGame = sortedByWeek(state.gameLogs || []).at(-1) || null;
  const newsItems = latestNewsItems(state);
  const chronicle = [...(state.careerChronicle || [])].filter(Boolean).reverse().slice(0, 4);
  const latestPodcast = [...(state.podcastEpisodes || [])].filter(Boolean).reverse().at(0) || null;
  const record = `${model.record?.wins || 0}-${model.record?.losses || 0}`;
  const compPct = state.rtg?.completionPct || state.rtg?.compPct || model.totals?.completionPct;
  const gameDate = formatDate(latestGame?.publishedAt || latestGame?.date || latestGame?.occurredAt);
  const weekType = state.currentWeekSetup?.type;
  const isBye = weekType === 'bye';
  const headline = isBye ? 'THE STORY CONTINUES THIS WEEK' : 'THE STORY CONTINUES SATURDAY';
  const stageLabel = model.stage === 'OC' ? 'OFFENSIVE COORDINATOR' : model.stage === 'HC' ? 'HEAD COACH' : model.stage === 'Retired' ? 'LEGACY' : display(player.pos, 'PLAYER');
  const open = (target) => onNavigate?.(target);

  return (
    <div
      id="dynastyhq-command-center"
      className="dhq-broadcast-dashboard relative z-10"
      data-dashboard-version="3"
      data-dashboard-modules={model.moduleIds.join(',')}
    >
      <div id="dhq-gameweek-flow-dashboard" hidden />

      <main className="dhq-broadcast-main">
        <section className="dhq-broadcast-hero" aria-labelledby="broadcast-week-title">
          <div className="dhq-broadcast-hero__angles" aria-hidden="true" />
          <span className="dhq-broadcast-hero__kicker">CURRENT WEEK</span>
          <h1 id="broadcast-week-title">{headline}</h1>
          <img className="dhq-broadcast-helmets" src={matchupHelmets} alt="Navy and red football helmets facing each other" />

          <div className="dhq-broadcast-team dhq-broadcast-team--left">
            <strong>{shortName(school)}</strong>
            <span>{record}</span>
            <small>{model.stage === 'HighSchool' ? 'HIGH SCHOOL' : 'CONFERENCE'}</small>
          </div>
          <div className="dhq-broadcast-team dhq-broadcast-team--right">
            <strong>{shortName(opponent, 'OPPONENT')}</strong>
            <span>{state.currentWeekSetup?.opponentRecord || '—'}</span>
            <small>{opponent === 'NEXT OPPONENT' ? 'ADD IN GAME HUB' : 'CONFERENCE'}</small>
          </div>

          <div className="dhq-broadcast-versus">
            <b>{isBye ? 'BYE' : 'VS'}</b>
            <span>{state.currentWeekSetup?.kickoff || (isBye ? `WEEK ${state.currentWeek ?? model.week}` : 'SATURDAY, 7:30 PM')}</span>
            <small>{state.currentWeekSetup?.venue || (isBye ? 'DEVELOPMENT WEEK' : 'STADIUM DETAILS PENDING')}</small>
          </div>

          {!readOnly ? (
            <div className="dhq-broadcast-hero__buttons">
              <button type="button" className="dhq-broadcast-primary" onClick={() => open('importSession')}>IMPORT SESSION <CloudUpload size={16} /></button>
              <button type="button" className="dhq-broadcast-secondary" onClick={() => open('gameHub')}>VIEW WEEK HUB <ChevronRight size={17} /></button>
            </div>
          ) : null}
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
