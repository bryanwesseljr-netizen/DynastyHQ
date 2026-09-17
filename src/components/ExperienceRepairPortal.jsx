import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
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
import { buildMediaNetworkLayer, latestCompletedMediaContext } from '../domain/mediaNetworkLayer.js';
import { nextScheduledGame, teamRecordForSeason } from '../domain/seasonSchedule.js';
import { resolveCollegeTeamBrand } from '../domain/teamBrandResolver.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './experience-utility.css';

const clean = (value) => String(value ?? '').trim();
const arrayOf = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const navButton = (labels = []) => {
  const wanted = (Array.isArray(labels) ? labels : [labels]).map((value) => clean(value).toUpperCase());
  const buttons = [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')];
  return buttons.find((button) => wanted.includes(clean(button.textContent).toUpperCase()) && button.offsetParent !== null)
    || buttons.find((button) => wanted.includes(clean(button.textContent).toUpperCase()))
    || null;
};

const openNav = (labels) => navButton(labels)?.click();

const notificationItems = (career = {}) => {
  const season = Math.max(1, Number(career.currentSeason) || 1);
  const record = teamRecordForSeason(career, season);
  const next = nextScheduledGame(career, season);
  const mediaContext = latestCompletedMediaContext(career);
  const media = buildMediaNetworkLayer(career, mediaContext);
  const games = arrayOf(career.gameLogs)
    .filter((game) => game?.stage !== 'high-school' && !game?.evaluation && clean(game?.opponent))
    .sort((a, b) => (Number(a?.season || 1) - Number(b?.season || 1)) || (Number(a?.week || 0) - Number(b?.week || 0)));
  const latest = games.at(-1) || null;
  const items = [];

  if (latest) items.push({
    id: 'result', Icon: Trophy, label: `WEEK ${latest.week} FINAL`,
    title: `${clean(latest.result).toUpperCase()} · ${latest.homeScore ?? '—'}-${latest.awayScore ?? '—'} vs ${clean(latest.opponent)}`,
    detail: `${record.wins}-${record.losses} on the season`, target: 'Game Hub',
  });
  if (next) items.push({
    id: 'next', Icon: Gamepad2, label: 'NEXT UP', title: `Week ${next.week} · ${clean(next.opponent)}`,
    detail: next.homeAway === 'home' ? 'Home' : next.homeAway === 'away' ? 'Away' : 'Upcoming', target: 'Game Hub',
  });
  if (media.dynasty.newsroomReady && media.dynasty.headline) items.push({
    id: 'news', Icon: Newspaper, label: 'NEWSROOM', title: media.dynasty.headline,
    detail: media.dynasty.dek || 'The latest DynastyHQ story is ready.', target: ['The Newsroom', 'Newsroom'],
  });
  if (media.dynasty.podcastReady) items.push({
    id: 'podcast', Icon: Headphones, label: 'THE HUDDLE', title: media.dynasty.podcastTitle || 'Latest episode ready',
    detail: media.dynasty.finishedPodcast ? 'Finished episode ready to play.' : 'Transcript ready in the podcast studio.', target: 'Podcast',
  });
  return items.slice(0, 5);
};

const HeaderTray = ({ type, items, close }) => {
  const quick = type === 'quick';
  return createPortal(
    <aside className="dhq-header-tray" role="dialog" aria-label={quick ? 'DynastyHQ quick menu' : 'Career notifications'}>
      <header>
        <div><span>{quick ? 'QUICK MENU' : 'LATEST AROUND YOUR CAREER'}</span><strong>{quick ? 'DYNASTYHQ' : 'NOTIFICATIONS'}</strong></div>
        <button type="button" onClick={close} aria-label="Close"><X size={16} /></button>
      </header>
      {quick ? (
        <div className="dhq-header-tray__quick">
          <button type="button" onClick={() => { close(); openNav('Home'); }}><Home size={16} /><span><strong>Home</strong><small>Return to the current week.</small></span><ChevronRight size={14} /></button>
          <button type="button" onClick={() => { close(); openNav('Game Hub'); }}><Gamepad2 size={16} /><span><strong>Game Hub</strong><small>Open the current or latest game.</small></span><ChevronRight size={14} /></button>
          <button type="button" onClick={() => { close(); openNav('Career'); }}><UserRound size={16} /><span><strong>Career</strong><small>Open your career timeline.</small></span><ChevronRight size={14} /></button>
          <button type="button" onClick={() => { close(); openNav(['The Newsroom', 'Newsroom']); }}><Newspaper size={16} /><span><strong>The Newsroom</strong><small>Read the latest coverage.</small></span><ChevronRight size={14} /></button>
          <button type="button" onClick={() => { close(); openNav('Podcast'); }}><Headphones size={16} /><span><strong>The Huddle</strong><small>Open the podcast studio.</small></span><ChevronRight size={14} /></button>
          <button type="button" onClick={() => { close(); document.querySelector('.dhq-broadcast-header__icon[aria-label="Settings"]')?.click(); }}><Settings size={16} /><span><strong>Settings</strong><small>Open site and account controls.</small></span><ChevronRight size={14} /></button>
        </div>
      ) : (
        <div className="dhq-header-tray__notifications">
          {items.length ? items.map(({ id, Icon, label, title, detail, target }) => (
            <button type="button" key={id} onClick={() => { close(); openNav(target); }}>
              <Icon size={15} /><span><small>{label}</small><strong>{title}</strong><p>{detail}</p></span><ChevronRight size={14} />
            </button>
          )) : <div className="dhq-header-tray__empty">Nothing new yet. Results, upcoming games, Newsroom stories, and Huddle episodes will appear here.</div>}
        </div>
      )}
    </aside>,
    document.body,
  );
};

const StoryActions = ({ career }) => {
  const context = latestCompletedMediaContext(career || {});
  const media = buildMediaNetworkLayer(career || {}, context);
  return (
    <div className="dhq-game-story-value">
      <div>
        <span>FROM THIS GAME</span>
        <strong>KEEP FOLLOWING THE STORY</strong>
        <p>Game Story is the short version of what this result changed. Go deeper only when you want the full article, episode, or career timeline.</p>
      </div>
      <div className="dhq-game-story-value__actions">
        {media.dynasty.newsroomReady ? <button type="button" onClick={() => openNav(['The Newsroom', 'Newsroom'])}><Newspaper size={13} /> READ NEWSROOM</button> : null}
        {media.dynasty.podcastReady ? <button type="button" onClick={() => openNav('Podcast')}><Headphones size={13} /> {media.dynasty.finishedPodcast ? 'PLAY THE HUDDLE' : 'OPEN THE HUDDLE'}</button> : null}
        <button type="button" onClick={() => openNav('Chronicle')}><BookOpen size={13} /> CAREER TIMELINE</button>
      </div>
    </div>
  );
};

const ExperienceRepairPortal = () => {
  const { career } = useOwnerCareer();
  const [tray, setTray] = useState('');
  const [storyMount, setStoryMount] = useState(null);
  const notifications = useMemo(() => notificationItems(career || {}), [career]);

  useEffect(() => {
    const capture = (event) => {
      const button = event.target?.closest?.('button');
      if (!button) return;
      const label = clean(button.getAttribute('aria-label')).toLowerCase();
      const text = clean(button.textContent).toUpperCase();

      if (button.matches('.dhq-broadcast-header__icon') && label.includes('career')) {
        event.preventDefault(); event.stopImmediatePropagation();
        setTray((current) => current === 'notifications' ? '' : 'notifications');
        return;
      }
      if (button.matches('.dhq-broadcast-header__chevron')) {
        event.preventDefault(); event.stopImmediatePropagation();
        setTray((current) => current === 'quick' ? '' : 'quick');
        return;
      }
      if (text.includes('CONTINUE WRAP-UP') && button.closest('#dynastyhq-command-center')) {
        event.preventDefault(); event.stopImmediatePropagation();
        window.setTimeout(() => openNav('Game Hub'), 0);
        return;
      }
      if (text.includes('OPEN COVERAGE') && button.closest('.dhq-game-hub')) {
        event.preventDefault(); event.stopImmediatePropagation();
        window.setTimeout(() => openNav(['The Newsroom', 'Newsroom']), 0);
      }
    };
    document.addEventListener('click', capture, true);
    return () => document.removeEventListener('click', capture, true);
  }, []);

  useEffect(() => {
    const bell = document.querySelector('.dhq-broadcast-header__icon[aria-label*="career" i]');
    const chevron = document.querySelector('.dhq-broadcast-header__chevron');
    if (bell) {
      bell.setAttribute('title', 'Career notifications');
      bell.setAttribute('aria-haspopup', 'dialog');
      bell.setAttribute('aria-expanded', tray === 'notifications' ? 'true' : 'false');
    }
    if (chevron) {
      chevron.setAttribute('title', 'DynastyHQ quick menu');
      chevron.setAttribute('aria-label', 'Open DynastyHQ quick menu');
      chevron.setAttribute('aria-haspopup', 'dialog');
      chevron.setAttribute('aria-expanded', tray === 'quick' ? 'true' : 'false');
    }
  }, [tray]);

  useEffect(() => {
    let mount = null;
    let scheduled = false;
    const sync = () => {
      scheduled = false;
      const beats = document.querySelector('.dhq-v3-story-experience__beats');
      if (!beats) {
        mount?.remove(); mount = null; setStoryMount(null); return;
      }
      if (!mount?.isConnected) {
        mount = document.createElement('div');
        mount.dataset.gameStoryUtility = 'true';
        beats.insertAdjacentElement('afterend', mount);
      }
      setStoryMount((current) => current === mount ? current : mount);
    };
    const schedule = () => { if (!scheduled) { scheduled = true; window.requestAnimationFrame(sync); } };
    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => { observer.disconnect(); mount?.remove(); };
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
        if (!opponent || /BYE/.test(opponent.toUpperCase())) { row.dataset.dhqTeamLogo = 'skip'; return; }
        const brand = await resolveCollegeTeamBrand(opponent);
        if (cancelled || !row.isConnected) return;
        const container = row.matches('.dhq-schedule-row') ? row.querySelector('.dhq-schedule-row__opponent') : row.querySelector('div');
        if (!container || container.querySelector('.dhq-schedule-team-logo')) return;
        container.classList.add('has-dhq-team-logo');
        const mark = brand.logo ? document.createElement('img') : document.createElement('span');
        mark.className = 'dhq-schedule-team-logo';
        if (brand.logo) { mark.src = brand.logo; mark.alt = `${brand.displayName || opponent} logo`; mark.loading = 'lazy'; }
        else { mark.textContent = clean(brand.abbreviation || opponent).slice(0, 3).toUpperCase(); }
        container.insertBefore(mark, container.firstChild);
        row.dataset.dhqTeamLogo = 'ready';
      });
    };
    const schedule = () => { if (!scheduled) { scheduled = true; window.requestAnimationFrame(decorate); } };
    decorate();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => { cancelled = true; observer.disconnect(); };
  }, [career]);

  useEffect(() => {
    if (!tray) return undefined;
    const close = (event) => { if (!event.target?.closest?.('.dhq-header-tray, .dhq-broadcast-header__actions')) setTray(''); };
    document.addEventListener('pointerdown', close, true);
    return () => document.removeEventListener('pointerdown', close, true);
  }, [tray]);

  return <>{tray ? <HeaderTray type={tray} items={notifications} close={() => setTray('')} /> : null}{storyMount ? createPortal(<StoryActions career={career || {}} />, storyMount) : null}</>;
};

export default ExperienceRepairPortal;
