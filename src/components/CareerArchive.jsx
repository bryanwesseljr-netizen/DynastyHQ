import { useMemo, useState } from 'react';
import {
  BookOpen, CalendarDays, CheckCircle2, ChevronRight, Clock3,
  FileSearch, Filter, Newspaper, Search, ShieldCheck, Trophy, UserRound,
} from 'lucide-react';
import {
  buildCareerArchive,
  filterCareerArchive,
  getCareerArchiveFacets,
  summarizeCareerArchive,
} from '../domain/careerArchive';
import { formatRtgDelta, formatRtgValue, hasRtgSnapshot, RTG_FIELDS } from '../domain/rtgProgress';

const formatValue = (value) => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === '' || value === null || value === undefined) return '—';
  return String(value);
};

const entryTone = (entry) => {
  if (entry.weekType === 'bye') return 'border-violet-500/30 bg-violet-950/20 text-violet-300';
  if (entry.game?.result === 'W') return 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300';
  if (entry.game?.result === 'L') return 'border-red-500/30 bg-red-950/20 text-red-300';
  if (entry.verificationMethod === 'user-confirmed') return 'border-amber-500/30 bg-amber-950/20 text-amber-300';
  return 'border-blue-500/30 bg-blue-950/20 text-blue-300';
};

const formatType = (value) => String(value || 'update')
  .split('-')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

