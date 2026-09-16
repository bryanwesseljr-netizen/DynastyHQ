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

const nextGameAfter = (career = {}, context = {}) => {
  const schedule = seasonScheduleFor(career, context.season);
  if (!schedule?.entries?.length) return null;
  return syncScheduleWithCareer(career, schedule).entries
    .filter((entry) => !entry.isBye && Number(entry.week) > Number(context.week))
    .sort((left, right) => Number(left.week) - Number(right.week))[0] || null;
};

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
        <p>{story.lead?.detail || story.previous?.copy || 'This view keeps the result, career meaning, and next step in one place.'}</p>
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
          <small>{next ? (next.homeAway === 'away' ? 'Away' : next.homeAway === 'home' ? 'Home' : 'Upcoming') : 'Open the story or coverage for more context'}</small>
        </article>
      </div>
      <div className="dhq-v3-game-overview__actions">
        <button type="button" onClick={() => onSection('story')}><BookOpen size={13} /> WHY IT MATTERS</button>
        <button type="button" onClick={() => onSection('media')}><Newspaper size={13} /> OPEN COVERAGE</button>
      </div>
    </section>
  );
};

const GAME_TABS = [
  ['overview', 'OVERVIEW', Activity],
  ['story', 'STORY', BookOpen],
  ['media', 'MEDIA', Headphones],
  ['stats', 'STATS', Trophy],
  ['photos', 'PHOTOS', Camera],
  ['season', 'SEASON', CalendarDays],
];

const SECTION_COPY = {
  story: ['WHY THIS GAME MATTERS', 'Career meaning, developing storylines, milestones, and season context.'],
  media: ['AROUND THE GAME', 'Official in-game coverage, DynastyHQ journalism, and the finished podcast in one place.'],
  stats: ['THE NUMBERS', 'Player production and the verified game summary without the surrounding noise.'],
  photos: ['GAME GALLERY', 'The visual record of this week — photos and keepsakes only.'],
  season: ['SEASON AT A GLANCE', 'The complete saved team schedule and results, kept separate from your personal appearance history.'],
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
