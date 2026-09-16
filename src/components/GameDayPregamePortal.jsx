import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  BookOpen,
  ChevronRight,
  CloudUpload,
  Radio,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { buildGameDayBrief } from '../domain/gameDayBrief.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './game-day-pregame.css';

const clean = (value) => String(value ?? '').trim();
const displayNumber = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '—';

const visibleNavButton = (label) => {
  const matcher = new RegExp(`^${label}$`, 'i');
  const buttons = [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')]
    .filter((button) => matcher.test(clean(button.textContent)));
  return buttons.find((button) => button.offsetParent !== null) || buttons[0] || null;
};

const GameDayPregamePortal = () => {
  const { career } = useOwnerCareer();
  const [mount, setMount] = useState(null);
  const brief = useMemo(() => buildGameDayBrief(career || {}), [career]);

  useEffect(() => {
    let ownedMount = null;
    let hiddenGrid = null;
    let scheduled = false;

    const cleanup = () => {
      hiddenGrid?.classList.remove('dhq-gh-pregame-grid--enhanced-hidden');
      hiddenGrid = null;
      if (ownedMount?.parentElement) ownedMount.remove();
      ownedMount = null;
      setMount(null);
    };

    const sync = () => {
      scheduled = false;
      const hub = document.querySelector('.dhq-game-hub');
      const hero = hub?.querySelector('.dhq-gh-hero.is-pregame');
      const progress = hub?.querySelector('.dhq-gh-progress');
      const legacyGrid = hub?.querySelector('.dhq-gh-pregame-grid');

      if (!hub || !hero || !progress || !legacyGrid) {
        cleanup();
        return;
      }

      if (hiddenGrid && hiddenGrid !== legacyGrid) hiddenGrid.classList.remove('dhq-gh-pregame-grid--enhanced-hidden');
      hiddenGrid = legacyGrid;
      hiddenGrid.classList.add('dhq-gh-pregame-grid--enhanced-hidden');

      if (!ownedMount || !ownedMount.isConnected) {
        ownedMount = document.createElement('div');
        ownedMount.dataset.gameDayPregame = 'true';
        progress.insertAdjacentElement('afterend', ownedMount);
      }
      setMount((current) => current === ownedMount ? current : ownedMount);
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
      cleanup();
    };
  }, []);

  if (!mount || !career) return null;

  const openImport = () => window.dispatchEvent(new CustomEvent('dynastyhq:open-session-import'));
  const openCareer = () => visibleNavButton('Career')?.click();
  const totalTD = brief.player.seasonTotals.passTD + brief.player.seasonTotals.rushTD;

  return createPortal(
    <section className="dhq-gameday" data-ready={brief.ready ? 'true' : 'false'} aria-label="Game Day pregame brief">
      <div className="dhq-gameday__topline">
        <div>
          <span><Radio size={12} /> GAME DAY BRIEF</span>
          <strong>SEASON {brief.season} · WEEK {brief.week}</strong>
        </div>
        <div className="dhq-gameday__status">
          <i />
          {brief.ready ? `${brief.school} VS ${brief.opponent}` : 'MATCHUP SETUP PENDING'}
        </div>
      </div>

      <section className="dhq-gameday__editorial-grid">
        <article className="dhq-gameday-card dhq-gameday-card--previous">
          <div className="dhq-gameday-card__heading"><span><BookOpen size={15} /> PREVIOUSLY ON DYNASTYHQ</span><small>{brief.previous.label}</small></div>
          <div className="dhq-gameday-card__body">
            <h2>{brief.previous.title}</h2>
            <p>{brief.previous.copy}</p>
            {brief.previousGame ? (
              <div className="dhq-gameday__previous-result">
                <span>WEEK {brief.previousGame.week}</span>
                <strong>{clean(brief.previousGame.opponent).toUpperCase()}</strong>
                <b>{brief.previous.result || 'FINAL'} {brief.previous.score}</b>
              </div>
            ) : null}
          </div>
        </article>

        <article className="dhq-gameday-card dhq-gameday-card--keys">
          <div className="dhq-gameday-card__heading"><span><Target size={15} /> 3 KEYS TO THE GAME</span><small>GROUNDED IN SAVED CONTEXT</small></div>
          <div className="dhq-gameday__keys">
            {brief.keys.map((key, index) => (
              <div key={`${key.title}-${index}`}>
                <b>{index + 1}</b>
                <span>
                  <strong>{key.title}</strong>
                  <p>{key.detail}</p>
                  <small>{key.evidence}</small>
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="dhq-gameday-card dhq-gameday-card--scout">
          <div className="dhq-gameday-card__heading"><span><ShieldCheck size={15} /> OPPONENT SCOUT</span><small>VERIFIED ONLY</small></div>
          <div className="dhq-gameday-card__body">
            <h2>{brief.opponent.toUpperCase()}</h2>
            {brief.scout.facts.length ? (
              <div className="dhq-gameday__scout-facts">
                {brief.scout.facts.map((fact) => <div key={`${fact.label}-${fact.value}`}><span>{fact.label}</span><strong>{fact.value}</strong></div>)}
              </div>
            ) : <div className="dhq-gameday__scout-empty">Verified opponent details have not been captured yet.</div>}
            <p className="dhq-gameday__scout-note">{brief.scout.note}</p>
          </div>
        </article>
      </section>

      <section className="dhq-gameday__lower-grid">
        <article className="dhq-gameday-card dhq-gameday-card--player">
          <div className="dhq-gameday-card__heading"><span><Activity size={15} /> PLAYER GAME DAY</span><small>{brief.player.role || 'ROLE NOT CAPTURED'}</small></div>
          <div className="dhq-gameday__player-head">
            <div>
              <strong>{brief.player.name.toUpperCase()}</strong>
              <span>{brief.player.pos.toUpperCase()} · #{brief.player.number}{brief.player.overall !== null ? ` · ${brief.player.overall} OVR` : ''}</span>
            </div>
            {brief.player.role ? <b>{brief.player.role.toUpperCase()}</b> : null}
          </div>
          <div className="dhq-gameday__season-stats">
            <div><b>{displayNumber(brief.player.seasonTotals.passYds)}</b><span>PASS YDS</span></div>
            <div><b>{displayNumber(totalTD)}</b><span>TOTAL TD</span></div>
            <div><b>{displayNumber(brief.player.seasonTotals.rushYds)}</b><span>RUSH YDS</span></div>
            <div><b>{displayNumber(brief.player.seasonTotals.interceptions)}</b><span>INT</span></div>
          </div>
          <div className="dhq-gameday__player-context">
            <span>Season record <strong>{brief.record}</strong></span>
            <span>Coach Trust <strong>{brief.player.coachTrust === null ? '—' : displayNumber(brief.player.coachTrust)}</strong></span>
            <span>Skill Points <strong>{brief.player.skillPoints === null ? '—' : displayNumber(brief.player.skillPoints)}</strong></span>
          </div>
        </article>

        <article className="dhq-gameday-card dhq-gameday-card--storylines">
          <div className="dhq-gameday-card__heading"><span><Sparkles size={15} /> STORYLINES TO WATCH</span><small>WHAT CAN CHANGE</small></div>
          <div className="dhq-gameday__storylines">
            {brief.storylines.map((story) => (
              <div key={`${story.label}-${story.title}`}>
                <small>{story.label}</small>
                <strong>{story.title}</strong>
                <p>{story.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="dhq-gameday-card dhq-gameday-card--handoff">
          <div className="dhq-gameday-card__heading"><span><TrendingUp size={15} /> GAME DAY HANDOFF</span><small>CFB 27 → DYNASTYHQ</small></div>
          <div className="dhq-gameday-card__body">
            <h2>{brief.ready ? 'PLAY THE GAME. COME BACK AFTER THE FINAL.' : 'FINISH WEEK SETUP FIRST.'}</h2>
            <p>{brief.ready
              ? 'Your pregame context is set. Play College Football 27 normally. When the game is over, return here and let Session Import handle the scoreboard, stats, progression, EA SPORTS Network coverage, and other useful screens.'
              : 'Once the opponent is set, this page becomes the pregame brief and the postgame import handoff.'}</p>
            <div className="dhq-gameday__handoff-flow"><span>GAME DAY</span><ChevronRight size={13} /><span>PLAY CFB 27</span><ChevronRight size={13} /><span>IMPORT</span></div>
            <div className="dhq-gameday__actions">
              <button type="button" className="is-primary" onClick={openImport} disabled={!brief.ready}><CloudUpload size={14} /> IMPORT AFTER GAME</button>
              <button type="button" className="is-secondary" onClick={openCareer}>VIEW CAREER CONTEXT <ChevronRight size={13} /></button>
            </div>
          </div>
        </article>
      </section>
    </section>,
    mount,
  );
};

export default GameDayPregamePortal;
