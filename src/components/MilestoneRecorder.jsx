import { useMemo, useState } from 'react';
import { CheckCircle2, Flag, ShieldCheck } from 'lucide-react';
import {
  MILESTONE_DEFINITIONS,
  MILESTONE_TYPES,
  validateMilestoneDraft,
} from '../domain/milestoneEngine';

const emptyDraft = ({ season, week, institution }) => ({
  type: MILESTONE_TYPES.COMMITMENT,
  season: season || 1,
  week: week || 1,
  institution: institution || '',
  previousInstitution: '',
  achievement: '',
  notes: '',
  confirmed: false,
});

const MilestoneRecorder = ({ season, week, institution, onPublish }) => {
  const [draft, setDraft] = useState(() => emptyDraft({ season, week, institution }));
  const [attempted, setAttempted] = useState(false);
  const definition = MILESTONE_DEFINITIONS[draft.type];
  const errors = useMemo(() => validateMilestoneDraft(draft), [draft]);
  const showPreviousInstitution = Boolean(definition.previousInstitutionLabel);
  const showAchievement = Boolean(definition.achievementLabel);

  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value, ...(key === 'type' ? { confirmed: false } : {}) }));

  const submit = () => {
    setAttempted(true);
    if (Object.keys(errors).length) return;
    const published = onPublish(draft);
    if (published !== false) {
      setDraft(emptyDraft({ season, week, institution }));
      setAttempted(false);
    }
  };

  return (
    <section className="rounded-xl border border-amber-500/25 bg-slate-950/50 p-4 shadow-inner">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2"><Flag className="text-amber-400" size={18} /></div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-white">Verified Career Milestone</h4>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">Record major events separately from weekly stats. Each entry writes user-confirmed facts to the Ledger and permanent Chronicle.</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-500">Milestone type</span>
          <select value={draft.type} onChange={(event) => change('type', event.target.value)} className="w-full rounded border border-slate-700 bg-slate-900 p-2.5 text-xs font-bold text-white">
            {Object.entries(MILESTONE_DEFINITIONS).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}
          </select>
          <span className="mt-1.5 block text-[10px] leading-relaxed text-slate-500">{definition.description}</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-500">Season</span>
            <input type="number" min="1" value={draft.season} onChange={(event) => change('season', event.target.value)} className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-xs text-white" />
            {attempted && errors.season && <span className="mt-1 block text-[9px] text-red-400">{errors.season}</span>}
          </label>
          <label>
            <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-500">Week</span>
            <input type="number" min="1" value={draft.week} onChange={(event) => change('week', event.target.value)} className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-xs text-white" />
            {attempted && errors.week && <span className="mt-1 block text-[9px] text-red-400">{errors.week}</span>}
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-500">{definition.institutionLabel || 'School (optional)'}</span>
          <input value={draft.institution} onChange={(event) => change('institution', event.target.value)} placeholder="Enter the exact school name" className="w-full rounded border border-slate-700 bg-slate-900 p-2.5 text-xs text-white placeholder:text-slate-600" />
          {attempted && errors.institution && <span className="mt-1 block text-[9px] text-red-400">{errors.institution}</span>}
        </label>

        {showPreviousInstitution && (
          <label className="block">
            <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-500">{definition.previousInstitutionLabel}</span>
            <input value={draft.previousInstitution} onChange={(event) => change('previousInstitution', event.target.value)} placeholder="Optional when not shown in the game" className="w-full rounded border border-slate-700 bg-slate-900 p-2.5 text-xs text-white placeholder:text-slate-600" />
          </label>
        )}

        {showAchievement && (
          <label className="block">
            <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-500">{definition.achievementLabel}</span>
            <input value={draft.achievement} onChange={(event) => change('achievement', event.target.value)} placeholder="Use the exact in-game wording" className="w-full rounded border border-slate-700 bg-slate-900 p-2.5 text-xs text-white placeholder:text-slate-600" />
            {attempted && errors.achievement && <span className="mt-1 block text-[9px] text-red-400">{errors.achievement}</span>}
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-500">Verified notes (optional)</span>
          <textarea value={draft.notes} onChange={(event) => change('notes', event.target.value)} rows="2" placeholder="Add only facts you personally confirmed." className="w-full resize-none rounded border border-slate-700 bg-slate-900 p-2.5 text-xs text-white placeholder:text-slate-600" />
        </label>

        <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${draft.confirmed ? 'border-emerald-500/35 bg-emerald-950/20' : 'border-slate-700 bg-slate-900/70'}`}>
          <input type="checkbox" checked={draft.confirmed} onChange={(event) => change('confirmed', event.target.checked)} className="mt-0.5 accent-emerald-500" />
          <span>
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-200"><ShieldCheck size={13} className="text-emerald-400" /> I verified this event</span>
            <span className="mt-1 block text-[10px] leading-relaxed text-slate-500">The game, a screenshot, or my own career record confirms every fact entered above.</span>
            {attempted && errors.confirmed && <span className="mt-1 block text-[9px] text-red-400">{errors.confirmed}</span>}
          </span>
        </label>

        <button type="button" onClick={submit} className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-950 transition-colors hover:bg-amber-400">
          <CheckCircle2 size={16} /> Publish Milestone
        </button>
      </div>
    </section>
  );
};

export default MilestoneRecorder;
