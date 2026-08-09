import { useState } from 'react';
import {
  ArrowRightLeft, CheckCircle2, Circle, ChevronDown, GraduationCap, Map, Plus, ShieldCheck, Star, Trash2,
} from 'lucide-react';
import {
  buildRecruitingTimeline,
  countHighSchoolGames,
  normalizePlayerRecruiting,
  sortedRecruitingSchools,
  TRANSFER_STATUSES,
} from '../domain/playerRecruiting';
import { suggestCollegeOutlets } from '../domain/collegeNewsroom';

const PlayerRecruitingWorkspace = ({
  state,
  careerStage,
  readOnly,
  commitOpen,
  onOpenCommit,
  onCloseCommit,
  onAddSchool,
  onUpdateSchool,
  onDeleteSchool,
  onToggleFinalist,
  onCommit,
  onOpenTransfer,
  onAddTransferTarget,
  onUpdateTransferTarget,
  onDeleteTransferTarget,
  onStay,
  onTransfer,
}) => {
  const [schoolInput, setSchoolInput] = useState('');
  const [transferInput, setTransferInput] = useState('');
  const playerRecruiting = normalizePlayerRecruiting(state.playerRecruiting);
  const schools = sortedRecruitingSchools(state.recruiting || []);
  const gamesComplete = countHighSchoolGames(state);
  const offers = schools.filter((school) => school.offered);
  const finalistIds = new Set(playerRecruiting.finalists);
  const finalists = schools.filter((school) => finalistIds.has(String(school.id)));
  const eligibleCommitments = finalists.filter((school) => school.offered);
  const canCommit = gamesComplete >= 5 && eligibleCommitments.length > 0;
  const timeline = buildRecruitingTimeline(state);
  const highSchool = playerRecruiting.highSchool;
  const committed = Boolean(state.player?.isCommitted);
  const transfer = playerRecruiting.transfer;
  const collegeCareerStarted = careerStage === 'College';

  const addSchool = (event) => {
    event.preventDefault();
    if (!schoolInput.trim()) return;
    onAddSchool(schoolInput.trim());
    setSchoolInput('');
  };

  const addTransfer = (event) => {
    event.preventDefault();
    if (!transferInput.trim()) return;
    onAddTransferTarget(transferInput.trim());
    setTransferInput('');
  };

  if (committed) {
    const archive = playerRecruiting.highSchoolArchive;
    return (
      <div className="relative z-10 mx-auto max-w-6xl space-y-6 pb-20 animate-in fade-in">
        <section className="overflow-hidden rounded-2xl border border-amber-400/40 bg-slate-950/90 shadow-2xl">
          <div className="bg-gradient-to-r from-amber-500 to-amber-300 p-6 text-slate-950 md:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em]">College Recruiting Hub</p>
            <h2 className="mt-1 text-3xl font-black uppercase md:text-4xl">Committed to {state.player.college}</h2>
            <p className="mt-2 max-w-3xl text-sm font-bold text-amber-950">Your high-school board is frozen as history. This screen stays quiet during college unless you intentionally explore the transfer portal.</p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-3 md:p-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Final rating</p><p className="mt-1 text-2xl font-black text-white">{archive?.starRating || state.player.stars || '—'}★</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Scholarship offers</p><p className="mt-1 text-2xl font-black text-white">{archive?.offerCount ?? offers.length}</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Transfer status</p><p className="mt-1 text-lg font-black text-emerald-400">{transfer.status === TRANSFER_STATUSES.EXPLORING ? 'Exploring options' : 'Staying put'}</p></div>
          </div>
        </section>

        {transfer.status !== TRANSFER_STATUSES.EXPLORING ? (
          <section className="rounded-2xl border border-slate-700/70 bg-slate-900/90 p-6 shadow-2xl">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-400"><ArrowRightLeft size={16} /> Transfer decision</p>
                <h3 className="mt-2 text-2xl font-black uppercase text-white">No active portal decision</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Nothing changes week to week. Open this only when the game reaches a real transfer decision; choosing to stay simply closes the window with no school change.</p>
              </div>
              {!readOnly && (
                <button type="button" disabled={!collegeCareerStarted} onClick={onOpenTransfer} className="rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500">
                  {collegeCareerStarted ? 'Explore transfer options' : 'Unlocks when college begins'}
                </button>
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-blue-500/35 bg-slate-900/95 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div><p className="text-xs font-black uppercase tracking-wider text-blue-400">Transfer Portal</p><h3 className="mt-1 text-2xl font-black uppercase text-white">Compare only the schools shown in-game</h3></div>
              {!readOnly && <button type="button" onClick={onStay} className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-4 py-2 text-xs font-black uppercase text-emerald-300">Stay at {state.player.college}</button>}
            </div>
            {!readOnly && <form onSubmit={addTransfer} className="mt-5 flex gap-2"><input value={transferInput} onChange={(event) => setTransferInput(event.target.value)} placeholder="Add a transfer option shown in CFB 27" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white" /><button className="rounded-lg bg-blue-600 px-4 text-white"><Plus size={17} /></button></form>}
            <div className="mt-5 space-y-3">
              {transfer.targets.map((target) => (
                <div key={target.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                    <input value={target.name} disabled={readOnly} onChange={(event) => onUpdateTransferTarget(target.id, 'name', event.target.value)} className="bg-transparent font-black text-white outline-none" />
                    <input value={target.projectedRole || ''} disabled={readOnly} onChange={(event) => onUpdateTransferTarget(target.id, 'projectedRole', event.target.value)} placeholder="Projected role" className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-xs text-white" />
                    <input value={target.fit || ''} disabled={readOnly} onChange={(event) => onUpdateTransferTarget(target.id, 'fit', event.target.value)} placeholder="Why it fits" className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-xs text-white" />
                    {!readOnly && <button type="button" onClick={() => onDeleteTransferTarget(target.id)} className="rounded border border-slate-700 p-2 text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>}
                  </div>
                  {!readOnly && (
                    <div className="mt-4 border-t border-slate-800 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[9px] font-black uppercase tracking-widest text-blue-400">New college Newsroom</p><button type="button" disabled={!target.city?.trim() || !target.state?.trim()} onClick={() => { const names = suggestCollegeOutlets({ school: target.name, city: target.city, state: target.state }); onUpdateTransferTarget(target.id, 'localOutletName', names.localOutletName); onUpdateTransferTarget(target.id, 'regionalOutletName', names.regionalOutletName); }} className="text-[9px] font-black uppercase tracking-wider text-amber-300 disabled:opacity-40">Suggest names</button></div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <input value={target.city || ''} onChange={(event) => onUpdateTransferTarget(target.id, 'city', event.target.value)} placeholder="College city" className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-xs text-white" />
                        <input value={target.state || ''} onChange={(event) => onUpdateTransferTarget(target.id, 'state', event.target.value)} placeholder="State" className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-xs text-white" />
                        <input value={target.localOutletName || ''} onChange={(event) => onUpdateTransferTarget(target.id, 'localOutletName', event.target.value)} placeholder="Local newspaper" className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-xs text-white" />
                        <input value={target.regionalOutletName || ''} onChange={(event) => onUpdateTransferTarget(target.id, 'regionalOutletName', event.target.value)} placeholder="Regional outlet" className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-xs text-white" />
                      </div>
                      <button type="button" disabled={!target.city?.trim() || !target.state?.trim() || !target.localOutletName?.trim() || !target.regionalOutletName?.trim()} onClick={() => onTransfer(target)} className="mt-3 rounded bg-amber-500 px-4 py-2 text-[10px] font-black uppercase text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500">Confirm transfer and switch outlets</button>
                    </div>
                  )}
                </div>
              ))}
              {!transfer.targets.length && <p className="rounded-xl border-2 border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">No transfer schools added. If you stay, close the window above and nothing else changes.</p>}
            </div>
          </section>
        )}

        <details className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-slate-300">View archived high-school recruiting history</summary>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {(archive?.finalists || finalists).map((school) => <div key={school.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3"><p className="font-black text-white">{school.name}</p><p className="mt-1 text-xs text-slate-500">Preference #{school.preferenceRank || school.customOrder || '—'}{school.offered ? ' · Scholarship offer' : ''}</p></div>)}
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="dhq-player-recruiting-workspace relative z-10 mx-auto max-w-7xl space-y-6 pb-20 animate-in fade-in">
      <section className="rounded-2xl border border-blue-500/30 bg-slate-950/90 p-6 shadow-2xl md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-blue-400"><Map size={16} /> High School Recruiting Tracker</p><h2 className="mt-2 text-3xl font-black uppercase text-white">Five games. One decision.</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Update the board from each postgame recruiting screen. DynastyHQ will carry verified movement into that week&rsquo;s Recruiting Wire article.</p></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-center"><p className="text-[9px] font-black uppercase text-slate-500">Games</p><p className="text-xl font-black text-white">{Math.max(gamesComplete, Number(highSchool.gameNumber) || 0)}/5</p></div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-center"><p className="text-[9px] font-black uppercase text-slate-500">Tape Score</p><p className="text-xl font-black text-blue-400">{Number(highSchool.tapeScore || 0).toLocaleString()}</p></div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-center"><p className="text-[9px] font-black uppercase text-slate-500">Top Schools</p><p className="text-xl font-black text-white">{highSchool.topSchoolsSelected || schools.length}/10</p></div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-center"><p className="text-[9px] font-black uppercase text-slate-500">Offers</p><p className="text-xl font-black text-emerald-400">{offers.length}</p></div>
          </div>
        </div>
        <div className="mt-6 grid gap-3 border-t border-slate-800 pt-5 sm:grid-cols-4">
          <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Recruit rating</p><p className="mt-1 text-lg font-black text-amber-400">{highSchool.recruitStars || state.player.stars || 3}-star</p></div>
          <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">National rank</p><p className="mt-1 text-lg font-black text-white">{highSchool.rankings.national ? `#${highSchool.rankings.national}` : 'Not captured'}</p></div>
          <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">State rank</p><p className="mt-1 text-lg font-black text-white">{highSchool.rankings.state ? `#${highSchool.rankings.state}` : 'Not captured'}</p></div>
          <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Position rank</p><p className="mt-1 text-lg font-black text-white">{highSchool.rankings.position ? `#${highSchool.rankings.position}` : 'Not captured'}</p></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/90 p-5 shadow-2xl md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h3 className="text-xl font-black uppercase text-white">Active School Board</h3><p className="mt-1 text-xs text-slate-500">Compact rankings replace the old four-column war room.</p></div>{!readOnly && <form onSubmit={addSchool} className="flex gap-2"><input value={schoolInput} onChange={(event) => setSchoolInput(event.target.value)} placeholder="Add school" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /><button className="rounded-lg bg-blue-600 px-3 text-white"><Plus size={16} /></button></form>}</div>
        <div className="mt-5 space-y-3">
          {schools.map((school, index) => {
            const finalist = finalistIds.has(String(school.id));
            const bonuses = Object.entries(school.scholarshipBonuses || {}).filter(([, value]) => value !== '' && value !== null && value !== undefined);
            return (
              <details key={school.id} className="group rounded-xl border border-slate-700 bg-slate-950/70 p-4 open:border-blue-500/40">
                <summary className="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 font-mono font-black text-blue-400">#{school.preferenceRank || index + 1}</span>
                    <div className="min-w-0"><input value={school.name} disabled={readOnly} onChange={(event) => onUpdateSchool(school.id, 'name', event.target.value)} onClick={(event) => event.stopPropagation()} className="w-full bg-transparent font-black text-white outline-none" /><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{school.projectedRole || 'Role not captured'} · {school.offensiveScheme || 'Scheme not captured'}</p></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-1 text-[9px] font-black uppercase ${school.schemeFit === true ? 'bg-emerald-500/15 text-emerald-300' : school.schemeFit === false ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>{school.schemeFit === true ? 'Scheme fit: Yes' : school.schemeFit === false ? 'Scheme fit: No' : 'Scheme fit unknown'}</span>
                    <span className={`rounded px-2 py-1 text-[9px] font-black uppercase ${school.offered ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>{school.offered ? 'Scholarship offer' : 'No offer'}</span>
                    <ChevronDown size={16} className="text-slate-500 transition-transform group-open:rotate-180" />
                  </div>
                </summary>
                <div className="mt-4 grid gap-4 border-t border-slate-800 pt-4 lg:grid-cols-[1fr_1fr_auto]">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-[9px] font-black uppercase text-slate-600">Tape requirement</p><p className="mt-1 font-bold text-white">{school.tapeScoreAssessed ?? '—'} / {school.tapeScoreRequired ?? '—'}</p></div>
                    <div><p className="text-[9px] font-black uppercase text-slate-600">Program</p><p className="mt-1 font-bold text-white">{school.programRatings?.overall || '—'} OVR · {school.programRatings?.offense || '—'} OFF · {school.programRatings?.defense || '—'} DEF</p></div>
                    <div><p className="text-[9px] font-black uppercase text-slate-600">Head coach</p><p className="mt-1 font-bold text-white">{school.headCoach || 'Not captured'}{school.coachLevel ? ` · Level ${school.coachLevel}` : ''}</p></div>
                    <div><p className="text-[9px] font-black uppercase text-slate-600">Tendencies</p><p className="mt-1 font-bold text-white">{school.tendencies?.run !== '' ? `${school.tendencies.run}% run / ${school.tendencies.pass}% pass` : 'Not captured'}</p></div>
                  </div>
                  <div className="space-y-2"><p className="text-[9px] font-black uppercase text-slate-600">Projected competition</p>{school.depthChart?.length ? school.depthChart.map((entry) => <p key={entry.role} className="rounded bg-slate-900 px-2 py-1.5 text-xs text-slate-300"><strong className="text-white">{entry.role}</strong> · {entry.summary}</p>) : <p className="text-xs text-slate-600">No depth chart captured.</p>}</div>
                  <div className="flex flex-wrap items-start gap-2 lg:max-w-52">{bonuses.length ? bonuses.map(([key, value]) => <span key={key} className="rounded border border-emerald-500/25 bg-emerald-950/20 px-2 py-1 text-[9px] font-bold uppercase text-emerald-300">{key.replace(/([A-Z])/g, ' $1')} +{value}</span>) : <span className="text-xs text-slate-600">Bonuses unlock with an offer.</span>}</div>
                </div>
                {!readOnly && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4"><label className="flex items-center gap-2 rounded border border-slate-700 px-2 py-1 text-[9px] font-black uppercase text-slate-500">Preference <input type="number" min="1" max="10" value={school.preferenceRank || index + 1} onChange={(event) => onUpdateSchool(school.id, 'preferenceRank', Math.max(1, Math.min(10, Number(event.target.value) || 1)))} className="w-10 bg-transparent text-center text-white outline-none" /></label><select value={school.schemeFit === null ? '' : String(school.schemeFit)} onChange={(event) => onUpdateSchool(school.id, 'schemeFit', event.target.value === '' ? null : event.target.value === 'true')} className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-[10px] font-black uppercase text-slate-400"><option value="">Scheme fit unknown</option><option value="true">Scheme fit: Yes</option><option value="false">Scheme fit: No</option></select><button type="button" disabled={!finalist && finalists.length >= 3} onClick={() => onToggleFinalist(school.id)} className={`flex items-center gap-1 rounded px-3 py-2 text-[10px] font-black uppercase ${finalist ? 'bg-amber-500 text-slate-950' : 'border border-slate-700 text-slate-400'}`}><Star size={12} fill={finalist ? 'currentColor' : 'none'} /> {finalist ? 'Top 3 finalist' : 'Select for Top 3'}</button><button type="button" onClick={() => onUpdateSchool(school.id, 'offered', !school.offered)} className="flex items-center gap-1 rounded border border-slate-700 px-3 py-2 text-[10px] font-black uppercase text-slate-400">{school.offered ? <CheckCircle2 size={14} /> : <Circle size={14} />} Toggle offer</button><button type="button" onClick={() => onDeleteSchool(school.id)} className="ml-auto rounded border border-slate-800 p-2 text-slate-600 hover:text-red-400"><Trash2 size={15} /></button></div>}
              </details>
            );
          })}
          {!schools.length && <p className="py-10 text-center text-sm text-slate-500">Add your initial Top 10 or upload the game&rsquo;s Top Schools screen to begin.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-950/90 p-5 shadow-2xl md:p-6">
        <h3 className="text-xl font-black uppercase text-white">Five-Game Timeline</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-5">{timeline.map((entry, index) => <div key={entry.id} className={`rounded-xl border p-4 ${entry.game ? 'border-blue-500/35 bg-blue-950/20' : 'border-slate-800 bg-slate-900/60'}`}><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Game {index + 1}</p><p className="mt-2 font-black text-white">{entry.game ? `vs. ${entry.game.opponent}` : 'Pending'}</p><p className="mt-2 text-[10px] leading-relaxed text-slate-500">{entry.changes.length ? `${entry.changes.length} verified recruiting update${entry.changes.length === 1 ? '' : 's'}` : entry.game ? 'Baseline saved' : 'Publish after playing'}</p></div>)}</div>
      </section>

      <section className={`rounded-2xl border p-6 shadow-2xl ${canCommit ? 'border-amber-400/45 bg-amber-950/20' : 'border-slate-800 bg-slate-900/80'}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400"><GraduationCap size={16} /> Signing Day</p><h3 className="mt-1 text-2xl font-black uppercase text-white">{gamesComplete < 5 ? `${5 - gamesComplete} high-school game${5 - gamesComplete === 1 ? '' : 's'} remaining` : 'Choose from your verified finalists'}</h3><p className="mt-2 text-sm text-slate-400">Select up to three offered schools as finalists. Commitment unlocks only after Game 5.</p></div>{!readOnly && <button type="button" disabled={!canCommit} onClick={onOpenCommit} className="rounded-xl bg-amber-500 px-6 py-3 text-xs font-black uppercase tracking-wider text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"><ShieldCheck size={16} className="mr-2 inline" />Commit to school</button>}</div>
      </section>

      {commitOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-7 text-center shadow-2xl"><h2 className="text-3xl font-black uppercase text-white">National Signing Day</h2><p className="mt-2 text-sm text-slate-400">Choose one of your offered Top 3 finalists.</p><div className="mt-6 space-y-3">{eligibleCommitments.map((school) => <button key={school.id} type="button" onClick={() => onCommit(school)} className="w-full rounded-xl border border-slate-600 bg-slate-800 p-4 text-lg font-black text-white hover:border-amber-400 hover:bg-amber-500 hover:text-slate-950">{school.name}</button>)}</div><button type="button" onClick={onCloseCommit} className="mt-5 text-xs font-black uppercase tracking-wider text-slate-500">Cancel</button></div></div>
      )}
    </div>
  );
};

export default PlayerRecruitingWorkspace;
