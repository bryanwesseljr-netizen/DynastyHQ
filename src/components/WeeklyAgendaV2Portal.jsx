import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Images,
  Loader2,
  PenLine,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react';
import { appId, auth, db } from '../firebase';
import { CAREER_STAGES, deriveCareerStage } from '../domain/commandCenter';
import { extractMenuVideoFrames } from '../services/menuVideoFrames';
import '../weekly-agenda-v2.css';

const MAX_SCREENSHOTS = 12;

const stageLabels = {
  [CAREER_STAGES.HIGH_SCHOOL]: 'High School Recruit',
  [CAREER_STAGES.COLLEGE]: 'College Player',
  [CAREER_STAGES.OC]: 'Offensive Coordinator',
  [CAREER_STAGES.HC]: 'Head Coach',
  [CAREER_STAGES.RETIRED]: 'Legacy',
};

const phaseLabels = {
  preseason: 'Preseason',
  regular: 'Regular Season',
  postseason: 'Postseason',
};

const findByText = (root, selector, matcher) => [...(root?.querySelectorAll(selector) || [])]
  .find((element) => matcher.test((element.textContent || '').trim()));

const findUniversalScannerInput = (root = document) => {
  const label = findByText(root, 'label', /choose weekly screenshots/i);
  return label?.querySelector('input[type="file"]') || null;
};

const markTopLevelContaining = (agenda, matcher, className) => {
  const candidate = [...agenda.querySelectorAll('h1,h2,h3,h4,p,span,label')]
    .find((element) => matcher.test((element.textContent || '').trim()));
  if (!candidate) return null;
  let node = candidate;
  while (node?.parentElement && node.parentElement !== agenda) node = node.parentElement;
  if (node?.parentElement === agenda) node.classList.add(className);
  return node;
};

const markAgendaStructure = (agenda) => {
  if (!agenda) return;
  agenda.dataset.weeklyAgendaV2 = 'active';

  const scannerLabel = findByText(agenda, 'label', /choose weekly screenshots/i);
  if (scannerLabel) {
    let node = scannerLabel;
    while (node?.parentElement && node.parentElement !== agenda) node = node.parentElement;
    if (node?.parentElement === agenda) node.classList.add('dhq-agenda-v2-legacy-scanner');
  }

  markTopLevelContaining(agenda, /college game week command center/i, 'dhq-agenda-v2-duplicate-block');
  markTopLevelContaining(agenda, /faster weekly entry/i, 'dhq-agenda-v2-duplicate-block');
  markTopLevelContaining(agenda, /postgame\s*[·•-]\s*postgame scanner/i, 'dhq-agenda-v2-duplicate-block');
  markTopLevelContaining(agenda, /verified draft ready/i, 'dhq-agenda-v3-applied-ready');

  const publishButton = findByText(
    agenda,
    'button',
    /publish verified week|save & process weekly agenda|process completed game week|update game log/i,
  );
  publishButton?.parentElement?.classList.add('dhq-agenda-v2-actions');

  const guidedLabel = findByText(agenda, 'p', /guided high-school scanner/i);
  guidedLabel?.closest('section')?.classList.add('dhq-agenda-v2-guided-import');
};

