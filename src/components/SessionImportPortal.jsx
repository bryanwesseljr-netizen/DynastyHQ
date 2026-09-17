import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  FileImage,
  Images,
  Loader2,
  Newspaper,
  ScanLine,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { coverageReferenceFor } from '../domain/coverageReferences.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './session-import.css';

const MAX_SCREENSHOTS = 30;

const clean = (value) => String(value || '').trim();

const visible = (element) => Boolean(element && element.offsetParent !== null);

const findButton = (matcher, root = document) => {
  const buttons = [...root.querySelectorAll('button')];
  return buttons.find((button) => visible(button) && matcher.test(clean(button.textContent)))
    || buttons.find((button) => matcher.test(clean(button.textContent)))
    || null;
};

const findScannerInput = () => {
  const labels = [...document.querySelectorAll('.dhq-weekly-agenda-workspace label')];
  const label = labels.find((entry) => /choose weekly screenshots/i.test(entry.textContent || ''));
  return label?.querySelector('input[type="file"]') || null;
};

const waitForScannerInput = (timeoutMs = 8000) => new Promise((resolve, reject) => {
  const startedAt = Date.now();
  const check = () => {
    const input = findScannerInput();
    if (input) {
      resolve(input);
      return;
    }
    if (Date.now() - startedAt >= timeoutMs) {
      reject(new Error('DynastyHQ could not open the verified Game Data scanner. Return to Game Hub and try again.'));
      return;
    }
    window.setTimeout(check, 90);
  };
  check();
});

