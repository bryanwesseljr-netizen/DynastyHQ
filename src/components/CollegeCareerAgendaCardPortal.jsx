import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, BookOpen, GraduationCap, ShieldCheck } from 'lucide-react';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const hasValue = (value) => value !== '' && value !== null && value !== undefined;
const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clickNavigation = (label) => {
  const buttons = [...document.querySelectorAll('button')];
  const target = buttons.find((button) => button.textContent?.trim() === label)
    || buttons.find((button) => button.textContent?.includes(label));
  target?.click();
};

const buildCollegeSnapshot = (state = {}) => {
  const season = Number(state.currentSeason ?? 1) || 1;
  const games = (state.gameLogs || []).filter((game) => (
    Number(game?.season ?? 1) === season
    && game?.stage !== 'high-school'
    && !game?.evaluation
  ));
  const appearances = games.filter((game) => game?.didPlay !== false);
  const wins = games.filter((game) => game?.result === 'W').length;
  const losses = games.filter((game) => game?.result === 'L').length;
  const passingYards = appearances.reduce((total, game) => total + numberValue(game?.passYds), 0);
  const rushingYards = appearances.reduce((total, game) => total + numberValue(game?.rushYds), 0);
  const touchdowns = appearances.reduce(
    (total, game) => total + numberValue(game?.passTD) + numberValue(game?.rushTD),
    0,
  );
  return {
    season,
    school: state.player?.school || state.player?.college || 'College program',
    overall: state.player?.overall,
    rank: state.rtg?.rank || 'Not captured',
    games: games.length,
    appearances: appearances.length,
    record: games.length ? `${wins}-${losses}` : '0-0',
    totalYards: passingYards + rushingYards,
    touchdowns,
  };
};

const CollegeCareerCard = ({ state }) => {
  const snapshot = useMemo(() => buildCollegeSnapshot(state), [state]);
  const hasProduction = snapshot.appearances > 0;

  return (
    <div className="dhq-college-career-card space-y-4" data-college-career-card>
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white drop-shadow">
          <GraduationCap size={17} className="text-blue-400" /> 3. College Career Snapshot
        </h3>
        <span className="rounded border border-blue-400/25 bg-blue-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-blue-300">
          Season {snapshot.season}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-slate-400">
        High-school recruiting is archived. This card now follows your verified college role and season instead of carrying the old Top Schools board forward.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Current Program</p>
          <p className="mt-1 truncate text-sm font-black text-white">{snapshot.school}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Overall</p>
          <p className="mt-1 font-mono text-lg font-black text-blue-400">{hasValue(snapshot.overall) ? snapshot.overall : '—'}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Depth Chart Role</p>
          <p className="mt-1 text-sm font-black text-amber-300">{snapshot.rank}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Verified Team Record</p>
          <p className="mt-1 font-mono text-lg font-black text-emerald-400">{snapshot.record}</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
        <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
          <Activity size={12} className="text-blue-400" /> Season Role & Production
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="font-mono text-base font-black text-white">{snapshot.appearances}</p>
            <p className="text-[8px] font-bold uppercase text-slate-500">Appearances</p>
          </div>
          <div>
            <p className="font-mono text-base font-black text-white">{hasProduction ? snapshot.totalYards.toLocaleString() : '—'}</p>
            <p className="text-[8px] font-bold uppercase text-slate-500">Total Yards</p>
          </div>
          <div>
            <p className="font-mono text-base font-black text-white">{hasProduction ? snapshot.touchdowns : '—'}</p>
            <p className="text-[8px] font-bold uppercase text-slate-500">Total TD</p>
          </div>
        </div>
        {!snapshot.games ? (
          <p className="mt-3 border-t border-slate-800 pt-2 text-[9px] leading-relaxed text-slate-500">
            No college game has been published yet. Week 0 and bye weeks can still establish your role and development baseline without creating fake statistics.
          </p>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => clickNavigation('Chronicle')} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-blue-500">
          <BookOpen size={13} /> Open Chronicle
        </button>
        <button type="button" onClick={() => clickNavigation('Weekly Agenda')} className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-200 hover:border-amber-400/50 hover:text-amber-300">
          <ShieldCheck size={13} /> Update RTG Status
        </button>
      </div>
    </div>
  );
};

const CollegeCareerAgendaCardPortal = () => {
  const { career: careerState } = useOwnerCareer();
  const [target, setTarget] = useState(null);

  useEffect(() => {
    const appRoot = document.getElementById('root');
    if (!appRoot) return undefined;

    const findTarget = () => {
      const next = appRoot.querySelector('[data-agenda-card="3"]');
      setTarget((current) => current === next ? current : next);
    };
    findTarget();
    const observer = new MutationObserver(findTarget);
    observer.observe(appRoot, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const careerPhase = String(careerState?.careerPhase || 'Player');
  const isCoach = ['OC', 'HC'].includes(careerPhase);
  const isCollegePlayer = Boolean(careerState?.player?.isCommitted) && !isCoach;

  useEffect(() => {
    if (!target || !isCollegePlayer) return undefined;
    target.classList.add('dhq-college-card-enhanced');
    return () => target.classList.remove('dhq-college-card-enhanced');
  }, [target, isCollegePlayer]);

  if (!target || !careerState || !isCollegePlayer) return null;
  return createPortal(<CollegeCareerCard state={careerState} />, target);
};

export default CollegeCareerAgendaCardPortal;
