import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Newspaper, Radio, Trophy } from 'lucide-react';
import { buildStorylineEngine } from '../domain/storylineEngine.js';
import {
  nextScheduledGame,
  seasonScheduleFor,
  syncScheduleWithCareer,
  teamRecordForSeason,
} from '../domain/seasonSchedule.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './season-wire.css';

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

const latestCompletedGame = (career = {}, season = 1) => arrayOf(career.gameLogs)
  .filter((game) => Number(game?.season || 1) === season)
  .filter((game) => game?.stage !== 'high-school' && !game?.evaluation && clean(game?.opponent))
  .sort((left, right) => numberOf(left?.week) - numberOf(right?.week))
  .at(-1) || null;

const latestNewsroomHeadline = (career = {}) => {
  const issues = arrayOf(career.newsroomIssues)
    .sort((left, right) => (
      numberOf(left?.season, 1) - numberOf(right?.season, 1)
      || numberOf(left?.week) - numberOf(right?.week)
    ));
  const issue = issues.at(-1);
  const article = arrayOf(issue?.articles).find((entry) => clean(entry?.headline || entry?.title));
  return clean(article?.headline || article?.title || issue?.headline);
};

const latestReadyPodcast = (career = {}) => arrayOf(career.podcastEpisodes)
  .filter((episode) => episode?.audioStatus === 'ready' || clean(episode?.status).toLowerCase() === 'published')
  .sort((left, right) => (
    numberOf(left?.season, 1) - numberOf(right?.season, 1)
    || numberOf(left?.week) - numberOf(right?.week)
  ))
  .at(-1) || null;

const buildSeasonWireItems = (career = {}) => {
  const season = Math.max(1, numberOf(career.currentSeason, 1));
  const record = teamRecordForSeason(career, season);
  const next = nextScheduledGame(career, season);
  const schedule = seasonScheduleFor(career, season);
  const syncedSchedule = schedule ? syncScheduleWithCareer(career, schedule) : null;
  const latest = latestCompletedGame(career, season);
  const setup = career.currentWeekSetup || {};
  const setupOpponent = clean(setup.opponent);
  const setupWeek = Math.max(0, numberOf(setup.week ?? career.currentWeek, 0));
  const activeGameDay = clean(setup.type).toLowerCase() !== 'bye' && Boolean(setupOpponent);
  const contextWeek = Math.max(0, numberOf(career.currentWeek, latest?.week || 0));
  const story = buildStorylineEngine(career, {
    season,
    week: contextWeek,
    opponent: setupOpponent,
    phase: setupOpponent ? 'pregame' : 'current',
  });
  const headline = latestNewsroomHeadline(career);
  const podcast = latestReadyPodcast(career);
  const items = [];

  if (activeGameDay) items.push({
    id: 'game-day',
    label: 'GAME DAY',
    text: `W${setupWeek} · ${setupOpponent.toUpperCase()}${clean(setup.opponentRank) ? ` · #${clean(setup.opponentRank).replace(/^#/, '')}` : ''}${clean(setup.venue) ? ` · ${clean(setup.venue).toUpperCase()}` : ''}`,
    target: 'gameHub',
    Icon: Radio,
  });

  items.push({
    id: 'record',
    label: 'SEASON',
    text: `${clean(career.player?.college || career.player?.school) || 'PROGRAM'} ${record.wins}-${record.losses}`,
    target: 'season',
    Icon: Trophy,
  });

  if (latest) {
    const result = clean(latest.result).toUpperCase();
    const score = latest.homeScore !== undefined && latest.awayScore !== undefined
      ? `${latest.homeScore}-${latest.awayScore}`
      : '';
    items.push({
      id: 'latest',
      label: `W${latest.week} FINAL`,
      text: `${result ? `${result} · ` : ''}${score ? `${score} · ` : ''}${clean(latest.opponent)}`,
      target: 'gameHub',
      Icon: Radio,
    });

    const totalTD = numberOf(latest.passTD) + numberOf(latest.rushTD);
    const statParts = [];
    if (latest.passYds !== undefined && latest.passYds !== '') statParts.push(`${numberOf(latest.passYds)} PASS YDS`);
    if (totalTD) statParts.push(`${totalTD} TD`);
    if (latest.rushYds !== undefined && latest.rushYds !== '' && numberOf(latest.rushYds)) statParts.push(`${numberOf(latest.rushYds)} RUSH YDS`);
    if (statParts.length) items.push({
      id: 'player-line',
      label: 'PLAYER LINE',
      text: statParts.join(' · '),
      target: 'career',
      Icon: Trophy,
    });
  }

  if (next && (!activeGameDay || Number(next.week) !== setupWeek || clean(next.opponent).toLowerCase() !== setupOpponent.toLowerCase())) items.push({
    id: 'next',
    label: 'NEXT',
    text: `W${next.week} · ${clean(next.opponent).toUpperCase()}${next.homeAway === 'away' ? ' · AWAY' : next.homeAway === 'home' ? ' · HOME' : ''}`,
    target: 'season',
    Icon: CalendarDays,
  });

  if (syncedSchedule?.entries?.length) {
    const anchorWeek = activeGameDay ? setupWeek : next?.week;
    const upcoming = syncedSchedule.entries
      .filter((entry) => !entry.isBye && !entry.completed && (!anchorWeek || entry.week > anchorWeek))
      .slice(0, 2)
      .map((entry) => `W${entry.week} ${clean(entry.opponent).toUpperCase()}`);
    if (upcoming.length) items.push({
      id: 'upcoming',
      label: 'ON DECK',
      text: upcoming.join(' · '),
      target: 'season',
      Icon: CalendarDays,
    });
  }

  if (story.lead?.title) items.push({
    id: 'story',
    label: 'THE STORY',
    text: clean(story.lead.title),
    target: 'chronicle',
    Icon: Newspaper,
  });

  if (headline) items.push({
    id: 'newsroom',
    label: 'NEWSROOM',
    text: headline,
    target: 'newsroom',
    Icon: Newspaper,
  });

  if (podcast) items.push({
    id: 'podcast',
    label: 'THE HUDDLE',
    text: clean(podcast.title || podcast.headline || 'Finished episode ready'),
    target: 'podcast',
    Icon: Radio,
  });

  return items.filter((item) => clean(item.text));
};

