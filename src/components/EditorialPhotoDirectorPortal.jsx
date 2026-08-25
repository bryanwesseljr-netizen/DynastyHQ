import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, ExternalLink, Images, Loader2, Sparkles, WandSparkles } from 'lucide-react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, auth, db } from '../firebase';
import {
  NEWSROOM_EDITORIAL_SCENE_OPTIONS,
  normalizeNewsroomEditorialScene,
  newsroomEditorialSceneLabel,
} from '../domain/newsroomEditorialPhoto.js';
import { requestNewsroomImagePrompt } from '../services/newsroomImagePromptClient.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const clean = (value) => String(value ?? '').trim();

const findVisibleNewsroomContext = (root) => {
  const mediaTools = root?.querySelector('.dhq-newsroom-media-tools');
  const article = root?.querySelector('.dhq-news-article');
  const issueSelect = root?.querySelector('select[aria-label="Choose weekly newsroom edition"]');
  const headline = clean(article?.querySelector('h1')?.textContent);
  if (!mediaTools || !article || !issueSelect?.value || !headline) return null;
  return { mediaTools, issueId: issueSelect.value, headline };
};

const findSavedArticle = (career, visible) => {
  if (!career || !visible) return { issue: null, article: null };
  const issue = (career.newsroomIssues || []).find((entry) => (
    entry?.id === visible.issueId || entry?.publicationId === visible.issueId
  ));
  const article = issue?.articles?.find((entry) => clean(entry?.headline) === visible.headline) || null;
  return { issue: issue || null, article };
};

const subjectLabel = (director = {}) => {
  if (director.subject === 'player') return director.position ? `${director.position} / Player` : 'Player';
  if (director.subject === 'coach') return 'Coach';
  return 'Team / Program';
};

const openExistingPhotoTool = (labelPattern) => {
  const details = document.querySelector('.dhq-newsroom-media-tools');
  if (!details) return false;
  details.open = true;
  const clickTarget = () => {
    const button = [...details.querySelectorAll('button')]
      .find((entry) => labelPattern.test(clean(entry.textContent)));
    if (!button) return false;
    button.click();
    details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return true;
  };
  if (clickTarget()) return true;
  window.setTimeout(clickTarget, 40);
  return true;
};

