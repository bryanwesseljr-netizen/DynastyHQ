import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  Film,
  Newspaper,
  Radio,
  ScanLine,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import {
  buildProcessWeekInbox,
  classifyProcessWeekAnalysis,
  publicationIdForProcessWeek,
} from '../domain/processWeek2.js';
import { buildStorylineEngine } from '../domain/storylineEngine.js';
import { nextScheduledGame, teamRecordThroughWeek } from '../domain/seasonSchedule.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './process-week-2.css';

const clean = (value) => String(value ?? '').trim();
const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const numberOf = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const visibleButton = (matcher) => {
  const buttons = [...document.querySelectorAll('button')];
  return buttons.find((button) => matcher.test(clean(button.textContent)) && button.offsetParent !== null)
    || buttons.find((button) => matcher.test(clean(button.textContent)))
    || null;
};

const nav = (matcher) => visibleButton(matcher)?.click();

const readReviewStat = (review, labelText) => {
  if (!review) return 0;
  const label = [...review.querySelectorAll('p')]
    .find((entry) => clean(entry.textContent).toLowerCase() === labelText.toLowerCase());
  if (!label?.parentElement) return 0;
  const value = [...label.parentElement.querySelectorAll('p')].find((entry) => entry !== label);
  const match = clean(value?.textContent).match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const readReview = (previous = {}) => {
  const review = document.querySelector('.dhq-postgame-review');
  const applied = Boolean(document.querySelector('.dhq-agenda-v3-applied-ready'));
  return {
    hasReview: Boolean(review),
    hasApplied: applied,
    screens: review ? readReviewStat(review, 'Screens') : (applied ? previous.screens || 0 : 0),
    facts: review ? readReviewStat(review, 'Extracted facts') : (applied ? previous.facts || 0 : 0),
    attention: review ? readReviewStat(review, 'Needs review') : (applied ? 0 : previous.attention || 0),
    missing: review ? readReviewStat(review, 'Required missing') : (applied ? 0 : previous.missing || 0),
  };
};

const expectedScreensFromDom = () => {
  const text = clean(document.querySelector('.dhq-session-import__processing-card h1')?.textContent);
  const match = text.match(/reading\s+(\d+)\s+screenshot/i);
  if (match) return Number(match[1]);
  const queue = clean(document.querySelector('.dhq-session-import__queue-head small')?.textContent);
  return Number(queue.match(/(\d+)\s+files?/i)?.[1] || 0);
};

const currentPublicationId = (career = {}) => publicationIdForProcessWeek(
  career.currentSeason || 1,
  career.currentWeek ?? 1,
);

const factValue = (analyses = [], key) => {
  for (let index = analyses.length - 1; index >= 0; index -= 1) {
    const fact = list(analyses[index]?.analysis?.facts).find((entry) => entry?.key === key);
    if (fact && clean(fact.value) !== '') return clean(fact.value);
  }
  return '';
};

const publicationMatches = (entry = {}, publicationId = '') => (
  entry?.publicationId === publicationId
  || entry?.weekKey === publicationId
  || entry?.id === publicationId
);

const latestPublished = (career = {}) => list(career.weeklyUpdates).slice().sort((a, b) => (
  Number(a.season || 1) - Number(b.season || 1)
  || Number(a.week || 0) - Number(b.week || 0)
)).at(-1) || null;

const InboxCard = ({ inbox, onProcess, onReview, compact = false, error = '' }) => (
  <section className={`dhq-process2-inbox is-${inbox.state} ${compact ? 'is-compact' : ''}`} aria-label="Process Week smart inbox">
    <header>
      <div>
        <span><ScanLine size={13} /> SMART SESSION INBOX</span>
        <h2>{inbox.label}</h2>
        <p>{inbox.detail}</p>
      </div>
      <div className="dhq-process2-inbox__meter">
        <strong>{inbox.analyzedScreens || inbox.expectedScreens || '—'}</strong>
        <span>SCREENS READ</span>
      </div>
    </header>

    <div className="dhq-process2-inbox__detections">
      {inbox.detected.map((item) => (
        <article key={item.id}>
          <CheckCircle2 size={14} />
          <div><strong>{item.label}</strong><small>{item.count > 1 ? `${item.count} screens · ` : ''}{item.detail}</small></div>
        </article>
      ))}
      {!inbox.detected.length ? <article className="is-waiting"><ScanLine size={14} /><div><strong>Sorting screenshots</strong><small>Recognized game and media types will appear here as analysis finishes.</small></div></article> : null}
    </div>

    {inbox.optional.length && !compact ? (
      <div className="dhq-process2-inbox__optional">
        <span>OPTIONAL ENRICHMENT</span>
        <p>{inbox.optional.slice(0, 2).join('  •  ')}</p>
      </div>
    ) : null}

    {error ? <div className="dhq-process2-inbox__error"><AlertTriangle size={13} /> {error}</div> : null}

    <div className="dhq-process2-inbox__actions">
      {inbox.attention || inbox.missing || inbox.state === 'needs-attention' ? (
        <button type="button" className="is-secondary" onClick={onReview}><Eye size={14} /> REVIEW FLAGGED ITEMS</button>
      ) : null}
      {inbox.canPublish ? (
        <button type="button" className="is-primary" onClick={onProcess}><Sparkles size={14} /> PROCESS WEEK <ArrowRight size={14} /></button>
      ) : null}
    </div>
  </section>
);

const ConfirmPublish = ({ career, analyses, inbox, onClose, onConfirm, busy, error }) => {
  const season = Number(career.currentSeason || 1);
  const week = Number(career.currentWeek ?? 1);
  const opponent = clean(career.currentWeekSetup?.opponent) || 'Current opponent';
  const result = factValue(analyses, 'game.result') || '—';
  const teamScore = factValue(analyses, 'game.homeScore');
  const opponentScore = factValue(analyses, 'game.awayScore');
  const passYds = factValue(analyses, 'game.passYds');
  const passTD = factValue(analyses, 'game.passTD');
  const rushYds = factValue(analyses, 'game.rushYds');
  const rushTD = factValue(analyses, 'game.rushTD');
  const totalTD = numberOf(passTD) + numberOf(rushTD);

  return createPortal(
    <div className="dhq-process2-confirm" role="dialog" aria-modal="true" aria-labelledby="dhq-process2-confirm-title" onClick={onClose}>
      <section onClick={(event) => event.stopPropagation()}>
        <button className="dhq-process2-confirm__close" type="button" onClick={onClose} aria-label="Close Process Week confirmation"><X size={18} /></button>
        <span className="dhq-process2-confirm__eyebrow"><Sparkles size={13} /> PROCESS WEEK · FINAL CONFIRMATION</span>
        <h2 id="dhq-process2-confirm-title">Publish Season {season} · Week {week}?</h2>
        <p>DynastyHQ will turn the verified session into the permanent week record and let the rest of the companion experience update from that source of truth.</p>

        <div className="dhq-process2-confirm__summary">
          <article><span>MATCHUP</span><strong>{opponent.toUpperCase()}</strong><small>{result !== '—' ? `${result}${teamScore && opponentScore ? ` · ${teamScore}-${opponentScore}` : ''}` : 'Verified game'}</small></article>
          <article><span>YOUR LINE</span><strong>{passYds ? `${passYds} PASS YDS` : 'VERIFIED STATS'}</strong><small>{totalTD ? `${totalTD} total TD${rushYds ? ` · ${rushYds} rush yds` : ''}` : 'Player production preserved'}</small></article>
          <article><span>SESSION</span><strong>{inbox.analyzedScreens || inbox.expectedScreens || '—'} SCREENS</strong><small>{inbox.detected.length} useful data lane{inbox.detected.length === 1 ? '' : 's'} recognized</small></article>
        </div>

        <div className="dhq-process2-confirm__will-update">
          <span>THIS PUBLISH UPDATES</span>
          <p>Game Hub · season record · player history · storyline context · Newsroom/Huddle source context · official coverage archive · Career Chronicle · Career Museum · Season Wire</p>
        </div>
        {error ? <div className="dhq-process2-inbox__error"><AlertTriangle size={13} /> {error}</div> : null}
        <div className="dhq-process2-confirm__actions">
          <button type="button" className="is-secondary" onClick={onClose}>KEEP REVIEWING</button>
          <button type="button" className="is-primary" disabled={busy} onClick={onConfirm}>{busy ? 'PUBLISHING…' : 'PUBLISH WEEK'} <ArrowRight size={14} /></button>
        </div>
      </section>
    </div>,
    document.body,
  );
};

const Premiere = ({ career, entry, onClose }) => {
  const season = Number(entry?.season || career.currentSeason || 1);
  const week = Number(entry?.week ?? career.currentWeek ?? 1);
  const game = entry?.game || {};
  const opponent = clean(game.opponent || career.currentWeekSetup?.opponent) || 'Opponent';
  const result = clean(game.result).toUpperCase() || 'FINAL';
  const teamScore = game.homeScore ?? game.teamScore;
  const opponentScore = game.awayScore ?? game.opponentScore;
  const score = teamScore !== undefined && teamScore !== '' && opponentScore !== undefined && opponentScore !== ''
    ? `${teamScore}-${opponentScore}`
    : 'FINAL';
  const totalTD = numberOf(game.passTD) + numberOf(game.rushTD);
  const record = teamRecordThroughWeek(career, season, week);
  const story = buildStorylineEngine(career, { season, week, opponent, phase: 'postgame' });
  const next = nextScheduledGame(career, season);
  const publicationId = entry.publicationId || entry.weekKey || publicationIdForProcessWeek(season, week);
  const newsroom = list(career.newsroomIssues).find((item) => publicationMatches(item, publicationId));
  const podcast = list(career.podcastEpisodes).find((item) => publicationMatches(item, publicationId));
  const official = list(career.eaSportsNetworkArticles).find((item) => publicationMatches(item, publicationId));
  const mediaCount = Number(Boolean(newsroom)) + Number(Boolean(podcast)) + Number(Boolean(official));

  return createPortal(
    <div className="dhq-postgame-premiere" role="dialog" aria-modal="true" aria-labelledby="dhq-postgame-premiere-title">
      <div className="dhq-postgame-premiere__backdrop" />
      <section>
        <div className="dhq-postgame-premiere__live"><Film size={13} /> DYNASTYHQ POSTGAME</div>
        <span>SEASON {season} · WEEK {week} · PUBLISHED</span>
        <h1 id="dhq-postgame-premiere-title">{result} · {score}</h1>
        <h2>{clean(career.player?.college || career.player?.school || 'YOUR TEAM').toUpperCase()} vs {opponent.toUpperCase()}</h2>

        <div className="dhq-postgame-premiere__beats">
          <article><span>YOUR PERFORMANCE</span><strong>{numberOf(game.passYds)} PASS YDS · {totalTD} TD</strong><small>{numberOf(game.rushYds)} rush yds · {numberOf(game.int ?? game.interceptions)} INT</small></article>
          <article><span>SEASON NOW</span><strong>{record.wins}-{record.losses}</strong><small>{record.streak || `${record.games} decisions recorded`}</small></article>
          <article><span>THE STORY</span><strong>{story.lead?.title || 'THE WEEK IS IN THE BOOKS'}</strong><small>{story.lead?.detail || 'This result is now part of the permanent career timeline.'}</small></article>
        </div>

        <div className="dhq-postgame-premiere__media">
          <span><Newspaper size={13} /> COVERAGE DESK</span>
          <strong>{mediaCount ? `${mediaCount} media layer${mediaCount === 1 ? '' : 's'} attached or ready` : 'The coverage desk now has the verified week context.'}</strong>
          <small>{official ? 'EA SPORTS Network preserved' : 'Official coverage optional'} · {newsroom ? 'Newsroom linked' : 'Newsroom can build from this week'} · {podcast ? 'The Huddle linked' : 'The Huddle can build from this week'}</small>
        </div>

        {next ? <div className="dhq-postgame-premiere__next"><Trophy size={14} /><span>NEXT UP</span><strong>W{next.week} · {clean(next.opponent).toUpperCase()}</strong></div> : null}

        <div className="dhq-postgame-premiere__actions">
          <button type="button" className="is-secondary" onClick={() => { onClose(); nav(/^home$/i); }}>CONTINUE CAREER</button>
          <button type="button" className="is-primary" onClick={() => { onClose(); window.__dhqAllowLegacyGameHubOnce = true; nav(/^game hub$/i); }}>OPEN GAME HUB <ArrowRight size={14} /></button>
        </div>
      </section>
    </div>,
    document.body,
  );
};

const ProcessWeek2Portal = () => {
  const { career } = useOwnerCareer();
  const [analyses, setAnalyses] = useState([]);
  const [review, setReview] = useState({ hasReview: false, hasApplied: false, screens: 0, facts: 0, attention: 0, missing: 0 });
  const [expectedScreens, setExpectedScreens] = useState(0);
  const [host, setHost] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [error, setError] = useState('');
  const [premiere, setPremiere] = useState(null);
  const sessionKeyRef = useRef('');

  const publicationId = currentPublicationId(career || {});
  const isBye = clean(career?.currentWeekSetup?.type).toLowerCase() === 'bye';
  const inbox = useMemo(() => buildProcessWeekInbox({ analyses, expectedScreens, review, isBye }), [analyses, expectedScreens, review, isBye]);

  useEffect(() => {
    const onAnalyzed = (event) => {
      const detail = event.detail || {};
      const analysis = detail.analysis || {};
      const item = {
        fileName: clean(detail.fileName),
        analysis,
        categories: classifyProcessWeekAnalysis(analysis),
      };
      setAnalyses((current) => {
        const next = [...current];
        const index = next.findIndex((entry) => entry.fileName && entry.fileName === item.fileName);
        if (index >= 0) next[index] = item;
        else next.push(item);
        return next;
      });
    };
    window.addEventListener('dynastyhq:screenshot-analyzed', onAnalyzed);
    return () => window.removeEventListener('dynastyhq:screenshot-analyzed', onAnalyzed);
  }, []);

  useEffect(() => {
    const root = document.getElementById('root') || document.body;
    const refresh = () => {
      const session = document.querySelector('.dhq-session-import');
      const currentExpected = expectedScreensFromDom();
      if (currentExpected) setExpectedScreens((value) => value || currentExpected);

      setReview((current) => {
        const next = readReview(current);
        return JSON.stringify(next) === JSON.stringify(current) ? current : next;
      });

      const liveKey = session ? `${publicationId}:${session.className}` : '';
      if (session && session.classList.contains('is-game') && sessionKeyRef.current !== publicationId) {
        sessionKeyRef.current = publicationId;
        setAnalyses([]);
        setExpectedScreens(0);
        setReview({ hasReview: false, hasApplied: false, screens: 0, facts: 0, attention: 0, missing: 0 });
        setError('');
      }

      let nextHost = null;
      if (session) {
        nextHost = document.getElementById('dhq-process-week2-inbox-host');
      } else if (!session && review.hasApplied) {
        const applied = document.querySelector('.dhq-agenda-v3-applied-ready');
        if (applied) {
          nextHost = document.getElementById('dhq-process-week2-inbox-host');
          if (!nextHost) {
            nextHost = document.createElement('div');
            nextHost.id = 'dhq-process-week2-inbox-host';
          }
          if (nextHost.parentElement !== applied.parentElement) applied.after(nextHost);
        }
      }
      setHost((current) => current === nextHost ? current : nextHost);
      void liveKey;
    };

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [publicationId, review.hasApplied]);

  useEffect(() => {
    if (!career) return;
    let wanted = '';
    try { wanted = window.sessionStorage?.getItem('dhq-process-week2-publishing') || ''; } catch { /* no-op */ }
    if (!wanted) return;
    const entry = list(career.weeklyUpdates).find((item) => publicationMatches(item, wanted));
    if (!entry) return;
    try { window.sessionStorage?.removeItem('dhq-process-week2-publishing'); } catch { /* no-op */ }
    setPublishBusy(false);
    setConfirmOpen(false);
    setPremiere(entry);
    window.dispatchEvent(new CustomEvent('dynastyhq:process-week-published', { detail: { publicationId: wanted } }));
  }, [career]);

  const reviewFlags = () => {
    setConfirmOpen(false);
    window.dispatchEvent(new CustomEvent('dynastyhq:review-game-data'));
    window.requestAnimationFrame(() => {
      const target = document.querySelector('#dhq-session-game-review-host .dhq-postgame-review')
        || document.querySelector('.dhq-postgame-review')
        || document.querySelector('.dhq-agenda-v3-applied-ready');
      if (!target) {
        setError('The scanner has not produced a review draft yet. Wait for analysis to finish.');
        return;
      }
      target.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      target.focus?.({ preventScroll: true });
    });
  };

  const publish = () => {
    setError('');
    const button = [...document.querySelectorAll('.dhq-weekly-agenda-workspace button')].find((entry) => (
      /publish verified week|save & process weekly agenda|process completed game week|update game log/i.test(clean(entry.textContent))
      && !entry.dataset.processWeek2
    ));
    if (!button) {
      setError('DynastyHQ could not find the verified Publish Week action. Open Weekly Agenda and try again.');
      return;
    }
    if (button.disabled) {
      setError('The underlying week still has a required verification item before it can be published.');
      return;
    }
    setPublishBusy(true);
    try { window.sessionStorage?.setItem('dhq-process-week2-publishing', publicationId); } catch { /* session hint only */ }
    button.click();
    window.setTimeout(() => {
      const continueButton = document.querySelector('.dhq-session-import__complete-actions .is-primary');
      continueButton?.click();
    }, 120);
    window.setTimeout(() => setPublishBusy(false), 10000);
  };

  if (!career) return null;

  return (
    <>
      {host ? createPortal(
        <InboxCard
          inbox={inbox}
          compact={document.querySelector('.dhq-session-import')?.classList.contains('is-applied')}
          error={error}
          onProcess={() => setConfirmOpen(true)}
          onReview={reviewFlags}
        />,
        host,
      ) : null}
      {confirmOpen ? <ConfirmPublish career={career} analyses={analyses} inbox={inbox} onClose={() => setConfirmOpen(false)} onConfirm={publish} busy={publishBusy} error={error} /> : null}
      {premiere ? <Premiere career={career} entry={premiere} onClose={() => setPremiere(null)} /> : null}
    </>
  );
};

export default ProcessWeek2Portal;
