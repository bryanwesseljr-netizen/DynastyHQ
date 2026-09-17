import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  BookOpen,
  CalendarDays,
  Camera,
  ChevronRight,
  Headphones,
  Newspaper,
  Radio,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react';
import { buildMediaNetworkLayer, latestCompletedMediaContext } from '../domain/mediaNetworkLayer.js';
import {
  nextScheduledGame,
  seasonScheduleFor,
  syncScheduleWithCareer,
  teamRecordForSeason,
  teamRecordThroughWeek,
} from '../domain/seasonSchedule.js';
import { buildStorylineEngine } from '../domain/storylineEngine.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './immersive-experience-v3.css';
import './immersive-experience-v3-polish.css';

const clean = (value) => String(value ?? '').trim();
const numberOf = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const arrayOf = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const visibleNavButton = (labels = []) => {
  const wanted = (Array.isArray(labels) ? labels : [labels]).map((label) => clean(label).toUpperCase());
  const buttons = [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')];
  return buttons.find((button) => wanted.includes(clean(button.textContent).toUpperCase()) && button.offsetParent !== null)
    || buttons.find((button) => wanted.includes(clean(button.textContent).toUpperCase()))
    || null;
};

const openNav = (labels) => visibleNavButton(labels)?.click();

const roleFor = (career = {}) => clean(
  career.rtg?.rank
  || career.rtg?.depthChartRole
  || career.rtgStatus?.rank
  || career.rtgStatus?.depthChartRole
  || career.player?.depthChartRole
  || career.player?.pos,
) || 'PLAYER';

const coachTrustFor = (career = {}) => numberOf(
  career.rtg?.coachTrust
  ?? career.rtgStatus?.coachTrust
  ?? career.currentRtgStatus?.coachTrust,
  0,
);

const currentStoryContext = (career = {}) => {
  const setup = career.currentWeekSetup || {};
  return {
    season: Math.max(1, numberOf(career.currentSeason, 1)),
    week: Math.max(0, numberOf(setup.week ?? career.currentWeek, 0)),
    opponent: clean(setup.opponent),
    phase: setup.type !== 'bye' && clean(setup.opponent) ? 'pregame' : 'current',
  };
};

const threadBadge = (thread = {}) => {
  if (thread.changedThisWeek) return 'NEW';
  if (thread.recentlyCovered) return 'CARRYOVER';
  return 'ACTIVE';
};

const HomeFocusDeck = ({ career }) => {
  const season = Math.max(1, numberOf(career.currentSeason, 1));
  const context = currentStoryContext(career);
  const story = buildStorylineEngine(career, context);
  const record = teamRecordForSeason(career, season);
  const nextGame = nextScheduledGame(career, season);
  const mediaContext = latestCompletedMediaContext(career);
  const media = buildMediaNetworkLayer(career, mediaContext);
  const role = roleFor(career);
  const coachTrust = coachTrustFor(career);
  const lead = story.lead;
  const playerName = clean(career.player?.name) || 'Tracked Player';
  const coverageTitle = media.dynasty.headline
    || media.dynasty.podcastTitle
    || (media.official.status === 'captured' ? media.official.headline : '')
    || 'The next verified story will appear here.';
  const coverageState = media.dynasty.finishedPodcast
    ? 'FINISHED PODCAST READY'
    : media.dynasty.newsroomReady
      ? 'NEWSROOM EDITION READY'
      : media.official.status === 'captured'
        ? 'OFFICIAL COVERAGE CAPTURED'
        : 'COVERAGE BUILDS WITH THE SEASON';

  return (
    <section className="dhq-v3-focus" aria-label="What matters now">
      <header className="dhq-v3-focus__header">
        <div>
          <span><Sparkles size={13} /> WHAT MATTERS NOW</span>
          <h2>{lead?.title || `${playerName}'s season is moving forward.`}</h2>
        </div>
        <p>{lead?.detail || story.previous?.copy || 'DynastyHQ is keeping the important career context together so you do not have to read every panel at once.'}</p>
      </header>

      <div className="dhq-v3-focus__grid">
        <button type="button" className="dhq-v3-focus-card" onClick={() => openNav('Career')}>
          <span><UserRound size={14} /> YOUR ROLE</span>
          <strong>{role.toUpperCase()}</strong>
          <small>{coachTrust ? `${coachTrust.toLocaleString()} coach trust` : `${playerName} · current saved role`}</small>
          <i>Career <ChevronRight size={13} /></i>
        </button>

        <button type="button" className="dhq-v3-focus-card" onClick={() => document.querySelector('.dhq-season-strip')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
          <span><Trophy size={14} /> SEASON</span>
          <strong>{record.wins}-{record.losses}</strong>
          <small>{nextGame ? `Next: W${nextGame.week} · ${clean(nextGame.opponent).toUpperCase()}` : 'Season calendar is up to date'}</small>
          <i>Schedule <ChevronRight size={13} /></i>
        </button>

        <button type="button" className="dhq-v3-focus-card" onClick={() => openNav(['The Newsroom', 'Newsroom'])}>
          <span><Newspaper size={14} /> COVERAGE</span>
          <strong>{coverageState}</strong>
          <small>{coverageTitle}</small>
          <i>Coverage <ChevronRight size={13} /></i>
        </button>
      </div>

      {lead ? (
        <button type="button" className="dhq-v3-story-feature" onClick={() => openNav('Chronicle')}>
          <span className="dhq-v3-story-feature__label"><BookOpen size={13} /> THE STORY · {threadBadge(lead)}</span>
          <strong>{lead.title}</strong>
          <p>{lead.detail}</p>
          <i>FOLLOW THE CAREER THREAD <ChevronRight size={13} /></i>
        </button>
      ) : null}
    </section>
  );
};

const parseHubContext = () => {
  const hub = document.querySelector('.dhq-game-hub');
  if (!hub || !hub.querySelector('.dhq-gh-hero.is-final')) return null;
  const label = clean(hub.querySelector('.dhq-game-hub__toolbar strong')?.textContent);
  const match = label.match(/season\s+(\d+)\s*[·•-]?\s*week\s+(\d+)/i);
  if (!match) return null;
  return {
    season: Number(match[1]),
    week: Number(match[2]),
    opponent: clean(hub.querySelector('.dhq-gh-team--right strong')?.textContent),
  };
};

const selectedGameFor = (career = {}, context = {}) => arrayOf(career.gameLogs).find((game) => (
  Number(game?.season || 1) === Number(context.season || 1)
  && Number(game?.week || 0) === Number(context.week || 0)
));

const syncedScheduleFor = (career = {}, season = 1) => {
  const schedule = seasonScheduleFor(career, season);
  return schedule?.entries?.length ? syncScheduleWithCareer(career, schedule) : null;
};

const nextGameAfter = (career = {}, context = {}) => {
  const schedule = syncedScheduleFor(career, context.season);
  if (!schedule?.entries?.length) return null;
  return schedule.entries
    .filter((entry) => !entry.isBye && Number(entry.week) > Number(context.week))
    .sort((left, right) => Number(left.week) - Number(right.week))[0] || null;
};

const scheduleStatus = (entry = {}) => {
  if (entry.isBye) return 'BYE';
  if (entry.completed) {
    const score = entry.teamScore !== null && entry.opponentScore !== null
      ? `${entry.teamScore}-${entry.opponentScore}`
      : '';
    return `${clean(entry.result).toUpperCase()}${score ? ` · ${score}` : ''}`.trim();
  }
  if (entry.homeAway === 'home') return 'HOME';
  if (entry.homeAway === 'away') return 'AWAY';
  if (entry.homeAway === 'neutral') return 'NEUTRAL';
  return 'UPCOMING';
};

const FullSchedule = ({ career, context }) => {
  const schedule = syncedScheduleFor(career, context.season);
  if (!schedule?.entries?.length) return null;
  const split = Math.ceil(schedule.entries.length / 2);
  const columns = [schedule.entries.slice(0, split), schedule.entries.slice(split)];

  return (
    <section className="dhq-v3-full-schedule" aria-label="Full season schedule">
      <header>
        <div>
          <span>SEASON {context.season}</span>
          <strong>FULL SCHEDULE</strong>
        </div>
        <small>{schedule.entries.length} weeks saved · Week {context.week} highlighted</small>
      </header>
      <div className="dhq-v3-full-schedule__columns">
        {columns.map((column, columnIndex) => (
          <div className="dhq-v3-full-schedule__column" key={`schedule-column-${columnIndex}`}>
            {column.map((entry) => (
              <article className={Number(entry.week) === Number(context.week) ? 'is-current' : ''} key={`schedule-${entry.week}`}>
                <span>W{entry.week}</span>
                <div>
                  <strong>{entry.isBye ? 'BYE WEEK' : clean(entry.opponent).toUpperCase()}</strong>
                  <small>{entry.date || (entry.isBye ? 'Development week' : '')}</small>
                </div>
                <b className={entry.result === 'W' ? 'is-win' : entry.result === 'L' ? 'is-loss' : ''}>{scheduleStatus(entry)}</b>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
};

const playerSeasonThroughWeek = (career = {}, context = {}) => arrayOf(career.gameLogs)
  .filter((game) => game?.stage !== 'high-school' && !game?.evaluation && game?.didPlay !== false)
  .filter((game) => Number(game?.season || 1) === Number(context.season) && Number(game?.week || 0) <= Number(context.week))
  .reduce((totals, game) => ({
    appearances: totals.appearances + 1,
    passYds: totals.passYds + numberOf(game.passYds),
    passTD: totals.passTD + numberOf(game.passTD),
    rushYds: totals.rushYds + numberOf(game.rushYds),
    rushTD: totals.rushTD + numberOf(game.rushTD),
    interceptions: totals.interceptions + numberOf(game.int ?? game.interceptions),
  }), { appearances: 0, passYds: 0, passTD: 0, rushYds: 0, rushTD: 0, interceptions: 0 });

const GameHubOverview = ({ career, context, onSection }) => {
  const game = selectedGameFor(career, context);
  const story = buildStorylineEngine(career, { ...context, phase: 'postgame' });
  const next = nextGameAfter(career, context);
  const passYds = numberOf(game?.passYds);
  const passTD = numberOf(game?.passTD);
  const rushYds = numberOf(game?.rushYds);
  const rushTD = numberOf(game?.rushTD);
  const totalTD = passTD + rushTD;
  const score = game && game.homeScore !== undefined && game.awayScore !== undefined ? `${game.homeScore}-${game.awayScore}` : 'FINAL';
  const result = clean(game?.result).toUpperCase() || 'FINAL';

  return (
    <section className="dhq-v3-game-overview" aria-label="Game overview">
      <div className="dhq-v3-game-overview__intro">
        <span>START HERE</span>
        <h2>{story.lead?.title || `${result} · ${score} vs ${context.opponent}`}</h2>
        <p>{story.lead?.detail || story.previous?.copy || 'This game now has one clear home: the result, your performance, the season around it, and what comes next.'}</p>
      </div>
      <div className="dhq-v3-game-overview__beats">
        <article>
          <span>WHAT HAPPENED</span>
          <strong>{result} · {score}</strong>
          <small>{context.opponent ? `vs ${context.opponent}` : 'Verified final result'}</small>
        </article>
        <article>
          <span>YOUR LINE</span>
          <strong>{passYds} PASS YDS · {totalTD} TD</strong>
          <small>{rushYds} rush yds{game?.int !== undefined ? ` · ${numberOf(game.int)} INT` : ''}</small>
        </article>
        <article>
          <span>WHAT'S NEXT</span>
          <strong>{next ? `W${next.week} · ${clean(next.opponent).toUpperCase()}` : 'CAREER MOVES FORWARD'}</strong>
          <small>{next ? (next.homeAway === 'away' ? 'Away' : next.homeAway === 'home' ? 'Home' : 'Upcoming') : 'The season continues from here'}</small>
        </article>
      </div>
      <FullSchedule career={career} context={context} />
      <div className="dhq-v3-game-overview__actions">
        <button type="button" onClick={() => onSection('story')}><BookOpen size={13} /> GAME STORY</button>
        <button type="button" onClick={() => onSection('media')}><Newspaper size={13} /> COVERAGE</button>
      </div>
    </section>
  );
};

const GameStoryExperience = ({ career, context }) => {
  const game = selectedGameFor(career, context);
  const story = buildStorylineEngine(career, { ...context, phase: 'postgame' });
  const media = buildMediaNetworkLayer(career, context);
  const next = nextGameAfter(career, context);
  const passYds = numberOf(game?.passYds);
  const passTD = numberOf(game?.passTD);
  const rushYds = numberOf(game?.rushYds);
  const rushTD = numberOf(game?.rushTD);
  const interceptions = numberOf(game?.int ?? game?.interceptions);
  const result = clean(game?.result).toUpperCase();
  const score = media.score || (game && game.homeScore !== undefined && game.awayScore !== undefined ? `${game.homeScore}-${game.awayScore}` : '');
  const totalTD = passTD + rushTD;
  const gameLine = media.dynasty.dek
    || `${clean(career.player?.name) || 'The tracked player'} finished with ${passYds} passing yards${totalTD ? ` and ${totalTD} total touchdown${totalTD === 1 ? '' : 's'}` : ''} in the ${result === 'W' ? 'win' : result === 'L' ? 'loss' : 'game'}${score ? `, ${score}` : ''}.`;
  const impact = story.lead?.detail
    || (interceptions > 0
      ? `${interceptions} interception${interceptions === 1 ? '' : 's'} becomes part of the film heading into the next start.`
      : `${passYds} passing yards and ${rushYds} rushing yards become the latest chapter in the season.`);
  const carry = next
    ? `The story now turns to Week ${next.week} against ${clean(next.opponent)}${next.homeAway === 'home' ? ' at home' : next.homeAway === 'away' ? ' on the road' : ''}.`
    : 'This result is now part of the permanent career timeline.';

  return (
    <section className="dhq-v3-story-experience" aria-label="Game story">
      <header>
        <span><BookOpen size={13} /> GAME STORY</span>
        <h2>{media.dynasty.headline || story.lead?.title || `${result || 'FINAL'} ${score ? `· ${score}` : ''} VS ${clean(context.opponent).toUpperCase()}`}</h2>
        <p>{gameLine}</p>
      </header>
      <div className="dhq-v3-story-experience__beats">
        <article><span>THE PLAYER LENS</span><strong>{passYds} PASS YDS · {totalTD} TD</strong><p>{impact}</p></article>
        <article><span>THE CARRYOVER</span><strong>{story.lead?.title || 'WHAT THIS SETS UP'}</strong><p>{carry}</p></article>
      </div>
      <button type="button" onClick={() => openNav('Chronicle')}>OPEN CAREER CHRONICLE <ChevronRight size={13} /></button>
    </section>
  );
};

const CoverageExperience = ({ career, context }) => {
  const media = buildMediaNetworkLayer(career, context);
  const hasOfficialStory = media.official.status === 'captured' && clean(media.official.headline);
  const hasDynastyStory = media.dynasty.newsroomReady && clean(media.dynasty.headline);
  const hasPodcast = media.dynasty.podcastReady && clean(media.dynasty.podcastTitle);

  return (
    <section className="dhq-v3-coverage-experience" aria-label="Game coverage">
      <header>
        <span><Radio size={13} /> COVERAGE DESK</span>
        <h2>HOW THIS GAME WAS TOLD</h2>
        <p>Only finished stories and shows appear here. Archive metadata and importer status stay out of the spotlight.</p>
      </header>
      <div className="dhq-v3-coverage-experience__grid">
        {hasDynastyStory ? (
          <article className="is-featured">
            <span><Newspaper size={13} /> DYNASTYHQ NEWSROOM</span>
            <strong>{media.dynasty.headline}</strong>
            <p>{media.dynasty.dek || 'The finished DynastyHQ game story is ready to read.'}</p>
            <button type="button" onClick={() => openNav(['The Newsroom', 'Newsroom'])}>READ THE STORY <ChevronRight size={13} /></button>
          </article>
        ) : null}
        {hasPodcast ? (
          <article>
            <span><Headphones size={13} /> THE HUDDLE</span>
            <strong>{media.dynasty.podcastTitle}</strong>
            <p>{media.dynasty.finishedPodcast ? 'The finished episode is ready to play.' : 'The episode is ready in the podcast studio.'}</p>
            <button type="button" onClick={() => openNav('Podcast')}>{media.dynasty.finishedPodcast ? 'LISTEN TO EPISODE' : 'OPEN PODCAST'} <ChevronRight size={13} /></button>
          </article>
        ) : null}
        {hasOfficialStory ? (
          <article>
            <span><Radio size={13} /> EA SPORTS NETWORK</span>
            <strong>{media.official.headline}</strong>
            <p>{media.official.summary || 'Official in-game coverage captured from this week.'}</p>
          </article>
        ) : null}
        {!hasDynastyStory && !hasPodcast && !hasOfficialStory ? (
          <article className="is-empty">
            <span>COVERAGE</span>
            <strong>NO FINISHED MEDIA FOR THIS GAME YET</strong>
            <p>When a Newsroom story, podcast episode, or captured official article exists, it will become part of this game’s media record.</p>
          </article>
        ) : null}
      </div>
    </section>
  );
};

const SeasonPulseExperience = ({ career, context }) => {
  const schedule = syncedScheduleFor(career, context.season);
  const thenRecord = teamRecordThroughWeek(career, context.season, context.week);
  const currentRecord = teamRecordForSeason(career, context.season);
  const player = playerSeasonThroughWeek(career, context);
  const decided = arrayOf(schedule?.entries)
    .filter((entry) => !entry.isBye && entry.completed && Number(entry.week) <= Number(context.week))
    .sort((a, b) => Number(a.week) - Number(b.week));
  const form = decided.slice(-5).map((entry) => clean(entry.result).toUpperCase()).filter(Boolean).join(' · ') || '—';
  const roadAhead = arrayOf(schedule?.entries)
    .filter((entry) => !entry.isBye && Number(entry.week) > Number(context.week))
    .sort((a, b) => Number(a.week) - Number(b.week))
    .slice(0, 4);
  const playerTD = player.passTD + player.rushTD;

  return (
    <section className="dhq-v3-season-pulse" aria-label="Season pulse">
      <header>
        <span><Trophy size={13} /> SEASON PULSE</span>
        <h2>WHERE THE SEASON STOOD AFTER WEEK {context.week}</h2>
        <p>This view is about context, not another copy of the schedule.</p>
      </header>
      <div className="dhq-v3-season-pulse__grid">
        <article>
          <span>AT THIS POINT</span>
          <strong>{thenRecord.wins}-{thenRecord.losses}</strong>
          <p>Recent form: {form}</p>
          {currentRecord.wins !== thenRecord.wins || currentRecord.losses !== thenRecord.losses ? <small>Season now: {currentRecord.wins}-{currentRecord.losses}</small> : null}
        </article>
        <article>
          <span>YOUR SEASON THROUGH W{context.week}</span>
          <strong>{player.passYds} PASS YDS · {playerTD} TD</strong>
          <p>{player.appearances} appearance{player.appearances === 1 ? '' : 's'} · {player.rushYds} rush yds · {player.interceptions} INT</p>
        </article>
        <article className="is-road-ahead">
          <span>ROAD AHEAD</span>
          <div>
            {roadAhead.length ? roadAhead.map((entry) => (
              <p key={`road-${entry.week}`}><b>W{entry.week}</b> {clean(entry.opponent).toUpperCase()} <small>{entry.homeAway === 'home' ? 'HOME' : entry.homeAway === 'away' ? 'AWAY' : ''}</small></p>
            )) : <p>Regular-season schedule complete.</p>}
          </div>
        </article>
      </div>
    </section>
  );
};

const GAME_TABS = [
  ['overview', 'OVERVIEW', Activity],
  ['story', 'GAME STORY', BookOpen],
  ['media', 'COVERAGE', Headphones],
  ['stats', 'STATS', Trophy],
  ['photos', 'PHOTOS', Camera],
  ['season', 'SEASON PULSE', CalendarDays],
];

const SECTION_COPY = {
  stats: ['THE NUMBERS', 'Player production and the verified game summary without the surrounding noise.'],
  photos: ['GAME GALLERY', 'The visual record of this week — photos and keepsakes only.'],
};

const GameHubExperience = ({ career, context }) => {
  const [section, setSection] = useState('overview');

  useEffect(() => setSection('overview'), [context.season, context.week]);

  useEffect(() => {
    const hub = document.querySelector('.dhq-game-hub');
    if (!hub) return undefined;
    hub.dataset.dhqExperience = 'v3';
    hub.dataset.dhqSection = section;
    return () => {
      delete hub.dataset.dhqExperience;
      delete hub.dataset.dhqSection;
    };
  }, [section]);

  const copy = SECTION_COPY[section];

  return (
    <div className="dhq-v3-game-nav-shell">
      <nav className="dhq-v3-game-tabs" aria-label="Game Hub sections">
        {GAME_TABS.map(([id, label, Icon]) => (
          <button type="button" key={id} className={section === id ? 'is-active' : ''} onClick={() => setSection(id)} aria-pressed={section === id}>
            <Icon size={14} /> <span>{label}</span>
          </button>
        ))}
      </nav>
      {section === 'overview' ? <GameHubOverview career={career} context={context} onSection={setSection} /> : null}
      {section === 'story' ? <GameStoryExperience career={career} context={context} /> : null}
      {section === 'media' ? <CoverageExperience career={career} context={context} /> : null}
      {section === 'season' ? <SeasonPulseExperience career={career} context={context} /> : null}
      {copy ? (
        <div className="dhq-v3-section-intro">
          <span>{copy[0]}</span>
          <p>{copy[1]}</p>
        </div>
      ) : null}
    </div>
  );
};

const ImmersiveExperienceV3Portal = () => {
  const { career } = useOwnerCareer();
  const [homeMount, setHomeMount] = useState(null);
  const [hubMount, setHubMount] = useState(null);
  const [hubContext, setHubContext] = useState(null);

  useEffect(() => {
    if (!career) return undefined;
    let homeNode = null;
    let hubNode = null;
    let scheduled = false;

    const remove = (node) => node?.isConnected && node.remove();

    const sync = () => {
      scheduled = false;
      const hero = document.querySelector('#dynastyhq-command-center .dhq-broadcast-hero');
      if (hero) {
        if (!homeNode?.isConnected) {
          homeNode = document.createElement('div');
          homeNode.dataset.immersiveHomeV3 = 'true';
        }
        if (homeNode.previousElementSibling !== hero) hero.insertAdjacentElement('afterend', homeNode);
        setHomeMount((current) => current === homeNode ? current : homeNode);
        document.getElementById('dynastyhq-command-center')?.setAttribute('data-dhq-experience', 'v3');
      } else {
        remove(homeNode);
        homeNode = null;
        setHomeMount(null);
      }

      const context = parseHubContext();
      const progress = document.querySelector('.dhq-game-hub .dhq-gh-progress');
      if (context && progress) {
        if (!hubNode?.isConnected) {
          hubNode = document.createElement('div');
          hubNode.dataset.immersiveGameHubV3 = 'true';
        }
        if (hubNode.previousElementSibling !== progress) progress.insertAdjacentElement('afterend', hubNode);
        setHubMount((current) => current === hubNode ? current : hubNode);
        setHubContext((current) => current?.season === context.season && current?.week === context.week && current?.opponent === context.opponent ? current : context);
      } else {
        remove(hubNode);
        hubNode = null;
        setHubMount(null);
        setHubContext(null);
      }
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
      remove(homeNode);
      remove(hubNode);
      document.getElementById('dynastyhq-command-center')?.removeAttribute('data-dhq-experience');
    };
  }, [career]);

  const home = useMemo(() => career && homeMount ? <HomeFocusDeck career={career} /> : null, [career, homeMount]);

  return (
    <>
      {homeMount && home ? createPortal(home, homeMount) : null}
      {hubMount && hubContext ? createPortal(<GameHubExperience career={career} context={hubContext} />, hubMount) : null}
    </>
  );
};

export default ImmersiveExperienceV3Portal;