const CareerArchive = ({ state, onOpenNewsroom }) => {
  const [filters, setFilters] = useState({ season: 'all', phase: 'all', type: 'all', query: '' });
  const [selectedId, setSelectedId] = useState('');
  const archive = useMemo(() => buildCareerArchive(state), [state]);
  const summary = useMemo(() => summarizeCareerArchive(archive), [archive]);
  const facets = useMemo(() => getCareerArchiveFacets(archive), [archive]);
  const visibleEntries = useMemo(() => filterCareerArchive(archive, filters), [archive, filters]);
  const selected = visibleEntries.find((entry) => entry.id === selectedId) || visibleEntries[0];

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  if (!archive.length) {
    return (
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="rounded-2xl border border-blue-500/25 bg-slate-900/90 p-10 text-center shadow-2xl backdrop-blur-md">
          <BookOpen className="mx-auto text-blue-400" size={48} />
          <h2 className="mt-5 text-3xl font-black uppercase tracking-tight text-white">Career Chronicle</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">Publish your first verified week to begin the permanent history of your journey from high-school recruit through retirement.</p>
        </div>
      </div>
    );
  }

  const record = `${summary.wins}-${summary.losses}`;
  const cards = [
    { label: 'Chronicle entries', value: summary.updates, icon: ShieldCheck, tone: 'text-blue-400' },
    { label: 'Career record', value: record, icon: Trophy, tone: 'text-amber-400' },
    { label: 'Appearances', value: summary.appearances, icon: UserRound, tone: 'text-emerald-400' },
    { label: 'Total touchdowns', value: summary.totalTouchdowns, icon: CheckCircle2, tone: 'text-violet-400' },
  ];

  return (
    <div className="relative z-10 mx-auto max-w-7xl space-y-6 pb-20">
      <header className="overflow-hidden rounded-2xl border border-blue-500/25 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-blue-950/70 p-6 shadow-2xl backdrop-blur-md md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-300"><BookOpen size={14} /> Permanent career record</p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white md:text-4xl">Career Chronicle</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">Every verified week, result, source fact, and newsroom edition—organized across the full player-to-coach journey.</p>
          </div>
          <div className="text-left lg:text-right">
            <div className="text-xs font-black uppercase tracking-widest text-slate-500">Current chapter</div>
            <div className="mt-1 text-lg font-black text-white">Season {state.currentSeason || 1} · Week {state.currentWeek || 1}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400">{state.careerPhase || 'Player'}</div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-slate-700/60 bg-slate-900/85 p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
              <Icon size={17} className={tone} />
            </div>
            <p className="mt-2 text-2xl font-black text-white">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-700/60 bg-slate-900/85 p-4 shadow-xl backdrop-blur-md">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_150px_170px_170px]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              value={filters.query}
              onChange={(event) => setFilter('query', event.target.value)}
              placeholder="Search opponent, headline, quote, or fact"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />
          </label>
          <select value={filters.season} onChange={(event) => setFilter('season', event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs font-bold text-white">
            <option value="all">All seasons</option>
            {facets.seasons.map((season) => <option key={season} value={season}>Season {season}</option>)}
          </select>
          <select value={filters.phase} onChange={(event) => setFilter('phase', event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs font-bold text-white">
            <option value="all">All career stages</option>
            {facets.phases.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
          </select>
          <select value={filters.type} onChange={(event) => setFilter('type', event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs font-bold text-white">
            <option value="all">All event types</option>
            {facets.types.map((type) => <option key={type} value={type}>{formatType(type)}</option>)}
          </select>
        </div>
        <p className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500"><Filter size={13} /> Showing {visibleEntries.length} of {archive.length} verified entries</p>
      </section>

      {visibleEntries.length ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(310px,0.85fr)_minmax(0,1.5fr)]">
          <section className="max-h-[760px] space-y-3 overflow-y-auto pr-1">
            {visibleEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedId(entry.id)}
                className={`w-full rounded-xl border p-4 text-left shadow-lg transition-all ${selected?.id === entry.id ? 'border-blue-400 bg-blue-950/50 ring-1 ring-blue-400/30' : 'border-slate-700/60 bg-slate-900/85 hover:border-slate-500 hover:bg-slate-900'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-400">Season {entry.season} · Week {entry.week} · {entry.careerPhase}</p>
                    <h3 className="mt-1.5 text-sm font-black leading-snug text-white">{entry.title}</h3>
                  </div>
                  <ChevronRight className="mt-1 shrink-0 text-slate-600" size={18} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${entryTone(entry)}`}>{formatType(entry.weekType)}</span>
                  <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">{entry.factCount} facts</span>
                  {entry.hasNewsroom && <span className="rounded-full border border-amber-500/30 bg-amber-950/20 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-300">News edition</span>}
                </div>
              </button>
            ))}
          </section>

          {selected && (
            <article className="h-fit overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/90 shadow-2xl backdrop-blur-md">
              <div className="border-b border-slate-700/60 bg-slate-950/50 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-400"><CalendarDays size={14} /> Season {selected.season} · Week {selected.week}</p>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{selected.careerPhase}</span>
                </div>
                <h2 className="mt-3 text-2xl font-black leading-tight text-white md:text-3xl">{selected.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{selected.summary}</p>
              </div>

              <div className="space-y-6 p-6">
                {selected.game && (
                  <section>
                    <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Verified game line</h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        ['Result', selected.game.result || '—'],
                        ['Score', selected.game.homeScore !== '' ? `${selected.game.homeScore}-${selected.game.awayScore}` : '—'],
                        ['Pass yards', selected.game.didPlay === false ? 'DNP' : formatValue(selected.game.passYds)],
                        ['Total TD', selected.game.didPlay === false ? 'DNP' : Number(selected.game.passTD || 0) + Number(selected.game.rushTD || 0)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                          <div className="text-[8px] font-black uppercase tracking-widest text-slate-600">{label}</div>
                          <div className="mt-1 text-lg font-black text-white">{value}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {hasRtgSnapshot(selected.rtgSnapshot) && (
                  <section className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">RTG Mechanics & NIL snapshot</h3>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Saved with this week</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {RTG_FIELDS.filter(({ key }) => selected.rtgSnapshot[key] !== undefined).map(({ key, label }) => {
                        const change = selected.rtgChanges?.find((entry) => entry.key === key);
                        return (
                          <div key={key} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-600">{label}</div>
                            <div className="mt-1 flex items-baseline gap-2">
                              <span className="text-sm font-black text-white">{formatRtgValue(key, selected.rtgSnapshot[key])}</span>
                              {change && <span className={`text-[10px] font-black ${change.kind === 'number' && change.delta < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatRtgDelta(change)}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {!!selected.rtgChanges?.length && (
                      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-blue-300">{selected.rtgChanges.length} verified change{selected.rtgChanges.length === 1 ? '' : 's'} from the previous published week</p>
                    )}
                  </section>
                )}

                {selected.quote && (
                  <blockquote className="border-l-4 border-amber-500 bg-amber-950/10 py-3 pl-4 pr-3 text-sm italic leading-relaxed text-slate-300">“{selected.quote}”</blockquote>
                )}

                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"><FileSearch size={14} /> Verified Fact Ledger</h3>
                    <span className="text-[10px] font-bold text-emerald-400">{selected.facts.length} attached</span>
                  </div>
                  {selected.facts.length ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selected.facts.map((fact) => (
                        <div key={fact.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{fact.label}</div>
                              <div className="mt-1 text-sm font-bold text-white">{formatValue(fact.value)}</div>
                            </div>
                            <CheckCircle2 className="shrink-0 text-emerald-500" size={15} />
                          </div>
                          <div className="mt-2 truncate font-mono text-[8px] text-slate-700">{fact.key}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-700 p-5 text-center text-xs text-slate-500">This legacy entry predates source-level Fact Ledger storage.</div>
                  )}
                </section>

                <footer className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Clock3 size={14} /> {selected.verificationMethod === 'user-confirmed' ? 'User-confirmed event' : `${selected.sourceCount} screenshot source${selected.sourceCount === 1 ? '' : 's'}`} · {selected.factCount} verified facts</div>
                  {selected.hasNewsroom && (
                    <button type="button" onClick={() => onOpenNewsroom(selected.id)} className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 transition-colors hover:bg-amber-400">
                      <Newspaper size={15} /> Open news edition
                    </button>
                  )}
                </footer>
              </div>
            </article>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-10 text-center">
          <Search className="mx-auto text-slate-600" size={34} />
          <h3 className="mt-3 text-lg font-black text-white">No matching career entries</h3>
          <p className="mt-1 text-sm text-slate-500">Clear or change the filters to return to the full Chronicle.</p>
        </div>
      )}
    </div>
  );
};

export default CareerArchive;
