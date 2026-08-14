import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react';
import { buildRecruitingCommand } from '../domain/recruitingCommand.js';

const actionTone = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  neutral: 'border-slate-700 bg-slate-900 text-slate-400',
};

const metricValue = (metric) => metric.verified
  ? (metric.value === null ? '—' : metric.value.toLocaleString())
  : 'Not verified';

const CoachRecruitingCommandCenter = ({ state, onNavigate }) => {
  const model = buildRecruitingCommand(state);

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-950/90 shadow-2xl backdrop-blur-md">
      <div className="border-b border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/30 p-6 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">Recruiting Command Center</p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white md:text-4xl">Build the roster, not just the class</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">DynastyHQ separates verified roster needs from recruiting-board leverage. If the game has not shown a need, this screen will not invent one.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-300">{model.roleLabel}</span>
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-300">{model.authorityLabel}</span>
            </div>
          </div>
          <button type="button" onClick={() => onNavigate?.('dataEntry')} className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">
            <ScanLine size={16} /> Upload roster / board screens
          </button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-800 p-5 sm:grid-cols-2 xl:grid-cols-4 md:p-6">
        {[
          ['Verified targets', model.targetSummary.verified, ShieldCheck],
          ['Verified offers', model.targetSummary.offered, CheckCircle2],
          ['High interest', model.targetSummary.highInterest, Target],
          ['Roster inputs', `${model.verifiedRosterMetrics}/6`, Users],
        ].map(([label, value, Icon]) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/75 p-4">
            <div className="flex items-center justify-between gap-2"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p><Icon size={16} className="text-amber-400" /></div>
            <p className="mt-2 text-2xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-[1.05fr_0.95fr] md:p-6">
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">Roster Needs Foundation</p>
                <h3 className="mt-1 text-xl font-black uppercase text-white">What the roster actually tells us</h3>
              </div>
              <span className={`rounded border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${model.rosterReadiness === 'ready' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : model.rosterReadiness === 'partial' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-950 text-slate-500'}`}>
                {model.rosterReadiness === 'ready' ? 'Roster picture ready' : model.rosterReadiness === 'partial' ? 'Partial roster picture' : 'Needs roster scan'}
              </span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {model.rosterMetrics.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">{metric.label}</p>
                    {metric.verified ? <ShieldCheck size={12} className="text-emerald-400" /> : <LockKeyhole size={12} className="text-slate-700" />}
                  </div>
                  <p className={`mt-1 text-sm font-black ${metric.verified ? 'text-white' : 'text-slate-600'}`}>{metricValue(metric)}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-300">Position priorities</h4>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Verified only</span>
              </div>
              {model.positionNeeds.length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {model.positionNeeds.map((need) => (
                    <div key={need.group} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-white">{need.group}</p><p className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300">{need.priority}</p></div>{need.targetCount !== null && <span className="rounded bg-slate-950 px-2 py-1 text-[9px] font-black text-white">Target {need.targetCount}</span>}</div>
                      {need.reason && <p className="mt-2 text-[10px] leading-relaxed text-slate-400">{need.reason}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-5 text-center">
                  <ClipboardList size={20} className="mx-auto text-slate-600" />
                  <p className="mt-2 text-xs font-black uppercase text-slate-400">No position need has been verified yet</p>
                  <p className="mx-auto mt-1 max-w-lg text-[10px] leading-relaxed text-slate-600">This is intentional. DynastyHQ will not infer a QB, OL, CB, or any other need from reputation or guesswork. A roster/depth screen has to support it first.</p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-blue-500/20 bg-blue-950/15 p-4">
            <div className="flex items-start gap-3">
              {model.rosterReadiness === 'needs-data' ? <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" /> : <Target size={18} className="mt-0.5 shrink-0 text-blue-400" />}
              <div><p className="text-[10px] font-black uppercase tracking-wider text-blue-300">Next recruiting action</p><p className="mt-1 text-sm font-black text-white">{model.nextAction.title}</p><p className="mt-1 text-xs leading-relaxed text-slate-400">{model.nextAction.detail}</p></div>
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-400">Decision Center</p><h3 className="mt-1 text-xl font-black uppercase text-white">Board leverage</h3></div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Need fit waits for roster data</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">These labels use only verified offer/interest data. They do not claim a prospect fills a roster need until position context exists.</p>
          <div className="mt-4 space-y-2">
            {!model.targets.length && <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-xs text-slate-500">No visible recruiting targets for this role yet.</div>}
            {model.targets.slice(0, 6).map((target, index) => (
              <div key={target.id || `${target.name}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/55 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-black text-white">{target.name}</p>{target.position && <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-black text-amber-300">{target.position}</span>}</div><p className="mt-1 text-[10px] text-slate-500">{target.offered ? 'Offer verified' : 'No verified offer'} · {target.interest === null || target.interest === undefined ? 'Interest not verified' : `${target.interest}% interest`}</p></div>
                  <span className={`shrink-0 rounded border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${actionTone[target.action.tone] || actionTone.neutral}`}>{target.action.label}</span>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-600">{target.action.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
};

export default CoachRecruitingCommandCenter;
