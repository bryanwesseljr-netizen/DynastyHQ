import { CheckCircle2, MinusCircle, Star, Target, XCircle } from 'lucide-react';
import { HIGH_SCHOOL_MOMENT_RESULTS, normalizeHighSchoolEvaluation, summarizeHighSchoolMoments } from '../domain/highSchoolEvaluation';

const resultOptions = [
  { value: '', label: 'Choose result', icon: Target },
  { value: HIGH_SCHOOL_MOMENT_RESULTS.SUCCESS, label: 'Successful', icon: CheckCircle2 },
  { value: HIGH_SCHOOL_MOMENT_RESULTS.PARTIAL, label: 'Partial', icon: MinusCircle },
  { value: HIGH_SCHOOL_MOMENT_RESULTS.FAILED, label: 'Failed', icon: XCircle },
];

const HighSchoolEvaluationEditor = ({ value, onChange }) => {
  const evaluation = normalizeHighSchoolEvaluation(value);
  const summary = summarizeHighSchoolMoments(evaluation);
  const update = (patch) => onChange({ ...evaluation, ...patch });
  const updateMoment = (index, patch) => update({
    moments: evaluation.moments.map((moment, momentIndex) => momentIndex === index ? { ...moment, ...patch } : moment),
  });

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">High-school Game {evaluation.gameNumber} of 5</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-300">Record the four playable moments. Use Partial when a Highlight Moment awarded credit for only some visible objectives. Tape Score comes from the game after the evaluation; DynastyHQ does not estimate points.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {evaluation.moments.map((moment, index) => {
          const selected = resultOptions.find((option) => option.value === moment.result);
          const Icon = selected?.icon || Target;
          return (
            <div key={moment.id} className="rounded-xl border border-slate-700 bg-slate-950/55 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">Moment {moment.id}</p>
                <Icon size={15} className={moment.result === 'success' ? 'text-emerald-400' : moment.result === 'partial' ? 'text-amber-400' : moment.result === 'failed' ? 'text-red-400' : 'text-slate-600'} />
              </div>
              <select aria-label={`Moment ${moment.id} result`} value={moment.result} onChange={(event) => updateMoment(index, { result: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs font-black text-white outline-none focus:border-blue-400">
                {resultOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <label className="mt-3 block text-[9px] font-black uppercase tracking-wider text-slate-500">Visible objective (optional)</label>
              <input aria-label={`Moment ${moment.id} visible objective`} value={moment.objective} onChange={(event) => updateMoment(index, { objective: event.target.value })} maxLength={240} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white outline-none focus:border-blue-400" placeholder="e.g. Complete a pass on the run" />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-700 bg-slate-950/55 p-4 sm:grid-cols-4">
        <div><p className="text-[9px] font-black uppercase text-slate-500">Successful</p><p className="mt-1 text-xl font-black text-emerald-400">{summary.success}</p></div>
        <div><p className="text-[9px] font-black uppercase text-slate-500">Partial</p><p className="mt-1 text-xl font-black text-amber-400">{summary.partial}</p></div>
        <div><p className="text-[9px] font-black uppercase text-slate-500">Failed</p><p className="mt-1 text-xl font-black text-red-400">{summary.failed}</p></div>
        <div><p className="text-[9px] font-black uppercase text-slate-500">Recorded</p><p className="mt-1 text-xl font-black text-white">{summary.completed}/4</p></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400">Tape Score before</label>
          <input aria-label="Tape Score before the high-school game" value={evaluation.tapeScoreBefore} readOnly className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 font-mono text-sm text-slate-500" />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400">Tape Score after</label>
          <input aria-label="Tape Score after the high-school game" type="number" min="0" value={evaluation.tapeScoreAfter} onChange={(event) => update({ tapeScoreAfter: event.target.value })} className="mt-1 w-full rounded-lg border border-blue-500/40 bg-slate-950 p-2 font-mono text-sm font-black text-blue-300 outline-none focus:border-blue-300" placeholder="Shown after Game" />
          {summary.tapeScoreDelta !== null && <p className={`mt-1 text-[10px] font-black ${summary.tapeScoreDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{summary.tapeScoreDelta >= 0 ? '+' : '−'}{Math.abs(summary.tapeScoreDelta).toLocaleString()} this game</p>}
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400">Recruit rating before</label>
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 p-2 text-sm font-black text-slate-500"><Star size={14} /> {evaluation.recruitStarsBefore}-star</div>
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400">Recruit rating after</label>
          <select aria-label="Recruit star rating after the high-school game" value={evaluation.recruitStarsAfter} onChange={(event) => update({ recruitStarsAfter: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-amber-500/40 bg-slate-950 p-2 text-sm font-black text-amber-300 outline-none focus:border-amber-300">
            {[1, 2, 3, 4, 5].map((stars) => <option key={stars} value={stars}>{stars}-star</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-black uppercase text-slate-400">Verified Team Impact play (optional)</label>
        <textarea aria-label="Verified Team Impact play" value={evaluation.teamImpact} onChange={(event) => update({ teamImpact: event.target.value })} maxLength={500} rows={2} className="mt-1 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white outline-none focus:border-blue-400" placeholder="Only enter an impactful play you saw or a Team Impact item shown by the game." />
      </div>
    </div>
  );
};

export default HighSchoolEvaluationEditor;