const openTarget = (target) => {
  if (target === 'season') {
    openNav('Game Hub');
    window.setTimeout(() => {
      const seasonTab = [...document.querySelectorAll('.dhq-v3-game-tabs button')]
        .find((button) => clean(button.textContent).toUpperCase().includes('SEASON'));
      seasonTab?.click();
    }, 80);
    return;
  }
  if (target === 'newsroom') return openNav(['The Newsroom', 'Newsroom']);
  if (target === 'podcast') return openNav(['Podcast', 'The Huddle']);
  if (target === 'career') return openNav('Career');
  if (target === 'chronicle') return openNav('Chronicle');
  return openNav('Game Hub');
};

const SeasonWire = ({ items }) => {
  const repeated = items.length > 1 ? [...items, ...items] : items;
  return (
    <div className="dhq-season-wire" aria-label="Season wire">
      <div className="dhq-season-wire__bug"><i /><strong>SEASON WIRE</strong></div>
      <div className="dhq-season-wire__viewport">
        <div className="dhq-season-wire__track" data-item-count={items.length}>
          {repeated.map((item, index) => {
            const Icon = item.Icon;
            return (
              <button type="button" key={`${item.id}-${index}`} className="dhq-season-wire__item" onClick={() => openTarget(item.target)}>
                <span><Icon size={11} /> {item.label}</span>
                <strong>{item.text}</strong>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const SeasonWirePortal = () => {
  const { career } = useOwnerCareer();
  const [host, setHost] = useState(null);
  const items = useMemo(() => buildSeasonWireItems(career || {}), [career]);

  useEffect(() => {
    if (!career) return undefined;
    let node = null;
    let scheduled = false;
    const sync = () => {
      scheduled = false;
      const ticker = document.querySelector('.dhq-score-ticker');
      if (!ticker) {
        node?.remove();
        node = null;
        setHost(null);
        return;
      }
      ticker.dataset.dhqSeasonWire = 'true';
      if (!node?.isConnected) {
        node = document.createElement('div');
        node.className = 'dhq-season-wire-host';
        ticker.appendChild(node);
      }
      setHost((current) => current === node ? current : node);
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };
    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      node?.remove();
      document.querySelector('.dhq-score-ticker')?.removeAttribute('data-dhq-season-wire');
    };
  }, [career]);

  if (!host || !items.length) return null;
  return createPortal(<SeasonWire items={items} />, host);
};

export default SeasonWirePortal;
