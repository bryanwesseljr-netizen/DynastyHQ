import { useMemo, useRef, useState } from 'react';
import {
  Check, FolderOpen, ImagePlus, Images, Loader2, Sparkles, Trash2, Upload, X,
} from 'lucide-react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, auth, db } from '../firebase';
import CustomNewsroomPhotoCreator from './CustomNewsroomPhotoCreator.jsx';
import {
  getNewsroomPhotoType,
  NEWSROOM_PHOTO_TYPES,
  normalizeNewsroomPhotoType,
} from '../domain/newsroomMedia';
import {
  getNewsroomIssueFolder,
  getNewsroomMediaFolder,
  NEWSROOM_MEDIA_FOLDERS,
  NEWSROOM_MEDIA_FOLDER_OPTIONS,
  normalizeNewsroomMediaFolder,
  newsroomMediaFolderLabel,
} from '../domain/newsroomMediaFolders.js';

const PHOTO_TYPE_OPTIONS = [
  { value: NEWSROOM_PHOTO_TYPES.GENERAL, label: 'General' },
  { value: NEWSROOM_PHOTO_TYPES.ACTION, label: 'Action' },
  { value: NEWSROOM_PHOTO_TYPES.PORTRAIT, label: 'Portrait' },
  { value: NEWSROOM_PHOTO_TYPES.RECRUITING, label: 'Recruiting' },
  { value: NEWSROOM_PHOTO_TYPES.CELEBRATION, label: 'Celebration' },
];

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
  const [typeBusyId, setTypeBusyId] = useState('');
  const [typeMessage, setTypeMessage] = useState('');
  const [folderFilter, setFolderFilter] = useState('all');
  const controlsBusy = busy || uploading;
  const issueFolder = getNewsroomIssueFolder(issue || {});

  const folderCounts = useMemo(() => {
    const counts = { all: mediaLibrary.length };
    NEWSROOM_MEDIA_FOLDER_OPTIONS.forEach((option) => { counts[option.value] = 0; });
    mediaLibrary.forEach((asset) => {
      const folder = getNewsroomMediaFolder(asset);
      counts[folder] = (counts[folder] || 0) + 1;
    });
    return counts;
  }, [mediaLibrary]);

  const filteredLibrary = useMemo(() => (
    folderFilter === 'all'
      ? mediaLibrary
      : mediaLibrary.filter((asset) => getNewsroomMediaFolder(asset) === folderFilter)
  ), [folderFilter, mediaLibrary]);

  const manualLibrary = useMemo(() => (
    [...mediaLibrary].sort((a, b) => {
      const aMatch = getNewsroomMediaFolder(a) === issueFolder ? 0 : 1;
      const bMatch = getNewsroomMediaFolder(b) === issueFolder ? 0 : 1;
      return aMatch - bMatch;
    })
  ), [issueFolder, mediaLibrary]);

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

  const savePhotoType = async (asset, nextType) => {
    const owner = auth?.currentUser;
    if (!owner || !db || !asset?.id) {
      setTypeMessage('Sign in as the DynastyHQ owner to tag library photos.');
      return;
    }
    setTypeBusyId(asset.id);
    setTypeMessage('');
    try {
      const photoType = normalizeNewsroomPhotoType(nextType);
      const masterRef = doc(db, 'artifacts', appId, 'users', owner.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(masterRef);
        if (!snapshot.exists()) throw new Error('The DynastyHQ master save could not be found.');
        const data = snapshot.data();
        const library = Array.isArray(data.newsroomMediaLibrary) ? data.newsroomMediaLibrary : [];
        const nextLibrary = library.map((entry) => entry.id !== asset.id ? entry : { ...entry, photoType });
        const remoteRevision = Number(data?._sync?.revision) || 0;
        transaction.update(masterRef, {
          newsroomMediaLibrary: nextLibrary,
          '_sync.revision': remoteRevision + 1,
          '_sync.deviceId': data?._sync?.deviceId || 'newsroom-photo-tagger',
          '_sync.updatedAt': new Date().toISOString(),
        });
      });
      setTypeMessage(`Tagged as ${PHOTO_TYPE_OPTIONS.find((option) => option.value === photoType)?.label || 'General'}.`);
    } catch (error) {
      setTypeMessage(error?.message || 'The photo type could not be saved.');
    } finally {
      setTypeBusyId('');
    }
  };

  const saveCareerFolder = async (asset, nextFolder) => {
    const owner = auth?.currentUser;
    if (!owner || !db || !asset?.id) {
      setTypeMessage('Sign in as the DynastyHQ owner to organize library folders.');
      return;
    }
    setTypeBusyId(asset.id);
    setTypeMessage('');
    try {
      const careerFolder = normalizeNewsroomMediaFolder(nextFolder);
      const masterRef = doc(db, 'artifacts', appId, 'users', owner.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(masterRef);
        if (!snapshot.exists()) throw new Error('The DynastyHQ master save could not be found.');
        const data = snapshot.data();
        const library = Array.isArray(data.newsroomMediaLibrary) ? data.newsroomMediaLibrary : [];
        const nextLibrary = library.map((entry) => entry.id !== asset.id ? entry : { ...entry, careerFolder });
        const remoteRevision = Number(data?._sync?.revision) || 0;
        transaction.update(masterRef, {
          newsroomMediaLibrary: nextLibrary,
          '_sync.revision': remoteRevision + 1,
          '_sync.deviceId': data?._sync?.deviceId || 'newsroom-folder-manager',
          '_sync.updatedAt': new Date().toISOString(),
        });
      });
      setTypeMessage(`Moved to ${newsroomMediaFolderLabel(careerFolder)}.`);
    } catch (error) {
      setTypeMessage(error?.message || 'The photo folder could not be saved.');
    } finally {
      setTypeBusyId('');
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
          {lockerOnly ? <FolderOpen size={14} /> : <ImagePlus size={14} />}
          {lockerOnly ? `Photo Library (${mediaLibrary.length})` : `AI Reference Locker (${mediaLibrary.filter((asset) => asset.isReference).length})`}
        </button>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        {lockerOnly
          ? `${mediaLibrary.length} saved ${mediaLibrary.length === 1 ? 'photo' : 'photos'}. File each photo under High School, College, or Coaching. Automatic matching never crosses career folders.`
          : `Uploads preserve the full photo in your reusable library. This article belongs to the ${newsroomMediaFolderLabel(issueFolder)} folder; automatic matching will only use photos filed there.`}
      </p>
      {uploading && <p className="mt-2 flex items-center gap-2 text-[10px] font-bold text-blue-300"><Loader2 size={12} className="animate-spin" /> Preparing and securely uploading your photo. New uploads start in Unsorted until you file them below.</p>}

      {libraryOpen && (
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Choose a career photo</p>
              <p className="mt-1 text-[9px] text-slate-500">{newsroomMediaFolderLabel(issueFolder)} photos are shown first. Manual selection can still override the folder rule.</p>
            </div>
            <button type="button" onClick={() => setLibraryOpen(false)} className="text-slate-500 hover:text-white"><X size={15} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {[...manualLibrary].reverse().map((asset) => (
              <button key={asset.id} type="button" onClick={() => { onAssign({ issue, article, asset }); setLibraryOpen(false); }} className={`group overflow-hidden rounded-lg border text-left ${article?.mediaAssetId === asset.id ? 'border-blue-400' : 'border-slate-700 hover:border-slate-500'}`}>
                <img src={asset.downloadUrl} alt={asset.referenceLabel || asset.fileName} className="aspect-[3/2] w-full bg-black object-contain" />
                <div className="space-y-1 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[9px] font-bold text-slate-300">{asset.fileName}</span>
                    {article?.mediaAssetId === asset.id && <Check size={12} className="shrink-0 text-blue-400" />}
                  </div>
                  <span className={`inline-flex rounded border px-1.5 py-0.5 text-[7px] font-black uppercase ${getNewsroomMediaFolder(asset) === issueFolder ? 'border-blue-400/40 bg-blue-500/10 text-blue-200' : 'border-slate-700 text-slate-500'}`}>{newsroomMediaFolderLabel(getNewsroomMediaFolder(asset))}</span>
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
              <p className="mt-1 text-[10px] text-slate-500">Organize photos by career stage first, then use photo-type tags for story matching inside that folder. Approved AI references are also folder-aware.</p>
            </div>
            <button type="button" disabled={controlsBusy} onClick={() => referenceRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-amber-500/30 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-amber-200 hover:bg-amber-500/10 disabled:opacity-50">
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Add AI Reference
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2" aria-label="Career photo folders">
            <button type="button" onClick={() => setFolderFilter('all')} className={`rounded-lg border px-3 py-2 text-[9px] font-black uppercase tracking-wider ${folderFilter === 'all' ? 'border-blue-400 bg-blue-500/15 text-blue-100' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>All · {folderCounts.all}</button>
            {NEWSROOM_MEDIA_FOLDER_OPTIONS.map((option) => (
              <button key={option.value} type="button" onClick={() => setFolderFilter(option.value)} className={`rounded-lg border px-3 py-2 text-[9px] font-black uppercase tracking-wider ${folderFilter === option.value ? 'border-blue-400 bg-blue-500/15 text-blue-100' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                {option.label} · {folderCounts[option.value] || 0}
              </button>
            ))}
          </div>

          <CustomNewsroomPhotoCreator
            mediaLibrary={mediaLibrary}
            defaultFolder={folderFilter !== 'all' && folderFilter !== NEWSROOM_MEDIA_FOLDERS.UNSORTED ? folderFilter : NEWSROOM_MEDIA_FOLDERS.COLLEGE}
          />

          {typeMessage && <p className="mt-3 text-[10px] font-bold text-slate-400">{typeMessage}</p>}

          {filteredLibrary.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {[...filteredLibrary].reverse().map((asset) => (
                <div key={asset.id} className={`overflow-hidden rounded-lg border ${asset.isReference ? 'border-amber-400' : 'border-slate-700'}`}>
                  <img src={asset.downloadUrl} alt={asset.referenceLabel || asset.fileName} className="aspect-[3/2] w-full bg-black object-contain" />
                  <div className="space-y-2 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-[9px] font-bold text-slate-300" title={asset.fileName}>{asset.fileName}</p>
                      {asset.origin === 'ai-generated' && <span className="shrink-0 text-[7px] font-black uppercase text-violet-300">AI</span>}
                    </div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-500">
                      Career folder
                      <select
                        value={getNewsroomMediaFolder(asset)}
                        disabled={controlsBusy || typeBusyId === asset.id}
                        onChange={(event) => saveCareerFolder(asset, event.target.value)}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-[9px] font-bold normal-case tracking-normal text-slate-200 outline-none focus:border-blue-500 disabled:opacity-50"
                      >
                        {NEWSROOM_MEDIA_FOLDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    {asset.origin === 'upload' && !asset.isReference && (
                      <label className="block text-[8px] font-black uppercase tracking-wider text-slate-500">
                        Photo type
                        <select
                          value={getNewsroomPhotoType(asset)}
                          disabled={controlsBusy || typeBusyId === asset.id}
                          onChange={(event) => savePhotoType(asset, event.target.value)}
                          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-[9px] font-bold normal-case tracking-normal text-slate-200 outline-none focus:border-blue-500 disabled:opacity-50"
                        >
                          {PHOTO_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                    )}
                    <label className="flex cursor-pointer items-center gap-2 text-[9px] font-bold text-slate-300">
                      <input type="checkbox" disabled={controlsBusy} checked={Boolean(asset.isReference)} onChange={(event) => onToggleReference(asset, event.target.checked)} className="accent-amber-500" /> Approved reference
                    </label>
                    <button type="button" disabled={controlsBusy} onClick={() => onDelete(asset)} className="flex items-center gap-1 text-[9px] font-bold text-slate-500 hover:text-red-300 disabled:opacity-40"><Trash2 size={11} /> Delete photo</button>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="mt-4 rounded-lg border border-dashed border-slate-700 p-5 text-center text-xs text-slate-500">No photos in this folder yet. Upload a photo or create a custom AI photo above, then file it here.</p>}

          <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-950/70 p-3">
            <input type="checkbox" disabled={controlsBusy} checked={autoAssignLibrary} onChange={(event) => onSetAutoAssignLibrary(event.target.checked)} className="mt-0.5 accent-blue-500" />
            <span>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-200">Automatically choose library photos</span>
              <span className="mt-1 block text-[10px] leading-relaxed text-slate-500">DynastyHQ first locks the article to its career folder—High School, College, or Coaching—then chooses an appropriate photo type inside that folder. It avoids same-edition duplicates and recent repeats. If the correct folder has no eligible photo, it leaves the article photo empty instead of borrowing from another stage of your career.</span>
            </span>
          </label>
        </div>
      )}
    </section>
  );
};

export default NewsroomMediaManager;
