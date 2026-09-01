import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Shirt } from 'lucide-react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, db } from '../firebase';
import {
  GAME_LOCATION_CONTEXTS,
  UNIFORM_CONTEXTS,
  normalizeGameLocationContext,
  normalizeUniformContext,
  uniformContextAdjustment,
  uniformContextIsHardMismatch,
} from '../domain/editorialRealism.js';
import { scoreNewsroomMediaForArticle } from '../domain/newsroomMedia.js';
import { getNewsroomIssueFolder, getNewsroomMediaFolder } from '../domain/newsroomMediaFolders.js';
import { sameProgram } from '../domain/teamMediaProfile.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const CONTEXT_LABELS = {
  [UNIFORM_CONTEXTS.ANY]: 'Any / not game-specific',
  [UNIFORM_CONTEXTS.HOME]: 'Home uniform',
  [UNIFORM_CONTEXTS.AWAY]: 'Away uniform',
  [UNIFORM_CONTEXTS.NEUTRAL]: 'Neutral / alternate',
};

const locationLabel = (value) => ({
  [GAME_LOCATION_CONTEXTS.HOME]: 'home game',
  [GAME_LOCATION_CONTEXTS.AWAY]: 'road game',
  [GAME_LOCATION_CONTEXTS.NEUTRAL]: 'neutral-site game',
}[value] || 'game');

const issueLocation = (career, issue) => normalizeGameLocationContext(
  career?.weeklyGameContexts?.[issue?.publicationId || issue?.id]?.location
    || issue?.gameLocation
    || issue?.game?.location
    || issue?.game?.venueContext,
);

const eligibleAsset = (asset, issue) => {
  if (!asset?.id || asset.isReference) return false;
  if (getNewsroomMediaFolder(asset) !== getNewsroomIssueFolder(issue)) return false;
  const issueTeam = String(issue?.outletProfile?.school || issue?.team || issue?.school || '').trim();
  const assetTeam = String(asset?.teamTag || asset?.generatedFrom?.team || '').trim();
  if (issueTeam && assetTeam && !sameProgram(issueTeam, assetTeam)) return false;
  return true;
};

const articleWithAsset = (article, asset, location) => ({
  ...article,
  mediaAssetId: asset.id,
  mediaSource: asset.origin,
  mediaDisclosure: asset.origin === 'ai-generated' ? 'AI-generated editorial image' : '',
  mediaAutoAssigned: true,
  mediaAutoRecommendation: '',
  mediaAutoReason: `Auto Select matched this ${locationLabel(location)} to a ${CONTEXT_LABELS[normalizeUniformContext(asset.uniformContextTag)].toLowerCase()} photo while preserving team, career-folder, and story fit.`,
  mediaAutoMatchQuality: 'strong',
  mediaQaStatus: 'unreviewed',
  mediaQaAssetId: asset.id,
  mediaQaApprovedAt: '',
  mediaQaChecklist: [],
});

const clearMismatchedAsset = (article, location) => ({
  ...article,
  mediaAssetId: '',
  mediaSource: '',
  mediaDisclosure: '',
  mediaAutoAssigned: false,
  mediaAutoRecommendation: 'generate',
  mediaAutoReason: `The available auto-selected photo used the wrong uniform context for this ${locationLabel(location)}. Add/tag a matching photo or generate a new one instead of forcing a visibly incorrect uniform.`,
  mediaAutoMatchQuality: 'uniform-context-mismatch',
  mediaQaStatus: 'unreviewed',
  mediaQaAssetId: '',
  mediaQaApprovedAt: '',
  mediaQaChecklist: [],
});

