import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  ArrowRight,
  Camera,
  Images,
  Loader2,
  ScanLine,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { appId, auth, db } from '../firebase';
import { CAREER_STAGES, deriveCareerStage } from '../domain/commandCenter';
import { extractMenuVideoFrames } from '../services/menuVideoFrames';

const MAX_SCREENSHOTS = 12;

const stageCopy = {
  [CAREER_STAGES.HIGH_SCHOOL]: {
    subtitle: 'Use the guided evaluation and recruiting scanner',
    detail: 'High-school Playable Moments need their guided slots so DynastyHQ knows which moment each screen belongs to.',
  },
  [CAREER_STAGES.COLLEGE]: {
    subtitle: 'Update game and RTG data from CFB 27',
    detail: 'Use screenshots anytime. Use a short menu recording when the useful stats are spread across several screens.',
  },
  [CAREER_STAGES.OC]: {
    subtitle: 'Update game, recruiting, and program data',
    detail: 'Import screenshots or a short menu recording, then verify every extracted fact in Weekly Agenda.',
  },
  [CAREER_STAGES.HC]: {
    subtitle: 'Update the current dynasty week faster',
    detail: 'Import screenshots or scroll through the relevant dynasty menus in one short recording.',
  },
};

const visible = (element) => Boolean(element && element.offsetParent !== null);

const findAgendaButton = () => {
  const buttons = [...document.querySelectorAll('button')].filter((button) => /weekly agenda/i.test((button.textContent || '').trim()));
  return buttons.find(visible) || buttons[0] || null;
};

const findUniversalScannerInput = () => {
  const labels = [...document.querySelectorAll('label')];
  const scannerLabel = labels.find((label) => /choose weekly screenshots/i.test(label.textContent || ''));
  return scannerLabel?.querySelector('input[type="file"]') || null;
};

const waitForUniversalScannerInput = (timeoutMs = 6500) => new Promise((resolve, reject) => {
  const startedAt = Date.now();
  const check = () => {
    const input = findUniversalScannerInput();
    if (input) {
      resolve(input);
      return;
    }
    if (Date.now() - startedAt >= timeoutMs) {
      reject(new Error('DynastyHQ opened Weekly Agenda but could not find the Universal Scanner. Try the scanner directly from Weekly Agenda.'));
      return;
    }
    window.setTimeout(check, 80);
  };
  check();
});

const routeFilesToUniversalScanner = async (files) => {
  if (!files?.length) return;
  const agendaButton = findAgendaButton();
  if (!agendaButton) throw new Error('Weekly Agenda is not available from this page.');
  agendaButton.click();
  const input = await waitForUniversalScannerInput();
  if (typeof DataTransfer === 'undefined') throw new Error('This browser cannot hand files to the Universal Scanner automatically. Open Weekly Agenda and upload them there instead.');
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  window.setTimeout(() => input.closest('div')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }), 120);
};

