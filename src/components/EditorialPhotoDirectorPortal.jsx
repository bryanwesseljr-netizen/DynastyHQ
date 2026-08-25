import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, CheckCircle2, Copy, ExternalLink, Images, Loader2,
  RotateCcw, Save, ShieldCheck, Sparkles, WandSparkles,
} from 'lucide-react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, auth, db } from '../firebase';
import {
  COLLEGE_FOOTBALL_CONFERENCES,
} from '../domain/collegeFootballTeamIdentity.js';
import {
  clearNewsroomConferenceOverride,
  getNewsroomConferenceOverride,
  resolveNewsroomTeamIdentity,
  setNewsroomConferenceOverride,
} from '../domain/newsroomConferenceContext.js';
import {
  NEWSROOM_EDITORIAL_SCENE_OPTIONS,
  normalizeNewsroomEditorialScene,
  newsroomEditorialSceneLabel,
} from '../domain/newsroomEditorialPhoto.js';
import {
  buildNewsroomPhotoQaReport,
  NEWSROOM_PHOTO_QA_STATUSES,
  NEWSROOM_PHOTO_VISUAL_CHECKS,
  setNewsroomPhotoQaDecision,
} from '../domain/newsroomPhotoQa.js';
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

const statusChip = (complete, label) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${complete ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-500'}`}>
    {complete ? <CheckCircle2 size={10} /> : null}{label}
  </span>
);

