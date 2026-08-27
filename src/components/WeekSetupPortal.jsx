import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import {
  CalendarDays,
  CheckCircle2,
  Info,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { appId, auth, db } from '../firebase';
import {
  createByeWeekPublication,
  defaultWeekLabel,
  normalizeWeekSetup,
  WEEK_PHASES,
  WEEK_SETUP_TYPES,
} from '../domain/weekSetup';

const WEEK_SETUP_DEVICE_ID = globalThis.crypto?.randomUUID?.() || `week-setup-${Date.now()}`;

const emptyForm = {
  week: 1,
  type: WEEK_SETUP_TYPES.GAME,
  phase: WEEK_PHASES.REGULAR,
  label: '',
  note: '',
  overall: '',
  rank: '',
  coachTrust: '',
  trustToNext: '',
  skillPoints: '',
  gpa: '',
  energy: '',
  followers: '',
  valuation: '',
};

const numericOrBlank = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
};

const phaseLabel = (phase) => {
  if (phase === WEEK_PHASES.PRESEASON) return 'Preseason';
  if (phase === WEEK_PHASES.POSTSEASON) return 'Postseason';
  return 'Regular Season';
};

const formFromCareer = (career = {}) => {
  const saved = career.currentWeekSetup || {};
  const week = Number.isFinite(Number(saved.week ?? career.currentWeek))
    ? Number(saved.week ?? career.currentWeek)
    : 1;
  const phase = Object.values(WEEK_PHASES).includes(saved.phase)
    ? saved.phase
    : (week === 0 ? WEEK_PHASES.PRESEASON : WEEK_PHASES.REGULAR);
  const type = Object.values(WEEK_SETUP_TYPES).includes(saved.type) ? saved.type : WEEK_SETUP_TYPES.GAME;
  return {
    ...emptyForm,
    week,
    type,
    phase,
    label: saved.customLabel || saved.label || '',
    note: saved.note || '',
    overall: career.player?.overall ?? '',
    rank: career.rtg?.rank ?? '',
    coachTrust: career.rtg?.coachTrust ?? '',
    trustToNext: career.rtg?.trustToNext ?? '',
    skillPoints: career.rtg?.skillPoints ?? '',
    gpa: career.rtg?.gpa ?? '',
    energy: career.rtg?.energy ?? '',
    followers: career.rtg?.followers ?? '',
    valuation: career.rtg?.valuation ?? '',
  };
};

const buildRtgFromForm = (form, remote = {}) => ({
  ...(remote.rtg || {}),
  rank: form.rank,
  coachTrust: numericOrBlank(form.coachTrust),
  trustToNext: numericOrBlank(form.trustToNext),
  skillPoints: numericOrBlank(form.skillPoints),
  gpa: numericOrBlank(form.gpa),
  energy: numericOrBlank(form.energy),
  followers: numericOrBlank(form.followers),
  valuation: numericOrBlank(form.valuation),
  wear: { ...(remote.rtg?.wear || {}) },
});

const Field = ({ label, children, hint }) => (
  <label className="block min-w-0">
    <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">{label}</span>
    {children}
    {hint ? <span className="mt-1 block text-[10px] leading-relaxed text-slate-500">{hint}</span> : null}
  </label>
);

const inputClass = 'w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm font-bold text-white outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30';

