import { useEffect, useMemo, useState } from 'react';
import {
  Copy, ExternalLink, Images, Loader2, Sparkles, WandSparkles,
} from 'lucide-react';
import { auth } from '../firebase';
import { buildNewsroomPhotoPrompt } from '../services/newsroomPhotoPromptClient.js';

const SCENE_OPTIONS = Object.freeze([
  { value: 'auto', label: 'Auto' },
  { value: 'pocket-action', label: 'Pocket Action' },
  { value: 'scramble', label: 'Scramble' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'sideline', label: 'Sideline' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'tunnel', label: 'Tunnel' },
  { value: 'practice', label: 'Practice' },
  { value: 'tough-loss', label: 'Tough Loss' },
]);

const titleCaseSubject = (value = '') => {
  const text = String(value || '').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Editorial';
};

const EditorialPhotoDirectorControl = ({
  issue,
  article,
  busy = false,
  mediaCount = 0,
  onUseLibrary,
  onGenerate,
}) => {
  const [sceneOverride, setSceneOverride] = useState('auto');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const requestPayload = useMemo(() => ({
    issue: {
      publicationId: issue?.publicationId || issue?.id,
      id: issue?.id,
    },
    article: { id: article?.id },
    sceneOverride,
  }), [article?.id, issue?.id, issue?.publicationId, sceneOverride]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const owner = auth?.currentUser;
      if (!owner || !article?.id || !requestPayload.issue.publicationId) return;
      setLoading(true);
      setMessage('');
      try {
        const idToken = await owner.getIdToken();
        const next = await buildNewsroomPhotoPrompt({ idToken, payload: requestPayload });
        if (!cancelled) setResult(next);
      } catch (error) {
        if (!cancelled) {
          setResult(null);
          setMessageType('error');
          setMessage(error?.message || 'The Editorial Photo Director could not build this scene.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [article?.id, requestPayload]);

  const director = result?.director || {};
  const sceneRejected = sceneOverride !== 'auto' && Boolean(director.overrideRejectedReason);

  const copyPrompt = async () => {
    if (!result?.chatGptPrompt || sceneRejected) return;
    try {
      await navigator.clipboard.writeText(result.chatGptPrompt);
      setMessageType('success');
      setMessage('Photo Director prompt copied. It requests four grounded variations in ChatGPT.');
    } catch {
      setMessageType('error');
      setMessage('Clipboard access was blocked. Try again from a secure browser tab.');
    }
  };

  const openChatGpt = async () => {
    if (!result?.chatGptPrompt || sceneRejected) return;
    const tab = window.open('https://chatgpt.com/', '_blank', 'noopener,noreferrer');
    try {
      await navigator.clipboard.writeText(result.chatGptPrompt);
      setMessageType('success');
      setMessage('Prompt copied. Paste it into the ChatGPT tab and attach any matching reference photos you want to use.');
    } catch {
      setMessageType('error');
      setMessage(tab ? 'ChatGPT opened, but clipboard access was blocked. Use Copy Photo Prompt and paste manually.' : 'Your browser blocked the new tab and clipboard access.');
    }
  };

  const generateInDynastyHq = () => {
    if (!onGenerate || !article || sceneRejected) return;
    onGenerate({
      issue,
      article: { ...article, sceneOverride },
    });
  };

  const subjectLabel = director.position
    ? `${director.position} ${titleCaseSubject(director.subject)}`
    : titleCaseSubject(director.subject);

  return (
    <section className="mb-4 rounded-xl border border-violet-500/30 bg-violet-950/15 p-4" aria-labelledby="editorial-photo-director-title">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-violet-300"><WandSparkles size={14} /> Editorial Photo</p>
          <h3 id="editorial-photo-director-title" className="mt-1 text-sm font-black uppercase text-white">
            {loading ? 'AI Photo Director is reading the verified story…' : `AI selected: ${director.presetLabel || 'Editorial Feature'}${director.subject ? ` — ${subjectLabel}` : ''}`}
          </h3>
          {!loading && director.reason && !sceneRejected && <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-slate-400">Because: {director.reason}</p>}
          {!loading && sceneRejected && <p className="mt-1 max-w-3xl rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] font-bold leading-relaxed text-red-300">Scene not available: {director.overrideRejectedReason} Choose Auto or another supported scene.</p>}
        </div>

        <label className="shrink-0 text-[8px] font-black uppercase tracking-wider text-slate-500">
          Scene
          <select
            value={sceneOverride}
            disabled={loading || busy}
            onChange={(event) => setSceneOverride(event.target.value)}
            className="mt-1 min-w-44 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[10px] font-bold normal-case tracking-normal text-slate-100 outline-none focus:border-violet-400 disabled:opacity-50"
          >
            {SCENE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={loading || sceneRejected || !result?.chatGptPrompt} onClick={copyPrompt} className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white hover:bg-violet-500 disabled:opacity-40">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />} Copy Photo Prompt
        </button>
        <button type="button" disabled={loading || sceneRejected || !result?.chatGptPrompt} onClick={openChatGpt} className="flex items-center gap-2 rounded-lg border border-violet-400/40 bg-violet-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-violet-200 hover:bg-violet-500/20 disabled:opacity-40">
          <ExternalLink size={13} /> Open ChatGPT
        </button>
        <button type="button" disabled={busy || !mediaCount} onClick={onUseLibrary} className="flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-blue-200 hover:bg-blue-500/20 disabled:opacity-40">
          <Images size={13} /> Use Library Photo ({mediaCount})
        </button>
        <button type="button" disabled={busy || loading || sceneRejected || !result || article?.groundingStatus !== 'verified'} onClick={generateInDynastyHq} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-300 hover:border-violet-500/50 hover:text-violet-200 disabled:opacity-40">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Generate in DynastyHQ
        </button>
      </div>

      <p className="mt-3 text-[9px] leading-relaxed text-slate-500">Copy Photo Prompt is the recommended workflow when you want several choices: DynastyHQ builds the grounded brief, ChatGPT can create multiple variations, and you upload the winners back to the Career Photo Library. No image-generation credit is used just to build or copy this prompt.</p>

      {message && <p className={`mt-3 rounded-lg border px-3 py-2 text-[10px] font-bold ${messageType === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>{message}</p>}
    </section>
  );
};

export default EditorialPhotoDirectorControl;
