import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, BookOpen, Headphones, History, Sparkles, Target, Trophy } from 'lucide-react';
import { buildImmersionModel } from '../domain/immersionEngine.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './immersion.css';

const clean = (value) => String(value ?? '').trim();

const ensureHostAfter = (anchor, id) => {
  if (!anchor?.parentElement) return null;
  let host = document.getElementById(id);
  if (!host) {
    host = document.createElement('div');
    host.id = id;
  }
  if (host.previousElementSibling !== anchor) anchor.insertAdjacentElement('afterend', host);
  return host;
};

const ensureHostBefore = (anchor, id) => {
  if (!anchor?.parentElement) return null;
  let host = document.getElementById(id);
  if (!host) {
    host = document.createElement('div');
    host.id = id;
  }
  if (host.nextElementSibling !== anchor) anchor.insertAdjacentElement('beforebegin', host);
  return host;
};

const Pulse = ({ model }) => (
  <section className="dhq-immersion-pulse" aria-label="Season pulse">
    <div className="dhq-immersion-pulse__title"><Activity size={15} /><span>SEASON PULSE</span><strong>{model.seasonPulse.record}</strong></div>
    <div className="dhq-immersion-results">
      {model.seasonPulse.results.length
        ? model.seasonPulse.results.slice(-10).map((result, index) => <i className={result === 'W' ? 'is-win' : 'is-loss'} key={`${result}-${index}`}>{result}</i>)
        : <small>CAREER JUST GETTING STARTED</small>}
    </div>
    <div className="dhq-immersion-pulse__stats">
      <span><b>{model.seasonPulse.passingYards.toLocaleString()}</b> PASS YDS</span>
      <span><b>{model.seasonPulse.totalTouchdowns}</b> TOTAL TD</span>
      {model.seasonPulse.rank ? <span><b>#{model.seasonPulse.rank}</b> RANK</span> : null}
    </div>
    <div className="dhq-immersion-brief">
      <Sparkles size={14} />
      <p>{model.todayBrief.slice(0, 2).join(' ')}</p>
    </div>
  </section>
);

const PregameIntel = ({ model }) => (
  <section className="dhq-immersion-game-grid" aria-label="Automatic game intelligence">
    <article className="dhq-immersion-card">
      <header><Target size={15} /><span>WHAT'S AT STAKE</span></header>
      {model.stakes.length ? model.stakes.map((item) => <div className="dhq-immersion-line" key={item.id}><small>{item.label}</small><strong>{item.detail}</strong></div>) : <p>No extra setup needed. DynastyHQ will build the stakes as verified career data accumulates.</p>}
    </article>
    <article className="dhq-immersion-card">
      <header><History size={15} /><span>{model.previousMeeting ? 'MEMORY LANE' : 'ACTIVE STORYLINES'}</span></header>
      {model.previousMeeting ? (
        <>
          <div className="dhq-immersion-memory-score"><b>{clean(model.previousMeeting.result) || '—'}</b><strong>{model.previousMeeting.homeScore ?? '—'}-{model.previousMeeting.awayScore ?? '—'}</strong></div>
          <p>Last meeting vs {model.currentOpponent} · Season {model.previousMeeting.season || 1}, Week {model.previousMeeting.week || '—'}</p>
          <small>DYNASTYHQ-ERA SERIES {model.series.wins}-{model.series.losses}</small>
        </>
      ) : model.storylines.slice(0, 3).map((item) => <div className="dhq-immersion-line" key={item.id}><small>{item.label}</small><strong>{item.detail}</strong></div>)}
    </article>
    <article className="dhq-immersion-card">
      <header><Sparkles size={15} /><span>STORY DIRECTOR LIVE</span></header>
      {model.storylines.slice(0, 3).map((item) => <div className="dhq-immersion-line" key={item.id}><small>{item.label}</small><strong>{item.detail}</strong></div>)}
      {!model.storylines.length ? <p>No major narrative thread yet. That's okay — DynastyHQ won't manufacture one.</p> : null}
    </article>
  </section>
);

const PostgameWrap = ({ model }) => {
  const wrap = model.postgameWrap;
  if (!wrap) return null;
  return (
    <section className="dhq-immersion-wrap" aria-label="DynastyHQ broadcast wrap">
      <div className="dhq-immersion-wrap__result"><span>DYNASTYHQ BROADCAST WRAP</span><strong>{wrap.result || 'FINAL'} · {wrap.score}</strong><small>vs {wrap.opponent}</small></div>
      <div className="dhq-immersion-wrap__performance"><span>PLAYER LINE</span><strong>{wrap.playerLine}</strong>{wrap.impact[0] ? <small>{wrap.impact.join(' · ')}</small> : null}</div>
      <div className="dhq-immersion-wrap__podcast"><Headphones size={18} /><span>NIPPERT NOTEBOOK</span><strong>{model.podcastPlan.label}</strong><small>{model.podcastPlan.reason}</small></div>
    </section>
  );
};

const RecordBook = ({ model }) => {
  const records = [
    ['Passing Yards', model.recordBook.passingYards],
    ['Rushing Yards', model.recordBook.rushingYards],
    ['Total TD', model.recordBook.totalTouchdowns],
  ];
  return (
    <section className="dhq-immersion-recordbook" aria-label="Automatic career record book">
      <div className="dhq-immersion-recordbook__heading"><div><span>AUTOMATIC HISTORY</span><h2>Career Record Book</h2></div><BookOpen size={21} /></div>
      <div className="dhq-immersion-record-grid">
        {records.map(([label, record]) => <article key={label}><span>{label}</span><strong>{record?.value ?? '—'}</strong><small>{record ? `vs ${record.opponent} · S${record.season} W${record.week}` : 'No verified college game yet'}</small></article>)}
        <article><span>Career Passing</span><strong>{model.recordBook.careerPassingYards.toLocaleString()}</strong><small>{model.recordBook.careerTotalTouchdowns} total touchdowns</small></article>
      </div>
      {model.recordWatch.length ? <div className="dhq-immersion-watch"><Trophy size={14} /><strong>RECORD WATCH</strong><span>{model.recordWatch[0].remaining} away from {model.recordWatch[0].label}</span></div> : null}
    </section>
  );
};

const ImmersionPortal = () => {
  const { career } = useOwnerCareer();
  const [targets, setTargets] = useState({ home: null, gameHub: null, career: null });
  const [selectionKey, setSelectionKey] = useState('current');
  const [gameHubPregame, setGameHubPregame] = useState(false);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    const ensure = () => {
      const homeHero = document.querySelector('#dynastyhq-command-center .dhq-broadcast-hero');
      const gameProgress = document.querySelector('.dhq-game-hub .dhq-gh-progress');
      const careerFooter = document.querySelector('.dhq-career-overview .dhq-career-footer');
      const next = {
        home: homeHero ? ensureHostAfter(homeHero, 'dhq-immersion-home-host') : null,
        gameHub: gameProgress ? ensureHostAfter(gameProgress, 'dhq-immersion-game-host') : null,
        career: careerFooter ? ensureHostBefore(careerFooter, 'dhq-immersion-career-host') : null,
      };
      setTargets((current) => (
        current.home === next.home && current.gameHub === next.gameHub && current.career === next.career ? current : next
      ));
      const select = document.querySelector('.dhq-game-hub__toolbar select');
      if (select) setSelectionKey(select.value || 'current');
      setGameHubPregame(Boolean(document.querySelector('.dhq-game-hub .dhq-gh-hero.is-pregame')));
    };

    ensure();
    const observer = new MutationObserver(ensure);
    observer.observe(root, { childList: true, subtree: true, attributes: true });
    const onChange = (event) => {
      if (event.target?.matches?.('.dhq-game-hub__toolbar select')) setSelectionKey(event.target.value || 'current');
    };
    root.addEventListener('change', onChange, true);
    return () => {
      observer.disconnect();
      root.removeEventListener('change', onChange, true);
      ['dhq-immersion-home-host', 'dhq-immersion-game-host', 'dhq-immersion-career-host'].forEach((id) => document.getElementById(id)?.remove());
    };
  }, []);

  const model = useMemo(() => buildImmersionModel(career || {}, { selectionKey }), [career, selectionKey]);

  useEffect(() => {
    document.body.dataset.dhqAtmosphere = model.atmosphere;
    return () => { delete document.body.dataset.dhqAtmosphere; };
  }, [model.atmosphere]);

  return (
    <>
      {targets.home ? createPortal(<Pulse model={model} />, targets.home) : null}
      {targets.gameHub ? createPortal(gameHubPregame ? <PregameIntel model={model} /> : <PostgameWrap model={model} />, targets.gameHub) : null}
      {targets.career ? createPortal(<RecordBook model={model} />, targets.career) : null}
    </>
  );
};

export default ImmersionPortal;
