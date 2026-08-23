import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  FileCheck2,
  LockKeyhole,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { appId, auth, db } from '../firebase';
import { buildGameweekFlow, createWeekFinalization } from '../domain/gameweekFlow';

const FLOW_DEVICE_ID = globalThis.crypto?.randomUUID?.() || `gameweek-flow-${Date.now()}`;

const navLabels = {
  agenda: /weekly agenda/i,
  newsroom: /the newsroom/i,
  podcast: /gridiron grind podcast/i,
};

const navigate = (target) => {
  const matcher = navLabels[target];
  if (!matcher || typeof document === 'undefined') return;
  const candidates = [...document.querySelectorAll('button')]
    .filter((button) => matcher.test((button.textContent || '').trim()));
  const button = candidates.find((entry) => entry.offsetParent !== null) || candidates[0];
  button?.click();
  if (target === 'agenda') {
    window.setTimeout(() => document.querySelector('[data-week-setup-panel]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }
};

const statusMeta = (step) => {
  if (step.state === 'complete') return {
    Icon: CheckCircle2,
    icon: 'text-emerald-300 border-emerald-400/35 bg-emerald-500/10',
    label: step.optional ? 'Not needed' : 'Complete',
    labelClass: step.optional ? 'text-slate-400' : 'text-emerald-300',
  };
  if (step.state === 'ready') return {
    Icon: FileCheck2,
    icon: 'text-amber-300 border-amber-400/40 bg-amber-500/10',
    label: 'Ready',
    labelClass: 'text-amber-300',
  };
  if (step.state === 'pending') return {
    Icon: Circle,
    icon: 'text-blue-300 border-blue-400/35 bg-blue-500/10',
    label: 'Next',
    labelClass: 'text-blue-300',
  };
  return {
    Icon: Circle,
    icon: 'text-slate-600 border-slate-700 bg-slate-900',
    label: 'Waiting',
    labelClass: 'text-slate-600',
  };
};

const latestFinalization = (career = {}) => {
  const raw = career.weekFinalizations || {};
  const entries = Array.isArray(raw) ? raw : Object.values(raw);
  return entries
    .filter(Boolean)
    .sort((a, b) => new Date(a.finalizedAt || 0).getTime() - new Date(b.finalizedAt || 0).getTime())
    .at(-1) || null;
};

const normalizedFinalizations = (career = {}) => {
  const raw = career.weekFinalizations || {};
  if (!Array.isArray(raw)) return { ...raw };
  return Object.fromEntries(raw.filter((entry) => entry?.publicationId).map((entry) => [entry.publicationId, entry]));
};

const ProgressDots = ({ steps }) => (
  <div className="grid grid-cols-5 gap-1.5" aria-label="Gameweek workflow progress">
    {steps.map((step) => {
      const done = step.state === 'complete';
      const ready = step.state === 'ready';
      return (
        <div key={step.id} className="min-w-0">
          <div className={`h-1.5 rounded-full ${done ? 'bg-emerald-400' : ready ? 'bg-amber-400' : step.state === 'pending' ? 'bg-blue-400' : 'bg-slate-800'}`} />
          <div className={`mt-1 truncate text-[7px] font-black uppercase tracking-[0.08em] ${done ? 'text-slate-300' : ready ? 'text-amber-300' : step.state === 'pending' ? 'text-blue-300' : 'text-slate-600'}`}>{step.label}</div>
        </div>
      );
    })}
  </div>
);

const GameweekFlowCard = ({ career, variant = 'dashboard', onFinalize, onUnlock, busy, message }) => {
  const flow = useMemo(() => buildGameweekFlow(career), [career]);
  const latestCheckpoint = latestFinalization(career);
  const completed = flow.steps.filter((step) => step.state === 'complete').length;
  const progressLabel = `${completed} of ${flow.requiredCount} steps complete`;
  const wrapLabel = flow.wrapUp
    ? `Season ${flow.wrapUp.season} · Week ${flow.wrapUp.week}`
    : `Season ${flow.activeWeek.season} · Week ${flow.activeWeek.week}`;

  const runNextAction = () => {
    if (flow.nextAction.target === 'finalize') onFinalize(flow);
    else navigate(flow.nextAction.target);
  };

  if (variant === 'agenda') {
    return (
      <section className="mb-6 rounded-2xl border border-blue-400/25 bg-[#071522]/95 p-4 shadow-xl md:p-5" data-gameweek-flow="agenda">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Gameweek Flow</span>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-slate-400">{wrapLabel}</span>
            </div>
            <h2 className="mt-1 text-lg font-black text-white">{flow.nextAction.label}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{flow.nextAction.detail}</p>
          </div>
          <button type="button" disabled={busy} onClick={runNextAction} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-blue-400 disabled:cursor-wait disabled:opacity-50">
            {flow.nextAction.target === 'finalize' ? <LockKeyhole size={15} /> : <ArrowRight size={15} />}
            {busy ? 'Saving…' : flow.nextAction.label}
          </button>
        </div>
        <div className="mt-4"><ProgressDots steps={flow.steps} /></div>
        {message ? <p className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold ${message.type === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>{message.text}</p> : null}
      </section>
    );
  }

  return (
    <section className="mx-auto mt-4 max-w-[1500px] px-5 sm:px-8 lg:px-14" data-gameweek-flow="dashboard">
      <div className="overflow-hidden rounded-xl border border-blue-400/25 bg-[#071522]/95 shadow-xl">
        <div className="grid gap-5 p-4 md:p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-blue-300"><Sparkles size={13} /> Smart Next Action</span>
              <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[7px] font-black uppercase tracking-wider text-slate-400">{wrapLabel}</span>
              <span className="text-[8px] font-bold text-slate-500">{progressLabel}</span>
            </div>
            <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">{flow.nextAction.label}</h2>
            <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-slate-400">{flow.nextAction.detail}</p>
            <div className="mt-4 max-w-3xl"><ProgressDots steps={flow.steps} /></div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3.5">
            <div className="space-y-2">
              {flow.steps.map((step) => {
                const meta = statusMeta(step);
                return (
                  <div key={step.id} className="flex items-start gap-2.5">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${meta.icon}`}><meta.Icon size={11} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><span className="text-[8px] font-black uppercase tracking-[0.08em] text-slate-200">{step.label}</span><span className={`text-[6px] font-black uppercase tracking-wider ${meta.labelClass}`}>{meta.label}</span></div>
                      <p className="mt-0.5 text-[8px] leading-relaxed text-slate-500">{step.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button type="button" disabled={busy} onClick={runNextAction} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 text-[8px] font-black uppercase tracking-[0.1em] text-white transition hover:bg-blue-400 disabled:cursor-wait disabled:opacity-50">
              {flow.nextAction.target === 'finalize' ? <LockKeyhole size={13} /> : <ArrowRight size={13} />}
              {busy ? 'Saving…' : flow.nextAction.label}
            </button>

            {latestCheckpoint && !flow.wrapUp ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2">
                <span className="flex min-w-0 items-center gap-1.5 text-[7px] font-bold text-emerald-300"><Check size={11} /> Last checkpoint: Season {latestCheckpoint.season} · Week {latestCheckpoint.week}</span>
                <button type="button" disabled={busy} onClick={() => onUnlock(latestCheckpoint)} className="shrink-0 text-[6px] font-black uppercase tracking-wider text-slate-500 hover:text-white"><RotateCcw size={10} className="mr-1 inline" />Unlock</button>
              </div>
            ) : null}
            {message ? <p className={`mt-2 rounded-lg border px-3 py-2 text-[8px] font-bold ${message.type === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>{message.text}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
};

const GameweekFlowPortal = () => {
  const isReadOnly = new URLSearchParams(window.location.search).has('view');
  const [user, setUser] = useState(auth.currentUser);
  const [career, setCareer] = useState(null);
  const [hosts, setHosts] = useState({ dashboard: null, agenda: null });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const ownedNodes = useRef([]);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (isReadOnly || !user || !db) {
      setCareer(null);
      return undefined;
    }
    const careerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    return onSnapshot(careerRef, (snapshot) => {
      if (snapshot.exists()) setCareer(snapshot.data());
    });
  }, [isReadOnly, user]);

  useEffect(() => {
    if (isReadOnly) return undefined;
    const ensure = () => {
      let dashboardHost = null;
      let agendaHost = null;
      const dashboard = document.getElementById('dynastyhq-command-center');
      if (dashboard) {
        dashboardHost = document.getElementById('dhq-gameweek-flow-dashboard');
        if (!dashboardHost) {
          dashboardHost = document.createElement('div');
          dashboardHost.id = 'dhq-gameweek-flow-dashboard';
          ownedNodes.current.push(dashboardHost);
        }
        if (dashboardHost.parentElement !== dashboard) {
          const banner = dashboard.querySelector('.dhq-home-banner');
          if (banner) banner.after(dashboardHost);
          else dashboard.prepend(dashboardHost);
        }
      }

      const agenda = document.querySelector('.dhq-weekly-agenda-workspace');
      if (agenda) {
        agendaHost = document.getElementById('dhq-gameweek-flow-agenda');
        if (!agendaHost) {
          agendaHost = document.createElement('div');
          agendaHost.id = 'dhq-gameweek-flow-agenda';
          ownedNodes.current.push(agendaHost);
        }
        if (agendaHost.parentElement !== agenda) {
          const setup = document.getElementById('dhq-week-setup-portal');
          if (setup?.parentElement === agenda) setup.after(agendaHost);
          else agenda.prepend(agendaHost);
        }
      }
      setHosts({ dashboard: dashboardHost, agenda: agendaHost });
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

  const writeCareer = async (transform, successText) => {
    if (!user || !db || !career) return;
    setBusy(true);
    setMessage(null);
    try {
      const careerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(careerRef);
        if (!snapshot.exists()) throw new Error('Career save was not found.');
        const remote = snapshot.data();
        const next = transform(remote);
        transaction.set(careerRef, {
          ...next,
          _sync: {
            revision: (Number(remote?._sync?.revision) || 0) + 1,
            deviceId: FLOW_DEVICE_ID,
            updatedAt: new Date().toISOString(),
          },
        });
      });
      setMessage({ type: 'success', text: successText });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'The gameweek checkpoint could not be saved.' });
    } finally {
      setBusy(false);
    }
  };

  const finalize = (flow) => writeCareer((remote) => {
    const freshFlow = buildGameweekFlow(remote);
    const checkpoint = createWeekFinalization(remote, freshFlow);
    return {
      ...remote,
      weekFinalizations: {
        ...normalizedFinalizations(remote),
        [checkpoint.publicationId]: checkpoint,
      },
    };
  }, `Week ${flow.wrapUp?.week ?? ''} finalized. DynastyHQ saved a completion checkpoint.`);

  const unlock = (checkpoint) => writeCareer((remote) => {
    const weekFinalizations = normalizedFinalizations(remote);
    delete weekFinalizations[checkpoint.publicationId];
    return { ...remote, weekFinalizations };
  }, `Week ${checkpoint.week} checkpoint unlocked for review.`);

  if (!career || isReadOnly) return null;

  return (
    <>
      {hosts.dashboard ? createPortal(<GameweekFlowCard career={career} variant="dashboard" onFinalize={finalize} onUnlock={unlock} busy={busy} message={message} />, hosts.dashboard) : null}
      {hosts.agenda ? createPortal(<GameweekFlowCard career={career} variant="agenda" onFinalize={finalize} onUnlock={unlock} busy={busy} message={message} />, hosts.agenda) : null}
    </>
  );
};

export default GameweekFlowPortal;
