import { useRef, useState } from 'react';
import {
  Check, ImagePlus, Images, Loader2, Sparkles, Trash2, Upload, X,
} from 'lucide-react';

const NewsroomMediaManager = ({
  issue,
  article,
  mediaLibrary = [],
  currentMedia,
  busy = false,
  autoAssignLibrary = true,
  onUpload,
  onAssign,
  onClear,
  onGenerate,
  onToggleReference,
  onDelete,
  onSetAutoAssignLibrary,
  lockerOnly = false,
}) => {
  const uploadRef = useRef(null);
  const referenceRef = useRef(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [lockerOpen, setLockerOpen] = useState(lockerOnly);
  const [uploading, setUploading] = useState(false);
  const controlsBusy = busy || uploading;

  const receiveFile = async (event, asReference) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onUpload) return;
    setUploading(true);
    try {
      await onUpload(file, { issue, article, asReference });
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="border-t border-slate-700 bg-slate-950 p-4 text-slate-100">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={uploadRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => receiveFile(event, false)} />
        <input ref={referenceRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => receiveFile(event, true)} />
        <button type="button" disabled={controlsBusy} onClick={() => uploadRef.current?.click()} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:bg-blue-500 disabled:opacity-50">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {uploading ? 'Uploading Photo…' : 'Add Photos to Library'}
        </button>
        {!lockerOnly && <button type="button" disabled={controlsBusy || !mediaLibrary.length} onClick={() => setLibraryOpen((open) => !open)} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-wider hover:border-slate-500 disabled:opacity-40">
          <Images size={14} /> Career Photo Library ({mediaLibrary.length})
        </button>}
        {!lockerOnly && <button type="button" disabled={controlsBusy || article?.groundingStatus !== 'verified'} onClick={() => onGenerate({ issue, article })} className="flex items-center gap-2 rounded-lg border border-violet-500/50 bg-violet-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-violet-200 hover:bg-violet-500/20 disabled:opacity-40">
          {busy && !uploading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Generate AI Photo
        </button>}
        {currentMedia?.asset && (
          <button type="button" disabled={controlsBusy} onClick={() => onClear({ issue, article })} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:border-red-500/50 hover:text-red-300">
            <X size={14} /> Remove From Article
          </button>
        )}
        <button type="button" disabled={controlsBusy} onClick={() => setLockerOpen((open) => !open)} className={`${lockerOnly ? '' : 'ml-auto'} flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-amber-200 hover:bg-amber-500/20 disabled:opacity-50`}>
          {lockerOnly ? <Images size={14} /> : <ImagePlus size={14} />}
          {lockerOnly ? `Photo Library (${mediaLibrary.length})` : `AI Reference Locker (${mediaLibrary.filter((asset) => asset.isReference).length})`}
        </button>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        {lockerOnly
          ? `${mediaLibrary.length} saved ${mediaLibrary.length === 1 ? 'photo' : 'photos'}. Thumbnails are shown below; uploads never trigger AI generation.`
          : 'Uploads go to your reusable library. New and rewritten editions automatically choose uploaded photos; AI images are created only when you press Generate AI Photo.'}
      </p>
      {uploading && <p className="mt-2 flex items-center gap-2 text-[10px] font-bold text-blue-300"><Loader2 size={12} className="animate-spin" /> Preparing and securely uploading your photo. This will stop with an error if the connection times out.</p>}

      {libraryOpen && (
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Choose a career photo</p>
            <button type="button" onClick={() => setLibraryOpen(false)} className="text-slate-500 hover:text-white"><X size={15} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {[...mediaLibrary].reverse().map((asset) => (
              <button key={asset.id} type="button" onClick={() => { onAssign({ issue, article, asset }); setLibraryOpen(false); }} className={`group overflow-hidden rounded-lg border text-left ${article?.mediaAssetId === asset.id ? 'border-blue-400' : 'border-slate-700 hover:border-slate-500'}`}>
                <img src={asset.downloadUrl} alt={asset.referenceLabel || asset.fileName} className="aspect-[3/2] w-full bg-black object-cover" />
                <div className="flex items-center justify-between gap-2 p-2">
                  <span className="min-w-0 truncate text-[9px] font-bold text-slate-300">{asset.fileName}</span>
                  {asset.isReference && <span className="shrink-0 text-[8px] font-black uppercase text-amber-300">Reference</span>}
                  {asset.origin === 'ai-generated' && <span className="shrink-0 text-[8px] font-black uppercase text-violet-300">AI</span>}
                  {article?.mediaAssetId === asset.id && <Check size={12} className="shrink-0 text-blue-400" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {lockerOpen && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-950/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Career Photo Library &amp; AI References</p>
              <p className="mt-1 text-[10px] text-slate-500">Every saved photo is visible here. Regular uploads can be selected automatically for articles; mark only clear face, uniform, helmet, or equipment photos as AI references.</p>
            </div>
            <button type="button" disabled={controlsBusy} onClick={() => referenceRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-amber-500/30 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-amber-200 hover:bg-amber-500/10 disabled:opacity-50">
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Add AI Reference
            </button>
          </div>

          {mediaLibrary.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {[...mediaLibrary].reverse().map((asset) => (
                <div key={asset.id} className={`overflow-hidden rounded-lg border ${asset.isReference ? 'border-amber-400' : 'border-slate-700'}`}>
                  <img src={asset.downloadUrl} alt={asset.referenceLabel || asset.fileName} className="aspect-[3/2] w-full bg-black object-cover" />
                  <div className="space-y-2 p-2">
                    <p className="truncate text-[9px] font-bold text-slate-300" title={asset.fileName}>{asset.fileName}</p>
                    <label className="flex cursor-pointer items-center gap-2 text-[9px] font-bold text-slate-300">
                      <input type="checkbox" disabled={controlsBusy} checked={Boolean(asset.isReference)} onChange={(event) => onToggleReference(asset, event.target.checked)} className="accent-amber-500" /> Approved reference
                    </label>
                    <button type="button" disabled={controlsBusy} onClick={() => onDelete(asset)} className="flex items-center gap-1 text-[9px] font-bold text-slate-500 hover:text-red-300 disabled:opacity-40"><Trash2 size={11} /> Delete photo</button>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="mt-4 rounded-lg border border-dashed border-slate-700 p-5 text-center text-xs text-slate-500">No photos saved yet. Use “Add Photos to Library” above to upload your first reusable game, action, recruiting, or portrait photo.</p>}

          <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-950/70 p-3">
            <input type="checkbox" disabled={controlsBusy} checked={autoAssignLibrary} onChange={(event) => onSetAutoAssignLibrary(event.target.checked)} className="mt-0.5 accent-blue-500" />
            <span>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-200">Automatically choose library photos</span>
              <span className="mt-1 block text-[10px] leading-relaxed text-slate-500">New and rewritten editions select uploaded photos in a stable randomized order. This never generates an AI image or uses API image credits.</span>
            </span>
          </label>
        </div>
      )}
    </section>
  );
};

export default NewsroomMediaManager;
