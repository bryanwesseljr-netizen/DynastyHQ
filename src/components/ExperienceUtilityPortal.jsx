import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  BookOpen,
  ChevronRight,
  Gamepad2,
  Headphones,
  Home,
  Newspaper,
  Settings,
  Trophy,
  UserRound,
  X,
} from 'lucide-react';
import { resolveCollegeTeamBrand } from '../domain/teamBrandResolver.js';
import { buildMediaNetworkLayer, latestCompletedMediaContext } from '../domain/mediaNetworkLayer.js';
import { buildStorylineEngine } from '../domain/storylineEngine.js';
import { nextScheduledGame, teamRecordForSeason } from '../domain/seasonSchedule.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './experience-utility.css';

const clean = (value) => String(value ?? '').trim();
const numberOf = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const arrayOf = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const navButton = (labels = []) => {
  const wanted = (Array.isArray(labels) ? labels : [labels]).map((value) => clean(value).toUpperCase());
  const buttons = [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')];
  return buttons.find((button) => wanted.includes(clean(button.textContent).toUpperCase()) && button.offsetParent !== null)
    || buttons.find((button) => wanted.includes(clean(button.textContent).toUpperCase()))
    || null;
};

const openNav = (labels) => {
  const button = navButton(labels);
  if (button) button.click();
};

const latestPlayedGame = (career = {}, context = {}) => arrayOf(career.gameLogs)
  .filter((game) => game?.stage !== 'high-school' && !game?.evaluation && clean(game?.opponent))
  .find((game) => (
    Number(game?.season || 1) === Number(context.season || 1)
    && Number(game?.week || 0) === Number(context.week || 0)
  ));

const hubContextFromDom = () => {
  const hub = document.querySelector('.dhq-game-hub');
  if (!hub) return null;
  const label = clean(hub.querySelector('.dhq-game-hub__toolbar strong')?.textContent);
  const match = label.match(/season\s+(\d+)\s*[·•-]?\s*week\s+(\d+)/i);
  if (!match) return null;
  return {
    season: Number(match[1]),
    week: Number(match[2]),
    opponent: clean(hub.querySelector('.dhq-gh-team--right strong')?.textContent),
  };
};

const notificationModel = (career = {}) => {
  const season = Math.max(1, numberOf(career.currentSeason, 1));
  const record = teamRecordForSeason(career, season);
  const next = nextScheduledGame(career, season);
  const mediaContext = latestCompletedMediaContext(career);
  const media = buildMediaNetworkLayer(career, mediaContext);
  const latestGame = latestPlayedGame(career, mediaContext);
  const story = buildStorylineEngine(career, {
    season,
    week: Math.max(0, numberOf(career.currentWeek, mediaContext.week || 0)),
    opponent: clean(career.currentWeekSetup?.opponent),
    phase: clean(career.currentWeekSetup?.opponent) ? 'pregame' : 'current',
  });

  const items = [];
  if (latestGame) {
    items.push({
      id: 'latest-result',
      icon: Trophy,
      label: `WEEK ${latestGame.week} FINAL`,
      title: `${clean(latestGame.result).toUpperCase()} · ${latestGame.homeScore ?? '—'}-${latestGame.awayScore ?? '—'} vs ${clean(latestGame.opponent)}`,
      detail: `${record.wins}-${record.losses} on the season`,
      target: 'Game Hub',
    });
  }
  if (next) {
    items.push({
      id: 'next-game',
      icon: Gamepad2,
      label: 'NEXT UP',
      title: `Week ${next.week} · ${clean(next.opponent)}`,
      detail: next.homeAway === 'home' ? 'Home' : next.homeAway === 'away' ? 'Away' : 'Upcoming',
      target: 'Game Hub',
    });
  }
  if (media.dynasty.newsroomReady && media.dynasty.headline) {
    items.push({
      id: 'newsroom',
      icon: Newspaper,
      label: 'NEWSROOM',
      title: media.dynasty.headline,
      detail: media.dynasty.dek || 'The latest DynastyHQ story is ready.',
      target: ['The Newsroom', 'Newsroom'],
    });
  }
  if (media.dynasty.podcastReady) {
    items.push({
      id: 'podcast',
      icon: Headphones,
      label: 'THE HUDDLE',
      title: media.dynasty.podcastTitle || 'Latest episode ready',
      detail: media.dynasty.finishedPodcast ? 'Finished episode ready to play.' : 'Transcript ready in the podcast studio.',
      target: 'Podcast',
    });
  }
  if (story.lead?.title) {
    items.push({
      id: 'career-thread',
      icon: BookOpen,
      label: 'CAREER THREAD',
      title: story.lead.title,
      detail: story.lead.detail || 'The current career storyline has moved forward.',
      target: 'Chronicle',
    });
  }
  return items.slice(0, 5);
};

const HeaderTray = ({ type, items, onClose }) => {
  const quick = type === 'quick';
  return createPortal(
    <aside className="dhq-header-tray" role="dialog" aria-label={quick ? 'Quick menu' : 'Career notifications'}>
      <header>
        <div>
          <span>{quick ? 'QUICK MENU' : 'LATEST AROUND YOUR CAREER'}</span>
          <strong>{quick ? 'DYNASTYHQ' : 'NOTIFICATIONS'}</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </header>
      {quick ? (
        <div className="dhq-header-tray__quick">
          <button type="button" onClick={() => { onClose(); openNav('Home'); }}><Home size={16} /><span><strong>Home</strong><small>Return to the current week.</small></span><ChevronRight size={14} /></button>
          <button type="button" onClick={() => { onClose(); openNav('Game Hub'); }}><Gamepad2 size={16} /><span><strong>Game Hub</strong><small>Open the current or latest game.</small></span><ChevronRight size={14} /></button>
          <button type="button" onClick={() => { onClose(); openNav('Career'); }}><UserRound size={16} /><span><strong>Career</strong><small>Open your career timeline.</small></span><ChevronRight size={14} /></button>
          <button type="button" onClick={() => { onClose(); openNav(['The Newsroom', 'Newsroom']); }}><Newspaper size={16} /><span><strong>The Newsroom</strong><small>Read the latest coverage.</small></span><ChevronRight size={14} /></button>
          <button type="button" onClick={() => { onClose(); openNav('Podcast'); }}><Headphones size={16} /><span><strong>The Huddle</strong><small>Open the podcast studio.</small></span><ChevronRight size={14} /></button>
          <button type="button" onClick={() => {
            onClose();
            window.setTimeout(() => document.querySelector('.dhq-broadcast-header__icon[aria-label="Settings"]')?.click(), 0);
          }}><Settings size={16} /><span><strong>Settings</strong><small>Account and site controls.</small></span><ChevronRight size={14} /></button>
        </div>
      ) : (
        <div className="dhq-header-tray__notifications">
          {items.length ? items.map((item) => {
            const Icon = item.icon;
            return (
              <button type="button" key={item.id} onClick={() => { onClose(); openNav(item.target); }}>
                <Icon size={15} />
                <span><small>{item.label}</small><strong>{item.title}</strong><p>{item.detail}</p></span>
                <ChevronRight size={14} />
              </button>
            );
          }) : <div className="dhq-header-tray__empty">Nothing new yet. DynastyHQ will surface results, upcoming games, coverage, and career developments here.</div>}
        </div>
      )}
    </aside>,
    document.body,
  );
};

const StoryValue = ({ career, context }) => {
  const media = buildMediaNetworkLayer(career, context);
  return (
    <div className="dhq-game-story-value">
      <div>
        <span>WHY GAME STORY EXISTS</span>
        <strong>THE GAME, IN CONTEXT</strong>
        <p>This view answers one question: what did this game change in your season or career? Use the links below only when you want the deeper version.</p>
      </div>
      <div className="dhq-game-story-value__actions">
        {media.dynasty.newsroomReady ? <button type="button" onClick={() => openNav(['The Newsroom', 'Newsroom'])}><Newspaper size={13} /> READ NEWSROOM</button> : null}
        {media.dynasty.podcastReady ? <button type="button" onClick={() => openNav('Podcast')}><Headphones size={13} /> {media.dynasty.finishedPodcast ? 'PLAY THE HUDDLE' : 'OPEN THE HUDDLE'}</button> : null}
        <button type="button" onClick={() => openNav('Chronicle')}><BookOpen size={13} /> CAREER TIMELINE</button>
      </div>
    </div>
  );
};

const ExperienceUtilityPortal = () => {
  const { career } = useOwnerCareer();
  const [tray, setTray] = useState('');
  const [storyMount, setStoryMount] = useState(null);
  const [storyContext, setStoryContext] = useState(null);
  const notifications = useMemo(() => notificationModel(career || {}), [career]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    const capture = (event) => {
      const button = event.target?.closest?.('button');
      if (!button) return;
      const text = clean(button.textContent).toUpperCase();

      if (button.matches('.dhq-broadcast-header__icon[aria-label="Open latest career updates"]')) {
        event.preventDefault();
        event.stopPropagation();
        setTray((current) => current === 'notifications' ? '' : 'notifications');
        return;
      }

      if (button.matches('.dhq-broadcast-header__chevron, .dhq-broadcast-header__profile')) {
        event.preventDefault();
        event.stopPropagation();
        setTray((current) => current === 'quick' ? '' : 'quick');
        return;
      }

      if (text.includes('CONTINUE WRAP-UP') && button.closest('#dynastyhq-command-center')) {
        event.preventDefault();
        event.stopPropagation();
        window.setTimeout(() => openNav('Game Hub'), 0);
        return;
      }

      if (text.includes('OPEN COVERAGE') && button.closest('.dhq-game-hub .dhq-gh-hero__actions')) {
        event.preventDefault();
        event.stopPropagation();
        window.setTimeout(() => openNav(['The Newsroom', 'Newsroom']), 0);
      }
    };

    root.addEventListener('click', capture, true);
    return () => root.removeEventListener('click', capture, true);
  }, []);

  useEffect(() => {
    const bell = document.querySelector('.dhq-broadcast-header__icon[aria-label="Open latest career updates"]');
    const chevron = document.querySelector('.dhq-broadcast-header__chevron');
    if (bell) {
      bell.setAttribute('aria-label', 'Open career notifications');
      bell.setAttribute('title', 'Career notifications');
      bell.setAttribute('aria-haspopup', 'dialog');
      bell.setAttribute('aria-expanded', tray === 'notifications' ? 'true' : 'false');
    }
    if (chevron) {
      chevron.setAttribute('aria-label', 'Open DynastyHQ quick menu');
      chevron.setAttribute('title', 'Quick menu');
      chevron.setAttribute('aria-haspopup', 'dialog');
      chevron.setAttribute('aria-expanded', tray === 'quick' ? 'true' : 'false');
    }
  }, [tray]);

  useEffect(() => {
    let activeMount = null;
    let scheduled = false;

    const removeStoryMount = () => {
      if (activeMount?.isConnected) activeMount.remove();
      activeMount = null;
      setStoryMount(null);
      setStoryContext(null);
    };

    const syncStory = () => {
      scheduled = false;
      const story = document.querySelector('.dhq-v3-story-experience');
      const beats = story?.querySelector('.dhq-v3-story-experience__beats');
      const context = story ? hubContextFromDom() : null;
      if (!story || !beats || !context) {
        removeStoryMount();
        return;
      }
      if (!activeMount?.isConnected) {
        activeMount = document.createElement('div');
        activeMount.dataset.gameStoryUtility = 'true';
        beats.insertAdjacentElement('afterend', activeMount);
      }
      setStoryMount((current) => current === activeMount ? current : activeMount);
      setStoryContext((current) => current?.season === context.season && current?.week === context.week ? current : context);
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(syncStory);
    };

    syncStory();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
      removeStoryMount();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let scheduled = false;

    const decorate = () => {
      scheduled = false;
      const rows = [
        ...document.querySelectorAll('.dhq-schedule-row:not([data-dhq-team-logo])'),
        ...document.querySelectorAll('.dhq-v3-full-schedule article:not([data-dhq-team-logo])'),
      ];
      rows.forEach(async (row) => {
        row.dataset.dhqTeamLogo = 'loading';
        const opponent = row.matches('.dhq-schedule-row')
          ? clean(row.querySelector('.dhq-schedule-row__opponent strong')?.textContent)
          : clean(row.querySelector('div > strong')?.textContent);
        if (!opponent || /BYE/.test(opponent.toUpperCase())) {
          row.dataset.dhqTeamLogo = 'skip';
          return;
        }
        const brand = await resolveCollegeTeamBrand(opponent);
        if (cancelled || !row.isConnected) return;
        const container = row.matches('.dhq-schedule-row')
          ? row.querySelector('.dhq-schedule-row__opponent')
          : row.querySelector('div');
        if (!container) return;
        container.classList.add('has-dhq-team-logo');
        const mark = brand.logo ? document.createElement('img') : document.createElement('span');
        mark.className = 'dhq-schedule-team-logo';
        if (brand.logo) {
          mark.src = brand.logo;
          mark.alt = `${brand.displayName || opponent} logo`;
          mark.loading = 'lazy';
        } else {
          mark.textContent = clean(brand.abbreviation || opponent).slice(0, 3).toUpperCase();
          mark.setAttribute('aria-label', `${brand.displayName || opponent} team mark`);
        }
        container.insertBefore(mark, container.firstChild);
        row.dataset.dhqTeamLogo = 'ready';
      });
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(decorate);
    };

    decorate();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [career]);

  useEffect(() => {
    if (!tray) return undefined;
    const close = (event) => {
      if (event.target?.closest?.('.dhq-header-tray, .dhq-broadcast-header__actions')) return;
      setTray('');
    };
    document.addEventListener('pointerdown', close, true);
    return () => document.removeEventListener('pointerdown', close, true);
  }, [tray]);

  return (
    <>
      {tray ? <HeaderTray type={tray} items={notifications} onClose={() => setTray('')} /> : null}
      {storyMount && storyContext ? createPortal(<StoryValue career={career || {}} context={storyContext} />, storyMount) : null}
    </>
  );
};

export default ExperienceUtilityPortal;
