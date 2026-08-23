import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  CalendarDays,
  Images,
  Loader2,
  ScanLine,
  ShieldCheck,
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

const findByText = (root, selector, matcher) => [...(root?.querySelectorAll(selector) || [])]
  .find((element) => matcher.test((element.textContent || '').trim()));

const findUniversalScannerInput = (root = document) => {
  const label = findByText(root, 'label', /choose weekly screenshots/i);
  return label?.querySelector('input[type="file"]') || null;
};

const markAgendaStructure = (agenda) => {
  if (!agenda) return;

  const scannerLabel = findByText(agenda, 'label', /choose weekly screenshots/i);
  if (scannerLabel) {
    let node = scannerLabel.parentElement;
    while (node && node !== agenda) {
      const heading = node.querySelector?.('h2');
      if (/universal scanner/i.test(heading?.textContent || '')) {
        node.classList.add('dhq-agenda-v2-legacy-scanner');
        break;
      }
      node = node.parentElement;
    }
  }

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
  if (!input) throw new Error('The Universal Scanner is not ready yet. Reload Weekly Agenda and try again.');
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

const WeeklyAgendaHeader = ({ career, stage }) => {
  const setup = career?.currentWeekSetup || {};
  const week = career?.currentWeek ?? setup.week ?? 1;
  const season = career?.currentSeason || 1;
  const school = career?.player?.college || career?.player?.school || career?.coach?.currentSchool || 'Current program';
  const setupType = setup.type === 'bye' ? 'Bye Week' : 'Game Week';
  const setupLabel = setup.label || setup.customLabel || `Week ${week}`;

  return (
    <section className="dhq-agenda-v2-header" data-weekly-agenda-v2-header>
      <div className="dhq-agenda-v2-header__identity">
        <span className="dhq-agenda-v2-header__icon"><CalendarDays size={17} /></span>
        <div className="min-w-0">
          <span className="dhq-agenda-v2-eyebrow">Weekly Agenda · {stageLabels[stage] || 'Career'}</span>
          <h1>{setupLabel}</h1>
          <p>{school} · {setupType}</p>
        </div>
      </div>
      <div className="dhq-agenda-v2-header__metrics">
        <div><span>Season</span><strong>{season}</strong></div>
        <div><span>Week</span><strong>{week}</strong></div>
        <div><span>Stage</span><strong>{stage === CAREER_STAGES.COLLEGE ? (career?.rtg?.rank || 'Player') : (stageLabels[stage] || 'Career')}</strong></div>
      </div>
    </section>
  );
};

const AgendaQuickImport = ({ career, stage, agenda }) => {
  const screenshotInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState(null);
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
      setMessage({ type: 'error', text: error?.message || 'Screenshot import failed.' });
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
      setMessage({ type: 'error', text: error?.message || 'Menu Video Import failed. Your saved career was not changed.' });
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
    <section className="dhq-agenda-v2-import" data-agenda-quick-import>
      <div className="dhq-agenda-v2-import__copy">
        <span className="dhq-agenda-v2-eyebrow"><ScanLine size={12} /> Quick Import</span>
        <h2>{isHighSchool ? 'Use the guided evaluation scanner' : 'Bring the week in before you type it'}</h2>
        <p>{isHighSchool
          ? 'Playable Moments need their exact slots, so High School keeps the guided screenshot workflow.'
          : 'Use one screenshot, several screenshots, or a short menu recording. Everything still goes through the same review desk before anything can be applied.'}</p>
      </div>

      {isHighSchool ? (
        <button type="button" onClick={openGuidedImport} className="dhq-agenda-v2-import__single">
          <Images size={15} /> Open guided import
        </button>
      ) : (
        <div className="dhq-agenda-v2-import__actions">
          <button type="button" disabled={busy} onClick={() => screenshotInputRef.current?.click()}>
            {busy && !status ? <Loader2 size={17} className="animate-spin" /> : <Images size={17} />}
            <span><strong>Screenshots</strong><small>One or several</small></span>
          </button>
          <button type="button" disabled={busy} onClick={() => videoInputRef.current?.click()}>
            {busy && status ? <Loader2 size={17} className="animate-spin" /> : <Video size={17} />}
            <span><strong>Menu Video</strong><small>Up to 2 minutes</small></span>
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

      {!isHighSchool ? (
        <div className="dhq-agenda-v2-import__safety"><ShieldCheck size={12} /> Nothing changes until you review and apply the extracted facts.</div>
      ) : null}

      {status ? (
        <div className="dhq-agenda-v2-import__progress">
          <div><span>Finding useful menu screens…</span><strong>{status.frames} frame{status.frames === 1 ? '' : 's'}</strong></div>
          <div className="dhq-agenda-v2-import__track"><span style={{ width: `${status.percent}%` }} /></div>
        </div>
      ) : null}

      {message ? <p className="dhq-agenda-v2-import__message">{message.text}</p> : null}
    </section>
  );
};

const WeeklyAgendaV2Portal = () => {
  const isReadOnly = new URLSearchParams(window.location.search).has('view');
  const [user, setUser] = useState(auth.currentUser);
  const [career, setCareer] = useState(null);
  const [hosts, setHosts] = useState({ header: null, importer: null, agenda: null });
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

  useEffect(() => {
    if (isReadOnly) return undefined;
    const ensure = () => {
      const agenda = document.querySelector('.dhq-weekly-agenda-workspace');
      if (!agenda) {
        setHosts({ header: null, importer: null, agenda: null });
        return;
      }
      agenda.classList.add('dhq-weekly-agenda-v2');
      markAgendaStructure(agenda);

      let headerHost = document.getElementById('dhq-weekly-agenda-v2-header-host');
      if (!headerHost) {
        headerHost = document.createElement('div');
        headerHost.id = 'dhq-weekly-agenda-v2-header-host';
        ownedNodes.current.push(headerHost);
      }
      if (headerHost.parentElement !== agenda || agenda.firstElementChild !== headerHost) agenda.prepend(headerHost);

      let importerHost = document.getElementById('dhq-weekly-agenda-v2-import-host');
      if (!importerHost) {
        importerHost = document.createElement('div');
        importerHost.id = 'dhq-weekly-agenda-v2-import-host';
        ownedNodes.current.push(importerHost);
      }
      const flow = document.getElementById('dhq-gameweek-flow-agenda');
      const setup = document.getElementById('dhq-week-setup-portal');
      const anchor = flow?.parentElement === agenda ? flow : setup?.parentElement === agenda ? setup : headerHost;
      if (importerHost.parentElement !== agenda || anchor.nextElementSibling !== importerHost) anchor.after(importerHost);

      setHosts((current) => (
        current.header === headerHost && current.importer === importerHost && current.agenda === agenda
          ? current
          : { header: headerHost, importer: importerHost, agenda }
      ));
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

  const stage = useMemo(() => career ? deriveCareerStage(career) : null, [career]);
  if (!career || !user || !hosts.agenda || !hosts.header || !hosts.importer) return null;

  return (
    <>
      {createPortal(<WeeklyAgendaHeader career={career} stage={stage} />, hosts.header)}
      {createPortal(<AgendaQuickImport career={career} stage={stage} agenda={hosts.agenda} />, hosts.importer)}
    </>
  );
};

export default WeeklyAgendaV2Portal;