const EditorialPhotoDirectorControl = ({ user, issue, article }) => {
  const storedScene = normalizeNewsroomEditorialScene(article?.imageSceneOverride || 'auto');
  const [scene, setScene] = useState(storedScene);
  const [packet, setPacket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sceneBusy, setSceneBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  useEffect(() => {
    setScene(storedScene);
    setPacket(null);
    setMessage('');
  }, [article?.id, issue?.id, storedScene]);

  const payloadFor = (sceneOverride) => ({
    issue: {
      publicationId: issue?.publicationId || issue?.id,
      id: issue?.id,
      season: issue?.season,
      week: issue?.week,
    },
    article: {
      id: article?.id,
      headline: article?.headline,
    },
    sceneOverride: normalizeNewsroomEditorialScene(sceneOverride),
  });

  const loadPacket = async (sceneOverride = scene) => {
    if (!user || !issue || !article) throw new Error('The saved article is not ready for Photo Director tools.');
    const idToken = await user.getIdToken();
    return requestNewsroomImagePrompt({ idToken, payload: payloadFor(sceneOverride) });
  };

  useEffect(() => {
    if (!user || !issue || !article) return undefined;
    let cancelled = false;
    setLoading(true);
    loadPacket(scene)
      .then((result) => {
        if (!cancelled) setPacket(result);
      })
      .catch((error) => {
        if (!cancelled) {
          setMessageType('error');
          setMessage(error?.message || 'The Photo Director could not analyze this article.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [article?.id, issue?.id, scene, user]);

  const saveScene = async (nextScene) => {
    const owner = auth?.currentUser || user;
    if (!owner || !db) throw new Error('Sign in as the DynastyHQ owner before changing the editorial scene.');
    const normalized = normalizeNewsroomEditorialScene(nextScene);
    const publicationId = issue?.publicationId || issue?.id;
    const masterRef = doc(db, 'artifacts', appId, 'users', owner.uid, 'hq_data', 'main');
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(masterRef);
      if (!snapshot.exists()) throw new Error('The DynastyHQ master save could not be found.');
      const data = snapshot.data();
      const issues = Array.isArray(data.newsroomIssues) ? data.newsroomIssues : [];
      let found = false;
      const nextIssues = issues.map((savedIssue) => {
        if (savedIssue?.id !== publicationId && savedIssue?.publicationId !== publicationId) return savedIssue;
        return {
          ...savedIssue,
          articles: (savedIssue.articles || []).map((savedArticle) => {
            if (savedArticle?.id !== article.id) return savedArticle;
            found = true;
            return { ...savedArticle, imageSceneOverride: normalized };
          }),
        };
      });
      if (!found) throw new Error('The saved newsroom article could not be updated.');
      const remoteRevision = Number(data?._sync?.revision) || 0;
      transaction.update(masterRef, {
        newsroomIssues: nextIssues,
        '_sync.revision': remoteRevision + 1,
        '_sync.deviceId': data?._sync?.deviceId || 'newsroom-photo-director',
        '_sync.updatedAt': new Date().toISOString(),
      });
    });
    return normalized;
  };

  const changeScene = async (event) => {
    const requested = normalizeNewsroomEditorialScene(event.target.value);
    if (requested === scene || sceneBusy) return;
    setSceneBusy(true);
    setMessage('');
    try {
      const result = await loadPacket(requested);
      if (result?.director?.overrideRejectedReason) {
        setMessageType('error');
        setMessage(result.director.overrideRejectedReason);
        return;
      }
      await saveScene(requested);
      setScene(requested);
      setPacket(result);
      setMessageType('success');
      setMessage(requested === 'auto'
        ? 'Photo Director returned to automatic scene selection.'
        : `${newsroomEditorialSceneLabel(requested)} saved for this article.`);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.message || 'The editorial scene could not be changed.');
    } finally {
      setSceneBusy(false);
    }
  };

  const copyPrompt = async () => {
    try {
      const result = packet?.chatGptPrompt ? packet : await loadPacket(scene);
      await navigator.clipboard.writeText(result.chatGptPrompt);
      setPacket(result);
      setMessageType('success');
      setMessage('Photo Director prompt copied. It asks ChatGPT for four grounded editorial variations.');
    } catch (error) {
      setMessageType('error');
      setMessage(error?.message || 'Your browser could not copy the Photo Director prompt.');
    }
  };

  const openChatGpt = () => {
    window.open('https://chatgpt.com/', '_blank', 'noopener,noreferrer');
  };

  const generateInDynastyHq = async () => {
    setMessage('');
    try {
      await saveScene(scene);
      const opened = openExistingPhotoTool(/generate ai photo/i);
      if (!opened) throw new Error('The existing DynastyHQ image generator could not be opened.');
    } catch (error) {
      setMessageType('error');
      setMessage(error?.message || 'The in-app image generator could not be started.');
    }
  };

  const director = packet?.director || {};
  const references = packet?.references || [];

  return (
    <section className="mt-4 rounded-xl border border-violet-500/30 bg-slate-950/95 p-4 shadow-xl" data-editorial-photo-director>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-violet-300"><WandSparkles size={14} /> Editorial Photo</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black uppercase text-white">
              {loading && !director.presetLabel ? 'AI selected: analyzing story…' : `AI selected: ${director.presetLabel || 'Editorial Feature'} — ${subjectLabel(director)}`}
            </h3>
            {packet?.visualProfileApplied && <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-cyan-200">Identity profile ready</span>}
          </div>
          {director.reason && <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-slate-400">{director.reason}</p>}
          {references.length > 0 && <p className="mt-1 text-[9px] text-slate-600">Suggested reference roles: {[...new Set(references.map((entry) => entry.roleLabel).filter(Boolean))].join(' · ')}</p>}
        </div>
        <label className="w-full shrink-0 text-[8px] font-black uppercase tracking-wider text-slate-500 lg:w-48">
          Change scene
          <select value={scene} disabled={sceneBusy || loading} onChange={changeScene} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] font-bold normal-case tracking-normal text-white outline-none focus:border-violet-400 disabled:opacity-50">
            {NEWSROOM_EDITORIAL_SCENE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" disabled={loading || sceneBusy || !article?.id} onClick={copyPrompt} className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-[9px] font-black uppercase tracking-wider text-white hover:bg-violet-500 disabled:opacity-40"><Copy size={13} /> Copy Photo Prompt</button>
        <button type="button" onClick={openChatGpt} className="flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-violet-200 hover:bg-violet-500/20"><ExternalLink size={13} /> Open ChatGPT</button>
        <button type="button" onClick={() => openExistingPhotoTool(/career photo library/i)} className="flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-blue-200 hover:bg-blue-500/20"><Images size={13} /> Use Library Photo</button>
        <button type="button" disabled={loading || sceneBusy || article?.groundingStatus !== 'verified'} onClick={generateInDynastyHq} className="ml-auto flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-400 hover:border-slate-500 hover:text-slate-200 disabled:opacity-40">{sceneBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Generate in DynastyHQ</button>
      </div>

      <p className="mt-3 text-[9px] leading-relaxed text-slate-600">Auto never spends image credits. Copy Photo Prompt is built from the verified article and owner save, and asks ChatGPT for four variations. In-app generation remains optional.</p>
      {message && <p className={`mt-3 rounded-lg border px-3 py-2 text-[10px] font-bold ${messageType === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>{message}</p>}
    </section>
  );
};

const EditorialPhotoDirectorPortal = () => {
  const { user, career } = useOwnerCareer();
  const [target, setTarget] = useState(null);
  const [visible, setVisible] = useState(null);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    const sync = () => {
      const next = findVisibleNewsroomContext(root);
      if (!next) {
        setTarget(null);
        setVisible(null);
        return;
      }

      let mount = next.mediaTools.previousElementSibling;
      if (!mount || mount.dataset?.editorialPhotoDirectorMount !== 'true') {
        mount = document.createElement('div');
        mount.dataset.editorialPhotoDirectorMount = 'true';
        next.mediaTools.parentNode?.insertBefore(mount, next.mediaTools);
      }
      setTarget((current) => current === mount ? current : mount);
      setVisible((current) => (
        current?.issueId === next.issueId && current?.headline === next.headline
          ? current
          : { issueId: next.issueId, headline: next.headline }
      ));
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const saved = useMemo(() => findSavedArticle(career, visible), [career, visible]);
  if (!target || !user || !saved.issue || !saved.article) return null;
  return createPortal(
    <EditorialPhotoDirectorControl key={`${saved.issue.id}-${saved.article.id}`} user={user} issue={saved.issue} article={saved.article} />,
    target,
  );
};

export default EditorialPhotoDirectorPortal;
