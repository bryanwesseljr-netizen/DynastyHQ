import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  BookOpen,
  ChevronRight,
  CircleUserRound,
  GraduationCap,
  Medal,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './career-overview.css';

const arrayOf = (value) => (Array.isArray(value) ? value : []);
const numberOf = (value) => Number(value) || 0;
const textOf = (value, fallback = '—') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const formatNumber = (value) => numberOf(value).toLocaleString();

const stageLabel = (career) => {
  const phase = String(career?.careerPhase || 'Player');
  if (phase === 'Retired') return 'Career Complete';
  if (phase === 'HC') return 'Head Coach';
  if (phase === 'OC') return 'Offensive Coordinator';
  if (career?.player?.isCommitted) return 'Road to Glory Player';
  return 'High School Recruit';
};

const eventDateValue = (entry) => {
  const date = Date.parse(entry?.occurredAt || entry?.publishedAt || entry?.createdAt || '');
  if (Number.isFinite(date)) return date;
  return (numberOf(entry?.season) * 100) + numberOf(entry?.week);
};

const CareerOverviewPortal = () => {
  const { career, ready } = useOwnerCareer();
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    const isCareerButton = (button) => {
      if (!button?.closest?.('.dhq-primary-nav, #mobile-primary-navigation')) return false;
      const label = String(button.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase();
      return label === 'CAREER' || label === 'LEGACY';
    };

    const syncActiveButton = (active) => {
      document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button').forEach((button) => {
        const label = String(button.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase();
        if (label === 'CAREER' || label === 'LEGACY') button.classList.toggle('dhq-career-active', active);
      });
    };

    const onClickCapture = (event) => {
      const button = event.target?.closest?.('button');
      if (!button) return;

      if (isCareerButton(button)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        setOpen(true);
        syncActiveButton(true);
        return;
      }

      if (openRef.current && button.closest?.('.dhq-primary-nav, #mobile-primary-navigation, .dhq-broadcast-header__actions, .dhq-broadcast-header-logo')) {
        setOpen(false);
        syncActiveButton(false);
      }
    };

    root.addEventListener('click', onClickCapture, true);
    return () => {
      root.removeEventListener('click', onClickCapture, true);
      syncActiveButton(false);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dhq-career-overview-open', open);
    return () => document.body.classList.remove('dhq-career-overview-open');
  }, [open]);

  const view = useMemo(() => {
    const state = career || {};
    const player = state.player || {};
    const rtg = state.rtg || {};
    const allGames = arrayOf(state.gameLogs);
    const collegeGames = allGames.filter((game) => (
      game
      && game.didPlay !== false
      && game.stage !== 'high-school'
      && !game.evaluation
      && String(game.opponent || '').trim()
    ));
    const wins = collegeGames.filter((game) => String(game.result || '').toUpperCase() === 'W').length;
    const losses = collegeGames.filter((game) => String(game.result || '').toUpperCase() === 'L').length;
    const totals = collegeGames.reduce((acc, game) => ({
      passYds: acc.passYds + numberOf(game.passYds),
      passTD: acc.passTD + numberOf(game.passTD),
      rushYds: acc.rushYds + numberOf(game.rushYds),
      rushTD: acc.rushTD + numberOf(game.rushTD),
      interceptions: acc.interceptions + numberOf(game.int),
    }), { passYds: 0, passTD: 0, rushYds: 0, rushTD: 0, interceptions: 0 });

    const highSchoolEvaluations = allGames.filter((game) => game?.stage === 'high-school' || game?.evaluation);
    const milestones = arrayOf(state.careerMilestones);
    const chronicle = arrayOf(state.careerChronicle);
    const honors = arrayOf(state.trophies);
    const timeline = [...milestones, ...chronicle]
      .filter(Boolean)
      .sort((left, right) => eventDateValue(right) - eventDateValue(left))
      .slice(0, 8);

    const rivalryMap = collegeGames.reduce((map, game) => {
      const opponent = String(game.opponent || '').trim();
      if (!opponent) return map;
      const current = map.get(opponent) || { opponent, wins: 0, losses: 0, lastSeason: numberOf(game.season) || 1 };
      if (String(game.result || '').toUpperCase() === 'W') current.wins += 1;
      if (String(game.result || '').toUpperCase() === 'L') current.losses += 1;
      current.lastSeason = Math.max(current.lastSeason, numberOf(game.season) || 1);
      map.set(opponent, current);
      return map;
    }, new Map());

    const rivalries = [...rivalryMap.values()]
      .sort((left, right) => ((right.wins + right.losses) - (left.wins + left.losses)) || (right.lastSeason - left.lastSeason))
      .slice(0, 6);

    const school = player.college || player.school || 'Career not assigned';
    const stars = Math.max(0, Math.min(5, numberOf(player.stars)));

    return {
      state,
      player,
      rtg,
      school,
      stage: stageLabel(state),
      stars,
      wins,
      losses,
      collegeGames,
      highSchoolEvaluations,
      totals,
      timeline,
      rivalries,
      honors,
      milestones,
      chronicle,
    };
  }, [career]);

  if (!open || !document.body) return null;

  const goHome = () => {
    setOpen(false);
    const homeButton = [...document.querySelectorAll('.dhq-primary-nav button')]
      .find((button) => String(button.textContent || '').trim().toUpperCase() === 'HOME');
    homeButton?.click();
  };

  return createPortal(
    <section className="dhq-career-overview" aria-label="Career overview">
      <div className="dhq-career-overview__scroll">
        <div className="dhq-career-overview__frame">
          {!ready ? (
            <div className="dhq-career-loading">Loading career history…</div>
          ) : (
            <>
              <header className="dhq-career-hero">
                <div className="dhq-career-hero__texture" aria-hidden="true" />
                <div className="dhq-career-hero__identity">
                  <div className="dhq-career-kicker">Career Overview</div>
                  <div className="dhq-career-player-row">
                    <div className="dhq-career-avatar">
                      {view.player.headshot ? <img src={view.player.headshot} alt="" /> : <CircleUserRound size={58} />}
                    </div>
                    <div>
                      <h1>{textOf(view.player.name, 'Your Career')}</h1>
                      <p>
                        {textOf(view.player.pos, 'Player')} {view.player.number ? `#${view.player.number}` : ''}
                        <span>•</span> {view.school}
                      </p>
                      <div className="dhq-career-stars" aria-label={`${view.stars} star player`}>
                        {Array.from({ length: 5 }, (_, index) => <span key={index} className={index < view.stars ? 'is-filled' : ''}>★</span>)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dhq-career-hero__chapter">
                  <span>Current Chapter</span>
                  <strong>{view.stage}</strong>
                  <p>Season {numberOf(view.state.currentSeason) || 1} · Week {numberOf(view.state.currentWeek) || 1}</p>
                </div>

                <div className="dhq-career-hero__record">
                  <span>College Record</span>
                  <strong>{view.wins}-{view.losses}</strong>
                  <p>{view.collegeGames.length} verified appearance{view.collegeGames.length === 1 ? '' : 's'}</p>
                </div>
              </header>

              <div className="dhq-career-stat-grid">
                <article>
                  <div className="dhq-career-card-icon"><TrendingUp size={19} /></div>
                  <span>Career Passing</span>
                  <strong>{formatNumber(view.totals.passYds)}</strong>
                  <p>{formatNumber(view.totals.passTD)} TD · {formatNumber(view.totals.interceptions)} INT</p>
                </article>
                <article>
                  <div className="dhq-career-card-icon"><Target size={19} /></div>
                  <span>Career Rushing</span>
                  <strong>{formatNumber(view.totals.rushYds)}</strong>
                  <p>{formatNumber(view.totals.rushTD)} rushing TD</p>
                </article>
                <article>
                  <div className="dhq-career-card-icon"><Sparkles size={19} /></div>
                  <span>Development</span>
                  <strong>{textOf(view.rtg.rank, textOf(view.player.overall ? `${view.player.overall} OVR` : '', 'Building'))}</strong>
                  <p>{formatNumber(view.rtg.coachTrust)} Coach Trust · {formatNumber(view.rtg.skillPoints)} skill pts</p>
                </article>
                <article>
                  <div className="dhq-career-card-icon"><Trophy size={19} /></div>
                  <span>Legacy</span>
                  <strong>{view.honors.length + view.milestones.length}</strong>
                  <p>{view.honors.length} honor{view.honors.length === 1 ? '' : 's'} · {view.milestones.length} milestone{view.milestones.length === 1 ? '' : 's'}</p>
                </article>
              </div>

              <div className="dhq-career-main-grid">
                <article className="dhq-career-panel dhq-career-timeline">
                  <div className="dhq-career-panel__heading">
                    <div><span>Career Story</span><h2>Timeline</h2></div>
                    <BookOpen size={22} />
                  </div>
                  <div className="dhq-career-timeline__list">
                    {view.timeline.length ? view.timeline.map((entry, index) => (
                      <div className="dhq-career-timeline__item" key={entry.id || entry.publicationId || `${entry.type}-${index}`}>
                        <i />
                        <div>
                          <small>Season {numberOf(entry.season) || 1} · Week {numberOf(entry.week) || 0}</small>
                          <strong>{textOf(entry.title, textOf(entry.type, 'Career milestone'))}</strong>
                          <p>{textOf(entry.summary, 'Verified career event')}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="dhq-career-empty">Your verified career timeline will build here as you process weeks and milestones.</div>
                    )}
                  </div>
                </article>

                <aside className="dhq-career-side-stack">
                  <article className="dhq-career-panel">
                    <div className="dhq-career-panel__heading">
                      <div><span>Player Profile</span><h2>Current Snapshot</h2></div>
                      <Shield size={22} />
                    </div>
                    <dl className="dhq-career-profile-list">
                      <div><dt>Height / Weight</dt><dd>{textOf(view.player.height)} / {textOf(view.player.weight)}</dd></div>
                      <div><dt>Archetype</dt><dd>{textOf(view.player.archetype, 'Not captured')}</dd></div>
                      <div><dt>Overall</dt><dd>{textOf(view.player.overall, '—')}</dd></div>
                      <div><dt>Depth Chart</dt><dd>{textOf(view.rtg.rank, 'Not captured')}</dd></div>
                      <div><dt>GPA</dt><dd>{textOf(view.rtg.gpa, 'Not captured')}</dd></div>
                      <div><dt>NIL / Followers</dt><dd>{formatNumber(view.rtg.valuation)} / {formatNumber(view.rtg.followers)}</dd></div>
                    </dl>
                  </article>

                  <article className="dhq-career-panel">
                    <div className="dhq-career-panel__heading">
                      <div><span>Early Journey</span><h2>Recruiting Tape</h2></div>
                      <GraduationCap size={22} />
                    </div>
                    <div className="dhq-career-recruiting-snapshot">
                      <strong>{view.highSchoolEvaluations.length}</strong>
                      <span>verified high-school evaluation{view.highSchoolEvaluations.length === 1 ? '' : 's'}</span>
                      <p>Tape Score {formatNumber(view.state.playerRecruiting?.highSchool?.tapeScore)} · {numberOf(view.state.playerRecruiting?.highSchool?.recruitStars || view.player.stars) || '—'}-star</p>
                    </div>
                  </article>
                </aside>
              </div>

              <div className="dhq-career-lower-grid">
                <article className="dhq-career-panel">
                  <div className="dhq-career-panel__heading">
                    <div><span>History</span><h2>Rivalry Ledger</h2></div>
                    <Medal size={22} />
                  </div>
                  <div className="dhq-career-rivalries">
                    {view.rivalries.length ? view.rivalries.map((rivalry) => (
                      <div key={rivalry.opponent}>
                        <span>{rivalry.opponent}</span>
                        <strong>{rivalry.wins}-{rivalry.losses}</strong>
                        <small>Last played S{rivalry.lastSeason}</small>
                      </div>
                    )) : <div className="dhq-career-empty">College rivalries will appear after verified game results.</div>}
                  </div>
                </article>

                <article className="dhq-career-panel">
                  <div className="dhq-career-panel__heading">
                    <div><span>Achievements</span><h2>Honors & Milestones</h2></div>
                    <Award size={22} />
                  </div>
                  <div className="dhq-career-honors">
                    {view.honors.length ? view.honors.slice(0, 5).map((honor, index) => (
                      <div key={honor.id || `${honor.name}-${index}`}>
                        <Trophy size={16} />
                        <span><strong>{textOf(honor.name, textOf(honor.type, 'Honor'))}</strong><small>{textOf(honor.year, 'Career achievement')}</small></span>
                      </div>
                    )) : <div className="dhq-career-empty">Awards and championships will collect here as your career grows.</div>}
                  </div>
                </article>
              </div>

              <footer className="dhq-career-footer">
                <button type="button" onClick={goHome}>Return Home <ChevronRight size={16} /></button>
                <p>DynastyHQ Career · Your Career. Your Legacy. Your Dynasty.</p>
              </footer>
            </>
          )}
        </div>
      </div>
    </section>,
    document.body,
  );
};

export default CareerOverviewPortal;
