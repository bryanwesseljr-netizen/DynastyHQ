import {
  AlertTriangle,
  ArrowRightLeft,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { buildOffseasonPlanner } from '../domain/offseasonPlanner.js';

const toneClasses = {
  info: 'border-blue-500/30 bg-blue-950/30 text-blue-100',
  success: 'border-emerald-500/30 bg-emerald-950/30 text-emerald-100',
  warning: 'border-amber-500/30 bg-amber-950/30 text-amber-100',
  danger: 'border-red-500/30 bg-red-950/30 text-red-100',
};

const valueLabel = (entry, suffix = '') => entry?.value === null || entry?.value === undefined
  ? 'Not verified'
  : `${Number(entry.value).toLocaleString()}${suffix}`;

const Verified = ({ fact }) => (
  <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider ${fact ? 'text-emerald-400' : 'text-slate-600'}`}>
    {fact ? <ShieldCheck size={10} /> : <LockKeyhole size={10} />}{fact ? 'Verified' : 'Unverified'}
  </span>
);

const SummaryCard = ({ label, entry, icon: Icon }) => (
  <div className="rounded-xl border border-slate-700/50 bg-slate-900/85 p-5 shadow-xl">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <Icon size={16} className="text-amber-400" />
    </div>
    <p className="mt-1 text-2xl font-black text-white">{valueLabel(entry)}</p>
    <div className="mt-2"><Verified fact={entry.fact} /></div>
  </div>
);

const NeedsBoard = ({ model }) => (
  <section className="rounded-2xl border border-slate-700/50 bg-slate-900/85 p-6 shadow-2xl">
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Roster construction</p>
    <h3 className="mt-1 flex items-center gap-2 text-xl font-black uppercase text-white"><ClipboardList size={20} /> Verified Position Needs</h3>
    <p className="mt-2 text-xs leading-relaxed text-slate-500">Counts and needs appear only when they were visible on a published roster screenshot.</p>
    <div className="mt-5 overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/50">
      {!model.positionNeeds.length && <div className="p-8 text-center text-sm text-slate-500">No verified position breakdown yet.</div>}
      {model.positionNeeds.map((row, index) => (
        <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_90px_90px] items-center gap-3 border-b border-slate-800 px-4 py-3 last:border-0">
          <div>
            <p className="font-black text-white"><span className="mr-2 text-slate-600">{index + 1}</span>{row.label}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">{row.side}</p>
          </div>
          <div className="text-right"><p className="text-[9px] font-black uppercase text-slate-500">Rostered</p><p className="font-mono font-black text-white">{valueLabel(row.count)}</p></div>
          <div className="text-right"><p className="text-[9px] font-black uppercase text-slate-500">Need</p><p className={`font-mono font-black ${(row.need.value || 0) > 0 ? 'text-amber-400' : 'text-slate-300'}`}>{valueLabel(row.need)}</p></div>
        </div>
      ))}
    </div>
  </section>
);

const RetentionBoard = ({ model }) => (
  <section className="rounded-2xl border border-slate-700/50 bg-slate-900/85 p-6 shadow-2xl">
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Stay-or-go desk</p>
    <h3 className="mt-1 flex items-center gap-2 text-xl font-black uppercase text-white"><UserCheck size={20} /> Roster Retention</h3>
    <p className="mt-2 text-xs leading-relaxed text-slate-500">Risk, status, overall, and NIL demand remain unknown until verified on-screen.</p>
    <div className="mt-5 space-y-2">
      {!model.retentionPlayers.length && <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">No verified retention decisions yet.</div>}
      {model.retentionPlayers.map((player) => {
        const allocation = model.retentionAllocation.find((row) => row.id === player.id);
        return (
          <div key={player.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-xl border border-slate-800 bg-slate-950/55 p-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-black text-white">{player.name}</p>{player.position && <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-black text-amber-300">{player.position}</span>}</div>
              <p className="mt-1 text-[10px] text-slate-500">{player.status || 'Status not verified'} · Risk: {player.risk || 'not verified'} · OVR: {player.overall ?? '—'}</p>
            </div>
            <div className="text-right"><p className="text-[9px] font-black uppercase text-slate-500">Suggested</p><p className="font-mono text-sm font-black text-emerald-400">{allocation ? `${allocation.suggestedPoints.toLocaleString()} pts` : '—'}</p></div>
          </div>
        );
      })}
    </div>
  </section>
);

const TargetList = ({ title, icon: Icon, rows, needs }) => (
  <div className="rounded-xl border border-slate-700/60 bg-slate-950/45 p-4">
    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-200"><Icon size={15} className="text-amber-400" /> {title}</h4>
    <div className="mt-3 space-y-2">
      {!rows.length && <p className="rounded-lg border border-dashed border-slate-800 p-5 text-center text-xs text-slate-600">No verified entries.</p>}
      {rows.slice(0, 8).map((target) => {
        const isNeed = needs.some((need) => need.label === target.position && (need.need.value || 0) > 0);
        return (
          <div key={target.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <div className="min-w-0"><p className="truncate text-xs font-black text-white">{target.name}</p><p className="mt-0.5 text-[9px] text-slate-500">{target.position || 'Position unverified'} · {target.status || 'Status unverified'}</p></div>
            <div className="text-right"><p className="font-mono text-xs font-black text-white">{target.interest === null ? '—' : `${target.interest}%`}</p>{isNeed && <span className="text-[8px] font-black uppercase text-amber-400">Matches need</span>}</div>
          </div>
        );
      })}
    </div>
  </div>
);

const AllocationPlan = ({ model }) => (
  <section className="rounded-2xl border border-slate-700/50 bg-slate-900/85 p-6 shadow-2xl">
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Advisory model</p>
    <h3 className="mt-1 flex items-center gap-2 text-xl font-black uppercase text-white"><BadgeDollarSign size={20} /> Suggested Points Plan</h3>
    <p className="mt-2 text-xs leading-relaxed text-slate-500">These are recommendations calculated from verified needs, risks, and budgets—not values claimed to come from CFB 27.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Recruiting pool</p><p className="mt-1 text-xl font-black text-white">{valueLabel(model.recruitingBudget, ' pts')}</p>
        <div className="mt-3 space-y-2">{model.recruitingAllocation.map((row) => <div key={row.key} className="flex justify-between text-xs"><span className="font-bold text-slate-300">{row.label} need</span><span className="font-mono font-black text-amber-400">{row.suggestedPoints.toLocaleString()} pts</span></div>)}{!model.recruitingAllocation.length && <p className="text-xs text-slate-600">Verify both the recruiting pool and position needs to calculate a plan.</p>}</div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Retention pool</p><p className="mt-1 text-xl font-black text-white">{valueLabel(model.retentionBudget, ' pts')}</p>
        <div className="mt-3 space-y-2">{model.retentionAllocation.map((row) => <div key={row.id} className="flex justify-between gap-3 text-xs"><span className="truncate font-bold text-slate-300">{row.name}</span><span className="font-mono font-black text-emerald-400">{row.suggestedPoints.toLocaleString()} pts</span></div>)}{!model.retentionAllocation.length && <p className="text-xs text-slate-600">Verify the retention pool and at-risk players to calculate a plan.</p>}</div>
      </div>
    </div>
  </section>
);

const OffseasonPlanner = ({ state, onNavigate, readOnly = false }) => {
  const model = buildOffseasonPlanner(state);
  if (!model.hasOffice) return (
    <div className="relative z-10 mx-auto max-w-3xl rounded-2xl border border-slate-700 bg-slate-900/90 p-10 text-center shadow-2xl">
      <LockKeyhole size={42} className="mx-auto text-slate-600" /><h2 className="mt-4 text-2xl font-black uppercase text-white">Offseason Planner Locked</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">This office unlocks after your verified offensive-coordinator hiring milestone.</p>
    </div>
  );

  return (
    <div className="relative z-10 mx-auto max-w-7xl space-y-6 pb-20 animate-in fade-in">
      <header className="rounded-2xl border border-slate-700/50 bg-slate-900/90 p-6 shadow-2xl">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">Football Operations</p><h2 className="mt-1 text-3xl font-black uppercase tracking-tight text-white">Offseason War Room</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">Build the retention, portal, and recruiting-class plan from verified CFB 27 screenshots while keeping authority realistic for your current coaching role.</p><div className="mt-4 flex gap-2"><span className="rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-[9px] font-black uppercase text-slate-300">{model.roleLabel}</span><span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[9px] font-black uppercase text-blue-300">{model.authorityLabel}</span></div></div>
          {!readOnly && state.careerPhase !== 'Retired' && <button type="button" onClick={() => onNavigate('dataEntry')} className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-950"><ScanLine size={16} /> Upload offseason screens</button>}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3"><SummaryCard label="Open scholarships" entry={model.classSummary.openScholarships} icon={GraduationCap} /><SummaryCard label="Class commits" entry={model.classSummary.classCommits} icon={Users} /><SummaryCard label="Portal additions" entry={model.classSummary.portalAdditions} icon={ArrowRightLeft} /></div>
      <div className="grid gap-6 xl:grid-cols-2"><NeedsBoard model={model} /><RetentionBoard model={model} /></div>
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/85 p-6 shadow-2xl"><h3 className="text-xl font-black uppercase text-white">Class & Portal Plan</h3><p className="mt-1 text-xs text-slate-500">Verified targets are separated by their visible status.</p><div className="mt-5 grid gap-4 lg:grid-cols-3"><TargetList title="High-school / JUCO" icon={GraduationCap} rows={model.prepTargets} needs={model.actionableNeeds} /><TargetList title="Transfer portal" icon={ArrowRightLeft} rows={model.portalTargets} needs={model.actionableNeeds} /><TargetList title="Committed / signed" icon={UserCheck} rows={model.commitments} needs={model.actionableNeeds} /></div></section>
      <AllocationPlan model={model} />
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/85 p-6 shadow-2xl"><h3 className="text-lg font-black uppercase text-white">War Room Briefing</h3><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{model.alerts.map((alert) => <div key={`${alert.title}-${alert.text}`} className={`rounded-xl border p-4 ${toneClasses[alert.tone] || toneClasses.info}`}><div className="flex gap-2">{alert.tone === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}<div><p className="text-[10px] font-black uppercase tracking-wider">{alert.title}</p><p className="mt-1 text-xs leading-relaxed opacity-80">{alert.text}</p></div></div></div>)}</div></section>
    </div>
  );
};

export default OffseasonPlanner;
