import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Loader2, Sparkles, WandSparkles } from 'lucide-react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, auth, db, firebaseApp } from '../firebase';
import { createNewsroomMediaAsset, NEWSROOM_MEDIA_ORIGINS } from '../domain/newsroomMedia.js';
import {
  getNewsroomMediaFolder,
  NEWSROOM_MEDIA_FOLDERS,
  NEWSROOM_MEDIA_FOLDER_OPTIONS,
  newsroomMediaFolderLabel,
} from '../domain/newsroomMediaFolders.js';
import { generateCustomNewsroomPhoto } from '../services/customNewsroomPhotoClient.js';
import { uploadNewsroomMedia } from '../services/newsroomMediaStorage.js';

const STARTER_PROMPT = 'Create a photorealistic editorial football photo with realistic stadium lighting, authentic equipment, natural body language, and the composition of a professional sports photographer. Describe the player, uniform, action, setting, camera angle, and mood I want.';

const createAssetId = () => globalThis.crypto?.randomUUID?.()
  || `custom-news-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const CustomNewsroomPhotoCreator = ({ mediaLibrary = [], defaultFolder = NEWSROOM_MEDIA_FOLDERS.COLLEGE }) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [folder, setFolder] = useState(defaultFolder);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const references = useMemo(() => (
    mediaLibrary
      .filter((asset) => asset?.isReference && asset?.downloadUrl && getNewsroomMediaFolder(asset) === folder)
      .slice(0, 4)
  ), [folder, mediaLibrary]);

  const copyStarter = async () => {
    try {
      await navigator.clipboard.writeText(prompt.trim() || STARTER_PROMPT);
      setMessageType('success');
      setMessage('Prompt copied. Open ChatGPT, refine it there if you want, then paste the final version back here for automatic library saving.');
    } catch {
      setMessageType('error');
      setMessage('Your browser blocked clipboard access. You can still open ChatGPT and write the prompt there normally.');
    }
  };

  const generate = async () => {
    const owner = auth?.currentUser;
    if (!owner || !db) {
      setMessageType('error');
      setMessage('Sign in as the DynastyHQ owner before generating a custom photo.');
      return;
    }
    if (prompt.trim().length < 12) {
      setMessageType('error');
      setMessage('Add a little more detail to the image prompt first.');
      return;
    }

    setBusy(true);
    setMessageType('success');
    setMessage(`Creating a custom ${newsroomMediaFolderLabel(folder)} photo…`);
    try {
      const idToken = await owner.getIdToken();
      const generated = await generateCustomNewsroomPhoto({
        idToken,
        prompt: prompt.trim(),
        folderLabel: newsroomMediaFolderLabel(folder),
        references: references.map((asset) => ({
          assetId: asset.id,
          imageUrl: asset.downloadUrl,
          label: asset.referenceLabel || asset.fileName || 'Approved reference',
        })),
      });

      const assetId = createAssetId();
      const fileName = `custom-${folder}-${Date.now()}.jpg`;
      const uploaded = await uploadNewsroomMedia({
        firebaseApp,
        appId,
        userId: owner.uid,
        assetId,
        imageDataUrl: `data:${generated.mimeType || 'image/jpeg'};base64,${generated.imageBase64}`,
        fileName,
        origin: NEWSROOM_MEDIA_ORIGINS.AI,
      });
      const asset = createNewsroomMediaAsset({
        id: assetId,
        ...uploaded,
        fileName,
        origin: NEWSROOM_MEDIA_ORIGINS.AI,
        careerFolder: folder,
        allowAutoAssign: true,
        generatedFrom: {
          model: generated.model || '',
          referenceAssetIds: references.map((entry) => entry.id),
        },
      });

      const masterRef = doc(db, 'artifacts', appId, 'users', owner.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(masterRef);
        if (!snapshot.exists()) throw new Error('The DynastyHQ master save could not be found.');
        const data = snapshot.data();
        const library = Array.isArray(data.newsroomMediaLibrary) ? data.newsroomMediaLibrary : [];
        const remoteRevision = Number(data?._sync?.revision) || 0;
        transaction.update(masterRef, {
          newsroomMediaLibrary: [...library, asset],
          '_sync.revision': remoteRevision + 1,
          '_sync.deviceId': data?._sync?.deviceId || 'newsroom-custom-photo',
          '_sync.updatedAt': new Date().toISOString(),
        });
      });

      setPrompt('');
      setMessage(`Custom photo saved directly to the ${newsroomMediaFolderLabel(folder)} folder${references.length ? ` using ${references.length} approved identity reference${references.length === 1 ? '' : 's'}` : ''}. It is eligible for automatic article matching in that folder.`);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.message || 'The custom photo could not be generated or saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-violet-500/25 bg-violet-950/10">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="custom-newsroom-photo-content"
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-violet-300"><WandSparkles size={14} /> Create Custom AI Photo</p>
          {!open && <p className="mt-1 text-[9px] text-slate-500">Write a prompt, use ChatGPT for help, or generate and save directly to the library.</p>}
        </div>
        {open ? <ChevronDown size={17} className="shrink-0 text-violet-300" /> : <ChevronRight size={17} className="shrink-0 text-violet-300" />}
      </button>

      {open && (
        <div id="custom-newsroom-photo-content" className="border-t border-violet-500/10 px-4 pb-4 pt-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <p className="max-w-2xl text-[10px] leading-relaxed text-slate-400">Write your own image prompt here and DynastyHQ will generate the photo, upload it, and file it automatically. Approved AI references from the same career folder are used when available.</p>
            <a href="https://chatgpt.com/" target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-200 hover:border-violet-400 hover:text-violet-200">
              <ExternalLink size={12} /> Open ChatGPT for Prompt Help
            </a>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[180px_1fr]">
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-500">
              Save to folder
              <select value={folder} disabled={busy} onChange={(event) => setFolder(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[10px] font-bold normal-case tracking-normal text-slate-200 outline-none focus:border-violet-500 disabled:opacity-50">
                {NEWSROOM_MEDIA_FOLDER_OPTIONS.filter((option) => option.value !== NEWSROOM_MEDIA_FOLDERS.UNSORTED).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <span className="mt-1 block normal-case tracking-normal text-slate-600">{references.length} matching approved reference{references.length === 1 ? '' : 's'}</span>
            </label>
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-500">
              Image prompt
              <textarea
                value={prompt}
                disabled={busy}
                onChange={(event) => setPrompt(event.target.value.slice(0, 2200))}
                placeholder="Example: Photorealistic sideline photo of my Cincinnati quarterback under the stadium lights after warmups, black uniform, helmet in one hand, shallow depth of field, shot from waist height with a 70-200mm sports lens…"
                rows={4}
                className="mt-1 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium normal-case tracking-normal text-slate-100 outline-none placeholder:text-slate-600 focus:border-violet-500 disabled:opacity-50"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy} onClick={copyStarter} className="rounded-lg border border-slate-700 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-300 hover:border-slate-500 disabled:opacity-50">Copy Prompt for ChatGPT</button>
            <button type="button" disabled={busy || prompt.trim().length < 12} onClick={generate} className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-[9px] font-black uppercase tracking-wider text-white hover:bg-violet-500 disabled:opacity-40">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {busy ? 'Generating + Saving…' : 'Generate + Save to Library'}
            </button>
          </div>

          <p className="mt-3 text-[9px] leading-relaxed text-slate-500">A separate ChatGPT tab cannot send its finished image back into DynastyHQ automatically. The purple Generate + Save button is the one-step path that creates the image and files it directly into your selected folder.</p>
          {message && <p className={`mt-3 rounded-lg border px-3 py-2 text-[10px] font-bold ${messageType === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>{message}</p>}
        </div>
      )}
    </div>
  );
};

export default CustomNewsroomPhotoCreator;