const readReviewStat = (review, labelText) => {
  if (!review) return 0;
  const label = [...review.querySelectorAll('p')]
    .find((entry) => (entry.textContent || '').trim().toLowerCase() === labelText.toLowerCase());
  if (!label?.parentElement) return 0;
  const values = [...label.parentElement.querySelectorAll('p')].filter((entry) => entry !== label);
  const match = (values[0]?.textContent || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const readAgendaWorkflow = (agenda, previous = {}) => {
  if (!agenda) return { hasReview: false, hasApplied: false, screens: 0, facts: 0, attention: 0, missing: 0 };
  markAgendaStructure(agenda);
  const review = agenda.querySelector('.dhq-postgame-review');
  const hasApplied = Boolean(agenda.querySelector('.dhq-agenda-v3-applied-ready'));
  return {
    hasReview: Boolean(review),
    hasApplied,
    screens: review ? readReviewStat(review, 'Screens') : (hasApplied ? previous.screens || 0 : 0),
    facts: review ? readReviewStat(review, 'Extracted facts') : (hasApplied ? previous.facts || 0 : 0),
    attention: review ? readReviewStat(review, 'Needs review') : 0,
    missing: review ? readReviewStat(review, 'Required missing') : 0,
  };
};

const sameWorkflow = (a, b) => (
  a.hasReview === b.hasReview
  && a.hasApplied === b.hasApplied
  && a.screens === b.screens
  && a.facts === b.facts
  && a.attention === b.attention
  && a.missing === b.missing
);

const handoffFilesToScanner = async (files, agenda) => {
  const selected = [...(files || [])];
  if (!selected.length) return;
  const input = findUniversalScannerInput(agenda);
  if (!input) throw new Error('The Weekly Agenda scanner is not ready yet. Reload the page and try again.');
  if (typeof DataTransfer === 'undefined') {
    throw new Error('This browser cannot hand files to the scanner automatically. Use the screenshot chooser in Weekly Agenda instead.');
  }
  const transfer = new DataTransfer();
  selected.forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

const WorkflowSteps = ({ activeStep }) => {
  const steps = [
    ['setup', '1', 'Setup', 'Set week'],
    ['import', '2', 'Import', 'Import postgame'],
    ['review', '3', 'Review', 'Review facts'],
    ['publish', '4', 'Publish', 'Publish week'],
  ];
  const activeIndex = Math.max(0, steps.findIndex(([id]) => id === activeStep));

  return (
    <div className="dhq-agenda-v3-steps" aria-label="Weekly workflow">
      {steps.map(([id, number, label, activeLabel], index) => {
        const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'waiting';
        return (
          <div key={id} className={`dhq-agenda-v3-step is-${state}`}>
            <span>{state === 'done' ? <CheckCircle2 size={12} /> : number}</span>
            <strong>
              <span className="dhq-agenda-v3-step__compact">{label}</span>
              <span className="dhq-agenda-v3-step__active">{activeLabel}</span>
            </strong>
          </div>
        );
      })}
    </div>
  );
};

const WeeklyAgendaShell = ({
  career,
  stage,
  agenda,
  setupOpen,
  manualOpen,
  moreOpen,
  rtgOpen,
  workflow,
  onToggleSetup,
  onToggleManual,
  onToggleMore,
  onToggleRtg,
}) => {
  const screenshotInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);

  const setup = career?.currentWeekSetup || {};
  const week = Number(setup.week ?? career?.currentWeek ?? 1);
  const season = Number(career?.currentSeason || 1);
  const school = career?.player?.college || career?.player?.school || career?.coach?.currentSchool || 'Current program';
  const role = stage === CAREER_STAGES.COLLEGE
    ? (career?.rtg?.rank || 'Player')
    : (stageLabels[stage] || 'Career');
  const setupReady = setup.week !== undefined && setup.week !== null;
  const setupType = setup.type === 'bye' ? 'Bye Week' : 'Game Week';
  const phase = phaseLabels[setup.phase] || 'Regular Season';
  const isHighSchool = stage === CAREER_STAGES.HIGH_SCHOOL;
  const isCollegePlayer = stage === CAREER_STAGES.COLLEGE;
  const activeStep = !setupReady ? 'setup' : workflow.hasApplied ? 'publish' : workflow.hasReview ? 'review' : 'import';
  const importActive = Boolean(pendingImport || workflow.hasReview || workflow.hasApplied);
  const screenCount = workflow.screens || pendingImport?.screens || 0;
  const factCount = workflow.facts || 0;

  useEffect(() => {
    if (workflow.hasReview || workflow.hasApplied) setPendingImport(null);
  }, [workflow.hasApplied, workflow.hasReview]);

  const importScreens = async (files) => {
    const selected = [...(files || [])].slice(0, MAX_SCREENSHOTS);
    if (!selected.length) return;
    setBusy(true);
    setStatus(null);
    setMessage(null);
    setPendingImport({ screens: selected.length, kind: 'screenshots' });
    try {
      await handoffFilesToScanner(selected, agenda);
    } catch (error) {
      setPendingImport(null);
      setMessage(error?.message || 'Screenshot import failed.');
    } finally {
      setBusy(false);
    }
  };

  const importVideo = async (file) => {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    setStatus({ percent: 0, frames: 0 });
    setPendingImport(null);
    try {
      const frames = await extractMenuVideoFrames(file, {
        onProgress: ({ percent, frames: frameCount }) => setStatus({ percent, frames: frameCount }),
      });
      setStatus({ percent: 100, frames: frames.length });
      setPendingImport({ screens: frames.length, kind: 'video' });
      await handoffFilesToScanner(frames, agenda);
    } catch (error) {
      setPendingImport(null);
      setMessage(error?.message || 'Menu Video Import failed. Your saved career was not changed.');
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const openGuidedImport = () => {
    const guided = agenda.querySelector('.dhq-agenda-v2-guided-import')
      || findByText(agenda, 'p', /guided high-school scanner/i)?.closest('section');
    guided?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const focusImportedWork = () => {
    const target = workflow.hasApplied
      ? agenda.querySelector('.dhq-agenda-v3-applied-ready')
      : agenda.querySelector('.dhq-postgame-review');
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const importSummary = workflow.hasApplied
    ? 'Verified facts applied · ready to publish'
    : workflow.hasReview
      ? workflow.attention
        ? `${workflow.attention} fact${workflow.attention === 1 ? '' : 's'} need review`
        : 'Extraction complete · ready to apply'
      : 'Scanner is analyzing the imported screens';

  return (
    <div className="dhq-agenda-v3-shell" data-weekly-agenda-v3-shell>
      <section className="dhq-agenda-v3-header">
        <div className="dhq-agenda-v3-header__identity">
          <span className="dhq-agenda-v3-header__icon"><CalendarDays size={18} /></span>
          <div className="min-w-0">
            <span className="dhq-agenda-v3-eyebrow">Weekly Agenda · {stageLabels[stage] || 'Career'}</span>
            <h1>Season {season} · Week {week}</h1>
            <p>{school} · {role}</p>
          </div>
        </div>
        <WorkflowSteps activeStep={activeStep} />
      </section>

      <section className="dhq-agenda-v3-control-grid">
        <div className="dhq-agenda-v3-control-card">
          <div className="dhq-agenda-v3-control-card__icon is-amber"><CalendarDays size={16} /></div>
          <div className="min-w-0 flex-1">
            <span className="dhq-agenda-v3-label">Week setup</span>
            <strong>{setupReady ? `${setupType} · ${phase}` : 'Setup needed'}</strong>
            <small>{setupReady ? (setup.label || setup.customLabel || `Week ${week}`) : 'Define the week before playing.'}</small>
          </div>
          <button type="button" onClick={onToggleSetup} className="dhq-agenda-v3-text-button">
            {setupOpen ? 'Hide' : setupReady ? 'Edit' : 'Open'} {setupOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        <div className={`dhq-agenda-v3-import-card ${importActive ? 'is-summary' : ''}`}>
          {importActive ? (
            <>
              <div className="dhq-agenda-v3-import-summary">
                <span className="dhq-agenda-v3-import-summary__icon"><CheckCircle2 size={16} /></span>
                <div className="min-w-0">
                  <span className="dhq-agenda-v3-label"><ScanLine size={12} /> Import summary</span>
                  <strong>{screenCount || '—'} screens detected{factCount ? ` · ${factCount} facts extracted` : ''}</strong>
                  <small>{importSummary}</small>
                </div>
              </div>
              <button type="button" onClick={focusImportedWork} disabled={!workflow.hasReview && !workflow.hasApplied} className="dhq-agenda-v3-summary-button">
                {workflow.hasApplied ? 'Ready to publish' : workflow.hasReview ? 'Review needed' : 'Analyzing…'} <span>→</span>
              </button>
            </>
          ) : (
            <>
              <div className="dhq-agenda-v3-import-copy">
                <span className="dhq-agenda-v3-label"><ScanLine size={12} /> Quick Import</span>
                <strong>{isHighSchool ? 'Guided evaluation import' : 'Bring in the postgame data'}</strong>
                <small>{isHighSchool ? 'Use the Playable Moment slots.' : 'Screenshots remain available; video is optional.'}</small>
              </div>
              {isHighSchool ? (
                <button type="button" onClick={openGuidedImport} className="dhq-agenda-v3-import-button is-wide">
                  <Images size={15} /> Guided Import
                </button>
              ) : (
                <div className="dhq-agenda-v3-import-actions">
                  <button type="button" disabled={busy} onClick={() => screenshotInputRef.current?.click()} className="dhq-agenda-v3-import-button">
                    {busy && !status ? <Loader2 size={15} className="animate-spin" /> : <Images size={15} />}
                    <span><strong>Screenshots</strong><small>1 or several</small></span>
                  </button>
                  <button type="button" disabled={busy} onClick={() => videoInputRef.current?.click()} className="dhq-agenda-v3-import-button">
                    {busy && status ? <Loader2 size={15} className="animate-spin" /> : <Video size={15} />}
                    <span><strong>Menu Video</strong><small>Up to 2 min</small></span>
                  </button>
                  <input ref={screenshotInputRef} type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(event) => {
                    importScreens(event.target.files);
                    event.target.value = '';
                  }} />
                  <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/x-m4v,video/webm,video/*" className="hidden" disabled={busy} onChange={(event) => {
                    importVideo(event.target.files?.[0]);
                    event.target.value = '';
                  }} />
                </div>
              )}
            </>
          )}
        </div>

        <div className="dhq-agenda-v3-tools-card">
          <div>
            <span className="dhq-agenda-v3-label"><Sparkles size={12} /> Only open what you need</span>
            <strong>Manual corrections stay out of the way</strong>
            <small>Use the scanner first. Open the old fields only when something is missing or needs a correction.</small>
          </div>
          <div className="dhq-agenda-v3-tools-actions">
            <button type="button" onClick={onToggleManual} className={manualOpen ? 'is-active' : ''}><PenLine size={13} /> {manualOpen ? 'Hide Manual Fields' : 'Manual Entry'}</button>
            <button type="button" onClick={onToggleMore} className={moreOpen ? 'is-active' : ''}><ShieldCheck size={13} /> {moreOpen ? 'Hide Milestone' : 'Milestone'}</button>
          </div>
        </div>
      </section>

      {isCollegePlayer ? (
        <section className={`dhq-agenda-v3-rtg-row ${rtgOpen ? 'is-open' : ''}`}>
          <div className="dhq-agenda-v3-rtg-row__status">
            <span className="dhq-agenda-v3-rtg-dot"><CheckCircle2 size={13} /></span>
            <div>
              <span className="dhq-agenda-v3-label">RTG Status</span>
              <strong>No changes detected</strong>
              <small>Carry-forward values stay in place unless you scan updated RTG screens.</small>
            </div>
          </div>
          <button type="button" onClick={onToggleRtg} className="dhq-agenda-v3-text-button">
            {rtgOpen ? 'Hide details' : 'View details'} {rtgOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </section>
      ) : null}

      {status && !workflow.hasReview && !workflow.hasApplied ? (
        <div className="dhq-agenda-v3-progress">
          <div><span>Finding useful menu screens…</span><strong>{status.frames} frame{status.frames === 1 ? '' : 's'}</strong></div>
          <div><span style={{ width: `${status.percent}%` }} /></div>
        </div>
      ) : null}

      {message ? <p className="dhq-agenda-v3-message">{message}</p> : null}

      <div className="dhq-agenda-v3-safety"><ShieldCheck size={12} /> Nothing is written to the career until the extracted facts are reviewed and applied.</div>
    </div>
  );
};

const GuidedActionBar = ({ agenda, setupReady, setupOpen, workflow, onToggleSetup }) => {
  const originalActions = agenda.querySelector('.dhq-agenda-v2-actions');

  const clickOriginal = (matcher) => {
    const button = findByText(originalActions, 'button', matcher);
    if (button && !button.disabled) button.click();
  };

  const focus = (selector) => agenda.querySelector(selector)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });

  let label = 'Continue After Game';
  let detail = 'Played the game? Import the postgame screens or a short menu video.';
  let action = () => focus('.dhq-agenda-v3-import-card');

  if (!setupReady) {
    label = 'Complete Week Setup';
    detail = 'Set the week identity before importing or publishing anything.';
    action = () => {
      if (!setupOpen) onToggleSetup();
      window.setTimeout(() => focus('[data-week-setup-panel]'), 50);
    };
  } else if (workflow.hasApplied) {
    label = 'Publish Verified Week';
    detail = 'The reviewed facts are applied and ready for the Chronicle, stats, and weekly record.';
    action = () => clickOriginal(/publish verified week|process completed game week|save & process weekly agenda|update game log/i);
  } else if (workflow.hasReview && workflow.attention === 0) {
    label = 'Apply Verified Draft';
    detail = workflow.missing ? `${workflow.missing} required item${workflow.missing === 1 ? '' : 's'} intentionally missing; the verified facts can still be applied.` : 'Review is clean. Apply the verified facts before publishing.';
    action = () => clickOriginal(/apply verified draft|apply intentional partial update/i) || focus('.dhq-postgame-review');
  } else if (workflow.hasReview) {
    label = `Review ${workflow.attention} Flagged Fact${workflow.attention === 1 ? '' : 's'}`;
    detail = 'Resolve the flagged scanner reads before applying the draft.';
    action = () => focus('.dhq-postgame-review');
  }

  const saveProgressButton = findByText(originalActions, 'button', /save progress only/i);

  return (
    <div className="dhq-agenda-v3-action-bar" data-guided-weekly-action>
      <div className="min-w-0">
        <span className="dhq-agenda-v3-label">Next step</span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </div>
      <div className="dhq-agenda-v3-action-buttons">
        {saveProgressButton ? <button type="button" className="is-secondary" onClick={() => clickOriginal(/save progress only/i)}>Save Progress</button> : null}
        <button type="button" className="is-primary" onClick={action}><CheckCircle2 size={15} /> {label}</button>
      </div>
    </div>
  );
};

const WeeklyAgendaV2Portal = () => {
  const isReadOnly = new URLSearchParams(window.location.search).has('view');
  const [user, setUser] = useState(auth.currentUser);
  const [career, setCareer] = useState(null);
  const [hosts, setHosts] = useState({ shell: null, agenda: null, actions: null });
  const [setupOpen, setSetupOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [rtgOpen, setRtgOpen] = useState(false);
  const [workflow, setWorkflow] = useState({ hasReview: false, hasApplied: false, screens: 0, facts: 0, attention: 0, missing: 0 });
  const ownedNodes = useRef([]);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (isReadOnly || !user || !db) {
      setCareer(null);
      return undefined;
    }
    const careerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    return onSnapshot(careerRef, (snapshot) => setCareer(snapshot.exists() ? snapshot.data() : null));
  }, [isReadOnly, user]);

  const stage = useMemo(() => career ? deriveCareerStage(career) : null, [career]);
  const setupReady = career?.currentWeekSetup?.week !== undefined && career?.currentWeekSetup?.week !== null;

  useEffect(() => {
    if (!career) return;
    setSetupOpen(!setupReady);
    setManualOpen(false);
    setMoreOpen(false);
    setRtgOpen(false);
  }, [career?.currentWeek, setupReady, stage]);

  useEffect(() => {
    if (isReadOnly) return undefined;
    const ensure = () => {
      const agenda = document.querySelector('.dhq-weekly-agenda-workspace');
      if (!agenda) {
        setHosts({ shell: null, agenda: null, actions: null });
        return;
      }
      agenda.classList.add('dhq-weekly-agenda-v2');
      markAgendaStructure(agenda);

      let shellHost = document.getElementById('dhq-weekly-agenda-v3-shell-host');
      if (!shellHost) {
        shellHost = document.createElement('div');
        shellHost.id = 'dhq-weekly-agenda-v3-shell-host';
        ownedNodes.current.push(shellHost);
      }
      if (shellHost.parentElement !== agenda || agenda.firstElementChild !== shellHost) agenda.prepend(shellHost);

      const originalActions = agenda.querySelector('.dhq-agenda-v2-actions');
      let actionsHost = document.getElementById('dhq-weekly-agenda-v3-actions-host');
      if (originalActions) {
        if (!actionsHost) {
          actionsHost = document.createElement('div');
          actionsHost.id = 'dhq-weekly-agenda-v3-actions-host';
          ownedNodes.current.push(actionsHost);
        }
        if (actionsHost.parentElement !== agenda || actionsHost.nextElementSibling !== originalActions) {
          agenda.insertBefore(actionsHost, originalActions);
        }
      }

      setHosts((current) => current.shell === shellHost && current.agenda === agenda && current.actions === (actionsHost || null)
        ? current
        : { shell: shellHost, agenda, actions: actionsHost || null });
    };

    ensure();
    const observer = new MutationObserver(ensure);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      ownedNodes.current.forEach((node) => node?.parentElement?.removeChild(node));
      ownedNodes.current = [];
    };
  }, [isReadOnly]);

  useEffect(() => {
    const agenda = hosts.agenda;
    if (!agenda) return undefined;

    const refresh = () => {
      setWorkflow((current) => {
        const next = readAgendaWorkflow(agenda, current);
        return sameWorkflow(current, next) ? current : next;
      });
    };

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(agenda, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [hosts.agenda]);

  useEffect(() => {
    const agenda = hosts.agenda;
    if (!agenda) return undefined;
    agenda.classList.toggle('dhq-agenda-v2-setup-open', setupOpen);
    agenda.classList.toggle('dhq-agenda-v2-manual-open', manualOpen);
    agenda.classList.toggle('dhq-agenda-v2-more-open', moreOpen);
    agenda.classList.toggle('dhq-agenda-v2-rtg-open', rtgOpen);
    return () => {
      agenda.classList.remove('dhq-agenda-v2-setup-open', 'dhq-agenda-v2-manual-open', 'dhq-agenda-v2-more-open', 'dhq-agenda-v2-rtg-open');
    };
  }, [hosts.agenda, setupOpen, manualOpen, moreOpen, rtgOpen]);

  if (!career || !user || !hosts.agenda || !hosts.shell) return null;

  return (
    <>
      {createPortal(
        <WeeklyAgendaShell
          career={career}
          stage={stage}
          agenda={hosts.agenda}
          setupOpen={setupOpen}
          manualOpen={manualOpen}
          moreOpen={moreOpen}
          rtgOpen={rtgOpen}
          workflow={workflow}
          onToggleSetup={() => setSetupOpen((value) => !value)}
          onToggleManual={() => setManualOpen((value) => !value)}
          onToggleMore={() => setMoreOpen((value) => !value)}
          onToggleRtg={() => setRtgOpen((value) => !value)}
        />,
        hosts.shell,
      )}
      {hosts.actions ? createPortal(
        <GuidedActionBar
          agenda={hosts.agenda}
          setupReady={setupReady}
          setupOpen={setupOpen}
          workflow={workflow}
          onToggleSetup={() => setSetupOpen((value) => !value)}
        />,
        hosts.actions,
      ) : null}
    </>
  );
};

export default WeeklyAgendaV2Portal;