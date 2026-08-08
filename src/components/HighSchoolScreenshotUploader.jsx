import { AlertTriangle, CheckCircle2, FileImage, Loader2, UploadCloud } from 'lucide-react';
import { HIGH_SCHOOL_UPLOAD_SLOTS } from '../domain/screenshotAnalysis';

const HighSchoolScreenshotUploader = ({ draft, isScanning, scanProgress, onUpload }) => (
  <section className="rounded-2xl border border-amber-500/40 bg-slate-900/85 p-5 shadow-2xl backdrop-blur-md">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Guided high-school scanner</p>
        <h3 className="mt-1 text-xl font-black uppercase text-white">Upload each screen to its exact slot</h3>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-300">
          DynastyHQ uses the slot you choose to place extracted objectives in the correct Moment card. Review every result before applying; uploads never change your saved career or publish your week.
        </p>
      </div>
      <div className="rounded-lg border border-blue-500/30 bg-blue-950/30 px-3 py-2 text-[10px] font-bold leading-relaxed text-blue-200">
        Manual editing stays available after extraction.
      </div>
    </div>

    {isScanning && (
      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3">
        <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-wider text-amber-300">
          <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Secure AI analysis</span>
          <span>{scanProgress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${scanProgress}%` }} />
        </div>
      </div>
    )}

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {HIGH_SCHOOL_UPLOAD_SLOTS.map((slot) => {
        const slotSources = (draft?.sources || []).filter((source) => source.uploadContext?.id === slot.id);
        const successfulSources = slotSources.filter((source) => !source.error);
        const failedSources = slotSources.filter((source) => source.error);
        const isPostgame = slot.id === 'postgame-summary';
        return (
          <div
            key={slot.id}
            className={`flex min-h-48 flex-col rounded-xl border p-4 ${
              successfulSources.length
                ? 'border-emerald-500/40 bg-emerald-950/15'
                : failedSources.length
                  ? 'border-red-500/40 bg-red-950/15'
                  : 'border-slate-700 bg-slate-950/55'
            } ${isPostgame ? 'sm:col-span-2 xl:col-span-4' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-white">{slot.label}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{slot.description}</p>
              </div>
              {successfulSources.length ? (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
              ) : failedSources.length ? (
                <AlertTriangle size={18} className="shrink-0 text-red-400" />
              ) : (
                <FileImage size={18} className="shrink-0 text-slate-600" />
              )}
            </div>

            <div className="mt-3 flex-1 space-y-1">
              {slotSources.length ? slotSources.map((source) => (
                <p key={source.id} className={`truncate text-[10px] ${source.error ? 'text-red-300' : 'text-emerald-300'}`} title={source.fileName}>
                  {source.error ? 'Needs retry' : 'Ready for review'} · {source.fileName}
                </p>
              )) : <p className="text-[10px] text-slate-600">No screenshot added yet.</p>}
            </div>

            <label className={`mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
              isScanning
                ? 'cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:border-amber-400 hover:bg-amber-500/20'
            }`}>
              <UploadCloud size={14} /> {slotSources.length ? 'Add another screenshot' : 'Choose screenshot'}
              <input
                type="file"
                accept="image/*"
                multiple={slot.multiple}
                disabled={isScanning}
                className="hidden"
                aria-label={`Upload ${slot.label} screenshot${slot.multiple ? 's' : ''}`}
                onChange={(event) => onUpload(event, slot)}
              />
            </label>
          </div>
        );
      })}
    </div>

    <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
      If two screenshots disagree, DynastyHQ pauses application and asks you to choose or correct the value. A passed Scholarship Challenge is not treated as an official offer unless an official offer screen verifies it.
    </p>
  </section>
);

export default HighSchoolScreenshotUploader;
