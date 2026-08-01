import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardList,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react';
import { buildPersonnelOffice } from '../domain/personnelOffice.js';

const toneClasses = {
  info: 'border-blue-500/30 bg-blue-950/30 text-blue-100',
  success: 'border-emerald-500/30 bg-emerald-950/30 text-emerald-100',
  warning: 'border-amber-500/30 bg-amber-950/30 text-amber-100',
  danger: 'border-red-500/30 bg-red-950/30 text-red-100',
};

const FactStatus = ({ fact }) => fact ? (
  <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300">
    <ShieldCheck size={11} /> Verified
  </span>
) : (
  <span className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
    <LockKeyhole size={11} /> Unverified
  </span>
);

const numberLabel = (entry) => entry.value === null ? 'Not verified' : entry.value.toLocaleString();

const BudgetOffice = ({ model }) => (
  <section className="rounded-2xl border border-slate-700/50 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-md">
    <div className="flex flex-col justify-between gap-4 border-b border-slate-700/60 pb-4 sm:flex-row sm:items-center">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">CFO desk</p>
        <h3 className="mt-1 flex items-center gap-2 text-xl font-black uppercase text-white"><BadgeDollarSign size={20} /> Dynasty Points Allocation</h3>
      </div>
      <FactStatus fact={model.budget.total.fact} />
    </div>

    <div className="mt-5 grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Verified total</p>
        <p className="mt-1 text-2xl font-black text-white">{model.budget.formattedTotal}</p>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Allocated</p>
        <p className="mt-1 text-2xl font-black text-amber-400">{model.budget.verifiedCount === 5 ? `${model.budget.allocations.toLocaleString()} pts` : 'Incomplete'}</p>
      </div>
      <div className={`rounded-xl border p-4 ${model.budget.overBudget ? 'border-red-500/50 bg-red-950/40' : 'border-slate-700 bg-slate-950/60'}`}>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Unallocated</p>
        <p className={`mt-1 text-2xl font-black ${model.budget.overBudget ? 'text-red-400' : 'text-emerald-400'}`}>{model.budget.formattedRemaining}</p>
      </div>
    </div>

    <div className="mt-5 overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/50">
      {model.budget.rows.map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-4 border-b border-slate-800 px-4 py-3 last:border-0">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-200">{row.label}</p>
            {!row.fact && row.fallback !== null && <p className="mt-0.5 text-[9px] text-slate-600">Legacy value exists but needs screenshot verification.</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-black text-white">{numberLabel(row)}{row.value === null ? '' : ' pts'}</span>
            <FactStatus fact={row.fact} />
          </div>
        </div>
      ))}
    </div>
    <p className="mt-4 text-[10px] leading-relaxed text-slate-500">Missing categories stay unknown. DynastyHQ does not treat an absent screenshot value as zero or invent an allocation.</p>
  </section>
);

