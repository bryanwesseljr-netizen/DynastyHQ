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

  const publishButton = findByText(
    agenda,
    'button',
    /publish verified week|save & process weekly agenda|process completed game week|update game log/i,
  );
  publishButton?.parentElement?.classList.add('dhq-agenda-v2-actions');

  const guidedLabel = findByText(agenda, 'p', /guided high-school scanner/i);
  guidedLabel?.closest('section')?.classList.add('dhq-agenda-v2-guided-import');
};

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
  window.setTimeout(() => {
    agenda.querySelector('.dhq-postgame-review')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, 500);
};

const WorkflowSteps = ({ setupReady }) => (
  <div className="dhq-agenda-v3-steps" aria-label="Weekly workflow">
    {[
      ['1', 'Setup', setupReady ? 'done' : 'active'],
      ['2', 'Import', setupReady ? 'active' : 'waiting'],
      ['3', 'Review', 'waiting'],
      ['4', 'Publish', 'waiting'],
    ].map(([number, label, state]) => (
      <div key={label} className={`dhq-agenda-v3-step is-${state}`}>
        <span>{state === 'done' ? <CheckCircle2 size={12} /> : number}</span>
        <strong>{label}</strong>
      </div>
    ))}
  </div>
);

const WeeklyAgendaShell = ({
  career,
  stage,
  agenda,
  setupOpen,
  manualOpen,
  moreOpen,
  onToggleSetup,
  onToggleManual,
  onToggleMore,
}) => {
  const screenshotInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState(null);

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

  const importScreens = async (files) => {
    const selected = [...(files || [])].slice(0, MAX_SCREENSHOTS);
    if (!selected.length) return;
    setBusy(true);
    setStatus(null);
    setMessage(null);
    try {
      await handoffFilesToScanner(selected, agenda);
    } catch (error) {
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
    try {
      const frames = await extractMenuVideoFrames(file, {
        onProgress: ({ percent, frames: frameCount }) => setStatus({ percent, frames: frameCount }),
      });
      setStatus({ percent: 100, frames: frames.length });
      await handoffFilesToScanner(frames, agenda);
    } catch (error) {
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
        <WorkflowSteps setupReady={setupReady} />
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

        <div className="dhq-agenda-v3-import-card">
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

      {status ? (
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

const WeeklyAgendaV2Portal = () => {
  const isReadOnly = new URLSearchParams(window.location.search).has('view');
  const [user, setUser] = useState(auth.currentUser);
  const [career, setCareer] = useState(null);
  const [hosts, setHosts] = useState({ shell: null, agenda: null });
  const [setupOpen, setSetupOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
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
    if (!setupReady) setSetupOpen(true);
    if (stage === CAREER_STAGES.HIGH_SCHOOL) setManualOpen(true);
  }, [career?.currentWeek, setupReady, stage]);

  useEffect(() => {
    if (isReadOnly) return undefined;
    const ensure = () => {
      const agenda = document.querySelector('.dhq-weekly-agenda-workspace');
      if (!agenda) {
        setHosts({ shell: null, agenda: null });
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

      setHosts((current) => current.shell === shellHost && current.agenda === agenda
        ? current
        : { shell: shellHost, agenda });
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
    agenda.classList.toggle('dhq-agenda-v2-setup-open', setupOpen);
    agenda.classList.toggle('dhq-agenda-v2-manual-open', manualOpen);
    agenda.classList.toggle('dhq-agenda-v2-more-open', moreOpen);
    return () => {
      agenda.classList.remove('dhq-agenda-v2-setup-open', 'dhq-agenda-v2-manual-open', 'dhq-agenda-v2-more-open');
    };
  }, [hosts.agenda, setupOpen, manualOpen, moreOpen]);

  if (!career || !user || !hosts.agenda || !hosts.shell) return null;

  return createPortal(
    <WeeklyAgendaShell
      career={career}
      stage={stage}
      agenda={hosts.agenda}
      setupOpen={setupOpen}
      manualOpen={manualOpen}
      moreOpen={moreOpen}
      onToggleSetup={() => setSetupOpen((value) => !value)}
      onToggleManual={() => setManualOpen((value) => !value)}
      onToggleMore={() => setMoreOpen((value) => !value)}
    />,
    hosts.shell,
  );
};

export default WeeklyAgendaV2Portal;
