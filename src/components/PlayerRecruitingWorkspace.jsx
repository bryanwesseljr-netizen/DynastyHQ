import { useState } from 'react';
import {
  ArrowRightLeft, CheckCircle2, Circle, GraduationCap, Map, Plus, ShieldCheck, Star, Trash2,
} from 'lucide-react';
import {
  buildRecruitingTimeline,
  countHighSchoolGames,
  normalizePlayerRecruiting,
  sortedRecruitingSchools,
  TRANSFER_STATUSES,
} from '../domain/playerRecruiting';

const interestTone = (value) => {
  const interest = Number(value) || 0;
  if (interest >= 75) return 'text-emerald-400';
  if (interest >= 50) return 'text-blue-400';
  if (interest >= 25) return 'text-amber-400';
  return 'text-slate-500';
};

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
                <div key={target.id} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                  <input value={target.name} disabled={readOnly} onChange={(event) => onUpdateTransferTarget(target.id, 'name', event.target.value)} className="bg-transparent font-black text-white outline-none" />
                  <input value={target.projectedRole || ''} disabled={readOnly} onChange={(event) => onUpdateTransferTarget(target.id, 'projectedRole', event.target.value)} placeholder="Projected role" className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-xs text-white" />
                  <input value={target.fit || ''} disabled={readOnly} onChange={(event) => onUpdateTransferTarget(target.id, 'fit', event.target.value)} placeholder="Why it fits" className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-xs text-white" />
                  {!readOnly && <div className="flex gap-2"><button type="button" onClick={() => onTransfer(target)} className="rounded bg-amber-500 px-3 py-2 text-[10px] font-black uppercase text-slate-950">Transfer</button><button type="button" onClick={() => onDeleteTransferTarget(target.id)} className="rounded border border-slate-700 p-2 text-slate-500 hover:text-red-400"><Trash2 size={14} /></button></div>}
                </div>
              ))}
              {!transfer.targets.length && <p className="rounded-xl border-2 border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">No transfer schools added. If you stay, close the window above and nothing else changes.</p>}
            </div>
          </section>
        )}

        <details className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-slate-300">View archived high-school recruiting history</summary>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {(archive?.finalists || finalists).map((school) => <div key={school.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3"><p className="font-black text-white">{school.name}</p><p className="mt-1 text-xs text-slate-500">Final interest: {Number(school.interest) || 0}%{school.offered ? ' · Offer' : ''}</p></div>)}
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto max-w-7xl space-y-6 pb-20 animate-in fade-in">
      <section className="rounded-2xl border border-blue-500/30 bg-slate-950/90 p-6 shadow-2xl md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-blue-400"><Map size={16} /> High School Recruiting Tracker</p><h2 className="mt-2 text-3xl font-black uppercase text-white">Five games. One decision.</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Update the board from each postgame recruiting screen. DynastyHQ will carry verified movement into that week&rsquo;s Recruiting Wire article.</p></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-center"><p className="text-[9px] font-black uppercase text-slate-500">Games</p><p className="text-xl font-black text-white">{gamesComplete}/5</p></div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-center"><p className="text-[9px] font-black uppercase text-slate-500">Offers</p><p className="text-xl font-black text-emerald-400">{offers.length}</p></div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-center"><p className="text-[9px] font-black uppercase text-slate-500">Finalists</p><p className="text-xl font-black text-amber-400">{finalists.length}/3</p></div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/90 p-5 shadow-2xl md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h3 className="text-xl font-black uppercase text-white">Active School Board</h3><p className="mt-1 text-xs text-slate-500">Compact rankings replace the old four-column war room.</p></div>{!readOnly && <form onSubmit={addSchool} className="flex gap-2"><input value={schoolInput} onChange={(event) => setSchoolInput(event.target.value)} placeholder="Add school" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /><button className="rounded-lg bg-blue-600 px-3 text-white"><Plus size={16} /></button></form>}</div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-700 text-[9px] font-black uppercase tracking-widest text-slate-500"><tr><th className="px-3 py-3">Rank</th><th className="px-3 py-3">School</th><th className="px-3 py-3">Interest</th><th className="px-3 py-3">Offer</th><th className="px-3 py-3">Top 3</th><th className="px-3 py-3"></th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {schools.map((school, index) => {
                const finalist = finalistIds.has(String(school.id));
                return <tr key={school.id} className="hover:bg-slate-800/50"><td className="px-3 py-3 font-mono font-black text-slate-500">#{index + 1}</td><td className="px-3 py-3"><input value={school.name} disabled={readOnly} onChange={(event) => onUpdateSchool(school.id, 'name', event.target.value)} className="w-full bg-transparent font-black text-white outline-none" /></td><td className="px-3 py-3"><div className="flex items-center gap-2"><input type="number" min="0" max="100" value={school.interest ?? 0} disabled={readOnly} onChange={(event) => onUpdateSchool(school.id, 'interest', Math.max(0, Math.min(100, Number(event.target.value) || 0)))} className={`w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono font-black ${interestTone(school.interest)}`} /><span className={interestTone(school.interest)}>%</span></div></td><td className="px-3 py-3"><button type="button" disabled={readOnly} onClick={() => onUpdateSchool(school.id, 'offered', !school.offered)} className={school.offered ? 'text-emerald-400' : 'text-slate-600'}>{school.offered ? <CheckCircle2 size={19} /> : <Circle size={19} />}</button></td><td className="px-3 py-3"><button type="button" disabled={readOnly || (!finalist && finalists.length >= 3)} onClick={() => onToggleFinalist(school.id)} className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-black uppercase ${finalist ? 'bg-amber-500 text-slate-950' : 'border border-slate-700 text-slate-500'}`}><Star size={12} fill={finalist ? 'currentColor' : 'none'} /> {finalist ? 'Finalist' : 'Select'}</button></td><td className="px-3 py-3">{!readOnly && <button type="button" onClick={() => onDeleteSchool(school.id)} className="text-slate-700 hover:text-red-400"><Trash2 size={15} /></button>}</td></tr>;
              })}
            </tbody>
          </table>
          {!schools.length && <p className="py-10 text-center text-sm text-slate-500">Add your initial Top 10 to begin.</p>}
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