const PersonnelBoard = ({ model, onNavigate }) => (
  <section className="rounded-2xl border border-slate-700/50 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-md">
    <div className="flex flex-col justify-between gap-4 border-b border-slate-700/60 pb-4 sm:flex-row sm:items-center">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Director of Player Personnel</p>
        <h3 className="mt-1 flex items-center gap-2 text-xl font-black uppercase text-white"><Users size={20} /> Verified Target Board</h3>
      </div>
      <button type="button" onClick={() => onNavigate('recruiting')} className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:border-amber-500/60 hover:bg-slate-700">Open full board</button>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        ['Visible', model.targetSummary.visible],
        ['Verified', model.targetSummary.verified],
        ['Offers', model.targetSummary.offered],
        ['High interest', model.targetSummary.highInterest],
      ].map(([label, value]) => (
        <div key={label} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-center">
          <p className="text-2xl font-black text-white">{value}</p>
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p>
        </div>
      ))}
    </div>

    <div className="mt-5 space-y-2">
      {!model.targets.length && <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">No eligible targets are visible for this role.</div>}
      {model.targets.map((target, index) => (
        <div key={target.id || `${target.name}-${index}`} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/55 p-3">
          <div className="text-center text-lg font-black text-slate-600">{index + 1}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-black text-white">{target.name}</p>
              {target.position && <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-black text-amber-300">{target.position}</span>}
              {target.stars && <span className="text-[9px] font-black text-amber-400">{'★'.repeat(Math.min(5, Math.max(1, Math.round(target.stars))))}</span>}
            </div>
            <p className="mt-1 text-[10px] text-slate-500">{target.status || 'Status not verified'} · {target.offered ? 'Offer verified' : 'No verified offer'}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-black text-white">{target.interest === null ? '—' : `${target.interest}%`}</p>
            <p className={`text-[8px] font-black uppercase tracking-wider ${target.verified ? 'text-emerald-400' : 'text-slate-600'}`}>{target.verified ? 'Verified data' : 'Needs scan'}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const PersonnelCfoWorkspace = ({ state, onNavigate, readOnly = false }) => {
  const model = buildPersonnelOffice(state);
  if (!model.hasOffice) {
    return (
      <div className="relative z-10 mx-auto max-w-3xl rounded-2xl border border-slate-700 bg-slate-900/90 p-10 text-center shadow-2xl">
        <LockKeyhole size={42} className="mx-auto text-slate-600" />
        <h2 className="mt-4 text-2xl font-black uppercase text-white">Program Office Locked</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">The Director of Player Personnel and CFO workspace unlocks after your verified offensive-coordinator hiring milestone.</p>
        <button type="button" onClick={() => onNavigate('dashboard')} className="mt-6 rounded-lg bg-amber-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-950">Return to Command Center</button>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto max-w-7xl space-y-6 pb-20 animate-in fade-in">
      <header className="rounded-2xl border border-slate-700/50 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">Football Operations</p>
            <h2 className="mt-1 text-3xl font-black uppercase tracking-tight text-white">Personnel & NIL/CFO Office</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300">{model.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-300">{model.roleLabel}</span>
              <span className={`rounded border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${model.readOnly ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>{model.authorityLabel}</span>
            </div>
          </div>
          {!readOnly && state.careerPhase !== 'Retired' && (
            <button type="button" onClick={() => onNavigate('dataEntry')} className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">
              <ScanLine size={16} /> Upload office screens
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/85 p-5 shadow-xl"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Roster size</p><p className="mt-1 text-2xl font-black text-white">{numberLabel(model.roster.size)}</p><div className="mt-2"><FactStatus fact={model.roster.size.fact} /></div></div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/85 p-5 shadow-xl"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Scholarships used</p><p className="mt-1 text-2xl font-black text-white">{numberLabel(model.roster.scholarshipsUsed)}</p><div className="mt-2"><FactStatus fact={model.roster.scholarshipsUsed.fact} /></div></div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/85 p-5 shadow-xl"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Portal departures</p><p className="mt-1 text-2xl font-black text-white">{numberLabel(model.roster.portalDepartures)}</p><div className="mt-2"><FactStatus fact={model.roster.portalDepartures.fact} /></div></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <PersonnelBoard model={model} onNavigate={onNavigate} />
        <BudgetOffice model={model} />
      </div>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-md">
        <h3 className="flex items-center gap-2 text-lg font-black uppercase text-white"><ClipboardList size={18} className="text-amber-400" /> Front Office Briefing</h3>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Verified facts only · role-aware recommendations</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {model.alerts.map((alert) => (
            <div key={`${alert.title}-${alert.text}`} className={`rounded-xl border p-4 ${toneClasses[alert.tone] || toneClasses.info}`}>
              <div className="flex items-start gap-2">
                {alert.tone === 'danger' || alert.tone === 'warning' ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : (alert.tone === 'success' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <Target size={16} className="mt-0.5 shrink-0" />)}
                <div><p className="text-[10px] font-black uppercase tracking-wider">{alert.title}</p><p className="mt-1 text-xs leading-relaxed opacity-80">{alert.text}</p></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PersonnelCfoWorkspace;
