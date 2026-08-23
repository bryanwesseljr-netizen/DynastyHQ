import { useState } from 'react';
import {
  ArrowRightLeft, CheckCircle2, ChevronDown, GraduationCap, Map, Plus, ShieldCheck, Star, Trash2,
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
  const [boardOpen, setBoardOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
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
  const topSchools = schools.slice(0, 3);

  const addSchool = (event) => {
    event.preventDefault();
    if (!schoolInput.trim()) return;
    onAddSchool(schoolInput.trim());
    setSchoolInput('');
    setBoardOpen(true);
  };

  const addTransfer = (event) => {
    event.preventDefault();
    if (!transferInput.trim()) return;
    onAddTransferTarget(transferInput.trim());
    setTransferInput('');
  };

  if (committed) {
    const archive = playerRecruiting.highSchoolArchive;
    const transferActive = transfer.status === TRANSFER_STATUSES.EXPLORING;
    return (
      <div className="relative z-10 mx-auto max-w-6xl space-y-3 pb-20 animate-in fade-in">
        <section className="overflow-hidden rounded-xl border border-amber-400/25 bg-[#11151a]/95 shadow-xl">
          <div className="flex flex-col gap-4 p-4 md:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-300">College Recruiting</p>
              <h1 className="mt-1 text-xl font-black text-white sm:text-2xl">Committed to {state.player.college}</h1>
              <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-slate-500">High-school recruiting is archived. This page stays quiet during college unless the game gives you a real transfer decision.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2 text-center"><p className="text-[7px] font-black uppercase text-slate-600">Final rating</p><p className="mt-1 text-base font-black text-white">{archive?.starRating || state.player.stars || '—'}★</p></div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2 text-center"><p className="text-[7px] font-black uppercase text-slate-600">Offers</p><p className="mt-1 text-base font-black text-white">{archive?.offerCount ?? offers.length}</p></div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2 text-center"><p className="text-[7px] font-black uppercase text-slate-600">Portal</p><p className={`mt-1 text-xs font-black ${transferActive ? 'text-blue-300' : 'text-emerald-300'}`}>{transferActive ? 'Open' : 'Closed'}</p></div>
            </div>
          </div>
        </section>

        {!transferActive ? (
          <section className="rounded-xl border border-blue-400/15 bg-[#0d1824]/95 p-4 shadow-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <ArrowRightLeft size={17} className="mt-0.5 shrink-0 text-blue-300" />
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-300">Transfer status</p>
                  <h2 className="mt-1 text-sm font-black text-white">No active portal decision</h2>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-500">Nothing needs attention here week to week. Open the portal only when CFB 27 actually presents a transfer decision.</p>
                </div>
              </div>
              {!readOnly ? (
                <button type="button" disabled={!collegeCareerStarted} onClick={onOpenTransfer} className="min-h-9 shrink-0 rounded-lg border border-blue-400/25 bg-blue-500/[0.07] px-3 text-[8px] font-black uppercase tracking-wider text-blue-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-700">
                  {collegeCareerStarted ? 'Explore transfer options' : 'Unlocks in college'}
                </button>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-blue-400/25 bg-[#0d1824]/95 p-4 shadow-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-300">Transfer portal</p><h2 className="mt-1 text-base font-black text-white">Compare only the schools shown in-game</h2></div>
              {!readOnly ? <button type="button" onClick={onStay} className="rounded-lg border border-emerald-400/25 bg-emerald-500/[0.06] px-3 py-2 text-[8px] font-black uppercase text-emerald-300">Stay at {state.player.college}</button> : null}
            </div>
            {!readOnly ? <form onSubmit={addTransfer} className="mt-3 flex gap-2"><input value={transferInput} onChange={(event) => setTransferInput(event.target.value)} placeholder="Add a transfer option shown in CFB 27" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white" /><button className="rounded-lg bg-blue-600 px-3 text-white"><Plus size={15} /></button></form> : null}
            <div className="mt-3 space-y-2">
              {transfer.targets.map((target) => (
                <div key={target.id} className="rounded-lg border border-slate-800 bg-slate-950/45 p-3">
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                    <input value={target.name} disabled={readOnly} onChange={(event) => onUpdateTransferTarget(target.id, 'name', event.target.value)} className="bg-transparent text-sm font-black text-white outline-none" />
                    <input value={target.projectedRole || ''} disabled={readOnly} onChange={(event) => onUpdateTransferTarget(target.id, 'projectedRole', event.target.value)} placeholder="Projected role" className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-[9px] text-white" />
                    <input value={target.fit || ''} disabled={readOnly} onChange={(event) => onUpdateTransferTarget(target.id, 'fit', event.target.value)} placeholder="Why it fits" className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-[9px] text-white" />
                    {!readOnly ? <button type="button" onClick={() => onDeleteTransferTarget(target.id)} className="grid h-8 w-8 place-items-center rounded border border-slate-800 text-slate-600 hover:text-red-300"><Trash2 size={12} /></button> : null}
                  </div>
                  {!readOnly ? (
                    <details className="mt-3 border-t border-slate-800 pt-3">
                      <summary className="cursor-pointer text-[8px] font-black uppercase tracking-wider text-slate-500">College newsroom setup</summary>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <input value={target.city || ''} onChange={(event) => onUpdateTransferTarget(target.id, 'city', event.target.value)} placeholder="College city" className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-[9px] text-white" />
                        <input value={target.state || ''} onChange={(event) => onUpdateTransferTarget(target.id, 'state', event.target.value)} placeholder="State" className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-[9px] text-white" />
                        <input value={target.localOutletName || ''} onChange={(event) => onUpdateTransferTarget(target.id, 'localOutletName', event.target.value)} placeholder="Local newspaper" className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-[9px] text-white" />
                        <input value={target.regionalOutletName || ''} onChange={(event) => onUpdateTransferTarget(target.id, 'regionalOutletName', event.target.value)} placeholder="Regional outlet" className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-[9px] text-white" />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" disabled={!target.city?.trim() || !target.state?.trim()} onClick={() => { const names = suggestCollegeOutlets({ school: target.name, city: target.city, state: target.state }); onUpdateTransferTarget(target.id, 'localOutletName', names.localOutletName); onUpdateTransferTarget(target.id, 'regionalOutletName', names.regionalOutletName); }} className="rounded border border-slate-700 px-3 py-2 text-[8px] font-black uppercase text-amber-300 disabled:opacity-30">Suggest outlet names</button>
                        <button type="button" disabled={!target.city?.trim() || !target.state?.trim() || !target.localOutletName?.trim() || !target.regionalOutletName?.trim()} onClick={() => onTransfer(target)} className="rounded bg-amber-500 px-3 py-2 text-[8px] font-black uppercase text-slate-950 disabled:bg-slate-800 disabled:text-slate-600">Confirm transfer</button>
                      </div>
                    </details>
                  ) : null}
                </div>
              ))}
              {!transfer.targets.length ? <p className="rounded-lg border border-dashed border-slate-800 py-7 text-center text-[10px] text-slate-600">No transfer options added.</p> : null}
            </div>
          </section>
        )}

        <details className="rounded-xl border border-slate-800 bg-[#11151a]/90 px-4 py-3 shadow-lg">
          <summary className="cursor-pointer text-[9px] font-black uppercase tracking-wider text-slate-400">Archived high-school recruiting history</summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {(archive?.finalists || finalists).map((school) => <div key={school.id} className="rounded-lg border border-slate-800 bg-slate-950/45 p-3"><p className="text-sm font-black text-white">{school.name}</p><p className="mt-1 text-[9px] text-slate-600">Preference #{school.preferenceRank || school.customOrder || '—'}{school.offered ? ' · Scholarship offer' : ''}</p></div>)}
          </div>
        </details>
      </div>
    );
  }

  const nextGame = Math.min(5, gamesComplete + 1);
  const nextTitle = canCommit
    ? 'Choose your school'
    : gamesComplete >= 5
      ? 'Finish your Top 3'
      : `Play Game ${nextGame} and update recruiting`;
  const nextDetail = canCommit
    ? 'Your five-game evaluation is complete and at least one offered finalist is eligible for commitment.'
    : gamesComplete >= 5
      ? 'Select up to three offered schools as finalists before signing day.'
      : 'After the game, import the updated recruiting screens in Weekly Agenda. DynastyHQ will carry verified movement here automatically.';

  return (
    <div className="relative z-10 mx-auto max-w-7xl space-y-3 pb-20 animate-in fade-in">
      <section className="overflow-hidden rounded-xl border border-blue-400/20 bg-[#11151a]/95 shadow-xl">
        <div className="grid gap-4 p-4 md:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-blue-300"><Map size={13} /> High School Recruiting</p>
            <h1 className="mt-1 text-xl font-black text-white sm:text-2xl">Five games. One decision.</h1>
            <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-slate-500">The page shows the decision first. Full school scouting detail and recruiting history stay collapsed until you need them.</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              ['Games', `${Math.max(gamesComplete, Number(highSchool.gameNumber) || 0)}/5`],
              ['Rating', `${highSchool.recruitStars || state.player.stars || 3}★`],
              ['Offers', offers.length],
              ['Top schools', `${highSchool.topSchoolsSelected || schools.length}/10`],
            ].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2 text-center"><p className="text-[7px] font-black uppercase text-slate-600">{label}</p><p className="mt-1 text-sm font-black text-white">{value}</p></div>)}
          </div>
        </div>
      </section>

      <section className={`rounded-xl border p-4 shadow-lg ${canCommit ? 'border-amber-400/30 bg-amber-500/[0.05]' : 'border-blue-400/15 bg-[#0d1824]/95'}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {canCommit ? <GraduationCap size={17} className="mt-0.5 shrink-0 text-amber-300" /> : <ShieldCheck size={17} className="mt-0.5 shrink-0 text-blue-300" />}
            <div><p className={`text-[8px] font-black uppercase tracking-[0.14em] ${canCommit ? 'text-amber-300' : 'text-blue-300'}`}>Next recruiting action</p><h2 className="mt-1 text-sm font-black text-white">{nextTitle}</h2><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{nextDetail}</p></div>
          </div>
          {canCommit && !readOnly ? <button type="button" onClick={onOpenCommit} className="min-h-9 shrink-0 rounded-lg bg-amber-500 px-4 text-[8px] font-black uppercase tracking-wider text-slate-950 hover:bg-amber-400">Commit to school</button> : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/50 bg-[#11151a]/95 p-4 shadow-lg">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-[0.14em] text-emerald-300">Priority schools</p><h2 className="mt-1 text-base font-black text-white">Your current Top 3</h2></div><button type="button" onClick={() => setBoardOpen(true)} className="text-[8px] font-black uppercase tracking-wider text-blue-300">Manage full board</button></div>
        <div className="mt-3 divide-y divide-slate-800/80">
          {topSchools.length ? topSchools.map((school, index) => {
            const finalist = finalistIds.has(String(school.id));
            return <div key={school.id} className="grid gap-2 py-3 sm:grid-cols-[36px_minmax(0,1fr)_auto_auto] sm:items-center"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-[10px] font-black text-blue-300">#{school.preferenceRank || index + 1}</span><div className="min-w-0"><strong className="truncate text-sm text-white">{school.name}</strong><p className="mt-0.5 text-[9px] text-slate-600">{school.projectedRole || 'Role not captured'} · {school.offensiveScheme || 'Scheme not captured'}</p></div><span className={`w-fit rounded border px-2 py-1 text-[7px] font-black uppercase ${school.offered ? 'border-emerald-400/25 bg-emerald-500/[0.07] text-emerald-300' : 'border-slate-800 text-slate-600'}`}>{school.offered ? 'Offer' : 'No offer'}</span><span className={`w-fit rounded border px-2 py-1 text-[7px] font-black uppercase ${finalist ? 'border-amber-400/25 bg-amber-500/[0.07] text-amber-300' : 'border-slate-800 text-slate-600'}`}>{finalist ? 'Top 3 finalist' : 'Not finalist'}</span></div>;
          }) : <p className="py-7 text-center text-[10px] text-slate-600">Add your initial Top Schools or import the game&rsquo;s recruiting screen.</p>}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-700/50 bg-[#11151a]/95 shadow-lg">
        <button type="button" onClick={() => setBoardOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"><span><span className="text-[9px] font-black uppercase tracking-wider text-slate-300">Full school board</span><span className="mt-1 block text-[9px] text-slate-600">{schools.length} school{schools.length === 1 ? '' : 's'} · scouting detail and manual corrections</span></span><ChevronDown size={15} className={`text-slate-500 transition-transform ${boardOpen ? 'rotate-180' : ''}`} /></button>
        {boardOpen ? (
          <div className="border-t border-slate-800 p-4">
            {!readOnly ? <form onSubmit={addSchool} className="mb-3 flex gap-2"><input value={schoolInput} onChange={(event) => setSchoolInput(event.target.value)} placeholder="Add school" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white" /><button className="rounded-lg bg-blue-600 px-3 text-white"><Plus size={15} /></button></form> : null}
            <div className="space-y-2">
              {schools.map((school, index) => {
                const finalist = finalistIds.has(String(school.id));
                const bonuses = Object.entries(school.scholarshipBonuses || {}).filter(([, value]) => value !== '' && value !== null && value !== undefined);
                return (
                  <details key={school.id} className="group rounded-lg border border-slate-800 bg-slate-950/45 p-3 open:border-blue-400/25">
                    <summary className="flex cursor-pointer list-none flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-black text-blue-300">#{school.preferenceRank || index + 1}</span><div className="min-w-0"><input value={school.name} disabled={readOnly} onChange={(event) => onUpdateSchool(school.id, 'name', event.target.value)} onClick={(event) => event.stopPropagation()} className="w-full bg-transparent text-sm font-black text-white outline-none" /><p className="mt-0.5 text-[8px] font-bold uppercase text-slate-600">{school.projectedRole || 'Role not captured'} · {school.offensiveScheme || 'Scheme not captured'}</p></div></div>
                      <div className="flex flex-wrap items-center gap-2"><span className={`rounded px-2 py-1 text-[7px] font-black uppercase ${school.schemeFit === true ? 'bg-emerald-500/10 text-emerald-300' : school.schemeFit === false ? 'bg-amber-500/10 text-amber-300' : 'bg-slate-900 text-slate-600'}`}>{school.schemeFit === true ? 'Scheme fit' : school.schemeFit === false ? 'No scheme fit' : 'Fit unknown'}</span><span className={`rounded px-2 py-1 text-[7px] font-black uppercase ${school.offered ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-900 text-slate-600'}`}>{school.offered ? 'Scholarship offer' : 'No offer'}</span><ChevronDown size={14} className="text-slate-600 transition-transform group-open:rotate-180" /></div>
                    </summary>
                    <div className="mt-3 grid gap-3 border-t border-slate-800 pt-3 lg:grid-cols-[1fr_1fr_auto]">
                      <div className="grid grid-cols-2 gap-2 text-[9px]"><div><p className="text-[7px] font-black uppercase text-slate-700">Tape requirement</p><p className="mt-1 font-bold text-white">{school.tapeScoreAssessed ?? '—'} / {school.tapeScoreRequired ?? '—'}</p></div><div><p className="text-[7px] font-black uppercase text-slate-700">Program</p><p className="mt-1 font-bold text-white">{school.programRatings?.overall || '—'} OVR · {school.programRatings?.offense || '—'} OFF · {school.programRatings?.defense || '—'} DEF</p></div><div><p className="text-[7px] font-black uppercase text-slate-700">Head coach</p><p className="mt-1 font-bold text-white">{school.headCoach || 'Not captured'}{school.coachLevel ? ` · Level ${school.coachLevel}` : ''}</p></div><div><p className="text-[7px] font-black uppercase text-slate-700">Tendencies</p><p className="mt-1 font-bold text-white">{school.tendencies?.run !== '' ? `${school.tendencies.run}% run / ${school.tendencies.pass}% pass` : 'Not captured'}</p></div></div>
                      <div><p className="text-[7px] font-black uppercase text-slate-700">Projected competition</p>{school.depthChart?.length ? school.depthChart.map((entry) => <p key={entry.role} className="mt-1 rounded bg-slate-900 px-2 py-1.5 text-[9px] text-slate-400"><strong className="text-white">{entry.role}</strong> · {entry.summary}</p>) : <p className="mt-1 text-[9px] text-slate-700">No depth chart captured.</p>}</div>
                      <div className="flex flex-wrap items-start gap-1 lg:max-w-52">{bonuses.length ? bonuses.map(([key, value]) => <span key={key} className="rounded border border-emerald-400/20 bg-emerald-500/[0.04] px-2 py-1 text-[7px] font-bold uppercase text-emerald-300">{key.replace(/([A-Z])/g, ' $1')} +{value}</span>) : <span className="text-[9px] text-slate-700">Bonuses unlock with an offer.</span>}</div>
                    </div>
                    {!readOnly ? <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3"><label className="flex items-center gap-2 rounded border border-slate-800 px-2 py-1 text-[7px] font-black uppercase text-slate-600">Preference <input type="number" min="1" max="10" value={school.preferenceRank || index + 1} onChange={(event) => onUpdateSchool(school.id, 'preferenceRank', Math.max(1, Math.min(10, Number(event.target.value) || 1)))} className="w-8 bg-transparent text-center text-white outline-none" /></label><select value={school.schemeFit === null ? '' : String(school.schemeFit)} onChange={(event) => onUpdateSchool(school.id, 'schemeFit', event.target.value === '' ? null : event.target.value === 'true')} className="rounded border border-slate-800 bg-slate-950 px-2 py-2 text-[7px] font-black uppercase text-slate-500"><option value="">Fit unknown</option><option value="true">Scheme fit</option><option value="false">No scheme fit</option></select><button type="button" disabled={!finalist && finalists.length >= 3} onClick={() => onToggleFinalist(school.id)} className={`flex items-center gap-1 rounded px-2 py-2 text-[7px] font-black uppercase ${finalist ? 'bg-amber-500 text-slate-950' : 'border border-slate-800 text-slate-500'}`}><Star size={10} fill={finalist ? 'currentColor' : 'none'} /> {finalist ? 'Top 3 finalist' : 'Select Top 3'}</button><button type="button" onClick={() => onUpdateSchool(school.id, 'offered', !school.offered)} className="rounded border border-slate-800 px-2 py-2 text-[7px] font-black uppercase text-slate-500">{school.offered ? 'Remove offer' : 'Mark offer'}</button><button type="button" onClick={() => onDeleteSchool(school.id)} className="ml-auto grid h-8 w-8 place-items-center rounded border border-slate-800 text-slate-700 hover:text-red-300"><Trash2 size={12} /></button></div> : null}
                  </details>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-700/50 bg-[#11151a]/95 shadow-lg">
        <button type="button" onClick={() => setTimelineOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"><span><span className="text-[9px] font-black uppercase tracking-wider text-slate-300">Five-game recruiting history</span><span className="mt-1 block text-[9px] text-slate-600">{gamesComplete}/5 games complete · verified movement by game</span></span><ChevronDown size={15} className={`text-slate-500 transition-transform ${timelineOpen ? 'rotate-180' : ''}`} /></button>
        {timelineOpen ? <div className="grid gap-2 border-t border-slate-800 p-4 sm:grid-cols-5">{timeline.map((entry, index) => <div key={entry.id} className={`rounded-lg border p-3 ${entry.game ? 'border-blue-400/20 bg-blue-500/[0.04]' : 'border-slate-800 bg-slate-950/35'}`}><div className="flex items-center justify-between"><span className="flex h-7 w-7 items-center justify-center rounded bg-slate-950 text-[9px] font-black text-blue-300">{index + 1}</span><span className={`text-[7px] font-black uppercase ${entry.game ? 'text-emerald-300' : 'text-slate-700'}`}>{entry.game ? 'Complete' : 'Pending'}</span></div><p className="mt-2 truncate text-[10px] font-black text-white">{entry.game ? `vs. ${entry.game.opponent}` : `Game ${index + 1}`}</p><p className="mt-1 text-[8px] text-slate-600">{entry.changes.length ? `${entry.changes.length} verified update${entry.changes.length === 1 ? '' : 's'}` : entry.game ? 'Baseline saved' : 'Awaiting result'}</p></div>)}</div> : null}
      </section>

      {commitOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl"><h2 className="text-2xl font-black text-white">National Signing Day</h2><p className="mt-1 text-[10px] text-slate-500">Choose one of your offered Top 3 finalists.</p><div className="mt-4 space-y-2">{eligibleCommitments.map((school) => <button key={school.id} type="button" onClick={() => onCommit(school)} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm font-black text-white hover:border-amber-400 hover:bg-amber-500 hover:text-slate-950">{school.name}</button>)}</div><button type="button" onClick={onCloseCommit} className="mt-4 text-[8px] font-black uppercase tracking-wider text-slate-500">Cancel</button></div></div>
      ) : null}
    </div>
  );
};

export default PlayerRecruitingWorkspace;
