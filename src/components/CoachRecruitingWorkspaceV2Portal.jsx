import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Plus,
  ScanLine,
  ShieldCheck,
  Target,
  Trash2,
  Users,
} from 'lucide-react';
import { appId, auth, db } from '../firebase';
import { CAREER_STAGES, deriveCareerStage } from '../domain/commandCenter';
import { buildRecruitingCommand } from '../domain/recruitingCommand';

const DEVICE_ID = globalThis.crypto?.randomUUID?.() || `coach-recruiting-v2-${Date.now()}`;

const sortBoard = (schools = []) => [...schools].sort((a, b) => {
  const aRank = Number(a.customOrder || a.preferenceRank || 999);
  const bRank = Number(b.customOrder || b.preferenceRank || 999);
  if (aRank !== bRank) return aRank - bRank;
  return String(a.name || '').localeCompare(String(b.name || ''));
});

const levelFromInterest = (value) => {
  const interest = Number(value) || 0;
  if (interest >= 75) return 'High';
  if (interest >= 50) return 'Medium';
  if (interest >= 25) return 'Low';
  return 'None';
};

const levelLabel = {
  High: 'High priority',
  Medium: 'Active',
  Low: 'Watch',
  None: 'Scout',
};

const toneClass = {
  High: 'border-emerald-400/25 bg-emerald-500/[0.06] text-emerald-300',
  Medium: 'border-blue-400/25 bg-blue-500/[0.06] text-blue-300',
  Low: 'border-amber-400/25 bg-amber-500/[0.06] text-amber-300',
  None: 'border-slate-700 bg-slate-900 text-slate-400',
};

const findVisibleButton = (matcher) => {
  const buttons = [...document.querySelectorAll('button')].filter((button) => matcher.test((button.textContent || '').trim()));
  return buttons.find((button) => button.offsetParent !== null) || buttons[0] || null;
};

const openWeeklyAgenda = () => findVisibleButton(/weekly agenda/i)?.click();

const statusText = (model) => {
  if (model.rosterReadiness === 'ready') return 'Roster picture ready';
  if (model.rosterReadiness === 'partial') return 'Roster picture partial';
  return 'Roster scan needed';
};

