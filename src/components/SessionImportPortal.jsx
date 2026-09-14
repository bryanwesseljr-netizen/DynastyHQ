import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  FileImage,
  Images,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
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

const findDataEntryWorkspace = () => (
  document.querySelector('main.dhq-page-main[data-active-tab="dataEntry"] .dhq-weekly-agenda-workspace')
  || [...document.querySelectorAll('.dhq-weekly-agenda-workspace')].find(visible)
  || null
);

const findDataEntryButton = () => {
  const buttons = [...document.querySelectorAll('.dhq-primary-nav button')];
  return buttons.find((button) => /weekly agenda/i.test(clean(button.getAttribute('title'))))
    || buttons.find((button) => /^game hub$/i.test(clean(button.textContent)))
    || null;
};

const requestDataEntryWorkspace = () => {
  if (findDataEntryWorkspace()) return true;
  const button = findDataEntryButton();
  if (!button) return false;
  window.__dhqAllowLegacyGameHubOnce = true;
  button.click();
  return true;
};

const waitForDataEntryWorkspace = (timeoutMs = 12000) => new Promise((resolve, reject) => {
  const startedAt = Date.now();
  let lastNavigationAttempt = 0;

  const check = () => {
    const workspace = findDataEntryWorkspace();
    if (workspace) {
      resolve(workspace);
      return;
    }

    const now = Date.now();
    if (now - lastNavigationAttempt >= 300) {
      lastNavigationAttempt = now;
      requestDataEntryWorkspace();
    }

    if (now - startedAt >= timeoutMs) {
      const activeTab = document.querySelector('main.dhq-page-main')?.dataset?.activeTab || 'unknown';
      reject(new Error(`DynastyHQ could not mount Weekly Agenda for Session Import (active tab: ${activeTab}).`));
      return;
    }
    window.setTimeout(check, 90);
  };
  check();
});

const waitForSessionRouter = (timeoutMs = 5000) => new Promise((resolve, reject) => {
  const startedAt = Date.now();
  const check = () => {
    if (window.__dhqSessionRouterReady) {
      resolve(true);
      return;
    }
    if (Date.now() - startedAt >= timeoutMs) {
      reject(new Error('DynastyHQ could not start the Session Import classifier. Reload the preview and try again.'));
      return;
    }
    window.setTimeout(check, 60);
  };
  check();
});

const handoffFiles = async (files) => {
  const opened = requestDataEntryWorkspace();
  if (!opened) throw new Error('DynastyHQ could not find the internal Weekly Agenda route.');
  await waitForDataEntryWorkspace();
  await waitForSessionRouter();

  // Session Import owns the mixed batch. Do not use an existing Weekly Agenda file
  // input as transport: in high-school mode that input can be the Postgame Tape Score
  // uploader, which incorrectly stamps every screenshot with that routing context.
  window.dispatchEvent(new CustomEvent('dynastyhq:session-import-files', {
    detail: { files: [...files] },
  }));
};

