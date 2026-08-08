import { CheckCircle2, MinusCircle, Star, Target, XCircle } from 'lucide-react';
import {
  HIGH_SCHOOL_MOMENT_TYPES,
  HIGH_SCHOOL_OBJECTIVE_RESULTS,
  normalizeHighSchoolEvaluation,
  summarizeHighSchoolMoments,
} from '../domain/highSchoolEvaluation';

const resultPresentation = {
  success: { label: 'Successful', icon: CheckCircle2, className: 'text-emerald-400' },
  partial: { label: 'Partial', icon: MinusCircle, className: 'text-amber-400' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-red-400' },
  '': { label: 'Awaiting results', icon: Target, className: 'text-slate-600' },
};

const HighSchoolEvaluationEditor = ({ value, onChange }) => {
  const evaluation = normalizeHighSchoolEvaluation(value);
  const summary = summarizeHighSchoolMoments(evaluation);
  const update = (patch) => onChange({ ...evaluation, ...patch });
  const updateMoment = (index, patch) => update({
    moments: evaluation.moments.map((moment, momentIndex) => momentIndex === index ? { ...moment, ...patch } : moment),
  });
  const updateObjective = (momentIndex, objectiveIndex, patch) => updateMoment(momentIndex, {
    objectives: evaluation.moments[momentIndex].objectives.map((objective, index) => (
      index === objectiveIndex ? { ...objective, ...patch } : objective
    )),
  });

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">High-school Game {evaluation.gameNumber} of 5</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-300">Each standard moment has two objectives: passing both is Successful, passing one is Partial, and failing both is Failed. When a school presents a Scholarship Challenge, record its one major objective instead. Tape Score comes from the game; DynastyHQ never estimates points.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {evaluation.moments.map((moment, index) => {
          const presentation = resultPresentation[moment.result] || resultPresentation[''];
          const Icon = presentation.icon;
          const isScholarship = moment.type === HIGH_SCHOOL_MOMENT_TYPES.SCHOLARSHIP;
          const activeObjectives = moment.objectives.slice(0, isScholarship ? 1 : 2);
          return (
            <div key={moment.id} className="rounded-xl border border-slate-700 bg-slate-950/55 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">Moment {moment.id}</p>
                <span className={`flex items-center gap-1 text-[9px] font-black uppercase ${presentation.className}`}><Icon size={15} /> {presentation.label}</span>
              </div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Moment format</label>
              <select aria-label={`Moment ${moment.id} format`} value={moment.type} onChange={(event) => updateMoment(index, { type: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs font-black text-white outline-none focus:border-blue-400">
                <option value={HIGH_SCHOOL_MOMENT_TYPES.STANDARD}>Standard moment · 2 objectives</option>
                <option value={HIGH_SCHOOL_MOMENT_TYPES.SCHOLARSHIP}>Scholarship Challenge · 1 major objective</option>
              </select>
              {isScholarship && (
                <div className="mt-3">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-amber-400">School presenting the challenge</label>
                  <input aria-label={`Moment ${moment.id} scholarship school`} value={moment.scholarshipSchool} onChange={(event) => updateMoment(index, { scholarshipSchool: event.target.value })} maxLength={120} className="mt-1 w-full rounded-lg border border-amber-500/40 bg-slate-900 p-2 text-xs text-white outline-none focus:border-amber-300" placeholder="e.g. Toledo" />
                </div>
              )}
              <div className="mt-3 space-y-3">
                {activeObjectives.map((objective, objectiveIndex) => (
                  <div key={objective.id} className={`rounded-lg border p-2 ${isScholarship ? 'border-amber-500/30 bg-amber-950/10' : 'border-slate-800 bg-slate-900/60'}`}>
                    <label className={`block text-[9px] font-black uppercase tracking-wider ${isScholarship ? 'text-amber-400' : 'text-slate-500'}`}>{isScholarship ? 'Major objective' : `Objective ${objective.id}`}</label>
                    <input aria-label={`Moment ${moment.id} objective ${objective.id}`} value={objective.text} onChange={(event) => updateObjective(index, objectiveIndex, { text: event.target.value })} maxLength={240} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white outline-none focus:border-blue-400" placeholder={isScholarship ? 'What did the school need to see?' : 'Enter the visible objective'} />
                    <select aria-label={`Moment ${moment.id} objective ${objective.id} result`} value={objective.result} onChange={(event) => updateObjective(index, objectiveIndex, { result: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs font-black text-white outline-none focus:border-blue-400">
                      <option value="">Choose objective result</option>
                      <option value={HIGH_SCHOOL_OBJECTIVE_RESULTS.PASSED}>Passed</option>
                      <option value={HIGH_SCHOOL_OBJECTIVE_RESULTS.FAILED}>Failed</option>
                    </select>
                  </div>
                ))}
              </div>
              {isScholarship && <p className="mt-2 text-[9px] leading-relaxed text-slate-500">Passing this challenge does not mark an official offer by itself. Verify the offer separately from the recruiting screen.</p>}
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