export const applyUniformContextToAutoAssignments = (career = {}) => {
  const library = career.newsroomMediaLibrary || [];
  const byId = new Map(library.map((asset) => [asset.id, asset]));
  let changed = false;

  const newsroomIssues = (career.newsroomIssues || []).map((issue) => {
    const location = issueLocation(career, issue);
    if (location === GAME_LOCATION_CONTEXTS.UNKNOWN) return issue;

    const articles = (issue.articles || []).map((article) => {
      if (!article?.mediaAutoAssigned || !article.mediaAssetId) return article;
      const current = byId.get(article.mediaAssetId);
      if (!current || !eligibleAsset(current, issue)) return article;

      const currentBase = scoreNewsroomMediaForArticle({ asset: current, article, issue });
      const currentTotal = currentBase + uniformContextAdjustment({
        gameLocation: location,
        uniformContext: current.uniformContextTag,
      });
      const currentMismatch = uniformContextIsHardMismatch({
        gameLocation: location,
        uniformContext: current.uniformContextTag,
      });

      const ranked = library
        .filter((asset) => eligibleAsset(asset, issue))
        .map((asset) => {
          const baseScore = scoreNewsroomMediaForArticle({ asset, article, issue });
          const totalScore = baseScore + uniformContextAdjustment({
            gameLocation: location,
            uniformContext: asset.uniformContextTag,
          });
          const mismatch = uniformContextIsHardMismatch({
            gameLocation: location,
            uniformContext: asset.uniformContextTag,
          });
          return { asset, baseScore, totalScore, mismatch };
        })
        .filter((entry) => entry.baseScore >= 130 && !entry.mismatch)
        .sort((a, b) => b.totalScore - a.totalScore);

      const best = ranked[0];
      if (!best) {
        if (!currentMismatch) return article;
        changed = true;
        return clearMismatchedAsset(article, location);
      }

      const bestContext = normalizeUniformContext(best.asset.uniformContextTag);
      const currentContext = normalizeUniformContext(current.uniformContextTag);
      const exactUpgrade = bestContext === location && currentContext !== location;
      const meaningfulUpgrade = best.totalScore >= currentTotal + 90;
      if (best.asset.id !== current.id && (currentMismatch || exactUpgrade || meaningfulUpgrade)) {
        changed = true;
        return articleWithAsset(article, best.asset, location);
      }
      if (currentMismatch && best.asset.id === current.id) {
        changed = true;
        return clearMismatchedAsset(article, location);
      }
      return article;
    });

    return articles.some((article, index) => article !== issue.articles?.[index]) ? { ...issue, articles } : issue;
  });

  return { changed, newsroomIssues };
};