const WeekSetupPanel = () => {
  const [user, setUser] = useState(auth.currentUser);
  const [career, setCareer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user || !db) {
      setCareer(null);
      return undefined;
    }
    const careerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    return onSnapshot(careerRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const next = snapshot.data();
      setCareer(next);
      if (!dirtyRef.current) setForm(formFromCareer(next));
    });
  }, [user]);

  const normalized = useMemo(() => normalizeWeekSetup(form, career || {}), [career, form]);
  const suggestedLabel = useMemo(() => defaultWeekLabel(normalized), [normalized]);
  const isBye = normalized.type === WEEK_SETUP_TYPES.BYE;
  const school = career?.player?.college || career?.player?.school || 'Current program';

  const updateForm = (patch) => {
    setDirty(true);
    setMessage(null);
    setForm((current) => ({ ...current, ...patch }));
  };

  const commitCareer = async (transform, successMessage) => {
    if (!user || !db) return;
    setBusy(true);
    setMessage(null);
    let committedState = null;
    try {
      const careerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(careerRef);
        if (!snapshot.exists()) throw new Error('Career save was not found. Reload DynastyHQ and try again.');
        const remote = snapshot.data();
        const next = transform(remote);
        const revision = (Number(remote?._sync?.revision) || 0) + 1;
        committedState = {
          ...next,
          _sync: {
            revision,
            deviceId: WEEK_SETUP_DEVICE_ID,
            updatedAt: new Date().toISOString(),
          },
        };
        transaction.set(careerRef, committedState);
      });
      setDirty(false);
      dirtyRef.current = false;
      if (committedState) {
        setCareer(committedState);
        setForm(formFromCareer(committedState));
      }
      setMessage({ type: 'success', text: successMessage });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Week Setup could not be saved.' });
    } finally {
      setBusy(false);
    }
  };

  const saveSetup = () => commitCareer((remote) => {
    const setup = normalizeWeekSetup(form, remote);
    return {
      ...remote,
      currentWeek: setup.week,
      currentWeekSetup: {
        week: setup.week,
        type: setup.type,
        phase: setup.phase,
        label: setup.label,
        customLabel: form.label.trim(),
        note: setup.note,
      },
    };
  }, `${normalized.label} is now the active DynastyHQ week.`);

  const publishBye = () => commitCareer((remote) => createByeWeekPublication({
    state: remote,
    setup: form,
    rtg: buildRtgFromForm(form, remote),
    playerOverall: form.overall,
  }), `${normalized.label} published. The career calendar advanced to Week ${normalized.week + 1}.`);

  if (!user || !career) return null;

  const phaseCopy = normalized.phase === WEEK_PHASES.PRESEASON
    ? 'Use this for Week 0, opening-camp weeks, or another verified preseason bye. Publishing records a non-game baseline and then moves the calendar forward.'
    : normalized.phase === WEEK_PHASES.POSTSEASON
      ? 'Use the Display Label for the exact bracket language shown in CFB 27, such as “CFP First-Round Bye.” A postseason bye never creates a win, loss, appearance, or box score.'
      : 'A regular-season bye records development and weekly changes without adding an opponent, score, appearance, win, or loss.';

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-amber-400/35 bg-slate-950/90 shadow-2xl" data-week-setup-panel>
      <div className="border-b border-white/10 bg-gradient-to-r from-amber-950/45 via-slate-950 to-slate-950 px-5 py-4 md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-300">
              <CalendarDays size={15} /> Week Setup
            </div>
            <h2 className="mt-1 text-xl font-black text-white">Tell DynastyHQ what kind of football week this is</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">Set the calendar identity before entering the week. Bye weeks become verified non-game records instead of fake matchups.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider">
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-300">Season {career.currentSeason ?? 1}</span>
            <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-amber-200">{school}</span>
          </div>
        </div>
      </div>

      <div className="p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Week Number" hint="Week 0 is allowed.">
            <input className={inputClass} type="number" min="0" max="40" value={form.week} onChange={(event) => updateForm({ week: event.target.value })} />
          </Field>
          <Field label="Week Type">
            <select className={inputClass} value={form.type} onChange={(event) => updateForm({ type: event.target.value })}>
              <option value={WEEK_SETUP_TYPES.GAME}>Game Week</option>
              <option value={WEEK_SETUP_TYPES.BYE}>Bye Week</option>
            </select>
          </Field>
          <Field label="Season Phase">
            <select className={inputClass} value={form.phase} onChange={(event) => updateForm({ phase: event.target.value })}>
              <option value={WEEK_PHASES.PRESEASON}>Preseason</option>
              <option value={WEEK_PHASES.REGULAR}>Regular Season</option>
              <option value={WEEK_PHASES.POSTSEASON}>Postseason / Playoff</option>
            </select>
          </Field>
          <Field label="Display Label" hint={`Default: ${suggestedLabel}`}>
            <input className={inputClass} type="text" value={form.label} onChange={(event) => updateForm({ label: event.target.value })} placeholder={suggestedLabel} />
          </Field>
        </div>

        <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-500/5 p-4">
          <div className="flex items-start gap-3">
            <Info size={17} className="mt-0.5 shrink-0 text-blue-300" />
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-blue-200">{phaseLabel(normalized.phase)} · {isBye ? 'Bye Week' : 'Game Week'}</div>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{phaseCopy}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Field label="Verified Week Note" hint="Optional. Enter only something the game actually establishes or something you intentionally want preserved as your own career note.">
            <textarea className={`${inputClass} min-h-20 resize-y`} value={form.note} onChange={(event) => updateForm({ note: event.target.value })} placeholder={normalized.phase === WEEK_PHASES.PRESEASON ? 'Example: Freshman arrival at Cincinnati; opening bye before Week 1.' : 'Optional context for this week'} />
          </Field>
        </div>

        {isBye ? (
          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.04] p-4 md:p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-300" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-200">Bye-week development snapshot</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">These are the facts DynastyHQ will use for the Chronicle, Newsroom, and future comparisons. Leave anything unknown blank—nothing will be invented.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <Field label="Overall">
                <input className={inputClass} type="number" min="0" max="99" value={form.overall} onChange={(event) => updateForm({ overall: event.target.value })} />
              </Field>
              <Field label="Depth Chart Rank">
                <select className={inputClass} value={form.rank} onChange={(event) => updateForm({ rank: event.target.value })}>
                  <option value="">Unranked / Unknown</option>
                  <option value="QB1">QB1 (Starter)</option>
                  <option value="QB2">QB2 (Backup)</option>
                  <option value="QB3">QB3</option>
                  <option value="Redshirt">Redshirt</option>
                </select>
              </Field>
              <Field label="Coach Trust">
                <input className={inputClass} type="number" min="0" value={form.coachTrust} onChange={(event) => updateForm({ coachTrust: event.target.value })} />
              </Field>
              <Field label="Trust to Next Rank">
                <input className={inputClass} type="number" min="0" value={form.trustToNext} onChange={(event) => updateForm({ trustToNext: event.target.value })} />
              </Field>
              <Field label="Available Skill Points">
                <input className={inputClass} type="number" min="0" value={form.skillPoints} onChange={(event) => updateForm({ skillPoints: event.target.value })} />
              </Field>
              <Field label="Energy">
                <input className={inputClass} type="number" min="0" max="100" value={form.energy} onChange={(event) => updateForm({ energy: event.target.value })} />
              </Field>
              <Field label="GPA">
                <input className={inputClass} type="number" min="0" max="4" step="0.01" value={form.gpa} onChange={(event) => updateForm({ gpa: event.target.value })} />
              </Field>
              <Field label="Followers">
                <input className={inputClass} type="number" min="0" value={form.followers} onChange={(event) => updateForm({ followers: event.target.value })} />
              </Field>
              <Field label="NIL Valuation">
                <input className={inputClass} type="number" min="0" value={form.valuation} onChange={(event) => updateForm({ valuation: event.target.value })} />
              </Field>
            </div>

            <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/[0.05] p-3 text-xs leading-relaxed text-slate-400">
              <strong className="text-amber-200">What Publish Bye Week does:</strong> creates a verified weekly update + Career Chronicle entry + bye-specific Newsroom edition, preserves this development snapshot, leaves the team record and game log untouched, then advances the calendar one week.
            </div>
          </div>
        ) : null}

        {message ? (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${message.type === 'error' ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'}`}>
            {message.text}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Active identity: <strong className="text-slate-300">Season {career.currentSeason ?? 1} · {normalized.label}</strong>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {isBye ? (
              <button type="button" disabled={busy} onClick={saveSetup} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-4 text-xs font-black uppercase tracking-wider text-slate-200 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50">
                <CalendarDays size={15} /> Save Setup Only
              </button>
            ) : null}
            <button type="button" disabled={busy} onClick={isBye ? publishBye : saveSetup} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-xs font-black uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-50 ${isBye ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-amber-400 text-slate-950 hover:bg-amber-300'}`}>
              {isBye ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
              {busy ? 'Saving…' : (isBye ? 'Publish Bye Week' : 'Apply Week Setup')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const WeekSetupPortal = () => {
  const [host, setHost] = useState(null);

  useEffect(() => {
    let ownedNode = null;
    const ensureHost = () => {
      const shell = document.querySelector('[data-weekly-agenda-v3-shell]');
      const agenda = shell?.closest('.dhq-weekly-agenda-workspace');
      const controlGrid = shell?.querySelector('.dhq-agenda-v3-control-grid');
      const setupControl = [...(controlGrid?.querySelectorAll('.dhq-agenda-v3-control-card') || [])]
        .find((card) => /week setup/i.test((card.textContent || '').trim()));

      if (!agenda || !controlGrid || !setupControl) {
        setHost(null);
        return;
      }

      let node = document.getElementById('dhq-week-setup-portal');
      if (!node) {
        node = document.createElement('div');
        node.id = 'dhq-week-setup-portal';
        ownedNode = node;
      }

      node.style.gridColumn = '1 / -1';
      node.style.gridRow = '2';
      node.style.minWidth = '0';
      node.style.display = agenda.classList.contains('dhq-agenda-v2-setup-open') ? 'block' : 'none';

      if (node.parentElement !== controlGrid || setupControl.nextElementSibling !== node) {
        setupControl.insertAdjacentElement('afterend', node);
      }
      setHost(node);
    };

    ensureHost();
    const observer = new MutationObserver(ensureHost);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => {
      observer.disconnect();
      if (ownedNode?.parentElement) ownedNode.remove();
    };
  }, []);

  return host ? createPortal(<WeekSetupPanel />, host) : null;
};

export default WeekSetupPortal;
