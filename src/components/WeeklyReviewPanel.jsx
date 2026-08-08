import { AlertTriangle, Check, CheckCircle2, ClipboardCheck, FileImage, ShieldCheck, Trash2, X } from 'lucide-react';
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
  const max = entry.key === 'rtg.gpa' ? 4 : (isRecruitingStars(entry.key) ? 5 : (/^retention\..+\.overall$/.test(entry.key) ? 99 : (entry.key === 'rtg.energy' || isRecruitingInterest(entry.key) ? 100 : undefined)));
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

const WeeklyReviewPanel = ({
  draft,
  onApply,
  onDiscard,
  onChangeFact,
  onVerifyFact,
  onRemoveFact,
  onChangeWeekType,
}) => {
  if (!draft) return null;

  const uncertainCount = draft.facts.filter((entry) => entry.confidence < 0.9 && !entry.userVerified).length;
  const invalidCount = draft.facts.filter((entry) => validateScanFact(entry)).length;
  const detectedTypes = [...new Set(draft.sources.flatMap((source) => source.detectedTypes))];
  const completeness = getWeeklyCompleteness(draft);
  const isHighSchool = draft.careerPhase === 'Player' && !draft.isCommitted;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-blue-500/40 bg-slate-900/95 shadow-2xl">
      <div className="flex flex-col gap-4 border-b border-slate-700/70 bg-blue-950/40 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Review before publishing</p>
          <h3 className="text-xl font-black uppercase text-white">Week {draft.week} extraction draft</h3>
          <p className="mt-1 text-xs text-slate-400">
            {draft.sources.length} screenshot{draft.sources.length === 1 ? '' : 's'} · {draft.facts.length} extracted facts · {detectedTypes.join(', ') || 'Unclassified'}
          </p>
          {draft.recoveredAt && <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-blue-300">Recovered after refresh · screenshot previews are no longer attached</p>}
        </div>
        {invalidCount > 0 || uncertainCount > 0 || completeness.missingRequired > 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200">
            <AlertTriangle size={15} />
            {invalidCount > 0
              ? `${invalidCount} invalid value${invalidCount === 1 ? '' : 's'}`
              : (uncertainCount > 0
                ? `${uncertainCount} value${uncertainCount === 1 ? '' : 's'} need attention`
                : `${completeness.missingRequired} essential item${completeness.missingRequired === 1 ? '' : 's'} missing`)}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200">
            <ShieldCheck size={15} /> Essential weekly facts complete
          </div>
        )}
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Extracted facts</h4>
            <span className="text-[10px] text-slate-500">Correct, confirm, or ignore uncertain values here.</span>
          </div>
          {draft.facts.length ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {draft.facts.map((entry) => {
                const confidence = confidenceStyle(entry.confidence);
                const source = draft.sources.find((item) => item.id === entry.sourceId);
                const validationError = validateScanFact(entry);
                return (
                  <div key={entry.key} className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{entry.label}</span>
                      <div className="flex items-center gap-1">
                        {entry.userVerified && <span className="rounded border border-blue-500/30 bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-300">{entry.corrected ? 'Corrected' : 'Confirmed'}</span>}
                        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${confidence.className}`}>{confidence.label}</span>
                      </div>
                    </div>
                    <FactEditor entry={entry} onChange={(value) => onChangeFact(entry.key, value)} />
                    {validationError && <p className="mt-1 text-[10px] font-bold text-red-300">{validationError}</p>}
                    {entry.evidence && <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500">Seen: {entry.evidence}</p>}
                    {source?.previewUrl && (
                      <a href={source.previewUrl} target="_blank" rel="noreferrer" className="mt-2 block truncate text-[9px] font-bold uppercase tracking-wide text-blue-400 hover:text-blue-300">
                        Open source · {source.fileName}
                      </a>
                    )}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2">
                      {entry.confidence < 0.9 && !entry.userVerified ? (
                        <button type="button" onClick={() => onVerifyFact(entry.key)} className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-blue-400 hover:text-blue-300"><Check size={12} /> Confirm as shown</button>
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

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300"><ClipboardCheck size={14} /> Weekly completeness</h4>
              {isHighSchool ? (
                <span className="rounded-lg border border-blue-500/30 bg-blue-950/30 px-2 py-1.5 text-[10px] font-black uppercase text-blue-200">High-school evaluation</span>
              ) : <select
                value={draft.weekType || WEEK_TYPES.GAME}
                onChange={(event) => onChangeWeekType(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[10px] font-black uppercase text-white outline-none focus:border-blue-400"
                aria-label="Weekly update type"
              >
                <option value={WEEK_TYPES.GAME}>Game week</option>
                {draft.careerPhase === 'Player' && <option value={WEEK_TYPES.NO_APPEARANCE}>Team game · no appearance</option>}
                <option value={WEEK_TYPES.BYE}>Bye week</option>
              </select>}
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
                      {check.status === 'missing' && (
                        <span className={`mt-1 inline-block text-[8px] font-black uppercase tracking-wider ${check.importance === 'required' ? 'text-amber-300' : 'text-slate-600'}`}>
                          {check.importance}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {completeness.missingRequired > 0 && (
              <p className="mt-3 text-[10px] leading-relaxed text-amber-200">You can continue with an intentional partial update. Missing facts will not be invented or written as zero.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300"><FileImage size={14} /> Sources</h4>
            <div className="mb-5 space-y-2">
              {draft.sources.map((source) => (
                <div key={source.id} className={`overflow-hidden rounded-lg border bg-slate-900/80 ${source.error ? 'border-red-500/40' : 'border-slate-800'}`}>
                  {source.previewUrl && (
                    <a href={source.previewUrl} target="_blank" rel="noreferrer" title="Open the full uploaded screenshot">
                      <img src={source.previewUrl} alt={`Uploaded source ${source.fileName}`} className="h-24 w-full bg-black object-contain" />
                    </a>
                  )}
                  <div className="p-3">
                    <p className="truncate text-xs font-bold text-white">{source.fileName}</p>
                    <p className={`mt-1 text-[10px] ${source.error ? 'text-red-300' : 'text-slate-500'}`}>
                      {source.error || source.detectedTypes.join(', ') || 'No screen type detected'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <button
                type="button"
                disabled={!draft.facts.length || uncertainCount > 0 || invalidCount > 0}
                onClick={onApply}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check size={16} /> {completeness.missingRequired > 0 ? 'Apply partial update' : 'Apply for review'}
              </button>
              {(uncertainCount > 0 || invalidCount > 0) && (
                <p className="text-center text-[10px] leading-relaxed text-amber-300">Resolve every flagged value before applying this draft.</p>
              )}
              <button
                type="button"
                onClick={onDiscard}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-300 transition-colors hover:border-red-500/50 hover:text-red-300"
              >
                <Trash2 size={15} /> Discard scan
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WeeklyReviewPanel;