const UniformTagControl = ({ asset, user }) => {
  const [busy, setBusy] = useState(false);
  const value = normalizeUniformContext(asset.uniformContextTag);

  const save = async (nextValue) => {
    if (!user || !db || busy) return;
    setBusy(true);
    try {
      const masterRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(masterRef);
        if (!snapshot.exists()) throw new Error('Your DynastyHQ career could not be loaded.');
        const remote = snapshot.data();
        const uniformContextTag = normalizeUniformContext(nextValue);
        const newsroomMediaLibrary = (remote.newsroomMediaLibrary || []).map((entry) => entry.id !== asset.id
          ? entry
          : { ...entry, uniformContextTag });
        transaction.update(masterRef, {
          newsroomMediaLibrary,
          '_sync.revision': (Number(remote?._sync?.revision) || 0) + 1,
          '_sync.deviceId': 'newsroom-uniform-context',
          '_sync.updatedAt': new Date().toISOString(),
        });
      });
    } catch (error) {
      console.error('Uniform context tag could not be saved', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-500">
      Uniform context
      <div className="relative mt-1">
        <select
          value={value}
          disabled={busy}
          onChange={(event) => save(event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 pr-7 text-[9px] font-bold normal-case tracking-normal text-slate-200 outline-none focus:border-blue-500 disabled:opacity-50"
          aria-label={`Uniform context for ${asset.fileName || 'photo'}`}
        >
          <option value={UNIFORM_CONTEXTS.ANY}>{CONTEXT_LABELS[UNIFORM_CONTEXTS.ANY]}</option>
          <option value={UNIFORM_CONTEXTS.HOME}>{CONTEXT_LABELS[UNIFORM_CONTEXTS.HOME]}</option>
          <option value={UNIFORM_CONTEXTS.AWAY}>{CONTEXT_LABELS[UNIFORM_CONTEXTS.AWAY]}</option>
          <option value={UNIFORM_CONTEXTS.NEUTRAL}>{CONTEXT_LABELS[UNIFORM_CONTEXTS.NEUTRAL]}</option>
        </select>
        {busy ? <Loader2 size={10} className="absolute right-2 top-2 animate-spin text-blue-300" /> : <Shirt size={10} className="pointer-events-none absolute right-2 top-2 text-slate-500" />}
      </div>
    </label>
  );
};

const NewsroomUniformContextPortal = () => {
  const { user, career } = useOwnerCareer();
  const [hosts, setHosts] = useState([]);
  const adjustmentBusyRef = useRef(false);
  const library = useMemo(() => career?.newsroomMediaLibrary || [], [career?.newsroomMediaLibrary]);

  useEffect(() => {
    const appRoot = document.getElementById('root');
    if (!appRoot) return undefined;
    const byUrl = new Map(library.filter((asset) => !asset.isReference && asset.downloadUrl).map((asset) => [asset.downloadUrl, asset]));

    const ensure = () => {
      const nextHosts = [];
      appRoot.querySelectorAll('img').forEach((image) => {
        const asset = byUrl.get(image.getAttribute('src')) || byUrl.get(image.src);
        if (!asset) return;
        const card = image.closest('div.overflow-hidden.rounded-lg.border');
        if (!card) return;
        const controls = card.querySelector('.space-y-2.p-2');
        if (!controls) return;
        let host = controls.querySelector(`[data-uniform-context-host="${asset.id}"]`);
        if (!host) {
          host = document.createElement('div');
          host.dataset.uniformContextHost = asset.id;
          const sceneLabel = [...controls.querySelectorAll('label')].find((entry) => /photo\s*\/\s*scene type/i.test(entry.textContent || ''));
          if (sceneLabel?.parentNode) sceneLabel.parentNode.insertBefore(host, sceneLabel.nextSibling);
          else controls.appendChild(host);
        }
        nextHosts.push({ assetId: asset.id, host });
      });
      setHosts((current) => {
        const currentKey = current.map((entry) => `${entry.assetId}:${entry.host === nextHosts.find((next) => next.assetId === entry.assetId)?.host}`).join('|');
        const nextKey = nextHosts.map((entry) => `${entry.assetId}:true`).join('|');
        return current.length === nextHosts.length && currentKey === nextKey ? current : nextHosts;
      });
    };

    ensure();
    const observer = new MutationObserver(ensure);
    observer.observe(appRoot, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [library]);

  useEffect(() => {
    if (!user || !db || !career || adjustmentBusyRef.current) return undefined;
    const preview = applyUniformContextToAutoAssignments(career);
    if (!preview.changed) return undefined;

    const timer = window.setTimeout(async () => {
      if (adjustmentBusyRef.current) return;
      adjustmentBusyRef.current = true;
      try {
        const masterRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(masterRef);
          if (!snapshot.exists()) return;
          const remote = snapshot.data();
          const adjusted = applyUniformContextToAutoAssignments(remote);
          if (!adjusted.changed) return;
          transaction.update(masterRef, {
            newsroomIssues: adjusted.newsroomIssues,
            '_sync.revision': (Number(remote?._sync?.revision) || 0) + 1,
            '_sync.deviceId': 'newsroom-uniform-auto-select',
            '_sync.updatedAt': new Date().toISOString(),
          });
        });
      } catch (error) {
        console.error('Uniform-aware newsroom Auto Select failed', error);
      } finally {
        adjustmentBusyRef.current = false;
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [career, user]);

  const assetById = useMemo(() => new Map(library.map((asset) => [asset.id, asset])), [library]);
  return hosts.map(({ assetId, host }) => {
    const asset = assetById.get(assetId);
    return asset ? createPortal(<UniformTagControl key={assetId} asset={asset} user={user} />, host, assetId) : null;
  });
};

export default NewsroomUniformContextPortal;
