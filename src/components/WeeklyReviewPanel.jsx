import { useEffect, useState } from 'react';
import {
  AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck,
  Eye, FileImage, ShieldCheck, Trash2, X,
} from 'lucide-react';
import { getWeeklyCompleteness, validateScanFact, WEEK_TYPES } from '../domain/weeklyEngine';

const confidenceStyle = (confidence) => {
  if (confidence >= 0.9) return { label: 'High', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
  if (confidence >= 0.75) return { label: 'Review', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
  return { label: 'Low', className: 'bg-red-500/15 text-red-300 border-red-500/30' };
};

const isRecruitingOffer = (key) => /^recruiting\..+\.offer$/.test(key);
const isRecruitingInterest = (key) => /^recruiting\..+\.interest$/.test(key);
const isRecruitingStars = (key) => /^recruiting\..+\.stars$/.test(key);
const isNumericFact = (key) => [
  'game.homeScore', 'game.awayScore', 'game.passYds', 'game.passTD', 'game.rushYds',
  'game.rushTD', 'game.int', 'rtg.gpa', 'rtg.energy', 'rtg.coachTrust',
  'rtg.trustToNext', 'rtg.skillPoints', 'rtg.followers', 'rtg.valuation',
  'coach.dynastyPoints', 'coach.recruitingNIL', 'coach.rosterNIL', 'coach.staffBudget',
  'coach.facilitiesBudget', 'coach.rosterSize', 'coach.scholarshipsUsed', 'coach.portalDepartures',
  'coach.openScholarships', 'coach.classCommits', 'coach.portalAdditions',
].includes(key) || /^roster\.(?:qb|rb|wr|te|ol|dl|lb|cb|s|st)\.(?:count|need)$/.test(key)
  || /^retention\..+\.(?:overall|nilDemand)$/.test(key)
  || /^recruiting\.profile\.(?:recruitStars|tapeScore|nationalRank|stateRank|positionRank|gameNumber|topSchoolsSelected)$/.test(key)
  || isRecruitingInterest(key) || isRecruitingStars(key);

const FactEditor = ({ entry, onChange }) => {
  if (isRecruitingOffer(entry.key)) {
    return (
      <select value={entry.value ? 'true' : 'false'} onChange={(event) => onChange(event.target.value === 'true')} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-blue-400">
        <option value="true">Official offer received</option>
        <option value="false">No offer received</option>
      </select>
    );
  }
  if (entry.key === 'game.result') {
    return (
      <select value={entry.value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-blue-400">
        <option value="W">Win</option>
        <option value="L">Loss</option>
      </select>
    );
  }
  if (/^highSchool\.moment\.\d\.type$/.test(entry.key)) {
    return (
      <select value={entry.value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-blue-400">
        <option value="standard">Standard moment · 2 objectives</option>
        <option value="scholarship">Scholarship Challenge · 1 major objective</option>
      </select>
    );
  }
  if (/^highSchool\.moment\.\d\.objective\.\d\.result$/.test(entry.key)) {
    return (
      <select value={entry.value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-blue-400">
        <option value="passed">Passed</option>
        <option value="failed">Failed</option>
      </select>
    );
  }
  if (/^highSchool\.moment\.\d\.result$/.test(entry.key)) {
    return (
      <select value={entry.value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-blue-400">
        <option value="success">Successful</option>
        <option value="partial">Partial</option>
        <option value="failed">Failed</option>
      </select>
    );
  }
  if (entry.key.startsWith('rtg.wear.')) {
    return (
      <select value={entry.value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-blue-400">
        <option value="Green">Green</option>
        <option value="Yellow">Yellow</option>
        <option value="Red">Red</option>
      </select>
    );
  }
  const max = entry.key === 'rtg.gpa'
    ? 4
    : (isRecruitingStars(entry.key)
      ? 5
      : (/^retention\..+\.overall$/.test(entry.key)
        ? 99
        : (entry.key === 'rtg.energy' || isRecruitingInterest(entry.key) ? 100 : undefined)));
  return (
    <input
      type={isNumericFact(entry.key) ? 'number' : 'text'}
      min={isNumericFact(entry.key) ? 0 : undefined}
      max={max}
      step={entry.key === 'rtg.gpa' ? 0.01 : (isNumericFact(entry.key) ? 1 : undefined)}
      value={entry.value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm font-black text-white outline-none focus:border-blue-400"
    />
  );
};

const SummaryStat = ({ label, value, tone = 'default' }) => (
  <div className={`rounded-xl border p-3 ${tone === 'attention' ? 'border-amber-500/30 bg-amber-500/10' : tone === 'ready' ? 'border-emerald-500/25 bg-emerald-500/8' : 'border-slate-700/70 bg-slate-950/45'}`}>
    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
    <p className={`mt-1 text-lg font-black ${tone === 'attention' ? 'text-amber-300' : tone === 'ready' ? 'text-emerald-300' : 'text-white'}`}>{value}</p>
  </div>
);

const WeeklyReviewPanel = ({
  draft,
  onApply,
  onDiscard,
  onChangeFact,
  onVerifyFact,
  onRemoveFact,
  onChangeWeekType,
}) => {
  const [viewMode, setViewMode] = useState('attention');
  const [sourcesOpen, setSourcesOpen] = useState(false);

  useEffect(() => {
    setViewMode('attention');
    setSourcesOpen(false);
  }, [draft?.id, draft?.week]);

  if (!draft) return null;

  const sourceById = new Map(draft.sources.map((source) => [source.id, source]));
  const conflictByKey = new Map((draft.conflicts || []).map((conflict) => [conflict.key, conflict]));
  const completeness = getWeeklyCompleteness(draft);
  const isHighSchool = draft.careerPhase === 'Player' && !draft.isCommitted;
  const detectedTypes = [...new Set(draft.sources.flatMap((source) => source.detectedTypes))];

  const factsWithState = draft.facts.map((entry) => {
    const validationError = validateScanFact(entry);
    const conflict = conflictByKey.get(entry.key);
    const uncertain = entry.confidence < 0.9 && !entry.userVerified;
    return { entry, validationError, conflict, uncertain, needsAttention: Boolean(validationError || conflict || uncertain) };
  });
  const attentionFacts = factsWithState.filter((item) => item.needsAttention);
  const invalidCount = factsWithState.filter((item) => item.validationError).length;
  const conflictCount = factsWithState.filter((item) => item.conflict).length;
  const uncertainCount = factsWithState.filter((item) => item.uncertain).length;
  const blockingCount = invalidCount + conflictCount + uncertainCount;
  const canApply = draft.facts.length > 0 && blockingCount === 0;
  const visibleFacts = viewMode === 'all' || attentionFacts.length === 0 ? factsWithState : attentionFacts;

  const factValue = (key) => draft.facts.find((entry) => entry.key === key)?.value;
  const opponent = factValue('game.opponent');
  const result = factValue('game.result');
  const homeScore = factValue('game.homeScore');
  const awayScore = factValue('game.awayScore');
  const passYds = factValue('game.passYds');
  const passTD = factValue('game.passTD');
  const interceptions = factValue('game.int');
  const rushYds = factValue('game.rushYds');
  const rushTD = factValue('game.rushTD');
  const hasGameSnapshot = [opponent, result, homeScore, awayScore, passYds, passTD, interceptions, rushYds, rushTD].some((value) => value !== undefined && value !== '');

  return (
    <section className="dhq-postgame-review mb-6 overflow-hidden rounded-2xl border border-blue-500/40 bg-slate-900/95 shadow-2xl">
      <div className="border-b border-slate-700/70 bg-gradient-to-r from-blue-950/60 via-slate-950/70 to-slate-950/90 p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Postgame scanner · review & confirm</p>
            <h3 className="text-2xl font-black uppercase text-white">Week {draft.week} verification desk</h3>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
              DynastyHQ extracted the facts below from {draft.sources.length} screenshot{draft.sources.length === 1 ? '' : 's'}. Review only the flagged items first. High-confidence facts stay untouched unless you choose to inspect them.
            </p>
            {draft.recoveredAt && <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-blue-300">Recovered after refresh · screenshot previews are no longer attached</p>}
          </div>
          <div className={`rounded-xl border px-4 py-3 ${blockingCount || completeness.missingRequired ? 'border-amber-500/30 bg-amber-500/10' : 'border-emerald-500/30 bg-emerald-500/10'}`}>
            <p className={`flex items-center gap-2 text-xs font-black uppercase ${blockingCount || completeness.missingRequired ? 'text-amber-200' : 'text-emerald-200'}`}>
              {blockingCount || completeness.missingRequired ? <AlertTriangle size={15} /> : <ShieldCheck size={15} />}
              {blockingCount ? `${blockingCount} review item${blockingCount === 1 ? '' : 's'} remaining` : completeness.missingRequired ? `${completeness.missingRequired} essential item${completeness.missingRequired === 1 ? '' : 's'} missing` : 'Ready to apply'}
            </p>
            <p className="mt-1 max-w-sm text-[10px] leading-relaxed text-slate-400">
              {blockingCount ? 'Resolve conflicts, invalid values, and uncertain reads before applying.' : completeness.missingRequired ? 'You may intentionally continue with a partial update; missing values will never be invented.' : 'All extracted values are internally valid and no screenshot conflicts remain.'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryStat label="Screens" value={draft.sources.length} />
          <SummaryStat label="Extracted facts" value={draft.facts.length} />
          <SummaryStat label="Needs review" value={attentionFacts.length} tone={attentionFacts.length ? 'attention' : 'ready'} />
          <SummaryStat label="Required missing" value={completeness.missingRequired} tone={completeness.missingRequired ? 'attention' : 'ready'} />
        </div>
      </div>

      {hasGameSnapshot && !isHighSchool && (
        <div className="border-b border-slate-800 bg-slate-950/55 px-5 py-4 md:px-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Quick read</span>
            {opponent && <span className="text-xs font-black text-white">vs. {String(opponent)}</span>}
            {result && <span className={`rounded px-2 py-1 text-[10px] font-black uppercase ${result === 'W' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>{result === 'W' ? 'Win' : 'Loss'}</span>}
            {homeScore !== undefined && awayScore !== undefined && <span className="font-mono text-xs font-black text-slate-200">Score {String(homeScore)}–{String(awayScore)}</span>}
            {passYds !== undefined && <span className="text-xs text-slate-300"><strong className="text-white">{String(passYds)}</strong> pass yds</span>}
            {passTD !== undefined && <span className="text-xs text-slate-300"><strong className="text-white">{String(passTD)}</strong> pass TD</span>}
            {interceptions !== undefined && <span className="text-xs text-slate-300"><strong className="text-white">{String(interceptions)}</strong> INT</span>}
            {rushYds !== undefined && <span className="text-xs text-slate-300"><strong className="text-white">{String(rushYds)}</strong> rush yds</span>}
            {rushTD !== undefined && <span className="text-xs text-slate-300"><strong className="text-white">{String(rushTD)}</strong> rush TD</span>}
          </div>
        </div>
      )}

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px] md:p-6">
        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider text-white">Extracted facts</h4>
              <p className="mt-1 text-[10px] text-slate-500">Fix only what needs fixing. Editing a value counts as a user correction.</p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-700 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setViewMode('attention')}
                className={`rounded-md px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${viewMode === 'attention' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Needs attention {attentionFacts.length ? `(${attentionFacts.length})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`rounded-md px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                All facts ({draft.facts.length})
              </button>
            </div>
          </div>

          {viewMode === 'attention' && attentionFacts.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-7 text-center">
              <CheckCircle2 className="mx-auto text-emerald-400" size={30} />
              <h5 className="mt-3 text-sm font-black uppercase tracking-wide text-emerald-200">No extracted values need manual review</h5>
              <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-400">The scanner found no conflicts, invalid values, or low-confidence facts. You can inspect every extracted fact if you want, or move directly to the completeness check and apply the draft.</p>
              <button type="button" onClick={() => setViewMode('all')} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-200 hover:border-blue-400">
                <Eye size={14} /> Inspect all facts
              </button>
            </div>
          ) : draft.facts.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleFacts.map(({ entry, validationError, conflict, uncertain, needsAttention }) => {
                const confidence = confidenceStyle(entry.confidence);
                const source = sourceById.get(entry.sourceId);
                return (
                  <div key={entry.key} className={`rounded-xl border p-3.5 ${needsAttention ? 'border-amber-500/45 bg-amber-950/10' : 'border-slate-700/70 bg-slate-950/60'}`}>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{entry.label}</span>
                      <div className="flex items-center gap-1">
                        {entry.userVerified && <span className="rounded border border-blue-500/30 bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-300">{entry.corrected ? 'Corrected' : 'Confirmed'}</span>}
                        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${confidence.className}`}>{confidence.label}</span>
                      </div>
                    </div>
                    <FactEditor entry={entry} onChange={(value) => onChangeFact(entry.key, value)} />
                    {validationError && <p className="mt-1.5 text-[10px] font-bold text-red-300">{validationError}</p>}
                    {conflict && (
                      <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
                        <p className="text-[9px] font-black uppercase tracking-wide text-amber-300">Screenshots disagree</p>
                        <div className="mt-1 space-y-1">
                          {conflict.candidates.map((candidate, index) => {
                            const candidateSource = sourceById.get(candidate.sourceId);
                            return (
                              <p key={`${candidate.sourceId}:${String(candidate.value)}:${index}`} className="text-[10px] text-amber-100">
                                <span className="font-black">{String(candidate.value)}</span> · {candidateSource?.uploadContext?.label || candidateSource?.fileName || 'Uploaded source'}
                              </p>
                            );
                          })}
                        </div>
                        <p className="mt-1 text-[9px] leading-relaxed text-amber-200/80">Edit the field or confirm the selected value to resolve the conflict.</p>
                      </div>
                    )}
                    {uncertain && !conflict && <p className="mt-2 text-[9px] leading-relaxed text-amber-200/80">Scanner confidence is below the automatic-review threshold. Compare it with the source and confirm or correct it.</p>}
                    {entry.evidence && <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-slate-500">Seen: {entry.evidence}</p>}
                    {source?.previewUrl && needsAttention && (
                      <a href={source.previewUrl} target="_blank" rel="noreferrer" className="mt-2 block truncate text-[9px] font-bold uppercase tracking-wide text-blue-400 hover:text-blue-300">
                        Open source · {source.fileName}
                      </a>
                    )}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2">
                      {(entry.confidence < 0.9 || conflict) && !entry.userVerified ? (
                        <button type="button" onClick={() => onVerifyFact(entry.key)} className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-blue-400 hover:text-blue-300"><Check size={12} /> {conflict ? 'Use selected value' : 'Confirm as shown'}</button>
                      ) : <span className="text-[9px] uppercase tracking-wide text-slate-600">{entry.userVerified ? 'User reviewed' : 'High confidence'}</span>}
                      <button type="button" onClick={() => onRemoveFact(entry.key)} title="Ignore this extracted fact" className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-slate-500 hover:text-red-300"><X size={12} /> Ignore</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center text-sm text-slate-400">
              No reliable facts were found. Discard this draft and try a tighter screenshot crop.
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300"><ClipboardCheck size={14} /> Weekly completeness</h4>
              {isHighSchool ? (
                <span className="rounded-lg border border-blue-500/30 bg-blue-950/30 px-2 py-1.5 text-[10px] font-black uppercase text-blue-200">High-school evaluation</span>
              ) : (
                <select
                  value={draft.weekType || WEEK_TYPES.GAME}
                  onChange={(event) => onChangeWeekType(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[10px] font-black uppercase text-white outline-none focus:border-blue-400"
                  aria-label="Weekly update type"
                >
                  <option value={WEEK_TYPES.GAME}>Game week</option>
                  {draft.careerPhase === 'Player' && <option value={WEEK_TYPES.NO_APPEARANCE}>Team game · no appearance</option>}
                  <option value={WEEK_TYPES.BYE}>Bye week</option>
                </select>
              )}
            </div>
            <div className="space-y-2">
              {completeness.checks.map((check) => (
                <div key={check.id} className={`rounded-lg border p-2.5 ${check.status === 'complete' ? 'border-emerald-500/20 bg-emerald-500/5' : (check.importance === 'required' ? 'border-amber-500/30 bg-amber-500/10' : 'border-slate-700 bg-slate-900/70')}`}>
                  <div className="flex items-start gap-2">
                    {check.status === 'complete'
                      ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                      : <AlertTriangle size={14} className={`mt-0.5 shrink-0 ${check.importance === 'required' ? 'text-amber-400' : 'text-slate-500'}`} />}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-200">{check.label}</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{check.detail}</p>
                      {check.status === 'missing' && <span className={`mt-1 inline-block text-[8px] font-black uppercase tracking-wider ${check.importance === 'required' ? 'text-amber-300' : 'text-slate-600'}`}>{check.importance}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {completeness.missingRequired > 0 && <p className="mt-3 text-[10px] leading-relaxed text-amber-200">Intentional partial updates are allowed. Missing facts stay missing; DynastyHQ will not convert them to zero or invent them.</p>}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/50">
            <button type="button" onClick={() => setSourcesOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
              <span>
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300"><FileImage size={14} /> Screenshot sources</span>
                <span className="mt-1 block text-[10px] text-slate-500">{draft.sources.length} upload{draft.sources.length === 1 ? '' : 's'} · {detectedTypes.join(', ') || 'Unclassified'}</span>
              </span>
              {sourcesOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
            {sourcesOpen && (
              <div className="space-y-2 border-t border-slate-800 p-3">
                {draft.sources.map((source) => (
                  <div key={source.id} className={`overflow-hidden rounded-lg border bg-slate-900/80 ${source.error ? 'border-red-500/40' : 'border-slate-800'}`}>
                    {source.previewUrl && (
                      <a href={source.previewUrl} target="_blank" rel="noreferrer" title="Open the full uploaded screenshot">
                        <img src={source.previewUrl} alt={`Uploaded source ${source.fileName}`} className="h-28 w-full bg-black object-contain" />
                      </a>
                    )}
                    <div className="p-3">
                      <p className="truncate text-xs font-bold text-white">{source.fileName}</p>
                      {source.uploadContext?.label && <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-amber-300">{source.uploadContext.label}</p>}
                      <p className={`mt-1 text-[10px] ${source.error ? 'text-red-300' : 'text-slate-500'}`}>{source.error || source.detectedTypes.join(', ') || 'No screen type detected'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`rounded-xl border p-4 ${canApply ? 'border-blue-500/35 bg-blue-950/20' : 'border-slate-700/70 bg-slate-950/50'}`}>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-300">Next action</p>
            <h4 className="mt-1 text-sm font-black uppercase text-white">{canApply ? 'Apply verified draft' : 'Finish flagged review'}</h4>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
              {canApply
                ? 'This copies the reviewed scanner values into the Weekly Agenda. It still does not publish the week; you will get one final verified summary first.'
                : 'Resolve each flagged read above. The Apply button unlocks automatically when conflicts, invalid values, and uncertain facts are cleared.'}
            </p>
            <button
              type="button"
              disabled={!canApply}
              onClick={onApply}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Check size={16} /> {completeness.missingRequired > 0 ? 'Apply intentional partial update' : 'Apply verified draft'}
            </button>
            {!canApply && blockingCount > 0 && <p className="mt-2 text-center text-[10px] leading-relaxed text-amber-300">{blockingCount} flagged review item{blockingCount === 1 ? '' : 's'} remaining.</p>}
            <button
              type="button"
              onClick={onDiscard}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-300 transition-colors hover:border-red-500/50 hover:text-red-300"
            >
              <Trash2 size={14} /> Discard scan
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default WeeklyReviewPanel;
