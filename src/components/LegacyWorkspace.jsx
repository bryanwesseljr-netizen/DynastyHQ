import { Award, BookOpen, Crown, Flag, GraduationCap, Medal, ShieldCheck, Star, Trophy, UserRound } from 'lucide-react';

const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const milestoneLabel = (type) => ({
  commitment: 'Commitment',
  transfer: 'Transfer',
  graduation: 'Graduation',
  'oc-hire': 'OC Hire',
  'hc-hire': 'Head Coach Hire',
  championship: 'Championship',
  award: 'Award',
  record: 'Record',
  retirement: 'Retirement',
}[type] || String(type || 'Milestone').replace(/-/g, ' '));

const LegacyWorkspace = ({ state }) => {
  const collegeGames = (state.gameLogs || []).filter((log) => (
    log && log.stage !== 'high-school' && !log.evaluation && String(log.opponent || '').trim()
  ));
  const appearances = collegeGames.filter((log) => log.didPlay !== false);
  const wins = collegeGames.filter((log) => log.result === 'W').length;
  const losses = collegeGames.filter((log) => log.result === 'L').length;
  const passingYards = appearances.reduce((sum, log) => sum + number(log.passYds), 0);
  const passingTouchdowns = appearances.reduce((sum, log) => sum + number(log.passTD), 0);
  const rushingYards = appearances.reduce((sum, log) => sum + number(log.rushYds), 0);
  const rushingTouchdowns = appearances.reduce((sum, log) => sum + number(log.rushTD), 0);
  const totalTouchdowns = passingTouchdowns + rushingTouchdowns;
  const milestones = [...(state.careerMilestones || [])].sort((a, b) => (
    number(b.season) - number(a.season) || number(b.week) - number(a.week)
  ));
  const trophies = state.trophies || [];

  const h2h = collegeGames.reduce((acc, log) => {
    const opponent = String(log.opponent || '').trim();
    if (!opponent) return acc;
    if (!acc[opponent]) acc[opponent] = { wins: 0, losses: 0, lastPlayed: number(log.season) || 1 };
    if (log.result === 'W') acc[opponent].wins += 1;
    else if (log.result === 'L') acc[opponent].losses += 1;
    acc[opponent].lastPlayed = Math.max(acc[opponent].lastPlayed, number(log.season) || 1);
    return acc;
  }, {});

  const rivalries = Object.entries(h2h)
    .sort((a, b) => ((b[1].wins + b[1].losses) - (a[1].wins + a[1].losses)))
    .slice(0, 12);

  const schools = [...new Set([
    state.player?.college,
    state.player?.school,
    state.coach?.currentSchool,
    ...milestones.flatMap((entry) => [entry.institution, entry.previousInstitution]),
  ].filter(Boolean))];

  const resumeCards = [
    { label: 'Career Record', value: `${wins}-${losses}`, icon: ShieldCheck, tone: 'text-emerald-400' },
    { label: 'Appearances', value: appearances.length, icon: UserRound, tone: 'text-blue-400' },
    { label: 'Total TD', value: totalTouchdowns, icon: Star, tone: 'text-violet-400' },
    { label: 'Trophies', value: trophies.length, icon: Trophy, tone: 'text-amber-400' },
  ];

  const statCards = [
    ['Pass Yards', passingYards.toLocaleString()],
    ['Pass TD', passingTouchdowns.toLocaleString()],
    ['Rush Yards', rushingYards.toLocaleString()],
    ['Rush TD', rushingTouchdowns.toLocaleString()],
  ];

  return (
    <div className="relative z-10 mx-auto max-w-7xl space-y-6 pb-20">
      <header className="overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-amber-950/35 p-6 shadow-2xl backdrop-blur-md md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-amber-300"><Crown size={14} /> Career résumé & trophy room</p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white md:text-4xl">Legacy</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">The permanent résumé: verified achievements, career totals, major decisions, championships, awards, records, and rivalry history.</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-black/25 px-5 py-4 lg:text-right">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Current identity</div>
            <div className="mt-1 text-lg font-black text-white">{state.player?.name || 'Career Subject'}</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wider text-amber-300">{state.careerPhase || 'Player'} · {state.coach?.currentSchool || state.player?.college || state.player?.school || 'School not recorded'}</div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {resumeCards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-slate-700/60 bg-slate-900/88 p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-2"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p><Icon size={17} className={tone} /></div>
            <p className="mt-2 text-2xl font-black text-white">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/88 p-5 shadow-2xl backdrop-blur-md md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-700/60 pb-4">
            <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">Playing résumé</p><h3 className="mt-1 text-xl font-black uppercase text-white">Verified Career Production</h3></div>
            <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400">College games only</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statCards.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/65 p-4"><p className="text-[8px] font-black uppercase tracking-widest text-slate-600">{label}</p><p className="mt-1 text-xl font-black text-white">{value}</p></div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4"><p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Programs / stops</p><p className="mt-2 text-sm font-black text-white">{schools.length || 0}</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{schools.join(' · ') || 'No school history recorded yet.'}</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4"><p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Major milestones</p><p className="mt-2 text-sm font-black text-white">{milestones.length}</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500">Commitments, transfers, hires, awards, records and championships.</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4"><p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Seasons logged</p><p className="mt-2 text-sm font-black text-white">{new Set((state.weeklyUpdates || []).map((entry) => entry.season)).size || 0}</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500">Based only on published weekly history.</p></div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/25 bg-slate-900/88 p-5 shadow-2xl backdrop-blur-md md:p-6">
          <div className="flex items-center gap-2"><Medal className="text-amber-400" size={20} /><h3 className="text-xl font-black uppercase text-white">Trophy Case</h3></div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">Only user-confirmed championships, awards and records belong here.</p>
          <div className="mt-4 space-y-3">
            {trophies.length ? trophies.slice(0, 8).map((trophy) => (
              <div key={trophy.id} className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-950/10 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10"><Trophy size={18} className="text-amber-400" /></div>
                <div className="min-w-0"><p className="truncate text-xs font-black text-white">{trophy.name}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-amber-300">{trophy.type} · {trophy.year}</p></div>
              </div>
            )) : <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-xs italic text-slate-500">The case is empty. Verified championships, awards and records will appear here.</div>}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/88 p-5 shadow-2xl backdrop-blur-md md:p-6">
          <div className="flex items-center gap-2"><Flag className="text-blue-400" size={19} /><h3 className="text-xl font-black uppercase text-white">Career Turning Points</h3></div>
          <p className="mt-1 text-xs text-slate-500">The major verified decisions and achievements that changed the direction of the career.</p>
          <div className="mt-5 space-y-3">
            {milestones.length ? milestones.map((entry) => (
              <div key={entry.id} className="relative rounded-xl border border-slate-800 bg-slate-950/55 p-4 pl-5">
                <span className="absolute inset-y-3 left-0 w-1 rounded-r bg-blue-500/70" />
                <div className="flex flex-wrap items-start justify-between gap-2"><span className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-400">Season {entry.season} · Week {entry.week} · {milestoneLabel(entry.type)}</span><span className="text-[9px] font-bold uppercase text-slate-600">{entry.careerPhase || state.careerPhase}</span></div>
                <p className="mt-2 text-sm font-black text-white">{entry.title || entry.achievement || milestoneLabel(entry.type)}</p>
                {entry.summary && <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{entry.summary}</p>}
              </div>
            )) : <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-xs italic text-slate-500">No major career milestones have been recorded yet.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/88 p-5 shadow-2xl backdrop-blur-md md:p-6">
          <div className="flex items-center gap-2"><BookOpen className="text-violet-400" size={19} /><h3 className="text-xl font-black uppercase text-white">Rivalry & Lore Ledger</h3></div>
          <p className="mt-1 text-xs text-slate-500">All-time head-to-head history from verified college and coaching game logs.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {rivalries.length ? rivalries.map(([opponent, record]) => (
              <div key={opponent} className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-white">{opponent}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-600">Last played · Season {record.lastPlayed}</p></div><div className={`text-xl font-black ${record.wins > record.losses ? 'text-emerald-400' : record.wins < record.losses ? 'text-red-400' : 'text-slate-300'}`}>{record.wins}-{record.losses}</div></div>
              </div>
            )) : <div className="sm:col-span-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-xs italic text-slate-500">Rivalry records begin with the first verified college game.</div>}
          </div>
        </div>
      </section>

      {state.player?.graduated && (
        <section className="rounded-2xl border border-blue-500/25 bg-blue-950/15 p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-start gap-3"><GraduationCap className="mt-0.5 shrink-0 text-blue-400" size={22} /><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-300">Player chapter complete</p><p className="mt-1 text-sm font-black text-white">Graduated from {state.player.graduationSchool || state.player.college || state.player.school}</p><p className="mt-1 text-xs leading-relaxed text-slate-400">The playing résumé remains permanent while the coaching chapter adds its own milestones, results and championships above it.</p></div></div>
        </section>
      )}
    </div>
  );
};

export default LegacyWorkspace;
