import { useState } from 'react';
import { Briefcase, CheckCircle2, GraduationCap, Play, ShieldCheck } from 'lucide-react';
import { CAREER_STAGES } from '../domain/commandCenter';
import { isGraduationReady, normalizeCareerTransitions } from '../domain/careerTransitions';
import { countHighSchoolGames } from '../domain/playerRecruiting';
import { suggestCollegeOutlets } from '../domain/collegeNewsroom';

const checklistLabels = {
  finalSeasonComplete: 'Final playing season is complete',
  statsArchived: 'Final career statistics are archived',
  awardsReviewed: 'Awards and records are reviewed',
  transferDecisionClosed: 'Final transfer decision is closed',
};

const CareerTransitionPanel = ({
  state,
  stage,
  readOnly = false,
  onBeginCollege,
  onChecklistChange,
  onGraduate,
  onCreateCoachingUniverse,
  onBeginOcCareer,
}) => {
  const transitions = normalizeCareerTransitions(state.careerTransitions);
  const fiveGamesComplete = countHighSchoolGames(state) >= 5;
  const [outletProfile, setOutletProfile] = useState({ city: '', state: '', localOutletName: '', regionalOutletName: '' });

  const updateOutletProfile = (field, value) => setOutletProfile((current) => ({ ...current, [field]: value }));
  const applySuggestions = () => setOutletProfile((current) => ({
    ...current,
    ...suggestCollegeOutlets({ school: state.player?.college, city: current.city, state: current.state }),
  }));
  const outletProfileComplete = ['city', 'state', 'localOutletName', 'regionalOutletName']
    .every((field) => outletProfile[field].trim());

  if (stage === CAREER_STAGES.HIGH_SCHOOL && state.player?.isCommitted) {
    return (
      <section className="rounded-2xl border border-amber-400/40 bg-amber-950/20 p-6 shadow-2xl">
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300"><ShieldCheck size={16} /> Signing Day complete</p>
        <h2 className="mt-2 text-2xl font-black uppercase text-white">Begin the college chapter at {state.player.college}</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">This freezes high-school recruiting as permanent history, advances to the freshman college season, and changes future editions to local, regional, Film Room, and national college-football coverage.</p>
        {!readOnly && fiveGamesComplete && (
          <div className="mt-5 rounded-xl border border-amber-400/25 bg-slate-950/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">College Newsroom setup</p><p className="mt-1 text-xs leading-relaxed text-slate-400">Enter the school&rsquo;s city and state, then use the suggested fictional names or customize them.</p></div>
              <button type="button" disabled={!outletProfile.city.trim() || !outletProfile.state.trim()} onClick={applySuggestions} className="rounded-lg border border-amber-400/35 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-amber-200 disabled:opacity-40">Suggest outlet names</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">College city<input value={outletProfile.city} onChange={(event) => updateOutletProfile('city', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-white" placeholder="e.g. Toledo" /></label>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">State<input value={outletProfile.state} onChange={(event) => updateOutletProfile('state', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-white" placeholder="e.g. Ohio" /></label>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Local newspaper<input value={outletProfile.localOutletName} onChange={(event) => updateOutletProfile('localOutletName', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-white" placeholder="e.g. Toledo Gazette" /></label>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Regional outlet<input value={outletProfile.regionalOutletName} onChange={(event) => updateOutletProfile('regionalOutletName', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-white" placeholder="e.g. Ohio College Sports Report" /></label>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-slate-500">The national desk will use <strong className="text-slate-300">College Football Central</strong>, a modern ESPN-style national presentation. These names are stored with this college stop, so archived editions never change.</p>
          </div>
        )}
        {!readOnly && <button type="button" disabled={!fiveGamesComplete || !outletProfileComplete} onClick={() => onBeginCollege(outletProfile)} className="mt-5 flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"><Play size={15} /> {!fiveGamesComplete ? 'Complete all five high-school games' : outletProfileComplete ? 'Begin College Career' : 'Complete Newsroom setup'}</button>}
      </section>
    );
  }

  if (stage !== CAREER_STAGES.COLLEGE || readOnly) return null;

  if (!state.player?.graduated) {
    return (
      <details className="rounded-2xl border border-blue-500/30 bg-slate-950/90 p-6 shadow-2xl">
        <summary className="cursor-pointer list-none"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300"><GraduationCap size={16} /> End-of-RTG transition</p><h2 className="mt-2 text-2xl font-black uppercase text-white">Graduation checklist</h2><p className="mt-2 text-sm text-slate-400">Open this only when your college playing career is actually finished.</p></summary>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {Object.entries(checklistLabels).map(([field, label]) => <label key={field} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm font-bold text-slate-300"><input type="checkbox" checked={Boolean(transitions.graduationChecklist[field])} onChange={(event) => onChecklistChange(field, event.target.checked)} className="accent-blue-500" /> {label}</label>)}
        </div>
        <button type="button" disabled={!isGraduationReady(state)} onClick={onGraduate} className="mt-5 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"><CheckCircle2 size={15} /> Archive RTG career and graduate</button>
      </details>
    );
  }

  if (!transitions.coachingUniverseCreated) {
    return (
      <section className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 shadow-2xl">
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300"><Briefcase size={16} /> Playing career archived</p>
        <h2 className="mt-2 text-2xl font-black uppercase text-white">Create the Coaching Universe</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">Your full RTG record stays intact. The active recruiting board resets so high-school schools can never leak into your coordinator career.</p>
        <button type="button" onClick={onCreateCoachingUniverse} className="mt-5 rounded-xl bg-emerald-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-950">Create Coaching Universe</button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-400/40 bg-slate-950/90 p-6 shadow-2xl">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Coaching universe ready</p>
      <h2 className="mt-2 text-2xl font-black uppercase text-white">Begin as OC at {state.player.graduationSchool || state.player.college}</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-400">This follows the career rule: your first coaching job begins at the final school of your Road to Glory career.</p>
      <button type="button" onClick={onBeginOcCareer} className="mt-5 flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-950"><Play size={15} /> Begin Offensive Coordinator Career</button>
    </section>
  );
};

export default CareerTransitionPanel;