const QuickImportCard = ({ career, stage }) => {
  const [busy, setBusy] = useState(false);
  const [videoStatus, setVideoStatus] = useState(null);
  const [message, setMessage] = useState(null);
  const screenshotInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const copy = stageCopy[stage] || stageCopy[CAREER_STAGES.COLLEGE];
  const isHighSchool = stage === CAREER_STAGES.HIGH_SCHOOL;
  const currentWeek = career?.currentWeek ?? 1;

  const openAgenda = () => {
    const button = findAgendaButton();
    if (button) button.click();
  };

  const importScreens = async (files) => {
    const selected = [...(files || [])].slice(0, MAX_SCREENSHOTS);
    if (!selected.length) return;
    setBusy(true);
    setMessage(null);
    try {
      await routeFilesToUniversalScanner(selected);
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'The screenshots could not be handed to Weekly Agenda.' });
    } finally {
      setBusy(false);
    }
  };

  const importVideo = async (file) => {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    setVideoStatus({ percent: 0, frames: 0 });
    try {
      const frames = await extractMenuVideoFrames(file, {
        onProgress: ({ percent, frames: frameCount }) => setVideoStatus({ percent, frames: frameCount }),
      });
      setVideoStatus({ percent: 100, frames: frames.length });
      await routeFilesToUniversalScanner(frames);
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Menu Video Import failed. Your saved career was not changed.' });
      setVideoStatus(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="dhq-v2-card" data-dashboard-card="quick-import" data-quick-import>
      <div className="dhq-v2-card__header">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><ScanLine size={14} className="shrink-0 text-blue-400" /><h2>Quick Import</h2></div>
          <p>{copy.subtitle}</p>
        </div>
        <button type="button" onClick={openAgenda} className="dhq-v2-card__action">Full scanner <ArrowRight size={12} /></button>
      </div>
      <div className="dhq-v2-card__body">
        <div className="flex items-start gap-3 rounded-lg border border-blue-400/15 bg-blue-500/[0.035] p-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-300"><ShieldCheck size={15} /></span>
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-300">Season {career?.currentSeason || 1} · Week {currentWeek}</div>
            <p className="mt-1 text-[9px] leading-relaxed text-slate-500">{copy.detail}</p>
          </div>
        </div>

        {isHighSchool ? (
          <button type="button" onClick={openAgenda} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-amber-400/25 bg-amber-500/[0.07] px-4 text-[9px] font-black uppercase tracking-wider text-amber-200 hover:bg-amber-500/[0.12]">
            <Camera size={14} /> Open guided high-school import
          </button>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={busy} onClick={() => screenshotInputRef.current?.click()} className="flex min-h-[62px] items-center gap-3 rounded-lg border border-slate-700 bg-black/20 px-4 text-left transition hover:border-blue-400/45 hover:bg-blue-500/[0.04] disabled:cursor-wait disabled:opacity-50">
              {busy && !videoStatus ? <Loader2 size={18} className="shrink-0 animate-spin text-blue-300" /> : <Images size={18} className="shrink-0 text-blue-300" />}
              <span><strong className="block text-[10px] font-black uppercase tracking-wider text-slate-100">Screenshots</strong><small className="mt-1 block text-[8px] leading-relaxed text-slate-500">One or several · always supported</small></span>
            </button>
            <button type="button" disabled={busy} onClick={() => videoInputRef.current?.click()} className="flex min-h-[62px] items-center gap-3 rounded-lg border border-slate-700 bg-black/20 px-4 text-left transition hover:border-amber-400/45 hover:bg-amber-500/[0.04] disabled:cursor-wait disabled:opacity-50">
              {busy && videoStatus ? <Loader2 size={18} className="shrink-0 animate-spin text-amber-300" /> : <Video size={18} className="shrink-0 text-amber-300" />}
              <span><strong className="block text-[10px] font-black uppercase tracking-wider text-slate-100">Menu Video</strong><small className="mt-1 block text-[8px] leading-relaxed text-slate-500">Up to 2 min · pause on each useful screen</small></span>
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

        {videoStatus ? (
          <div className="mt-3 rounded-lg border border-amber-400/15 bg-amber-500/[0.035] px-3 py-2.5">
            <div className="flex items-center justify-between gap-3 text-[8px] font-black uppercase tracking-wider"><span className="text-amber-200">Finding useful menu screens…</span><span className="text-slate-500">{videoStatus.frames} frame{videoStatus.frames === 1 ? '' : 's'}</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${videoStatus.percent}%` }} /></div>
          </div>
        ) : null}

        {message ? <p className={`mt-3 rounded-lg border px-3 py-2 text-[9px] font-bold ${message.type === 'error' ? 'border-red-400/20 bg-red-500/[0.06] text-red-200' : 'border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-200'}`}>{message.text}</p> : null}

        {!isHighSchool ? <p className="mt-3 text-[8px] leading-relaxed text-slate-600">Menu Video is processed locally into still frames. The full video is not sent to the scanner. Nothing changes in your career until you review and apply the extracted facts in Weekly Agenda.</p> : null}
      </div>
    </section>
  );
};

const QuickImportPortal = () => {
  const isReadOnly = new URLSearchParams(window.location.search).has('view');
  const [user, setUser] = useState(auth.currentUser);
  const [career, setCareer] = useState(null);
  const [target, setTarget] = useState(null);

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
      const grid = document.querySelector('#dynastyhq-command-center .dhq-v2-grid');
      if (!grid) {
        setTarget(null);
        return;
      }
      let host = document.getElementById('dhq-quick-import-card-host');
      if (!host) {
        host = document.createElement('div');
        host.id = 'dhq-quick-import-card-host';
        host.style.display = 'contents';
      }
      if (host.parentElement !== grid) grid.prepend(host);
      setTarget((current) => current === host ? current : host);
    };
    ensure();
    const observer = new MutationObserver(ensure);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.getElementById('dhq-quick-import-card-host')?.remove();
    };
  }, [isReadOnly]);

  const stage = useMemo(() => career ? deriveCareerStage(career) : null, [career]);
  if (!target || !career || !user || stage === CAREER_STAGES.RETIRED) return null;
  return createPortal(<QuickImportCard career={career} stage={stage} />, target);
};

export default QuickImportPortal;
