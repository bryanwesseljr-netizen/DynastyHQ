import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CloudUpload,
  Headphones,
  MapPin,
  Newspaper,
  Radio,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { buildGameDayLiveV2 } from '../domain/gameDayLiveV2.js';
import { fallbackTeamBrand, resolveTeamBrand } from '../domain/teamBrandResolver.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './game-day-live-v2.css';

const clean = (value) => String(value ?? '').trim();
const displayNumber = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '—';

const visibleNavButton = (labels) => {
  const wanted = (Array.isArray(labels) ? labels : [labels]).map((value) => clean(value).toUpperCase());
  const buttons = [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')];
  return buttons.find((button) => wanted.includes(clean(button.textContent).toUpperCase()) && button.offsetParent !== null)
    || buttons.find((button) => wanted.includes(clean(button.textContent).toUpperCase()))
    || null;
};

const openNav = (labels) => visibleNavButton(labels)?.click();

const TeamMark = ({ brand, name, record, rank }) => (
  <div className="dhq-live-team">
    <div className="dhq-live-team__logo" style={{ '--team-primary': brand.primaryColor, '--team-secondary': brand.secondaryColor }}>
      {brand.logo ? <img src={brand.logo} alt={`${name} logo`} /> : <span>{brand.abbreviation}</span>}
    </div>
    <div>
      <small>{rank ? `${rank.startsWith('#') ? rank : `#${rank}`} · ` : ''}{record || 'RECORD —'}</small>
      <strong>{name.toUpperCase()}</strong>
    </div>
  </div>
);

const GameDayPregamePortal = () => {
  const { career } = useOwnerCareer();
  const [mount, setMount] = useState(null);
  const [brands, setBrands] = useState(() => ({
    school: fallbackTeamBrand('Program'),
    opponent: fallbackTeamBrand('Opponent'),
  }));
  const live = useMemo(() => buildGameDayLiveV2(career || {}), [career]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      resolveTeamBrand(live.school),
      resolveTeamBrand(live.opponent),
    ]).then(([school, opponent]) => {
      if (!cancelled) setBrands({ school, opponent });
    }).catch(() => {
      if (!cancelled) setBrands({ school: fallbackTeamBrand(live.school), opponent: fallbackTeamBrand(live.opponent) });
    });
    return () => { cancelled = true; };
  }, [live.school, live.opponent]);

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
        ownedMount.dataset.gameDayPregame = 'v2';
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
  const totalTD = live.player.seasonTotals.passTD + live.player.seasonTotals.rushTD;
  const opponentRecord = clean(live.matchup?.record) || '—';
  const locationLine = [live.venue, live.kickoff].filter(Boolean).join(' · ') || 'Game details from Week Setup';
  const mediaIcon = (target) => target === 'podcast' ? Headphones : target === 'newsroom' ? Newspaper : Radio;

  const openMedia = (item) => {
    const target = item?.target;
    if (target === 'newsroom') return openNav(['The Newsroom', 'Newsroom']);
    if (target === 'podcast') return openNav(['Podcast', 'The Huddle']);
    if (target === 'official') {
      window.dispatchEvent(new CustomEvent('dynastyhq:open-official-coverage', {
        detail: {
          headline: item?.headline || item?.title || '',
          season: item?.season,
          week: item?.week,
          source: 'around-the-program',
        },
      }));
      return;
    }
    return openNav('Game Hub');
  };

  return createPortal(
    <section className="dhq-live" data-ready={live.ready ? 'true' : 'false'} aria-label="Game Day Live pregame experience">
      <div className="dhq-live__network-bar">
        <span><i /> GAME DAY LIVE</span>
        <strong>SEASON {live.season} · WEEK {live.week}</strong>
        <small>{live.ready ? 'PREGAME COVERAGE LIVE' : 'MATCHUP SETUP PENDING'}</small>
      </div>

      <section className="dhq-live__matchup" style={{ '--home-primary': brands.school.primaryColor, '--away-primary': brands.opponent.primaryColor }}>
        <div className="dhq-live__matchup-bg" aria-hidden="true" />
        <div className="dhq-live__matchup-head">
          <span><Radio size={13} /> SATURDAY STARTS HERE</span>
          <p>{locationLine}</p>
        </div>
        <div className="dhq-live__teams">
          <TeamMark brand={brands.school} name={live.school} record={live.record} />
          <div className="dhq-live__vs">
            <small>WEEK {live.week}</small>
            <strong>VS</strong>
            <span>{live.matchup?.rank ? 'RANKED MATCHUP' : 'GAME WEEK'}</span>
          </div>
          <TeamMark brand={brands.opponent} name={live.opponent} record={opponentRecord} rank={clean(live.matchup?.rank)} />
        </div>
        <div className="dhq-live__matchup-footer">
          <span><MapPin size={12} /> {live.venue || 'Venue not saved'}</span>
          <span><CalendarDays size={12} /> {live.kickoff || `Week ${live.week}`}</span>
          <span><Trophy size={12} /> {live.school} {live.record}</span>
        </div>
      </section>

      <section className="dhq-live__lead-grid">
        <article className="dhq-live-card dhq-live-card--stakes">
          <header><span><Sparkles size={14} /> WHAT'S AT STAKE</span><small>THE STORY ENTERING KICKOFF</small></header>
          <div className="dhq-live__stakes">
            {live.stakes.map((item, index) => (
              <div key={`${item.label}-${index}`}>
                <b>{String(index + 1).padStart(2, '0')}</b>
                <span><small>{item.label}</small><strong>{item.title}</strong><p>{item.detail}</p></span>
              </div>
            ))}
          </div>
        </article>

        <article className="dhq-live-card dhq-live-card--player">
          <header><span><Activity size={14} /> PLAYER SPOTLIGHT</span><small>{live.player.role || 'CURRENT ROLE'}</small></header>
          <div className="dhq-live__player-name">
            <div><small>{live.player.pos.toUpperCase()} · #{live.player.number}</small><strong>{live.player.name.toUpperCase()}</strong></div>
            {live.player.role ? <b>{live.player.role.toUpperCase()}</b> : null}
          </div>
          <div className="dhq-live__player-stats">
            <div><strong>{displayNumber(live.player.seasonTotals.passYds)}</strong><span>PASS YDS</span></div>
            <div><strong>{displayNumber(totalTD)}</strong><span>TOTAL TD</span></div>
            <div><strong>{displayNumber(live.player.seasonTotals.rushYds)}</strong><span>RUSH YDS</span></div>
            <div><strong>{displayNumber(live.player.seasonTotals.interceptions)}</strong><span>INT</span></div>
          </div>
          {live.lastPlayerLine ? (
            <div className="dhq-live__last-line">
              <span>LAST APPEARANCE</span>
              <strong>{live.lastPlayerLine.passYds} PASS YDS · {live.lastPlayerLine.totalTD} TD</strong>
              <small>{live.lastPlayerLine.rushYds} rush yds · {live.lastPlayerLine.interceptions} INT</small>
            </div>
          ) : null}
          <div className="dhq-live__player-meta">
            <span>Coach Trust <strong>{live.player.coachTrust === null ? '—' : displayNumber(live.player.coachTrust)}</strong></span>
            <span>Skill Points <strong>{live.player.skillPoints === null ? '—' : displayNumber(live.player.skillPoints)}</strong></span>
          </div>
        </article>
      </section>

      <section className="dhq-live__context-grid">
        <article className="dhq-live-card dhq-live-card--season">
          <header><span><Trophy size={14} /> SEASON SNAPSHOT</span><small>FORM + ROAD AHEAD</small></header>
          <div className="dhq-live__season-context">
            <div className="dhq-live__form">
              <span>RECENT FORM</span>
              {live.recentForm.length ? live.recentForm.map((game) => (
                <div key={`form-${game.week}`}><b className={game.result === 'W' ? 'is-win' : 'is-loss'}>{game.result || '—'}</b><strong>W{game.week} · {game.opponent.toUpperCase()}</strong><small>{game.score || 'FINAL'}</small></div>
              )) : <p>No completed schedule results before this week.</p>}
            </div>
            <div className="dhq-live__road">
              <span>AFTER TODAY</span>
              {live.roadAhead.length ? live.roadAhead.map((game) => (
                <div key={`road-${game.week}`}><b>W{game.week}</b><strong>{game.opponent.toUpperCase()}</strong><small>{game.site === 'home' ? 'HOME' : game.site === 'away' ? 'AWAY' : 'UPCOMING'}</small></div>
              )) : <p>No later opponent is saved yet.</p>}
            </div>
          </div>
        </article>

        <article className="dhq-live-card dhq-live-card--media">
          <header><span><BookOpen size={14} /> AROUND THE PROGRAM</span><small>RECENT COVERAGE</small></header>
          <div className="dhq-live__media">
            {live.media.items.length ? live.media.items.map((item) => {
              const Icon = mediaIcon(item.target);
              return (
                <button type="button" key={item.id} onClick={() => openMedia(item)}>
                  <Icon size={15} />
                  <span><small>{item.label}</small><strong>{item.title}</strong><p>{item.detail}</p></span>
                  <ChevronRight size={14} />
                </button>
              );
            }) : (
              <div className="dhq-live__media-empty"><Radio size={17} /><span><strong>THE DESK IS QUIET</strong><p>Finished Newsroom, Huddle, or EA SPORTS Network coverage will surface here when it exists.</p></span></div>
            )}
          </div>
        </article>
      </section>

      <section className="dhq-live__handoff">
        <div>
          <span><Radio size={13} /> GAME DAY HANDOFF</span>
          <h2>{live.ready ? 'PLAY THE GAME. DYNASTYHQ WILL BE WAITING AFTER THE FINAL.' : 'FINISH THE MATCHUP SETUP FIRST.'}</h2>
          <p>{live.ready
            ? 'The pregame story is set. Play College Football 27 normally, then return with the screenshots from the week. Process Week 2.0 will take it from there.'
            : 'Once Week Setup has an opponent, Game Day Live becomes the pregame broadcast and postgame handoff.'}</p>
        </div>
        <div className="dhq-live__handoff-actions">
          <button type="button" className="is-primary" onClick={openImport} disabled={!live.ready}><CloudUpload size={14} /> IMPORT AFTER GAME</button>
          <button type="button" onClick={() => openNav('Career')}>CAREER CONTEXT <ChevronRight size={13} /></button>
        </div>
      </section>
    </section>,
    mount,
  );
};

export default GameDayPregamePortal;
