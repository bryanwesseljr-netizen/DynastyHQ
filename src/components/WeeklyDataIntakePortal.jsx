import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  Images,
  Loader2,
  Newspaper,
  PenLine,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react';
import { CAREER_STAGES, deriveCareerStage } from '../domain/commandCenter';
import { coverageReferenceFor } from '../domain/coverageReferences.js';
import { resolveWeeklyWorkContext } from '../domain/weeklyWorkContext.js';
import { extractMenuVideoFrames } from '../services/menuVideoFrames';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import '../weekly-data-intake.css';

const MAX_SCREENSHOTS = 12;

const findByText = (root, selector, matcher) => [...(root?.querySelectorAll(selector) || [])]
  .find((element) => matcher.test((element.textContent || '').trim()));

const findUniversalScannerInput = (agenda) => {
  const label = findByText(agenda, 'label', /choose weekly screenshots/i);
  return label?.querySelector('input[type="file"]') || null;
};

const handoffFilesToScanner = async (files, agenda) => {
  const selected = [...(files || [])];
  if (!selected.length) return;
  const input = findUniversalScannerInput(agenda);
  if (!input) throw new Error('The Game Data scanner is not ready yet. Reload Weekly Agenda and try again.');
  if (typeof DataTransfer === 'undefined') {
    throw new Error('This browser cannot hand files to the scanner automatically. Use the original screenshot chooser in Weekly Agenda instead.');
  }
  const transfer = new DataTransfer();
  selected.forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

const readReviewStat = (review, labelText) => {
  if (!review) return 0;
  const label = [...review.querySelectorAll('p')]
    .find((entry) => (entry.textContent || '').trim().toLowerCase() === labelText.toLowerCase());
  if (!label?.parentElement) return 0;
  const value = [...label.parentElement.querySelectorAll('p')].find((entry) => entry !== label);
  const match = (value?.textContent || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const readGameWorkflow = (agenda, previous = {}) => {
  const review = agenda?.querySelector('.dhq-postgame-review');
  const hasApplied = Boolean(agenda?.querySelector('.dhq-agenda-v3-applied-ready'));
  return {
    hasReview: Boolean(review),
    hasApplied,
    screens: review ? readReviewStat(review, 'Screens') : (hasApplied ? previous.screens || 0 : 0),
    facts: review ? readReviewStat(review, 'Extracted facts') : (hasApplied ? previous.facts || 0 : 0),
    attention: review ? readReviewStat(review, 'Needs review') : 0,
  };
};

const sameWorkflow = (a, b) => (
  a.hasReview === b.hasReview
  && a.hasApplied === b.hasApplied
  && a.screens === b.screens
  && a.facts === b.facts
  && a.attention === b.attention
);

const StatusPill = ({ tone, children }) => <span className={`dhq-data-intake-status is-${tone}`}>{children}</span>;

const Lane = ({ number, icon: Icon, title, badge, badgeTone, subtitle, timing, children, complete = false }) => (
  <section className={`dhq-data-intake-lane ${complete ? 'is-complete' : ''}`} data-weekly-data-lane={number}>
    <div className="dhq-data-intake-lane__number">{complete ? <CheckCircle2 size={15} /> : number}</div>
    <div className="dhq-data-intake-lane__main">
      <div className="dhq-data-intake-lane__title-row">
        <span className="dhq-data-intake-lane__icon"><Icon size={15} /></span>
        <div className="min-w-0">
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <StatusPill tone={badgeTone}>{badge}</StatusPill>
      </div>
      <div className="dhq-data-intake-timing"><strong>When:</strong> {timing}</div>
      {children}
    </div>
  </section>
);

const WeeklyDataIntake = ({ career, agenda }) => {
  const screenshotInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [gameBusy, setGameBusy] = useState(false);
  const [videoStatus, setVideoStatus] = useState(null);
  const [pendingScreens, setPendingScreens] = useState(0);
  const [message, setMessage] = useState('');
  const [rtgOpen, setRtgOpen] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [gameWorkflow, setGameWorkflow] = useState({ hasReview: false, hasApplied: false, screens: 0, facts: 0, attention: 0 });
  const [advanced, setAdvanced] = useState({ manual: false, milestone: false });

  const work = useMemo(() => resolveWeeklyWorkContext(career), [career]);
  const { season, week, setupReady, setup } = work;
  const isBye = setupReady && setup?.type === 'bye';
  const coverageSaved = useMemo(() => coverageReferenceFor(career, work.publicationId), [career, work.publicationId]);
  const lastRtgScan = career?.rtg?.lastStatusScan || null;
  const rtgCurrent = Boolean(lastRtgScan
    && Number(lastRtgScan.season) === Number(season)
    && Number(lastRtgScan.week) === Number(week));

  useEffect(() => {
    setRtgOpen(false);
    setCoverageOpen(false);
    setPendingScreens(0);
    setVideoStatus(null);
    setMessage('');
  }, [work.publicationId]);

  useEffect(() => {
    if (!agenda) return undefined;
    const refresh = () => {
      setGameWorkflow((current) => {
        const next = readGameWorkflow(agenda, current);
        return sameWorkflow(current, next) ? current : next;
      });
      setAdvanced((current) => {
        const next = {
          manual: agenda.classList.contains('dhq-agenda-v2-manual-open'),
          milestone: agenda.classList.contains('dhq-agenda-v2-more-open'),
        };
        return current.manual === next.manual && current.milestone === next.milestone ? current : next;
      });
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(agenda, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [agenda]);

  useEffect(() => {
    if (gameWorkflow.hasReview || gameWorkflow.hasApplied) setPendingScreens(0);
  }, [gameWorkflow.hasApplied, gameWorkflow.hasReview]);

  const importScreens = async (fileList) => {
    const files = [...(fileList || [])].slice(0, MAX_SCREENSHOTS);
    if (!files.length || !agenda || !setupReady || isBye) return;
    setGameBusy(true);
    setMessage('');
    setPendingScreens(files.length);
    try {
      await handoffFilesToScanner(files, agenda);
    } catch (error) {
      setPendingScreens(0);
      setMessage(error?.message || 'Game Data import failed.');
    } finally {
      setGameBusy(false);
    }
  };

  const importVideo = async (file) => {
    if (!file || !agenda || !setupReady || isBye) return;
    setGameBusy(true);
    setMessage('');
    setVideoStatus({ percent: 0, frames: 0 });
    setPendingScreens(0);
    try {
      const frames = await extractMenuVideoFrames(file, {
        onProgress: ({ percent, frames: frameCount }) => setVideoStatus({ percent, frames: frameCount }),
      });
      setVideoStatus({ percent: 100, frames: frames.length });
      setPendingScreens(frames.length);
      await handoffFilesToScanner(frames, agenda);
    } catch (error) {
      setVideoStatus(null);
      setMessage(error?.message || 'Menu Video Import failed. Your saved career was not changed.');
    } finally {
      setGameBusy(false);
    }
  };

  const focusGameReview = () => {
    const target = gameWorkflow.hasApplied
      ? agenda?.querySelector('.dhq-agenda-v3-applied-ready')
      : agenda?.querySelector('.dhq-postgame-review');
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const clickLegacyTool = (matcher) => {
    const shell = agenda?.querySelector('.dhq-agenda-v3-shell');
    const tools = shell?.querySelector('.dhq-agenda-v3-tools-card');
    const button = [...(tools?.querySelectorAll('button') || [])].find((entry) => matcher.test((entry.textContent || '').trim()));
    button?.click();
  };

  const gameComplete = isBye || gameWorkflow.hasApplied;
  const gameBadge = !setupReady
    ? ['Set week first', 'amber']
    : isBye
      ? ['Not needed', 'muted']
      : gameWorkflow.hasApplied
        ? ['Complete', 'green']
        : gameWorkflow.hasReview
          ? ['Review', 'amber']
          : pendingScreens
            ? ['Analyzing', 'blue']
            : ['Needed', 'amber'];

  const gameSummary = isBye
    ? 'Bye week — no game screenshots are required.'
    : gameWorkflow.hasApplied
      ? `${gameWorkflow.screens || 'Game'} screen${gameWorkflow.screens === 1 ? '' : 's'} · ${gameWorkflow.facts || 0} verified facts applied.`
      : gameWorkflow.hasReview
        ? `${gameWorkflow.screens || 0} screens · ${gameWorkflow.facts || 0} facts extracted${gameWorkflow.attention ? ` · ${gameWorkflow.attention} need review` : ''}.`
        : pendingScreens
          ? `${pendingScreens} imported screen${pendingScreens === 1 ? '' : 's'} are being analyzed.`
          : 'Use the postgame/game-summary screens and your relevant player-stat screens.';

  return (
    <section className="dhq-weekly-data-intake dhq-agenda-v3-import-card" data-weekly-data-intake>
      <header className="dhq-weekly-data-intake__header">
        <div>
          <span className="dhq-weekly-data-intake__eyebrow"><Database size={13} /> Weekly Data Intake</span>
          <h2>Upload the week in a clear order</h2>
          <p>Each lane has a different job. Keep the uploads separate so DynastyHQ can verify the right facts without mixing player, game, and editorial data.</p>
        </div>
        <div className="dhq-weekly-data-intake__summary">
          <span>Season {season} · Week {week}</span>
          <strong>{gameComplete ? 'Game data handled' : 'Start with Game Data'}</strong>
        </div>
      </header>

      <div className="dhq-weekly-data-intake__lanes">
        <Lane
          number="1"
          icon={ScanLine}
          title="Game Data"
          badge={gameBadge[0]}
          badgeTone={gameBadge[1]}
          subtitle="Updates the Game Log and verified game/player facts."
          timing={isBye ? 'Nothing to upload for a bye.' : 'Immediately after the game, before RTG Status or media coverage.'}
          complete={gameComplete}
        >
          <p className="dhq-data-intake-description">{gameSummary}</p>
          {!gameWorkflow.hasReview && !gameWorkflow.hasApplied && !isBye ? (
            <div className="dhq-data-intake-actions">
              <button type="button" disabled={gameBusy || !setupReady} onClick={() => screenshotInputRef.current?.click()}>
                {gameBusy && !videoStatus ? <Loader2 size={14} className="animate-spin" /> : <Images size={14} />}
                <span><strong>Upload Screens</strong><small>1 or several screenshots</small></span>
              </button>
              <button type="button" disabled={gameBusy || !setupReady} onClick={() => videoInputRef.current?.click()}>
                {gameBusy && videoStatus ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
                <span><strong>Menu Video</strong><small>Optional · up to 2 min</small></span>
              </button>
              <input ref={screenshotInputRef} type="file" accept="image/*" multiple className="hidden" disabled={gameBusy} onChange={(event) => {
                importScreens(event.target.files);
                event.target.value = '';
              }} />
              <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/x-m4v,video/webm,video/*" className="hidden" disabled={gameBusy} onChange={(event) => {
                importVideo(event.target.files?.[0]);
                event.target.value = '';
              }} />
            </div>
          ) : gameWorkflow.hasReview || gameWorkflow.hasApplied ? (
            <button type="button" className="dhq-data-intake-single-action" onClick={focusGameReview}>
              <CheckCircle2 size={14} /> {gameWorkflow.hasApplied ? 'View Applied Game Data' : 'Review Extracted Game Data'}
            </button>
          ) : null}
          {videoStatus && !gameWorkflow.hasReview && !gameWorkflow.hasApplied ? (
            <div className="dhq-data-intake-progress"><span style={{ width: `${videoStatus.percent}%` }} /></div>
          ) : null}
        </Lane>

        <Lane
          number="2"
          icon={Sparkles}
          title="RTG Status"
          badge={rtgCurrent ? 'Updated' : 'Recommended'}
          badgeTone={rtgCurrent ? 'green' : 'blue'}
          subtitle="Updates OVR, role, Coach Trust, skill points, GPA, and Weekly Agenda meters."
          timing="After returning to the RTG menus. Skip this lane when nothing changed."
          complete={rtgCurrent}
        >
          <p className="dhq-data-intake-description">Upload Coach / Overview, Academics, Leadership, Health, Fitness, and Brand together when those values change.</p>
          <button type="button" className="dhq-data-intake-single-action" onClick={() => setRtgOpen((value) => !value)}>
            <Sparkles size={14} /> {rtgOpen ? 'Hide RTG Upload' : rtgCurrent ? 'Update RTG Again' : 'Open RTG Upload'} {rtgOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {rtgOpen ? <div id="dhq-weekly-rtg-data-host" className="dhq-data-intake-detail-host" /> : null}
        </Lane>

        <Lane
          number="3"
          icon={Newspaper}
          title="Coverage Data"
          badge={coverageSaved ? 'Added' : 'Optional'}
          badgeTone={coverageSaved ? 'green' : 'muted'}
          subtitle="Adds teammate, opponent, and scoring context for Newsroom + Podcast only."
          timing="Last, after Game Data and RTG Status, before generating weekly media."
          complete={Boolean(coverageSaved)}
        >
          <p className="dhq-data-intake-description">Use teammate/opponent Player Stats and Scoring Summary screens when you want richer coverage. These facts never overwrite your RTG stats or career totals.</p>
          <button type="button" className="dhq-data-intake-single-action" onClick={() => setCoverageOpen((value) => !value)}>
            <Newspaper size={14} /> {coverageOpen ? 'Hide Coverage Upload' : coverageSaved ? 'Update Coverage Data' : 'Add Optional Coverage'} {coverageOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {coverageOpen ? <div id="dhq-weekly-coverage-data-host" className="dhq-data-intake-detail-host" /> : null}
        </Lane>
      </div>

      {message ? <p className="dhq-weekly-data-intake__message">{message}</p> : null}

      <div className="dhq-weekly-data-intake__advanced">
        <div>
          <span className="dhq-weekly-data-intake__eyebrow"><ShieldCheck size={12} /> Corrections & Extras</span>
          <p>Use these only when scanner data needs a manual correction or you want to log a milestone.</p>
        </div>
        <div>
          <button type="button" className={advanced.manual ? 'is-active' : ''} onClick={() => clickLegacyTool(/manual entry|hide manual fields/i)}><PenLine size={13} /> {advanced.manual ? 'Hide Manual Fields' : 'Manual Entry'}</button>
          <button type="button" className={advanced.milestone ? 'is-active' : ''} onClick={() => clickLegacyTool(/milestone|hide milestone/i)}><ShieldCheck size={13} /> {advanced.milestone ? 'Hide Milestone' : 'Milestone'}</button>
        </div>
      </div>

      <div className="dhq-weekly-data-intake__safety"><ShieldCheck size={12} /> Separate lanes keep game facts, RTG status, and editorial-only coverage from contaminating one another.</div>
    </section>
  );
};

const WeeklyDataIntakePortal = () => {
  const { user, career } = useOwnerCareer();
  const [target, setTarget] = useState(null);
  const [agenda, setAgenda] = useState(null);
  const stage = useMemo(() => career ? deriveCareerStage(career) : null, [career]);

  useEffect(() => {
    const appRoot = document.getElementById('root');
    if (!appRoot) return undefined;
    let currentAgenda = null;

    const interceptContinue = (event) => {
      const button = event.target?.closest?.('[data-guided-weekly-action] button');
      if (!button || !/continue after game/i.test((button.textContent || '').trim())) return;
      const intake = currentAgenda?.querySelector('[data-weekly-data-intake]');
      if (!intake) return;
      event.preventDefault();
      event.stopPropagation();
      intake.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    };

    const ensure = () => {
      const nextAgenda = appRoot.querySelector('.dhq-weekly-agenda-workspace');
      const shell = nextAgenda?.querySelector('.dhq-agenda-v3-shell');
      const controlGrid = shell?.querySelector('.dhq-agenda-v3-control-grid');
      if (!nextAgenda || !shell || !controlGrid) {
        if (currentAgenda) currentAgenda.removeEventListener('click', interceptContinue, true);
        currentAgenda = null;
        setAgenda(null);
        setTarget(null);
        return;
      }

      if (currentAgenda !== nextAgenda) {
        currentAgenda?.removeEventListener('click', interceptContinue, true);
        currentAgenda = nextAgenda;
        currentAgenda.addEventListener('click', interceptContinue, true);
      }

      nextAgenda.classList.add('dhq-weekly-data-intake-active');
      let host = shell.querySelector('#dhq-weekly-data-intake-host');
      if (!host) {
        host = document.createElement('div');
        host.id = 'dhq-weekly-data-intake-host';
      }
      if (host.parentElement !== shell || controlGrid.nextElementSibling !== host) controlGrid.insertAdjacentElement('afterend', host);
      setAgenda((current) => current === nextAgenda ? current : nextAgenda);
      setTarget((current) => current === host ? current : host);
    };

    ensure();
    const observer = new MutationObserver(ensure);
    observer.observe(appRoot, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      currentAgenda?.removeEventListener('click', interceptContinue, true);
      currentAgenda?.classList.remove('dhq-weekly-data-intake-active');
      appRoot.querySelector('#dhq-weekly-data-intake-host')?.remove();
    };
  }, []);

  if (!user || !career || stage !== CAREER_STAGES.COLLEGE || !target || !agenda) return null;
  return createPortal(<WeeklyDataIntake career={career} agenda={agenda} />, target);
};

export default WeeklyDataIntakePortal;
