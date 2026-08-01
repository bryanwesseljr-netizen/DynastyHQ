import {
  Activity,
  AlertTriangle,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Film,
  HeartPulse,
  Map,
  Play,
  ShieldCheck,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { buildCommandCenter, CAREER_STAGES } from '../domain/commandCenter';

const panelIcons = {
  map: Map,
  film: Film,
  health: HeartPulse,
  target: Target,
  money: DollarSign,
  playbook: ClipboardList,
  users: Users,
  contract: Briefcase,
  shield: ShieldCheck,
  trophy: Trophy,
  book: BookOpen,
  briefcase: Briefcase,
};

const toneClasses = {
  default: 'text-white',
  gold: 'text-amber-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-red-400',
};

const adviceClasses = {
  info: 'border-blue-500 bg-slate-900/80 text-slate-300',
  success: 'border-emerald-500 bg-emerald-950/40 text-emerald-100',
  warning: 'border-amber-500 bg-amber-950/40 text-amber-100',
  danger: 'border-red-500 bg-red-950/40 text-red-100',
};

const AdviceIcon = ({ tone }) => tone === 'danger' || tone === 'warning'
  ? <AlertTriangle size={16} className="mt-0.5 shrink-0" />
  : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />;

const StagePanel = ({ panel }) => {
  const Icon = panelIcons[panel.icon] || Activity;
  return (
    <div className="flex flex-col rounded-xl border border-slate-700/50 bg-slate-900/85 p-5 shadow-2xl backdrop-blur-md">
      <h3 className="flex items-center gap-2 border-b border-slate-700/50 pb-3 text-sm font-black uppercase tracking-wider text-white">
        <Icon size={16} className="text-amber-400" /> {panel.title}
      </h3>
      <div className="mt-3 divide-y divide-slate-800/80 rounded-lg border border-slate-800/50 bg-slate-950/50 px-4 shadow-inner">
        {panel.rows.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</span>
            <span className={`text-right text-xs font-black ${toneClasses[item.tone] || toneClasses.default}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const RecentGames = ({ model }) => {
  const playerView = [CAREER_STAGES.HIGH_SCHOOL, CAREER_STAGES.COLLEGE].includes(model.stage);
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-md lg:col-span-2">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold uppercase tracking-wide text-white">
        <Activity size={18} className="text-amber-500" /> Verified Season Results
      </h3>
      <div className="max-h-[300px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 border-b border-slate-700 bg-slate-900 text-slate-400">
            <tr>
              <th className="pb-2">Wk</th><th className="pb-2">Opponent</th><th className="pb-2">Result</th><th className="pb-2">Score</th>
              {playerView && <><th className="pb-2">Pass</th><th className="pb-2">Rush</th></>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200">
            {!model.recentGames.length && (
              <tr><td colSpan={playerView ? 6 : 4} className="py-8 text-center text-slate-500">No verified result has been published for this season.</td></tr>
            )}
            {model.recentGames.map((game, index) => (
              <tr key={`${game.season || model.season}-${game.week || index}-${game.opponent}`} className="hover:bg-slate-800/30">
                <td className="py-3 font-mono text-slate-400">{game.week || '—'}</td>
                <td className="py-3 font-bold text-white">{game.opponent || 'Unknown opponent'}</td>
                <td className={`py-3 font-black ${game.result === 'W' ? 'text-emerald-400' : 'text-red-400'}`}>{game.result || '—'}</td>
                <td className="py-3 font-mono">{game.homeScore !== '' && game.homeScore !== undefined ? `${game.homeScore}-${game.awayScore}` : '—'}</td>
                {playerView && <>
                  <td className="py-3">{game.didPlay === false ? 'DNP' : `${game.passYds || 0}/${game.passTD || 0}`}</td>
                  <td className="py-3 text-amber-400">{game.didPlay === false ? 'DNP' : `${game.rushYds || 0}/${game.rushTD || 0}`}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LegacyEvents = ({ model }) => (
  <div className="rounded-xl border border-slate-700/50 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-md lg:col-span-2">
    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold uppercase tracking-wide text-white">
      <BookOpen size={18} className="text-amber-500" /> Defining Career Events
    </h3>
    <div className="space-y-3">
      {!model.recentEvents.length && <p className="py-8 text-center text-sm text-slate-500">No verified Chronicle events are available.</p>}
      {model.recentEvents.map((event) => (
        <div key={event.id} className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-4">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">Season {event.season || 1} · Week {event.week || 1}</div>
          <div className="mt-1 text-sm font-black text-white">{event.title}</div>
          {event.summary && <p className="mt-1 text-xs leading-relaxed text-slate-400">{event.summary}</p>}
        </div>
      ))}
    </div>
  </div>
);

const CareerCommandCenter = ({ state, onNavigate, readOnly = false }) => {
  const model = buildCommandCenter(state);
  return (
    <div className="relative z-10 mx-auto max-w-7xl space-y-6 pb-20 animate-in fade-in">
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">{model.eyebrow}</div>
            <h2 className="mt-1 text-3xl font-black uppercase tracking-tight text-white">{model.title}</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-300">{model.description}</p>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Season {model.season} · Week {model.week} · {model.institution}</p>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => onNavigate(model.primaryAction.tab)} className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">
                <Play size={15} /> {model.primaryAction.label}
              </button>
              <button type="button" onClick={() => onNavigate(model.secondaryAction.tab)} className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-xs font-black uppercase tracking-wider text-white hover:border-amber-500/60 hover:bg-slate-700">
                {model.secondaryAction.label}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {model.metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-slate-700/50 bg-slate-900/85 p-5 shadow-2xl backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{metric.label}</p>
            <p className={`mt-1 text-3xl font-black ${toneClasses[metric.tone] || toneClasses.default}`}>{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {model.panels.map((item) => <StagePanel key={item.id} panel={item} />)}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {model.stage === CAREER_STAGES.RETIRED ? <LegacyEvents model={model} /> : <RecentGames model={model} />}
        <div className="space-y-3 rounded-xl border border-slate-700/50 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-md">
          <h3 className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide text-white"><Target size={18} className="text-emerald-500" /> Weekly Priorities</h3>
          <p className="border-b border-slate-700/50 pb-3 text-[10px] uppercase tracking-widest text-slate-400">Stage-aware · verified data only</p>
          {model.advice.map((item) => (
            <div key={`${item.title}-${item.text}`} className={`rounded-lg border-l-4 p-3.5 text-xs leading-relaxed ${adviceClasses[item.tone] || adviceClasses.info}`}>
              <div className="flex items-start gap-2">
                <AdviceIcon tone={item.tone} />
                <div><div className="mb-1 font-black uppercase tracking-wider">{item.title}</div><div>{item.text}</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CareerCommandCenter;