const EditorialPhotoDirectorControl = ({ user, career, issue, article }) => {
  const storedScene = normalizeNewsroomEditorialScene(article?.imageSceneOverride || 'auto');
  const [scene, setScene] = useState(storedScene);
  const [packet, setPacket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sceneBusy, setSceneBusy] = useState(false);
  const [identityBusy, setIdentityBusy] = useState(false);
  const [qaBusy, setQaBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const team = clean(career?.player?.college || career?.player?.school);
  const dynastySeason = Math.max(1, Number(issue?.season || career?.currentSeason) || 1);
  const conferenceOverride = useMemo(() => getNewsroomConferenceOverride({
    settings: career?.newsroomMediaSettings || {},
    teamName: team,
    dynastySeason,
  }), [career?.newsroomMediaSettings, dynastySeason, team]);
  const resolvedIdentity = useMemo(() => (
    team ? resolveNewsroomTeamIdentity({ state: career || {}, teamName: team, dynastySeason }) : null
  ), [career, dynastySeason, team]);
  const conferenceSignature = `${team}:${resolvedIdentity?.primaryConference || ''}:${resolvedIdentity?.identitySource || ''}:${conferenceOverride?.effectiveSeason || ''}`;
  const [conferenceDraft, setConferenceDraft] = useState(resolvedIdentity?.primaryConference || '');
  const [effectiveSeasonDraft, setEffectiveSeasonDraft] = useState(dynastySeason);

  const assignedAsset = useMemo(() => (
    (career?.newsroomMediaLibrary || []).find((entry) => entry.id === article?.mediaAssetId) || null
  ), [article?.mediaAssetId, career?.newsroomMediaLibrary]);
  const qaReport = useMemo(() => buildNewsroomPhotoQaReport({
    state: career || {}, issue: issue || {}, article: article || {}, asset: assignedAsset,
  }), [article, assignedAsset, career, issue]);
  const [qaChecklist, setQaChecklist] = useState([]);

  useEffect(() => {
    setScene(storedScene);
    setPacket(null);
    setMessage('');
  }, [article?.id, issue?.id, storedScene]);

  useEffect(() => {
    setConferenceDraft(resolvedIdentity?.primaryConference || '');
    setEffectiveSeasonDraft(conferenceOverride?.effectiveSeason || dynastySeason);
  }, [conferenceSignature, conferenceOverride?.effectiveSeason, dynastySeason, resolvedIdentity?.primaryConference]);

  useEffect(() => {
    const saved = article?.mediaQaAssetId === assignedAsset?.id ? (article?.mediaQaChecklist || []) : [];
    setQaChecklist(Array.isArray(saved) ? saved : []);
  }, [article?.id, article?.mediaQaAssetId, article?.mediaQaChecklist, assignedAsset?.id]);

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
  }, [article?.id, conferenceSignature, issue?.id, scene, user]);

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
            return {
              ...savedArticle,
              imageSceneOverride: normalized,
              mediaQaStatus: 'unreviewed',
              mediaQaApprovedAt: '',
              mediaQaChecklist: [],
            };
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
        ? 'Photo Director returned to automatic scene selection. Photo QA was reset for re-review.'
        : `${newsroomEditorialSceneLabel(requested)} saved for this article. Photo QA was reset for re-review.`);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.message || 'The editorial scene could not be changed.');
    } finally {
      setSceneBusy(false);
    }
  };

  const saveConference = async () => {
    const owner = auth?.currentUser || user;
    if (!owner || !db || !team || !conferenceDraft) return;
    setIdentityBusy(true);
    setMessage('');
    try {
      const masterRef = doc(db, 'artifacts', appId, 'users', owner.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(masterRef);
        if (!snapshot.exists()) throw new Error('The DynastyHQ master save could not be found.');
        const data = snapshot.data();
        const nextSettings = setNewsroomConferenceOverride({
          settings: data.newsroomMediaSettings || {},
          teamName: team,
          conference: conferenceDraft,
          effectiveSeason: effectiveSeasonDraft,
        });
        const remoteRevision = Number(data?._sync?.revision) || 0;
        transaction.update(masterRef, {
          newsroomMediaSettings: nextSettings,
          '_sync.revision': remoteRevision + 1,
          '_sync.deviceId': data?._sync?.deviceId || 'newsroom-conference-identity',
          '_sync.updatedAt': new Date().toISOString(),
        });
      });
      setPacket(null);
      setMessageType('success');
      setMessage(`${team} is now treated as a ${conferenceDraft} program beginning in Dynasty season ${Math.max(1, Number(effectiveSeasonDraft) || 1)} for photo prompts and QA.`);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.message || 'The Dynasty conference override could not be saved.');
    } finally {
      setIdentityBusy(false);
    }
  };

  const clearConference = async () => {
    const owner = auth?.currentUser || user;
    if (!owner || !db || !team) return;
    setIdentityBusy(true);
    setMessage('');
    try {
      const masterRef = doc(db, 'artifacts', appId, 'users', owner.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(masterRef);
        if (!snapshot.exists()) throw new Error('The DynastyHQ master save could not be found.');
        const data = snapshot.data();
        const nextSettings = clearNewsroomConferenceOverride({ settings: data.newsroomMediaSettings || {}, teamName: team });
        const remoteRevision = Number(data?._sync?.revision) || 0;
        transaction.update(masterRef, {
          newsroomMediaSettings: nextSettings,
          '_sync.revision': remoteRevision + 1,
          '_sync.deviceId': data?._sync?.deviceId || 'newsroom-conference-identity',
          '_sync.updatedAt': new Date().toISOString(),
        });
      });
      setPacket(null);
      setMessageType('success');
      setMessage(`${team} returned to the real-world 2026 conference fallback for photo identity.`);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.message || 'The Dynasty conference override could not be cleared.');
    } finally {
      setIdentityBusy(false);
    }
  };

  const saveQaDecision = async (approved) => {
    const owner = auth?.currentUser || user;
    if (!owner || !db || !assignedAsset?.id) return;
    setQaBusy(true);
    setMessage('');
    try {
      const publicationId = issue?.publicationId || issue?.id;
      const masterRef = doc(db, 'artifacts', appId, 'users', owner.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(masterRef);
        if (!snapshot.exists()) throw new Error('The DynastyHQ master save could not be found.');
        const data = snapshot.data();
        const nextIssues = setNewsroomPhotoQaDecision({
          issues: data.newsroomIssues || [],
          publicationId,
          articleId: article.id,
          assetId: assignedAsset.id,
          status: approved ? NEWSROOM_PHOTO_QA_STATUSES.APPROVED : NEWSROOM_PHOTO_QA_STATUSES.NEEDS_REVIEW,
          checklist: approved ? qaChecklist : [],
        });
        const remoteRevision = Number(data?._sync?.revision) || 0;
        transaction.update(masterRef, {
          newsroomIssues: nextIssues,
          '_sync.revision': remoteRevision + 1,
          '_sync.deviceId': data?._sync?.deviceId || 'newsroom-photo-qa',
          '_sync.updatedAt': new Date().toISOString(),
        });
      });
      setMessageType('success');
      setMessage(approved ? 'Editorial photo approved for this article.' : 'Photo returned to Needs Review.');
    } catch (error) {
      setMessageType('error');
      setMessage(error?.message || 'The Photo QA decision could not be saved.');
    } finally {
      setQaBusy(false);
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
  const qaApproved = qaReport.status === NEWSROOM_PHOTO_QA_STATUSES.APPROVED;
  const qaAllChecked = NEWSROOM_PHOTO_VISUAL_CHECKS.every((entry) => qaChecklist.includes(entry.id));

  return (
    <section className="mt-4 rounded-xl border border-violet-500/30 bg-slate-950/95 p-4 shadow-xl" data-editorial-photo-director>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
        <span className="mr-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Article photo flow</span>
        {statusChip(article?.groundingStatus === 'verified', '1 · Review')}
        {statusChip(Boolean(assignedAsset?.id), '2 · Photo')}
        {statusChip(qaApproved, '3 · QA Approved')}
      </div>

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

      <details className="mt-4 rounded-lg border border-slate-800 bg-slate-900/50">
        <summary className="cursor-pointer px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-300">
          Team identity · {team || 'Unknown team'} · {resolvedIdentity?.primaryConference || 'Conference not resolved'} {resolvedIdentity?.identitySource === 'save-override' ? '· Save override' : '· 2026 fallback'}
        </summary>
        <div className="grid gap-3 border-t border-slate-800 p-3 lg:grid-cols-[1fr_190px_150px_auto] lg:items-end">
          <div className="text-[9px] leading-relaxed text-slate-500">
            <span className="block font-black uppercase tracking-wider text-slate-300">Dynasty conference alignment</span>
            Set an override only when your save realigns this team. It becomes authoritative for prompts and Photo QA from the chosen Dynasty season onward.
          </div>
          <label className="text-[8px] font-black uppercase tracking-wider text-slate-500">Conference
            <select value={conferenceDraft} disabled={identityBusy || !team} onChange={(event) => setConferenceDraft(event.target.value)} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-[10px] font-bold normal-case tracking-normal text-white disabled:opacity-50">
              {COLLEGE_FOOTBALL_CONFERENCES.map((conference) => <option key={conference} value={conference}>{conference}</option>)}
            </select>
          </label>
          <label className="text-[8px] font-black uppercase tracking-wider text-slate-500">Effective season
            <input type="number" min="1" value={effectiveSeasonDraft} disabled={identityBusy || !team} onChange={(event) => setEffectiveSeasonDraft(Math.max(1, Number(event.target.value) || 1))} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-[10px] font-bold normal-case tracking-normal text-white disabled:opacity-50" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={identityBusy || !team || !conferenceDraft} onClick={saveConference} className="flex items-center gap-1 rounded bg-blue-600 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-white disabled:opacity-40">{identityBusy ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save override</button>
            {conferenceOverride && <button type="button" disabled={identityBusy} onClick={clearConference} className="flex items-center gap-1 rounded border border-slate-700 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-slate-400 disabled:opacity-40"><RotateCcw size={11} /> Use fallback</button>}
          </div>
        </div>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" disabled={loading || sceneBusy || !article?.id} onClick={copyPrompt} className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-[9px] font-black uppercase tracking-wider text-white hover:bg-violet-500 disabled:opacity-40"><Copy size={13} /> Copy Photo Prompt</button>
        <button type="button" onClick={openChatGpt} className="flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-violet-200 hover:bg-violet-500/20"><ExternalLink size={13} /> Open ChatGPT</button>
        <button type="button" onClick={() => openExistingPhotoTool(/career photo library/i)} className="flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-blue-200 hover:bg-blue-500/20"><Images size={13} /> Use Library Photo</button>
        <button type="button" disabled={loading || sceneBusy || article?.groundingStatus !== 'verified'} onClick={generateInDynastyHq} className="ml-auto flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-400 hover:border-slate-500 hover:text-slate-200 disabled:opacity-40">{sceneBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Generate in DynastyHQ</button>
      </div>

      <div className={`mt-4 rounded-xl border p-3 ${qaApproved ? 'border-emerald-500/30 bg-emerald-500/5' : qaReport.failures.length ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/25 bg-amber-500/5'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-200"><ShieldCheck size={13} /> Photo QA / Approval</p>
            <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
              DynastyHQ checks structured article/photo consistency automatically. You confirm the few visual details that require actually looking at the image.
            </p>
          </div>
          <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${qaApproved ? 'border-emerald-500/30 text-emerald-300' : qaReport.failures.length ? 'border-red-500/30 text-red-300' : 'border-amber-500/30 text-amber-300'}`}>
            {qaApproved ? 'Approved' : qaReport.failures.length ? 'Needs Review' : assignedAsset ? 'Ready for visual check' : 'No photo'}
          </span>
        </div>

        {assignedAsset ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-[170px_1fr]">
            <img src={assignedAsset.downloadUrl} alt={assignedAsset.fileName || 'Assigned editorial photo'} className="aspect-[3/2] w-full rounded-lg border border-slate-700 bg-black object-contain" />
            <div className="space-y-2">
              {qaReport.checks.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 text-[9px]">
                  {entry.level === 'pass' ? <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-400" /> : <AlertTriangle size={12} className={`mt-0.5 shrink-0 ${entry.level === 'fail' ? 'text-red-400' : 'text-amber-400'}`} />}
                  <span className={entry.level === 'fail' ? 'text-red-300' : 'text-slate-400'}><strong className="text-slate-200">{entry.label}</strong>{entry.detail ? ` — ${entry.detail}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        ) : <p className="mt-3 rounded-lg border border-dashed border-slate-700 p-3 text-center text-[10px] text-slate-500">Choose, upload, or generate a photo first. QA will appear here automatically.</p>}

        {assignedAsset && !qaReport.failures.length && (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {NEWSROOM_PHOTO_VISUAL_CHECKS.map((entry) => (
              <label key={entry.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-[9px] font-bold text-slate-300">
                <input type="checkbox" checked={qaChecklist.includes(entry.id)} disabled={qaBusy} onChange={(event) => setQaChecklist((current) => event.target.checked ? [...new Set([...current, entry.id])] : current.filter((id) => id !== entry.id))} className="mt-0.5 accent-emerald-500" />
                {entry.label}
              </label>
            ))}
          </div>
        )}

        {assignedAsset && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={qaBusy || !qaReport.canApprove || !qaAllChecked} onClick={() => saveQaDecision(true)} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-[8px] font-black uppercase tracking-wider text-white disabled:opacity-35">{qaBusy ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Approve Photo</button>
            {qaApproved && <button type="button" disabled={qaBusy} onClick={() => saveQaDecision(false)} className="rounded-lg border border-slate-700 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-slate-400 disabled:opacity-40">Return to Review</button>}
          </div>
        )}
      </div>

      <p className="mt-3 text-[9px] leading-relaxed text-slate-600">Auto never spends image credits. Copy Photo Prompt is built from the verified article and owner save, and asks ChatGPT for four variations. Save-specific conference alignment overrides the real-world fallback when configured.</p>
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
  if (!target || !user || !career || !saved.issue || !saved.article) return null;
  return createPortal(
    <EditorialPhotoDirectorControl key={`${saved.issue.id}-${saved.article.id}`} user={user} career={career} issue={saved.issue} article={saved.article} />,
    target,
  );
};

export default EditorialPhotoDirectorPortal;
