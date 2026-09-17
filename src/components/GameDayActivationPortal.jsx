import { useEffect, useRef } from 'react';
import { nextScheduledGame } from '../domain/seasonSchedule.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './game-day-activation.css';

const clean = (value) => String(value ?? '').trim();

const GameDayActivationPortal = () => {
  const { career } = useOwnerCareer();
  const initialized = useRef(new WeakSet());

  useEffect(() => {
    if (!career) return undefined;

    const setup = career.currentWeekSetup || {};
    const explicitGame = clean(setup.type).toLowerCase() !== 'bye' && Boolean(clean(setup.opponent));
    const next = explicitGame ? null : nextScheduledGame(career, career.currentSeason || 1);
    let scheduled = false;

    const sync = () => {
      scheduled = false;
      const hub = document.querySelector('.dhq-game-hub');
      if (!hub) return;

      const select = hub.querySelector('.dhq-game-hub__toolbar select');
      if (next && select && !initialized.current.has(select)) {
        initialized.current.add(select);
        if (select.value !== 'current') {
          select.value = 'current';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      const liveHost = hub.querySelector('[data-game-day-pregame="v2"]');
      const pregameHero = hub.querySelector('.dhq-gh-hero.is-pregame');
      const scheduleDerived = Boolean(next && liveHost && pregameHero);
      hub.classList.toggle('dhq-game-day-live-schedule-derived', scheduleDerived);
      if (scheduleDerived) {
        hub.dataset.dhqGameDayWeek = String(next.week);
        hub.dataset.dhqGameDayOpponent = clean(next.opponent);
        const context = hub.querySelector('.dhq-game-hub__toolbar > div:first-child strong');
        const label = `Season ${Number(career.currentSeason) || 1} · Week ${next.week}`;
        if (context && clean(context.textContent) !== label) context.textContent = label;
      } else {
        delete hub.dataset.dhqGameDayWeek;
        delete hub.dataset.dhqGameDayOpponent;
      }
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
      document.querySelector('.dhq-game-hub')?.classList.remove('dhq-game-day-live-schedule-derived');
    };
  }, [career]);

  return null;
};

export default GameDayActivationPortal;