const formatBytes = (bytes = 0) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const SessionImportPortal = () => {
  const { career } = useOwnerCareer();
  const fileInputRef = useRef(null);
  const phaseRef = useRef('upload');
  const previousOverflowRef = useRef('');
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState('upload');
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [routeSummary, setRouteSummary] = useState(null);
  const [routeProgress, setRouteProgress] = useState({ completed: 0, total: 0 });

  const season = career?.currentSeason || 1;
  const week = career?.currentWeek ?? 1;
  const opponent = clean(career?.currentWeekSetup?.opponent) || 'Current week';
  const publicationId = `season-${Number(season) || 1}-week-${Number(week) || 1}`;
  const totalBytes = useMemo(() => files.reduce((total, file) => total + Number(file.size || 0), 0), [files]);

  useEffect(() => {
    phaseRef.current = phase;
    document.body.classList.toggle('dhq-session-import-review', open && phase === 'review');
    return () => document.body.classList.remove('dhq-session-import-review');
  }, [open, phase]);

  const reset = () => {
    setFiles([]);
    setDragging(false);
    setError('');
    setRouteSummary(null);
    setRouteProgress({ completed: 0, total: 0 });
    setPhase('upload');
  };

  const openWorkspace = () => {
    reset();
    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('dhq-session-import-mode');
    setOpen(true);
  };

  const closeWorkspace = ({ home = false, focusApplied = false } = {}) => {
    setOpen(false);
    document.body.classList.remove('dhq-session-import-mode', 'dhq-session-import-review');
    document.body.style.overflow = previousOverflowRef.current;
    if (home) {
      window.setTimeout(() => findButton(/^home$/i)?.click(), 30);
    } else if (focusApplied) {
      window.setTimeout(() => findButton(/^game hub$/i)?.click(), 50);
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
  }, []);

  useEffect(() => {
    const openFromGameHub = () => openWorkspace();
    window.addEventListener('dynastyhq:open-session-import', openFromGameHub);
    return () => window.removeEventListener('dynastyhq:open-session-import', openFromGameHub);
  }, []);

  useEffect(() => {
    const onRoutingStart = (event) => {
      if (!open) return;
      setRouteSummary(null);
      setRouteProgress({ completed: 0, total: Number(event?.detail?.total) || files.length });
    };
    const onRoutingProgress = (event) => {
      if (!open) return;
      setRouteProgress({
        completed: Number(event?.detail?.completed) || 0,
        total: Number(event?.detail?.total) || files.length,
      });
    };
    const onRoutingClassified = (event) => {
      if (!open) return;
      setRouteSummary(event?.detail || null);
    };
    const onRoutingComplete = (event) => {
      if (!open) return;
      setRouteSummary(event?.detail || null);
      const review = document.querySelector('.dhq-postgame-review');
      if (review) setPhase('review');
    };
    const onRoutingError = (event) => {
      if (!open) return;
      setError(event?.detail?.message || 'DynastyHQ could not route this screenshot batch safely. Nothing was applied.');
      setPhase('upload');
    };
    window.addEventListener('dynastyhq:session-routing-start', onRoutingStart);
    window.addEventListener('dynastyhq:session-route-progress', onRoutingProgress);
    window.addEventListener('dynastyhq:session-routing-classified', onRoutingClassified);
    window.addEventListener('dynastyhq:session-routing-complete', onRoutingComplete);
    window.addEventListener('dynastyhq:session-routing-error', onRoutingError);
    return () => {
      window.removeEventListener('dynastyhq:session-routing-start', onRoutingStart);
      window.removeEventListener('dynastyhq:session-route-progress', onRoutingProgress);
      window.removeEventListener('dynastyhq:session-routing-classified', onRoutingClassified);
      window.removeEventListener('dynastyhq:session-routing-complete', onRoutingComplete);
      window.removeEventListener('dynastyhq:session-routing-error', onRoutingError);
    };
  }, [files.length, open]);

  useEffect(() => {
    if (!open || !['analyzing', 'review'].includes(phase)) return undefined;
    const refresh = () => {
      const review = document.querySelector('.dhq-postgame-review');
      const applied = document.querySelector('.dhq-agenda-v3-applied-ready');
      if (review && !window.__dhqSessionRoutingBusy && phaseRef.current !== 'review') {
        setPhase('review');
        return;
      }
      if (!review && applied && phaseRef.current === 'review') {
        try { window.sessionStorage?.setItem('dhq-session-applied-week', publicationId); } catch { /* session hint only */ }
        setPhase('applied');
      }
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true, attributes: true });
    return () => observer.disconnect();
  }, [open, phase, publicationId]);

  useEffect(() => () => {
    document.body.classList.remove('dhq-session-import-mode', 'dhq-session-import-review');
    document.body.style.overflow = previousOverflowRef.current;
  }, []);

  const addFiles = (fileList) => {
    const incoming = [...(fileList || [])].filter((file) => file.type?.startsWith('image/'));
    if (!incoming.length) return;
    setError('');
    setFiles((current) => {
      const keyed = new Map(current.map((file) => [`${file.name}:${file.size}:${file.lastModified}`, file]));
      incoming.forEach((file) => keyed.set(`${file.name}:${file.size}:${file.lastModified}`, file));
      const next = [...keyed.values()];
      if (next.length > MAX_SCREENSHOTS) setError(`Session Import currently accepts up to ${MAX_SCREENSHOTS} screenshots at once.`);
      return next.slice(0, MAX_SCREENSHOTS);
    });
  };

  const removeFile = (index) => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));

  const processSession = async () => {
    if (!files.length) return;
    setError('');
    setRouteSummary(null);
    setRouteProgress({ completed: 0, total: files.length });
    setPhase('analyzing');
    try {
      await handoffFiles(files);
    } catch (handoffError) {
      setPhase('upload');
      setError(handoffError?.message || 'The session could not be handed to the Session Import classifier.');
    }
  };

  if (!open || typeof document === 'undefined') return null;

  const step = phase === 'upload' ? 1 : phase === 'analyzing' ? 2 : phase === 'review' ? 3 : 4;
  const routeParts = routeSummary ? [
    `${routeSummary.total || files.length} uploaded`,
    routeSummary.game ? `${routeSummary.game} Game` : '',
    routeSummary.rtg ? `${routeSummary.rtg} RTG` : '',
    routeSummary.coverage ? `${routeSummary.coverage} Coverage` : '',
    routeSummary.highSchool ? `${routeSummary.highSchool} High School` : '',
    routeSummary.unknown ? `${routeSummary.unknown} Unclassified` : '',
  ].filter(Boolean) : [];

  return createPortal(
    <div className={`dhq-session-import is-${phase}`} role="dialog" aria-modal="true" aria-labelledby="dhq-session-import-title">
      <div className="dhq-session-import__stadium" aria-hidden="true" />
      <header className="dhq-session-import__topbar">
        <button type="button" className="dhq-session-import__brand" onClick={() => closeWorkspace({ home: true })}><span>DYNASTY</span><b>HQ</b></button>
        <div className="dhq-session-import__context"><span>SESSION IMPORT</span><strong>SEASON {season} · WEEK {week}</strong></div>
        {phase === 'upload' ? <button type="button" className="dhq-session-import__close" onClick={() => closeWorkspace()} aria-label="Close Session Import"><X size={19} /></button> : null}
      </header>

      <div className="dhq-session-import__stepbar" aria-label="Session Import progress">
        {[
          ['1', 'Upload'],
          ['2', 'Analyze'],
          ['3', 'Verify'],
          ['4', 'Confirm'],
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
        {phase === 'upload' ? (
          <section className="dhq-session-import__card dhq-session-import__upload-card">
            <div className="dhq-session-import__headline">
              <span><CloudUpload size={17} /> CURRENT SESSION</span>
              <h1 id="dhq-session-import-title">Drop the screenshots. DynastyHQ handles the week.</h1>
              <p>Upload the useful CFB 27 screens from this game or week together. DynastyHQ classifies each screen first, routes it to the correct scanner, flags uncertain reads, and gives you a confirmation step before anything is applied.</p>
            </div>

            <div className="dhq-session-import__meta-row">
              <div><span>WEEK</span><strong>{week}</strong></div>
              <div><span>OPPONENT</span><strong>{opponent}</strong></div>
              <div><span>SCREENSHOTS</span><strong>{files.length}/{MAX_SCREENSHOTS}</strong></div>
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
              <strong>{files.length ? 'Add more screenshots' : 'Choose screenshots'}</strong>
              <small>Tap to browse or drag images here · up to {MAX_SCREENSHOTS} per session</small>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} />

            {files.length ? (
              <div className="dhq-session-import__queue">
                <div className="dhq-session-import__queue-head"><span><FileImage size={14} /> READY TO PROCESS</span><small>{files.length} file{files.length === 1 ? '' : 's'} · {formatBytes(totalBytes)}</small></div>
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
              <button type="button" className="is-primary" disabled={!files.length} onClick={processSession}>PROCESS SESSION <ChevronRight size={16} /></button>
            </div>
            <div className="dhq-session-import__safety"><ShieldCheck size={14} /><span><strong>Nothing is published automatically.</strong> Screens are classified before lane analysis, and extracted facts still pass through DynastyHQ’s verification desk before they can update the week.</span></div>
          </section>
        ) : null}

        {phase === 'analyzing' ? (
          <section className="dhq-session-import__card dhq-session-import__processing-card">
            <div className="dhq-session-import__processing-icon"><Loader2 size={34} /></div>
            <span>PROCESS WEEK</span>
            <h1 id="dhq-session-import-title">Sorting and reading {files.length} screenshot{files.length === 1 ? '' : 's'}…</h1>
            <p>{routeSummary ? `Classification complete: ${routeParts.join(' · ')}. DynastyHQ is finishing each specialized scanner before opening Verify.` : 'DynastyHQ first identifies the screen type, then sends it only to the scanner responsible for that data. Unknown screens are never sprayed across every lane.'}</p>
            <div className="dhq-session-import__scanline"><i /></div>
            <div className="dhq-session-import__processing-stats"><div><strong>{routeProgress.completed || files.length}</strong><span>OF {routeProgress.total || files.length} CLASSIFIED</span></div><div><Sparkles size={18} /><span>ROUTE + ANALYZE</span></div><div><ShieldCheck size={18} /><span>VERIFY AFTER ALL LANES</span></div></div>
          </section>
        ) : null}

        {phase === 'review' ? (
          <section className="dhq-session-import__review-heading" aria-live="polite">
            <span><ShieldCheck size={14} /> VERIFICATION DESK</span>
            <strong>{routeParts.length ? routeParts.join(' · ') : 'Review only what DynastyHQ flags. High-confidence facts can stay untouched.'}</strong>
          </section>
        ) : null}

        {phase === 'applied' ? (
          <section className="dhq-session-import__card dhq-session-import__complete-card">
            <div className="dhq-session-import__complete-icon"><CheckCircle2 size={38} /></div>
            <span>SESSION CONFIRMED</span>
            <h1 id="dhq-session-import-title">Verified data is ready in Game Hub.</h1>
            <p>Your reviewed scanner draft has been applied to the current week. Nothing was invented, and the week is still yours to publish from Game Hub.</p>
            <div className="dhq-session-import__complete-actions">
              <button type="button" className="is-secondary" onClick={() => closeWorkspace({ home: true })}>RETURN HOME</button>
              <button type="button" className="is-primary" onClick={() => closeWorkspace({ focusApplied: true })}>CONTINUE TO GAME HUB <ChevronRight size={16} /></button>
            </div>
          </section>
        ) : null}
      </main>
    </div>,
    document.body,
  );
};

export default SessionImportPortal;
