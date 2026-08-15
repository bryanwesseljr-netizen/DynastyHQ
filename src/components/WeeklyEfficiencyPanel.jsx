import { CheckCircle2, RefreshCcw, Sparkles, TrendingUp } from 'lucide-react';
import { buildChangeOnlyModel } from '../domain/betweenGames';

const WeeklyEfficiencyPanel = ({ state = {}, rtgUpdate = {}, isCoach = false, isHighSchoolCareer = false }) => {
  if (isHighSchoolCareer) return null;

  if (isCoach) {
    return (
      <section className="mb-4 rounded-xl border border-blue-400/20 bg-slate-900/75 p-4 shadow-lg backdrop-blur">
        <div className="flex items-start gap-3">
          <RefreshCcw size={16} className="mt-0.5 shrink-0 text-blue-300" />
          <div>
            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-300">Change-only program updates</div>
            <p className="mt-1 text-[9px] leading-relaxed text-slate-400">Keep the saved coach/program values unless CFB 27 shows a change. The scanner can update changed fields; you do not need to re-enter stable values every week.</p>
          </div>
        </div>
      </section>
    );
  }

  const model = buildChangeOnlyModel({ state, rtgUpdate });

  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-emerald-400/20 bg-slate-900/75 shadow-lg backdrop-blur" aria-labelledby="change-only-title">
      <div className="flex flex-col gap-3 border-b border-white/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.14em] text-emerald-300"><Sparkles size={12} /> Faster Weekly Entry</div>
          <h3 id="change-only-title" className="mt-1 text-sm font-black text-white">Only touch what changed</h3>
          <p className="mt-1 text-[9px] leading-relaxed text-slate-400">Your last verified RTG values stay in the form. If CFB 27 shows the same value, leave it alone. Upload or edit only the fields that changed.</p>
        </div>
        <span className="shrink-0 rounded border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-[7px] font-black uppercase tracking-wider text-slate-400">Baseline · {model.baselineLabel}</span>
      </div>

      <div className="grid gap-px bg-white/[0.06] sm:grid-cols-3">
        <div className="bg-slate-950/70 px-4 py-3 text-center"><div className="text-[7px] font-black uppercase tracking-wider text-slate-500">Changed now</div><div className={`mt-1 text-xl font-black ${model.changedCount ? 'text-amber-300' : 'text-emerald-300'}`}>{model.changedCount}</div></div>
        <div className="bg-slate-950/70 px-4 py-3 text-center"><div className="text-[7px] font-black uppercase tracking-wider text-slate-500">Carry forward</div><div className="mt-1 text-xl font-black text-white">{model.carriedCount}</div></div>
        <div className="bg-slate-950/70 px-4 py-3 text-center"><div className="text-[7px] font-black uppercase tracking-wider text-slate-500">Not captured</div><div className="mt-1 text-xl font-black text-slate-400">{model.unknownCount}</div></div>
      </div>

      <div className="px-4 py-3">
        {model.changed.length ? (
          <div>
            <div className="mb-2 flex items-center gap-2 text-[7px] font-black uppercase tracking-wider text-amber-300"><TrendingUp size={11} /> Pending RTG changes</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {model.changed.map((field) => (
                <div key={field.key} className="rounded border border-amber-400/20 bg-amber-500/5 p-2.5">
                  <div className="text-[7px] font-black uppercase tracking-wider text-slate-500">{field.label}</div>
                  <div className="mt-1 text-[9px] font-black text-white"><span className="text-slate-600">{field.baselineDisplay}</span> → {field.draftDisplay}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded border border-emerald-400/15 bg-emerald-500/5 p-3">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />
            <div><div className="text-[8px] font-black text-emerald-300">No RTG changes entered yet</div><p className="mt-1 text-[8px] leading-relaxed text-slate-400">That is okay. Stable verified values can carry forward without you retyping them. Unknown values remain unknown until a screenshot or manual entry verifies them.</p></div>
          </div>
        )}

        {(model.carried.length || model.unknown.length) ? (
          <details className="group mt-2 rounded border border-slate-800 bg-slate-950/35">
            <summary className="cursor-pointer list-none px-3 py-2 text-[7px] font-black uppercase tracking-wider text-slate-400 hover:text-white">See carry-forward / unknown fields</summary>
            <div className="grid gap-px border-t border-white/[0.06] bg-white/[0.05] sm:grid-cols-2 lg:grid-cols-3">
              {[...model.carried, ...model.unknown].map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-3 bg-slate-950/75 px-3 py-2 text-[7px]">
                  <span className="font-bold text-slate-400">{field.label}</span>
                  <span className={`font-black ${field.status === 'carry' ? 'text-emerald-300' : 'text-slate-600'}`}>{field.status === 'carry' ? `${field.baselineDisplay} · unchanged` : 'Not captured'}</span>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
};

export default WeeklyEfficiencyPanel;
