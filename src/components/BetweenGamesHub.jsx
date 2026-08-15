import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Headphones,
  Inbox,
  Newspaper,
  PlayCircle,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { buildBetweenGamesModel } from '../domain/betweenGames';

const priorityClasses = {
  high: 'border-red-400/25 bg-red-500/8 text-red-200',
  medium: 'border-amber-400/25 bg-amber-500/8 text-amber-200',
  low: 'border-blue-400/20 bg-blue-500/8 text-blue-200',
};

const BetweenGamesHub = ({ state = {}, readOnly = false, onNavigate }) => {
  const model = buildBetweenGamesModel(state);
  const canNavigate = typeof onNavigate === 'function';

  return (
    <section className="mx-2 mt-2 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/78 shadow-xl backdrop-blur sm:mx-3" aria-labelledby="between-games-title">
      <div className="flex flex-col gap-3 border-b border-white/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.14em] text-amber-300"><Sparkles size={12} /> Between Games</div>
          <h2 id="between-games-title" className="mt-1 text-base font-black text-white">Season {model.season} · Week {model.week} · {model.stage}</h2>
          <p className="mt-1 text-[9px] text-slate-400">One glance for what changed, what still needs attention, and what to do next.</p>
        </div>
        {!readOnly && canNavigate ? (
          <button type="button" onClick={() => onNavigate(model.primaryAction.tab)} className="inline-flex min-h-9 items-center justify-center gap-2 rounded border border-amber-300/70 bg-amber-400 px-4 text-[8px] font-black uppercase tracking-wider text-slate-950 transition-colors hover:bg-amber-300">
            <PlayCircle size={14} /> {model.primaryAction.label}
          </button>
        ) : null}
      </div>

      <div className="grid gap-px bg-white/[0.06] lg:grid-cols-[1.05fr_1.15fr_1.35fr]">
        <div className="bg-slate-950/85 p-4">
          <div className="text-[7px] font-black uppercase tracking-wider text-slate-500">Last verified week</div>
          {model.latestGame ? (
            <div className="mt-2">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[13px] font-black text-white">{model.latestGame.label}</div>
                  <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-emerald-300">{model.latestGame.result}</div>
                </div>
                {model.latestGame.score ? <div className="text-lg font-black text-slate-200">{model.latestGame.score}</div> : null}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[9px] leading-relaxed text-slate-500">No verified game or tape evaluation has been published yet.</p>
          )}

          <div className="mt-3 border-t border-white/[0.07] pt-3">
            <div className="text-[7px] font-black uppercase tracking-wider text-slate-500">Story layer</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={`rounded border px-2 py-1 text-[7px] font-black uppercase ${model.latestIssue ? 'border-emerald-400/25 bg-emerald-500/8 text-emerald-300' : 'border-slate-700 text-slate-500'}`}><Newspaper size={9} className="mr-1 inline" /> Newsroom {model.latestIssue ? 'ready' : '—'}</span>
              <span className={`rounded border px-2 py-1 text-[7px] font-black uppercase ${model.latestPodcast ? 'border-blue-400/25 bg-blue-500/8 text-blue-300' : 'border-slate-700 text-slate-500'}`}><Headphones size={9} className="mr-1 inline" /> Podcast {model.latestPodcast ? 'ready' : '—'}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-950/85 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[7px] font-black uppercase tracking-wider text-slate-500">What changed</div>
            {model.latestChanges.length ? <span className="rounded border border-emerald-400/25 bg-emerald-500/8 px-2 py-1 text-[6px] font-black uppercase text-emerald-300">{model.latestChanges.length} update{model.latestChanges.length === 1 ? '' : 's'}</span> : null}
          </div>
          {model.latestChanges.length ? (
            <div className="mt-2 divide-y divide-white/[0.06]">
              {model.latestChanges.map((change) => (
                <div key={`${change.key}-${change.label}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1.5">
                  <span className="truncate text-[8px] font-bold text-slate-300">{change.label}</span>
                  <span className="text-[8px] font-black text-white"><span className="text-slate-600">{change.before}</span> <ArrowRight size={9} className="mx-1 inline text-slate-600" /> {change.after}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2 rounded border border-emerald-400/15 bg-emerald-500/5 p-3">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />
              <p className="text-[8px] leading-relaxed text-slate-400">No verified RTG progression changes were recorded in the latest published week.</p>
            </div>
          )}
        </div>

        <div className="bg-slate-950/85 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[7px] font-black uppercase tracking-wider text-slate-500"><Inbox size={11} /> Needs Attention</div>
            <span className={`rounded border px-2 py-1 text-[6px] font-black uppercase ${model.inboxCount ? 'border-amber-400/30 bg-amber-500/10 text-amber-300' : 'border-emerald-400/25 bg-emerald-500/8 text-emerald-300'}`}>{model.inboxCount || 'Clear'}</span>
          </div>
          {model.inbox.length ? (
            <div className="mt-2 space-y-2">
              {model.inbox.slice(0, 4).map((item) => (
                <div key={item.id} className={`rounded border p-2.5 ${priorityClasses[item.priority] || priorityClasses.low}`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[8px] font-black text-current">{item.title}</div>
                      <div className="mt-1 text-[7px] leading-relaxed text-slate-400">{item.detail}</div>
                      {!readOnly && canNavigate && item.tab ? <button type="button" onClick={() => onNavigate(item.tab)} className="mt-1.5 text-[6px] font-black uppercase tracking-wider text-amber-300 hover:text-amber-200">{item.actionLabel || 'Open'} →</button> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2 rounded border border-emerald-400/15 bg-emerald-500/5 p-3">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />
              <div><div className="text-[8px] font-black text-emerald-300">Inbox clear</div><p className="mt-1 text-[7px] leading-relaxed text-slate-400">Nothing needs cleanup before you move into the next game week.</p></div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-white/[0.07] bg-slate-900/50 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[7px] text-slate-500">{model.primaryAction.detail}</p>
        {canNavigate ? (
          <div className="flex flex-wrap gap-1.5">
            {model.quickLinks.map((link) => (
              <button key={link.id} type="button" onClick={() => onNavigate(link.tab)} className="rounded border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-[6px] font-black uppercase tracking-wider text-slate-300 hover:border-amber-400/50 hover:text-amber-300">
                {link.id === 'chronicle' ? <Trophy size={9} className="mr-1 inline" /> : null}{link.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default BetweenGamesHub;