const CoachRecruitingWorkspace = ({ career, onWrite }) => {
  const [addText, setAddText] = useState('');
  const [boardOpen, setBoardOpen] = useState(false);
  const [needsOpen, setNeedsOpen] = useState(false);
  const model = useMemo(() => buildRecruitingCommand(career), [career]);
  const board = useMemo(() => sortBoard(career.recruiting || []), [career.recruiting]);
  const offers = board.filter((entry) => entry.offered).length;
  const highPriority = board.filter((entry) => Number(entry.interest) >= 75 || entry.level === 'High').length;
  const topTargets = [...board]
    .sort((a, b) => Number(Boolean(b.offered)) - Number(Boolean(a.offered)) || (Number(b.interest) || 0) - (Number(a.interest) || 0))
    .slice(0, 5);

  const updateSchool = (id, patch, message = null) => onWrite((remote) => ({
    ...remote,
    recruiting: (remote.recruiting || []).map((school) => school.id === id ? { ...school, ...patch } : school),
  }), message);

  const changeInterest = (id, rawValue) => {
    const interest = Math.max(0, Math.min(100, Number(rawValue) || 0));
    updateSchool(id, { interest, level: levelFromInterest(interest) });
  };

  const changeRank = (id, rawRank) => onWrite((remote) => {
    const sorted = sortBoard(remote.recruiting || []);
    const currentIndex = sorted.findIndex((school) => school.id === id);
    if (currentIndex < 0) return remote;
    const targetIndex = Math.max(0, Math.min(sorted.length - 1, (Number(rawRank) || 1) - 1));
    const [moved] = sorted.splice(currentIndex, 1);
    sorted.splice(targetIndex, 0, moved);
    return {
      ...remote,
      recruiting: sorted.map((school, index) => ({ ...school, customOrder: index + 1 })),
    };
  });

  const deleteSchool = (id) => onWrite((remote) => ({
    ...remote,
    recruiting: (remote.recruiting || []).filter((school) => school.id !== id),
  }), 'Prospect removed from the recruiting board.');

  const addProspects = (event) => {
    event.preventDefault();
    const names = addText.split(',').map((value) => value.trim()).filter(Boolean);
    if (!names.length) return;
    onWrite((remote) => {
      const recruiting = [...(remote.recruiting || [])];
      let nextOrder = recruiting.length + 1;
      names.forEach((name, index) => {
        if (recruiting.some((school) => String(school.name || '').toLowerCase() === name.toLowerCase())) return;
        recruiting.push({
          id: Date.now() + index,
          name,
          level: 'None',
          interest: 0,
          offered: false,
          customOrder: nextOrder,
        });
        nextOrder += 1;
      });
      return { ...remote, recruiting };
    }, `${names.length} prospect${names.length === 1 ? '' : 's'} added to the board.`);
    setAddText('');
    setBoardOpen(true);
  };

  return (
    <div className="relative z-10 mx-auto max-w-7xl space-y-3 pb-20 animate-in fade-in" data-coach-recruiting-v2>
      <section className="overflow-hidden rounded-xl border border-slate-700/60 bg-[#101419]/95 shadow-xl">
        <div className="grid gap-4 p-4 md:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-300">Coach Recruiting</span>
              <span className="rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-[8px] font-black uppercase text-slate-400">{model.roleLabel}</span>
              <span className="rounded border border-amber-400/20 bg-amber-500/[0.05] px-2 py-1 text-[8px] font-black uppercase text-amber-200">{model.authorityLabel}</span>
            </div>
            <h1 className="mt-1 text-xl font-black text-white sm:text-2xl">Recruiting Board</h1>
            <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-slate-500">See what needs attention this week first. Full board editing, roster context, and historical detail stay tucked away until you need them.</p>
          </div>
          <button type="button" onClick={openWeeklyAgenda} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-[9px] font-black uppercase tracking-wider text-slate-950 hover:bg-amber-400">
            <ScanLine size={14} /> Import current screens
          </button>
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-slate-800 bg-slate-800 sm:grid-cols-4">
          {[
            ['Targets', board.length],
            ['Offers', offers],
            ['High priority', highPriority],
            ['Roster inputs', `${model.verifiedRosterMetrics}/6`],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#101419] px-4 py-3">
              <p className="text-[8px] font-black uppercase tracking-wider text-slate-600">{label}</p>
              <p className="mt-1 text-lg font-black text-white">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-blue-400/20 bg-[#0d1824]/95 p-4 shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {model.rosterReadiness === 'needs-data' ? <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-300" /> : <Target size={17} className="mt-0.5 shrink-0 text-blue-300" />}
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-300">This week</p>
              <h2 className="mt-1 text-sm font-black text-white">{model.nextAction.title}</h2>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{model.nextAction.detail}</p>
            </div>
          </div>
          <button type="button" onClick={openWeeklyAgenda} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-blue-400/25 bg-blue-500/[0.07] px-3 text-[8px] font-black uppercase tracking-wider text-blue-200 hover:bg-blue-500/[0.12]">
            Go to Weekly Agenda <ArrowRight size={12} />
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/50 bg-[#11151a]/95 p-4 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-emerald-300">Priority targets</p>
            <h2 className="mt-1 text-base font-black text-white">Who needs your attention</h2>
          </div>
          <button type="button" onClick={() => setBoardOpen(true)} className="text-[8px] font-black uppercase tracking-wider text-blue-300 hover:text-blue-200">Open full board</button>
        </div>

        <div className="mt-3 divide-y divide-slate-800/80">
          {topTargets.length ? topTargets.map((target, index) => {
            const level = target.level || levelFromInterest(target.interest);
            return (
              <div key={target.id || `${target.name}-${index}`} className="grid gap-2 py-3 sm:grid-cols-[36px_minmax(0,1fr)_auto_auto] sm:items-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-[10px] font-black text-slate-500">#{board.findIndex((entry) => entry.id === target.id) + 1}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><strong className="truncate text-sm text-white">{target.name}</strong>{target.position ? <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[8px] font-black text-amber-300">{target.position}</span> : null}</div>
                  <p className="mt-0.5 text-[9px] text-slate-600">{target.offered ? 'Offer sent' : 'No offer'} · {Number(target.interest) || 0}% interest</p>
                </div>
                <span className={`w-fit rounded border px-2 py-1 text-[7px] font-black uppercase tracking-wider ${toneClass[level] || toneClass.None}`}>{levelLabel[level] || 'Scout'}</span>
                <span className={`w-fit rounded border px-2 py-1 text-[7px] font-black uppercase tracking-wider ${target.offered ? 'border-emerald-400/25 bg-emerald-500/[0.07] text-emerald-300' : 'border-slate-800 text-slate-600'}`}>{target.offered ? 'Offered' : 'No offer'}</span>
              </div>
            );
          }) : (
            <div className="py-7 text-center">
              <ClipboardList size={20} className="mx-auto text-slate-700" />
              <p className="mt-2 text-[10px] font-black uppercase text-slate-500">No current targets</p>
              <p className="mt-1 text-[9px] text-slate-600">Import the game&rsquo;s recruiting board or add prospects manually.</p>
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-700/50 bg-[#11151a]/95 shadow-lg">
        <button type="button" onClick={() => setNeedsOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
          <span>
            <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-300"><Users size={13} className="text-amber-300" /> Roster needs & class context</span>
            <span className="mt-1 block text-[9px] text-slate-600">{statusText(model)} · {model.positionNeeds.length} verified position priorit{model.positionNeeds.length === 1 ? 'y' : 'ies'}</span>
          </span>
          <ChevronDown size={15} className={`shrink-0 text-slate-500 transition-transform ${needsOpen ? 'rotate-180' : ''}`} />
        </button>
        {needsOpen ? (
          <div className="border-t border-slate-800 p-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {model.rosterMetrics.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-slate-800 bg-slate-950/45 p-3">
                  <div className="flex items-center justify-between gap-2"><span className="text-[8px] font-black uppercase tracking-wider text-slate-600">{metric.label}</span>{metric.verified ? <ShieldCheck size={12} className="text-emerald-400" /> : null}</div>
                  <p className={`mt-1 text-sm font-black ${metric.verified ? 'text-white' : 'text-slate-700'}`}>{metric.verified ? (metric.value ?? '—') : 'Not verified'}</p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <p className="text-[8px] font-black uppercase tracking-wider text-slate-500">Verified position priorities</p>
              {model.positionNeeds.length ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {model.positionNeeds.map((need) => (
                    <div key={need.group} className="rounded-lg border border-amber-400/20 bg-amber-500/[0.04] p-3">
                      <div className="flex items-center justify-between gap-2"><strong className="text-sm text-white">{need.group}</strong>{need.targetCount !== null ? <span className="text-[8px] font-black text-amber-300">Target {need.targetCount}</span> : null}</div>
                      <p className="mt-1 text-[8px] font-black uppercase text-amber-300">{need.priority}</p>
                      {need.reason ? <p className="mt-1 text-[9px] leading-relaxed text-slate-500">{need.reason}</p> : null}
                    </div>
                  ))}
                </div>
              ) : <p className="mt-2 text-[9px] text-slate-600">No position need is shown until current roster/depth information verifies it.</p>}
            </div>
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-700/50 bg-[#11151a]/95 shadow-lg">
        <button type="button" onClick={() => setBoardOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
          <span>
            <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-300"><Target size={13} className="text-blue-300" /> Full recruiting board</span>
            <span className="mt-1 block text-[9px] text-slate-600">{board.length} prospect{board.length === 1 ? '' : 's'} · editing and manual corrections</span>
          </span>
          <ChevronDown size={15} className={`shrink-0 text-slate-500 transition-transform ${boardOpen ? 'rotate-180' : ''}`} />
        </button>

        {boardOpen ? (
          <div className="border-t border-slate-800 p-4">
            <form onSubmit={addProspects} className="flex flex-col gap-2 sm:flex-row">
              <input value={addText} onChange={(event) => setAddText(event.target.value)} placeholder="Add prospects separated by commas" className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-400" />
              <button type="submit" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-[9px] font-black uppercase tracking-wider text-white hover:bg-blue-500"><Plus size={13} /> Add</button>
            </form>

            <div className="mt-3 space-y-2">
              {board.map((school, index) => {
                const level = school.level || levelFromInterest(school.interest);
                return (
                  <div key={school.id} className="rounded-lg border border-slate-800 bg-slate-950/45 p-3">
                    <div className="grid gap-3 lg:grid-cols-[52px_minmax(160px,1.2fr)_90px_90px_110px_auto] lg:items-center">
                      <label className="flex items-center gap-1 text-[8px] font-black uppercase text-slate-600">#<input type="number" min="1" max={Math.max(1, board.length)} defaultValue={index + 1} onBlur={(event) => changeRank(school.id, event.target.value)} className="w-9 rounded border border-slate-800 bg-slate-900 px-1 py-1 text-center text-[10px] text-white outline-none" /></label>
                      <input value={school.name || ''} onChange={(event) => updateSchool(school.id, { name: event.target.value })} className="min-w-0 bg-transparent text-sm font-black text-white outline-none" />
                      <input value={school.position || ''} onChange={(event) => updateSchool(school.id, { position: event.target.value })} placeholder="Position" className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-[9px] text-white outline-none" />
                      <label className="flex items-center gap-1 rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-[8px] font-black uppercase text-slate-500"><input type="number" min="0" max="100" value={Number(school.interest) || 0} onChange={(event) => changeInterest(school.id, event.target.value)} className="w-9 bg-transparent text-right text-[10px] text-white outline-none" />%</label>
                      <select value={level} onChange={(event) => updateSchool(school.id, { level: event.target.value })} className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-[8px] font-black uppercase text-slate-400 outline-none">
                        <option value="High">High priority</option><option value="Medium">Active</option><option value="Low">Watch</option><option value="None">Scout</option>
                      </select>
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => updateSchool(school.id, { offered: !school.offered }, school.offered ? 'Offer status removed.' : 'Offer marked as sent.')} className={`inline-flex min-h-8 items-center gap-1 rounded border px-2 text-[7px] font-black uppercase ${school.offered ? 'border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-300' : 'border-slate-700 text-slate-500'}`}>{school.offered ? <CheckCircle2 size={11} /> : null}{school.offered ? 'Offered' : 'Offer'}</button>
                        <button type="button" onClick={() => deleteSchool(school.id)} className="grid h-8 w-8 place-items-center rounded border border-slate-800 text-slate-600 hover:border-red-400/30 hover:text-red-300"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!board.length ? <p className="rounded-lg border border-dashed border-slate-800 py-8 text-center text-[10px] text-slate-600">No prospects yet.</p> : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
};

const CoachRecruitingWorkspaceV2Portal = () => {
  const [user, setUser] = useState(auth.currentUser);
  const [career, setCareer] = useState(null);
  const [target, setTarget] = useState(null);
  const legacyRootRef = useRef(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user || !db) {
      setCareer(null);
      return undefined;
    }
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    return onSnapshot(ref, (snapshot) => setCareer(snapshot.exists() ? snapshot.data() : null));
  }, [user]);

  const stage = useMemo(() => career ? deriveCareerStage(career) : null, [career]);
  const isCoach = stage === CAREER_STAGES.OC || stage === CAREER_STAGES.HC;

  useEffect(() => {
    if (!isCoach) {
      if (legacyRootRef.current) legacyRootRef.current.style.display = '';
      legacyRootRef.current = null;
      setTarget(null);
      return undefined;
    }

    const ensure = () => {
      const heading = [...document.querySelectorAll('h1,h2,h3')].find((element) => /coach'?s prospect board/i.test((element.textContent || '').trim()));
      if (!heading) {
        if (legacyRootRef.current) legacyRootRef.current.style.display = '';
        legacyRootRef.current = null;
        setTarget(null);
        return;
      }
      let root = heading;
      while (root.parentElement && root.parentElement.parentElement && root.parentElement !== document.body && !root.parentElement.matches('main')) root = root.parentElement;
      const legacyRoot = root.parentElement?.matches('main') ? root : root.closest('main > div') || root;
      if (!legacyRoot?.parentElement) return;

      if (legacyRootRef.current && legacyRootRef.current !== legacyRoot) legacyRootRef.current.style.display = '';
      legacyRootRef.current = legacyRoot;
      legacyRoot.style.display = 'none';

      let host = document.getElementById('dhq-coach-recruiting-v2-host');
      if (!host) {
        host = document.createElement('div');
        host.id = 'dhq-coach-recruiting-v2-host';
      }
      if (host.parentElement !== legacyRoot.parentElement) legacyRoot.parentElement.insertBefore(host, legacyRoot);
      setTarget((current) => current === host ? current : host);
    };

    ensure();
    const observer = new MutationObserver(ensure);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (legacyRootRef.current) legacyRootRef.current.style.display = '';
      legacyRootRef.current = null;
      document.getElementById('dhq-coach-recruiting-v2-host')?.remove();
      setTarget(null);
    };
  }, [isCoach]);

  const writeCareer = async (transform, successMessage = null) => {
    if (!user || !db) return;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('Career save was not found.');
      const remote = snapshot.data();
      const next = transform(remote);
      transaction.set(ref, {
        ...next,
        _sync: {
          revision: (Number(remote?._sync?.revision) || 0) + 1,
          deviceId: DEVICE_ID,
          updatedAt: new Date().toISOString(),
        },
      });
    });
    if (successMessage) console.info(successMessage);
  };

  if (!user || !career || !isCoach || !target) return null;
  return createPortal(<CoachRecruitingWorkspace career={career} onWrite={writeCareer} />, target);
};

export default CoachRecruitingWorkspaceV2Portal;