const handoffGameFiles = async (files) => {
  const gameHubButton = findButton(/^game hub$/i);
  if (!gameHubButton) throw new Error('Game Hub is not available from this screen.');
  window.__dhqAllowLegacyGameHubOnce = true;
  gameHubButton.click();
  const input = await waitForScannerInput();
  if (typeof DataTransfer === 'undefined') {
    throw new Error('This browser cannot hand the screenshots to the verified scanner automatically.');
  }
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

const formatBytes = (bytes = 0) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const laneStepForPhase = (phase) => {
  if (phase === 'rtg') return 2;
  if (phase === 'coverage') return 3;
  if (phase === 'ready') return 4;
  return 1;
};

const SessionImportPortal = () => {
  const { career } = useOwnerCareer();
  const fileInputRef = useRef(null);
  const phaseRef = useRef('game');
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState('game');
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [rtgSkipped, setRtgSkipped] = useState(false);
  const [coverageSkipped, setCoverageSkipped] = useState(false);
  const [error, setError] = useState('');

  const season = career?.currentSeason || 1;
  const week = career?.currentWeek ?? 1;
  const opponent = clean(career?.currentWeekSetup?.opponent) || 'Current week';
  const publicationId = `season-${Number(season) || 1}-week-${Number(week) || 1}`;
  const totalBytes = useMemo(() => files.reduce((total, file) => total + Number(file.size || 0), 0), [files]);
  const lastRtgScan = career?.rtg?.lastStatusScan || null;
  const rtgCurrent = Boolean(lastRtgScan
    && (lastRtgScan.publicationId === publicationId
      || (Number(lastRtgScan.season) === Number(season) && Number(lastRtgScan.week) === Number(week))));
  const coverageSaved = useMemo(() => coverageReferenceFor(career, publicationId), [career, publicationId]);

  useEffect(() => {
    phaseRef.current = phase;
    document.body.classList.toggle('dhq-session-import-review', open && phase === 'review');
    return () => document.body.classList.remove('dhq-session-import-review');
  }, [open, phase]);

  const reset = () => {
    setFiles([]);
    setDragging(false);
    setRtgSkipped(false);
    setCoverageSkipped(false);
    setError('');
    let appliedHint = false;
    try { appliedHint = window.sessionStorage?.getItem('dhq-session-applied-week') === publicationId; } catch { /* session hint only */ }
    const pendingReview = document.querySelector(`.dhq-postgame-review[data-publication-id="${publicationId}"]`);
    setPhase(pendingReview ? 'review' : appliedHint ? 'rtg' : 'game');
  };

  const openWorkspace = () => {
    reset();
    document.body.classList.add('dhq-session-import-mode');
    setOpen(true);
  };

  const closeWorkspace = ({ home = false, focusApplied = false } = {}) => {
    setOpen(false);
    document.body.classList.remove('dhq-session-import-mode', 'dhq-session-import-review');
    if (home) {
      window.setTimeout(() => findButton(/^home$/i)?.click(), 30);
    } else if (focusApplied) {
      window.setTimeout(() => {
        window.__dhqAllowLegacyGameHubOnce = true;
        findButton(/^game hub$/i)?.click();
      }, 50);
    }
  };

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;
    const interceptDashboardImport = (event) => {
      const button = event.target?.closest?.('button');
      if (!button || !button.closest('#dynastyhq-command-center')) return;
      if (!/^import session\b/i.test(clean(button.textContent))) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      openWorkspace();
    };
    root.addEventListener('click', interceptDashboardImport, true);
    return () => root.removeEventListener('click', interceptDashboardImport, true);
  }, [publicationId]);

  useEffect(() => {
    const openFromGameHub = () => openWorkspace();
    window.addEventListener('dynastyhq:open-session-import', openFromGameHub);
    return () => window.removeEventListener('dynastyhq:open-session-import', openFromGameHub);
  }, [publicationId]);

  useEffect(() => {
    const applied = (event) => {
      if (!open || event.detail?.publicationId !== publicationId) return;
      try { window.sessionStorage?.setItem('dhq-session-applied-week', publicationId); } catch { /* session hint only */ }
      setPhase('rtg');
    };
    const discarded = () => { if (open) setPhase('game'); };
    const review = () => {
      if (open && document.querySelector('.dhq-postgame-review')) setPhase('review');
    };
    window.addEventListener('dynastyhq:game-data-applied', applied);
    window.addEventListener('dynastyhq:game-data-discarded', discarded);
    window.addEventListener('dynastyhq:review-game-data', review);
    return () => {
      window.removeEventListener('dynastyhq:game-data-applied', applied);
      window.removeEventListener('dynastyhq:game-data-discarded', discarded);
      window.removeEventListener('dynastyhq:review-game-data', review);
    };
  }, [open, publicationId]);

  useEffect(() => {
    if (!open || !['analyzing', 'review'].includes(phase)) return undefined;
    const refresh = () => {
      const review = document.querySelector('.dhq-postgame-review');
      const applied = document.querySelector('.dhq-agenda-v3-applied-ready');
      if (review && phaseRef.current !== 'review') {
        setPhase('review');
        return;
      }
      if (!review && applied && phaseRef.current === 'review') {
        try { window.sessionStorage?.setItem('dhq-session-applied-week', publicationId); } catch { /* session hint only */ }
        setPhase('rtg');
      }
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true, attributes: true });
    return () => observer.disconnect();
  }, [open, phase, publicationId]);

  useEffect(() => () => {
    document.body.classList.remove('dhq-session-import-mode', 'dhq-session-import-review');
  }, []);

  const addFiles = (fileList) => {
    const incoming = [...(fileList || [])].filter((file) => file.type?.startsWith('image/'));
    if (!incoming.length) return;
    setError('');
    setFiles((current) => {
      const keyed = new Map(current.map((file) => [`${file.name}:${file.size}:${file.lastModified}`, file]));
      incoming.forEach((file) => keyed.set(`${file.name}:${file.size}:${file.lastModified}`, file));
      const next = [...keyed.values()];
      if (next.length > MAX_SCREENSHOTS) setError(`Game Data currently accepts up to ${MAX_SCREENSHOTS} screenshots at once.`);
      return next.slice(0, MAX_SCREENSHOTS);
    });
  };

  const removeFile = (index) => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));

  const processGameData = async () => {
    if (!files.length) return;
    setError('');
    setPhase('analyzing');
    try {
      await handoffGameFiles(files);
    } catch (handoffError) {
      setPhase('game');
      setError(handoffError?.message || 'Game Data could not be handed to the verified scanner.');
    }
  };

  if (!open || typeof document === 'undefined') return null;

  const step = laneStepForPhase(phase);
  const canClose = !['analyzing', 'review'].includes(phase);

  return (
    <div className={`dhq-session-import is-${phase}`} role="dialog" aria-modal="true" aria-labelledby="dhq-session-import-title">
      <div className="dhq-session-import__stadium" aria-hidden="true" />
      <header className="dhq-session-import__topbar">
        <button type="button" className="dhq-session-import__brand" onClick={() => closeWorkspace({ home: true })}><span>DYNASTY</span><b>HQ</b></button>
        <div className="dhq-session-import__context"><span>SESSION IMPORT</span><strong>SEASON {season} · WEEK {week}</strong></div>
        {canClose ? <button type="button" className="dhq-session-import__close" onClick={() => closeWorkspace()} aria-label="Close Session Import"><X size={19} /></button> : null}
      </header>

      <div className="dhq-session-import__stepbar" aria-label="Session Import progress">
        {[
          ['1', 'Game Data'],
          ['2', 'RTG Status'],
          ['3', 'Coverage'],
          ['4', 'Process Week'],
        ].map(([number, label], index) => {
          const itemStep = index + 1;
          return (
            <div key={number} className={`${itemStep === step ? 'is-current' : ''} ${itemStep < step ? 'is-complete' : ''}`}>
              <i>{itemStep < step ? <CheckCircle2 size={13} /> : number}</i><span>{label}</span>{index < 3 ? <b /> : null}
            </div>
          );
        })}
      </div>

      <main className="dhq-session-import__main">
        {['analyzing', 'review'].includes(phase) ? <div id="dhq-process-week2-inbox-host" /> : null}
        {phase === 'game' ? (
          <section className="dhq-session-import__card dhq-session-import__upload-card">
            <div className="dhq-session-import__headline">
              <span><ScanLine size={17} /> 1 · GAME DATA</span>
              <h1 id="dhq-session-import-title">Start with what happened on the field.</h1>
              <p>Upload only the screens that establish the game: final score, your player line, useful game/team stats, and any EA SPORTS Network article pages you captured. RTG menu screens and optional media context get their own lanes next.</p>
            </div>

            <div className="dhq-session-import__meta-row">
              <div><span>WEEK</span><strong>{week}</strong></div>
              <div><span>OPPONENT</span><strong>{opponent}</strong></div>
              <div><span>GAME SCREENS</span><strong>{files.length}/{MAX_SCREENSHOTS}</strong></div>
            </div>

            <div className="dhq-session-import__lane-guide">
              <div className="is-active"><ScanLine size={15} /><span><strong>GAME DATA</strong><small>Score · your stats · game facts · EA SPORTS Network</small></span></div>
              <div><Sparkles size={15} /><span><strong>RTG STATUS</strong><small>OVR · role · Coach Trust · GPA · health · brand</small></span></div>
              <div><Newspaper size={15} /><span><strong>COVERAGE DATA</strong><small>Optional teammate · opponent · scoring context</small></span></div>
            </div>

            <button
              type="button"
              className={`dhq-session-import__dropzone ${dragging ? 'is-dragging' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
              onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
            >
              <span className="dhq-session-import__drop-icon"><Images size={28} /></span>
              <strong>{files.length ? 'Add more Game Data screens' : 'Choose Game Data screenshots'}</strong>
              <small>Keep Coach/Overview, Academics, Leadership, Health, Fitness, Brand, teammate stats and scoring-summary context out of this lane.</small>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} />

            {files.length ? (
              <div className="dhq-session-import__queue">
                <div className="dhq-session-import__queue-head"><span><FileImage size={14} /> GAME DATA READY</span><small>{files.length} file{files.length === 1 ? '' : 's'} · {formatBytes(totalBytes)}</small></div>
                <div className="dhq-session-import__file-grid">
                  {files.map((file, index) => (
                    <div key={`${file.name}:${file.size}:${file.lastModified}`}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <p><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></p>
                      <button type="button" onClick={(event) => { event.stopPropagation(); removeFile(index); }} aria-label={`Remove ${file.name}`}><X size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? <div className="dhq-session-import__error">{error}</div> : null}

            <div className="dhq-session-import__actions">
              <button type="button" className="is-secondary" onClick={() => closeWorkspace()}><ArrowLeft size={15} /> Back</button>
              <button type="button" className="is-primary" disabled={!files.length} onClick={processGameData}>ANALYZE GAME DATA <ChevronRight size={16} /></button>
            </div>
            <div className="dhq-session-import__safety"><ShieldCheck size={14} /><span><strong>Three lanes, three jobs.</strong> DynastyHQ will not use the RTG Status or Coverage Data lanes to overwrite your verified game line.</span></div>
          </section>
        ) : null}

        {phase === 'analyzing' ? (
          <section className="dhq-session-import__card dhq-session-import__processing-card">
            <div className="dhq-session-import__processing-icon"><Loader2 size={34} /></div>
            <span>GAME DATA · ANALYZING</span>
            <h1 id="dhq-session-import-title">Reading {files.length} game screenshot{files.length === 1 ? '' : 's'}…</h1>
            <p>The verified scanner is identifying the result, your stat line, supported game context and official in-game coverage. Uncertain reads will be flagged instead of guessed.</p>
            <div className="dhq-session-import__scanline"><i /></div>
            <div className="dhq-session-import__processing-stats"><div><strong>{files.length}</strong><span>GAME SCREENS</span></div><div><Sparkles size={18} /><span>AI ANALYSIS</span></div><div><ShieldCheck size={18} /><span>VERIFY NEXT</span></div></div>
          </section>
        ) : null}

        {phase === 'review' ? (
          <section aria-label="Game Data review">
            <div className="dhq-session-import__review-heading" aria-live="polite">
              <h1 id="dhq-session-import-title">Review Game Data</h1>
              <p>Confirm or correct the flagged values below. Then apply Game Data to continue to RTG Status and optional Coverage.</p>
            </div>
            <div id="dhq-session-game-review-host" />
          </section>
        ) : null}

        {phase === 'rtg' ? (
          <section className="dhq-session-import__card dhq-session-import__lane-card">
            <div className="dhq-session-import__lane-header">
              <span><Sparkles size={17} /> 2 · RTG STATUS</span>
              <strong className={rtgCurrent ? 'is-complete' : ''}>{rtgCurrent ? 'UPDATED' : 'RECOMMENDED'}</strong>
              <h1 id="dhq-session-import-title">Now update the player state.</h1>
              <p>This lane is only for the RTG menus: Coach / Overview, Academics, Leadership, Health, Fitness and Brand. It updates OVR, role, Coach Trust, Skill Points, GPA and other career-state values — never your Week {week} game stats.</p>
            </div>
            <div id="dhq-weekly-rtg-data-host" data-session-import-host="rtg" className="dhq-session-import__embedded-scanner" />
            <div className="dhq-session-import__actions">
              {!rtgCurrent ? <button type="button" className="is-secondary" onClick={() => { setRtgSkipped(true); setPhase('coverage'); }}>SKIP — NOTHING CHANGED</button> : null}
              <button type="button" className="is-primary" disabled={!rtgCurrent} onClick={() => setPhase('coverage')}>CONTINUE TO COVERAGE <ChevronRight size={16} /></button>
            </div>
          </section>
        ) : null}

        {phase === 'coverage' ? (
          <section className="dhq-session-import__card dhq-session-import__lane-card">
            <div className="dhq-session-import__lane-header">
              <span><Newspaper size={17} /> 3 · COVERAGE DATA</span>
              <strong className={coverageSaved ? 'is-complete' : ''}>{coverageSaved ? 'ADDED' : 'OPTIONAL'}</strong>
              <h1 id="dhq-session-import-title">Add context only if the story needs it.</h1>
              <p>Teammate stats, opponent stats and scoring-summary screens belong here. They can enrich The Newsroom and The Huddle, but this lane cannot overwrite your RTG stats or career totals.</p>
            </div>
            <div id="dhq-weekly-coverage-data-host" data-session-import-host="coverage" className="dhq-session-import__embedded-scanner" />
            <div className="dhq-session-import__actions">
              <button type="button" className="is-secondary" onClick={() => setPhase('rtg')}><ArrowLeft size={15} /> RTG Status</button>
              {!coverageSaved ? <button type="button" className="is-secondary" onClick={() => { setCoverageSkipped(true); setPhase('ready'); }}>SKIP OPTIONAL COVERAGE</button> : null}
              <button type="button" className="is-primary" disabled={!coverageSaved} onClick={() => setPhase('ready')}>CONTINUE TO PROCESS WEEK <ChevronRight size={16} /></button>
            </div>
          </section>
        ) : null}

        {phase === 'ready' ? (
          <section className="dhq-session-import__card dhq-session-import__complete-card dhq-session-import__ready-card">
            <div className="dhq-session-import__complete-icon"><CheckCircle2 size={38} /></div>
            <span>4 · PROCESS WEEK</span>
            <h1 id="dhq-session-import-title">The week is cleanly separated and ready.</h1>
            <p>Game Data is verified. RTG Status and Coverage Data were either updated in their own lanes or deliberately skipped. Process Week can now build the Week {week} story without mixing data sources.</p>
            <div className="dhq-session-import__ready-summary">
              <div className="is-done"><ScanLine size={16} /><span><small>GAME DATA</small><strong>VERIFIED</strong></span></div>
              <div className={rtgCurrent ? 'is-done' : 'is-skipped'}><Sparkles size={16} /><span><small>RTG STATUS</small><strong>{rtgCurrent ? 'UPDATED' : rtgSkipped ? 'NO CHANGES' : 'SKIPPED'}</strong></span></div>
              <div className={coverageSaved ? 'is-done' : 'is-skipped'}><Newspaper size={16} /><span><small>COVERAGE DATA</small><strong>{coverageSaved ? 'ADDED' : coverageSkipped ? 'OPTIONAL · SKIPPED' : 'NOT ADDED'}</strong></span></div>
            </div>
            <div className="dhq-session-import__complete-actions">
              <button type="button" className="is-secondary" onClick={() => setPhase('coverage')}><ArrowLeft size={15} /> Coverage</button>
              <button type="button" className="is-primary" onClick={() => closeWorkspace({ focusApplied: true })}>OPEN PROCESS WEEK <ChevronRight size={16} /></button>
            </div>
            <div className="dhq-session-import__safety"><ShieldCheck size={14} /><span><strong>Nothing publishes from this screen.</strong> Process Week still gives you the final verification and publishing decision.</span></div>
          </section>
        ) : null}
      </main>
    </div>
  );
};

export default SessionImportPortal;
