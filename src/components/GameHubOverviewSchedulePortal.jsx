import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { seasonScheduleFor, syncScheduleWithCareer } from '../domain/seasonSchedule.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './game-hub-overview-schedule.css';

const clean = (value) => String(value ?? '').trim();
const numberOf = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseSelectedContext = () => {
  const hub = document.querySelector('.dhq-game-hub');
  if (!hub || hub.dataset.dhqSection !== 'overview') return null;
  const label = clean(hub.querySelector('.dhq-game-hub__toolbar strong')?.textContent);
  const match = label.match(/season\s+(\d+)\s*[·•-]?\s*week\s+(\d+)/i);
  if (!match) return null;
  return { season: Number(match[1]), week: Number(match[2]) };
};

const openSeasonTab = () => {
  const button = [...document.querySelectorAll('.dhq-v3-game-tabs button')]
    .find((entry) => clean(entry.textContent).toUpperCase().includes('SEASON'));
  button?.click();
};

const rowLabel = (entry = {}) => {
  if (entry.isBye) return 'BYE';
  if (entry.completed) {
    const score = entry.teamScore !== null && entry.opponentScore !== null
      ? `${entry.teamScore}-${entry.opponentScore}`
      : 'FINAL';
    return `${clean(entry.result).toUpperCase() || 'FINAL'} · ${score}`;
  }
  return entry.homeAway === 'away' ? 'AWAY' : entry.homeAway === 'home' ? 'HOME' : entry.homeAway === 'neutral' ? 'NEUTRAL' : 'UPCOMING';
};

const CompactSchedule = ({ career, context }) => {
  const schedule = seasonScheduleFor(career, context.season);
  const entries = schedule ? syncScheduleWithCareer(career, schedule).entries : [];
  const selectedIndex = entries.findIndex((entry) => Number(entry.week) === Number(context.week));
  const anchor = selectedIndex >= 0 ? selectedIndex : Math.max(0, entries.findIndex((entry) => !entry.completed && !entry.isBye));
  const start = Math.max(0, anchor - 2);
  const visible = entries.slice(start, start + 5);

  if (!visible.length) return null;

  return (
    <section className="dhq-v3-overview-schedule" aria-label="Season schedule snapshot">
      <div className="dhq-v3-overview-schedule__heading">
        <div><span><CalendarDays size={13} /> SEASON SNAPSHOT</span><strong>WHERE THIS GAME FITS</strong></div>
        <button type="button" onClick={openSeasonTab}>FULL SCHEDULE <ChevronRight size={13} /></button>
      </div>
      <div className="dhq-v3-overview-schedule__track">
        {visible.map((entry) => {
          const selected = Number(entry.week) === Number(context.week);
          return (
            <article key={entry.week} className={`${selected ? 'is-selected' : ''} ${entry.completed ? 'is-complete' : ''} ${entry.isBye ? 'is-bye' : ''}`}>
              <span>W{entry.week}</span>
              <strong>{entry.isBye ? 'BYE' : clean(entry.opponent).toUpperCase()}</strong>
              <small>{rowLabel(entry)}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
};

const GameHubOverviewSchedulePortal = () => {
  const { career } = useOwnerCareer();
  const [host, setHost] = useState(null);
  const [context, setContext] = useState(null);

  useEffect(() => {
    if (!career) return undefined;
    let node = null;
    let scheduled = false;
    const sync = () => {
      scheduled = false;
      const nextContext = parseSelectedContext();
      const anchor = document.querySelector('.dhq-v3-game-overview__beats');
      if (!nextContext || !anchor) {
        node?.remove();
        node = null;
        setHost(null);
        setContext(null);
        return;
      }
      if (!node?.isConnected) {
        node = document.createElement('div');
        node.className = 'dhq-v3-overview-schedule-host';
      }
      if (node.previousElementSibling !== anchor) anchor.insertAdjacentElement('afterend', node);
      setHost((current) => current === node ? current : node);
      setContext((current) => current?.season === nextContext.season && current?.week === nextContext.week ? current : nextContext);
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };
    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-dhq-section'], characterData: true });
    return () => {
      observer.disconnect();
      node?.remove();
    };
  }, [career]);

  const content = useMemo(() => (
    host && context ? <CompactSchedule career={career} context={context} /> : null
  ), [career, context, host]);

  return host && content ? createPortal(content, host) : null;
};

export default GameHubOverviewSchedulePortal;
