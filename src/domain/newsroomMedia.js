import { getFrontPageMediaAssetIds, removeFrontPageMediaAsset } from './postgameFrontPage.js';
import { removeVisualProfileReference } from './playerVisualProfile.js';
import { sameProgram } from './teamMediaProfile.js';
import {
  getNewsroomIssueFolder,
  getNewsroomMediaFolder,
  normalizeNewsroomMediaFolder,
} from './newsroomMediaFolders.js';

const cleanText = (value, maxLength = 180) => String(value || '').trim().slice(0, maxLength);

export const NEWSROOM_MEDIA_ORIGINS = Object.freeze({
  UPLOAD: 'upload',
  AI: 'ai-generated',
});

export const NEWSROOM_PHOTO_TYPES = Object.freeze({
  GENERAL: 'general',
  ACTION: 'action',
  PORTRAIT: 'portrait',
  RECRUITING: 'recruiting',
  CELEBRATION: 'celebration',
  SIDELINE: 'sideline',
  TUNNEL: 'tunnel',
  PRACTICE: 'practice',
  COACH: 'coach',
  TEAM: 'team',
});

const VALID_PHOTO_TYPES = new Set(Object.values(NEWSROOM_PHOTO_TYPES));

export const normalizeNewsroomPhotoType = (value) => (
  VALID_PHOTO_TYPES.has(String(value || '').toLowerCase())
    ? String(value).toLowerCase()
    : NEWSROOM_PHOTO_TYPES.GENERAL
);

export const normalizeNewsroomSceneTag = (value) => cleanText(value, 80)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const inferPhotoTypeFromText = (value = '') => {
  const text = String(value || '').toLowerCase();
  if (/\bcoach\b|coaching|coordinator|head coach|position coach/.test(text)) return NEWSROOM_PHOTO_TYPES.COACH;
  if (/tunnel|entrance|walkout|walk out|runout|run out/.test(text)) return NEWSROOM_PHOTO_TYPES.TUNNEL;
  if (/sideline|bench|waiting|headset|huddle|between series|between drives/.test(text)) return NEWSROOM_PHOTO_TYPES.SIDELINE;
  if (/practice|training|drill|warmup|warm-up|workout/.test(text)) return NEWSROOM_PHOTO_TYPES.PRACTICE;
  if (/team photo|team shot|group photo|locker room|whole team|team huddle/.test(text)) return NEWSROOM_PHOTO_TYPES.TEAM;
  if (/headshot|portrait|profile|selfie|media day|posed|pose\b/.test(text)) return NEWSROOM_PHOTO_TYPES.PORTRAIT;
  if (/recruit|commit|signing|offer|visit|camp|top school|scholarship/.test(text)) return NEWSROOM_PHOTO_TYPES.RECRUITING;
  if (/celebrat|trophy|award|champ|victory|win\b|touchdown|td\b|cheer|gatorade/.test(text)) return NEWSROOM_PHOTO_TYPES.CELEBRATION;
  if (/action|game|throw|pass|scrambl|run\b|rush|pocket|field|snap|qb|quarterback/.test(text)) return NEWSROOM_PHOTO_TYPES.ACTION;
  return NEWSROOM_PHOTO_TYPES.GENERAL;
};

export const getNewsroomPhotoType = (asset = {}) => {
  if (VALID_PHOTO_TYPES.has(String(asset.photoType || '').toLowerCase())) {
    return String(asset.photoType).toLowerCase();
  }
  return inferPhotoTypeFromText(`${asset.referenceLabel || ''} ${asset.fileName || ''}`);
};

const emptyPhotoQa = () => ({
  mediaQaStatus: 'unreviewed',
  mediaQaAssetId: '',
  mediaQaApprovedAt: '',
  mediaQaChecklist: [],
});

export const createNewsroomMediaAsset = ({
  id,
  downloadUrl,
  storagePath,
  fileName,
  mimeType = 'image/jpeg',
  sizeBytes = 0,
  origin = NEWSROOM_MEDIA_ORIGINS.UPLOAD,
  createdAt = new Date().toISOString(),
  isReference = false,
  referenceLabel = '',
  photoType = '',
  careerFolder = '',
  allowAutoAssign = false,
  teamTag = '',
  conferenceTag = '',
  sceneTag = '',
  generatedFrom = null,
}) => {
  const assetId = cleanText(id, 120);
  const url = cleanText(downloadUrl, 2400);
  const path = cleanText(storagePath, 600);
  if (!assetId || !url || !path) throw new Error('A saved newsroom image requires an id, URL, and storage path.');

  const safeFileName = cleanText(fileName || 'newsroom-photo.jpg', 180);
  const safeReferenceLabel = cleanText(referenceLabel, 120);

  return {
    id: assetId,
    downloadUrl: url,
    storagePath: path,
    fileName: safeFileName,
    mimeType: cleanText(mimeType, 80) || 'image/jpeg',
    sizeBytes: Math.max(0, Number(sizeBytes) || 0),
    origin: origin === NEWSROOM_MEDIA_ORIGINS.AI ? NEWSROOM_MEDIA_ORIGINS.AI : NEWSROOM_MEDIA_ORIGINS.UPLOAD,
    createdAt,
    isReference: Boolean(isReference),
    referenceLabel: safeReferenceLabel,
    photoType: normalizeNewsroomPhotoType(photoType || inferPhotoTypeFromText(`${safeReferenceLabel} ${safeFileName}`)),
    careerFolder: normalizeNewsroomMediaFolder(careerFolder),
    allowAutoAssign: Boolean(allowAutoAssign),
    teamTag: cleanText(teamTag, 120),
    conferenceTag: cleanText(conferenceTag, 120),
    sceneTag: normalizeNewsroomSceneTag(sceneTag),
    generatedFrom: generatedFrom ? {
      publicationId: cleanText(generatedFrom.publicationId, 120),
      articleId: cleanText(generatedFrom.articleId, 120),
      model: cleanText(generatedFrom.model, 100),
      referenceAssetIds: [...new Set((generatedFrom.referenceAssetIds || []).map((entry) => cleanText(entry, 120)).filter(Boolean))].slice(0, 4),
      team: cleanText(generatedFrom.team, 120),
      conference: cleanText(generatedFrom.conference, 120),
      scene: normalizeNewsroomSceneTag(generatedFrom.scene),
    } : null,
  };
};

export const assignNewsroomMedia = ({ issues = [], publicationId, articleId, asset }) => (
  issues.map((issue) => issue.publicationId !== publicationId && issue.id !== publicationId ? issue : {
    ...issue,
    articles: (issue.articles || []).map((article) => article.id !== articleId ? article : {
      ...article,
      mediaAssetId: asset.id,
      mediaSource: asset.origin,
      mediaDisclosure: asset.origin === NEWSROOM_MEDIA_ORIGINS.AI ? 'AI-generated editorial image' : '',
      mediaAutoAssigned: false,
      ...emptyPhotoQa(),
      mediaQaAssetId: asset.id,
    }),
  })
);

export const clearNewsroomMediaAssignment = ({ issues = [], publicationId, articleId }) => (
  issues.map((issue) => issue.publicationId !== publicationId && issue.id !== publicationId ? issue : {
    ...issue,
    articles: (issue.articles || []).map((article) => article.id !== articleId ? article : {
      ...article,
      mediaAssetId: '',
      mediaSource: '',
      mediaDisclosure: '',
      mediaAutoAssigned: false,
      ...emptyPhotoQa(),
    }),
  })
);

export const getNewsroomArticlePhotoPreferences = (article = {}) => {
  const text = [
    article.outletId,
    article.theme,
    article.desk,
    article.kicker,
    article.headline,
    article.dek,
    article.imageSceneOverride,
    article.sceneOverride,
  ].filter(Boolean).join(' ').toLowerCase();

  const scene = normalizeNewsroomSceneTag(article.imageSceneOverride || article.sceneOverride || '');
  if (scene === 'celebration') return [NEWSROOM_PHOTO_TYPES.CELEBRATION, NEWSROOM_PHOTO_TYPES.TEAM, NEWSROOM_PHOTO_TYPES.ACTION, NEWSROOM_PHOTO_TYPES.SIDELINE, NEWSROOM_PHOTO_TYPES.GENERAL];
  if (scene === 'sideline' || scene === 'tough-loss') return [NEWSROOM_PHOTO_TYPES.SIDELINE, NEWSROOM_PHOTO_TYPES.ACTION, NEWSROOM_PHOTO_TYPES.TEAM, NEWSROOM_PHOTO_TYPES.PORTRAIT, NEWSROOM_PHOTO_TYPES.GENERAL];
  if (scene === 'tunnel') return [NEWSROOM_PHOTO_TYPES.TUNNEL, NEWSROOM_PHOTO_TYPES.TEAM, NEWSROOM_PHOTO_TYPES.PORTRAIT, NEWSROOM_PHOTO_TYPES.GENERAL, NEWSROOM_PHOTO_TYPES.ACTION];
  if (scene === 'practice') return [NEWSROOM_PHOTO_TYPES.PRACTICE, NEWSROOM_PHOTO_TYPES.ACTION, NEWSROOM_PHOTO_TYPES.TEAM, NEWSROOM_PHOTO_TYPES.GENERAL, NEWSROOM_PHOTO_TYPES.PORTRAIT];
  if (scene === 'portrait') return [NEWSROOM_PHOTO_TYPES.PORTRAIT, NEWSROOM_PHOTO_TYPES.GENERAL, NEWSROOM_PHOTO_TYPES.SIDELINE, NEWSROOM_PHOTO_TYPES.ACTION, NEWSROOM_PHOTO_TYPES.TEAM];
  if (scene === 'pocket-action' || scene === 'scramble') return [NEWSROOM_PHOTO_TYPES.ACTION, NEWSROOM_PHOTO_TYPES.SIDELINE, NEWSROOM_PHOTO_TYPES.GENERAL, NEWSROOM_PHOTO_TYPES.TEAM, NEWSROOM_PHOTO_TYPES.PORTRAIT];

  if (/recruit|signing|commit|offer|scholarship|visit|prospect/.test(text)) {
    return [NEWSROOM_PHOTO_TYPES.RECRUITING, NEWSROOM_PHOTO_TYPES.PORTRAIT, NEWSROOM_PHOTO_TYPES.ACTION, NEWSROOM_PHOTO_TYPES.GENERAL, NEWSROOM_PHOTO_TYPES.TEAM];
  }
  if (/coach|coordinator|staff|play caller|play-caller/.test(text)) {
    return [NEWSROOM_PHOTO_TYPES.COACH, NEWSROOM_PHOTO_TYPES.SIDELINE, NEWSROOM_PHOTO_TYPES.TEAM, NEWSROOM_PHOTO_TYPES.GENERAL, NEWSROOM_PHOTO_TYPES.ACTION];
  }
  if (/film|scheme|analysis|breakdown|evaluation|scouting/.test(text)) {
    return [NEWSROOM_PHOTO_TYPES.ACTION, NEWSROOM_PHOTO_TYPES.PRACTICE, NEWSROOM_PHOTO_TYPES.GENERAL, NEWSROOM_PHOTO_TYPES.SIDELINE, NEWSROOM_PHOTO_TYPES.PORTRAIT];
  }
  if (/champ|award|victory|win\b|touchdown|milestone|celebrat/.test(text)) {
    return [NEWSROOM_PHOTO_TYPES.CELEBRATION, NEWSROOM_PHOTO_TYPES.TEAM, NEWSROOM_PHOTO_TYPES.ACTION, NEWSROOM_PHOTO_TYPES.SIDELINE, NEWSROOM_PHOTO_TYPES.GENERAL];
  }
  if (/profile|spotlight|feature|future|watch|inside|journey|story/.test(text)) {
    return [NEWSROOM_PHOTO_TYPES.PORTRAIT, NEWSROOM_PHOTO_TYPES.SIDELINE, NEWSROOM_PHOTO_TYPES.ACTION, NEWSROOM_PHOTO_TYPES.GENERAL, NEWSROOM_PHOTO_TYPES.TEAM];
  }
  return [NEWSROOM_PHOTO_TYPES.ACTION, NEWSROOM_PHOTO_TYPES.SIDELINE, NEWSROOM_PHOTO_TYPES.GENERAL, NEWSROOM_PHOTO_TYPES.TEAM, NEWSROOM_PHOTO_TYPES.CELEBRATION];
};

export const scoreNewsroomMediaForArticle = ({ asset = {}, article = {}, issue = {} } = {}) => {
  if (!asset?.id) return -Infinity;
  let score = 0;
  const issueFolder = getNewsroomIssueFolder(issue);
  if (getNewsroomMediaFolder(asset) === issueFolder) score += 100;
  else score -= 80;

  const issueTeam = cleanText(issue?.outletProfile?.school || issue?.team || issue?.school, 120);
  const assetTeam = cleanText(asset.teamTag || asset.generatedFrom?.team, 120);
  if (issueTeam && assetTeam) score += sameProgram(assetTeam, issueTeam) ? 90 : -140;

  const preferences = getNewsroomArticlePhotoPreferences(article);
  const typeIndex = preferences.indexOf(getNewsroomPhotoType(asset));
  score += typeIndex >= 0 ? Math.max(0, 60 - (typeIndex * 12)) : 0;

  const requestedScene = normalizeNewsroomSceneTag(article.imageSceneOverride || article.sceneOverride || '');
  const assetScene = normalizeNewsroomSceneTag(asset.sceneTag || asset.generatedFrom?.scene || '');
  if (requestedScene && requestedScene !== 'auto' && assetScene) {
    score += assetScene === requestedScene ? 45 : -12;
  }

  const publicationId = issue.publicationId || issue.id || '';
  if (asset.generatedFrom?.articleId && asset.generatedFrom.articleId === article.id) score += 80;
  if (asset.generatedFrom?.publicationId && asset.generatedFrom.publicationId === publicationId) score += 20;
  if (asset.isReference) score -= 500;
  if (asset.allowAutoAssign || asset.origin === NEWSROOM_MEDIA_ORIGINS.UPLOAD) score += 5;
  return score;
};

export const rankNewsroomMediaForArticle = ({ assets = [], article = {}, issue = {} } = {}) => (
  [...assets].sort((a, b) => {
    const scoreDiff = scoreNewsroomMediaForArticle({ asset: b, article, issue })
      - scoreNewsroomMediaForArticle({ asset: a, article, issue });
    if (scoreDiff) return scoreDiff;
    const dateDiff = String(b?.createdAt || '').localeCompare(String(a?.createdAt || ''));
    if (dateDiff) return dateDiff;
    return String(a?.id || '').localeCompare(String(b?.id || ''));
  })
);

const stableAsset = (assets = []) => assets[0];

const recentLibraryAssignments = (issues = [], targetIndex = -1) => {
  const end = targetIndex >= 0 ? targetIndex : issues.length;
  const recentIssues = issues.slice(Math.max(0, end - 2), end);
  return new Set(recentIssues.flatMap((issue) => (
    (issue.articles || [])
      .filter((article) => article.mediaSource === NEWSROOM_MEDIA_ORIGINS.UPLOAD || article.mediaAutoAssigned)
      .map((article) => article.mediaAssetId)
      .filter(Boolean)
  )));
};

const chooseSmartLibraryPhoto = ({ candidates, article, issue, usedThisEdition, recentlyUsed }) => {
  const currentId = article.mediaAssetId || '';
  const available = candidates.filter((asset) => !usedThisEdition.has(asset.id));
  const editionPool = available.length ? available : candidates;
  const ranked = rankNewsroomMediaForArticle({ assets: editionPool, article, issue });
  if (!ranked.length) return null;

  const bestScore = scoreNewsroomMediaForArticle({ asset: ranked[0], article, issue });
  const bestMatches = ranked.filter((asset) => (
    scoreNewsroomMediaForArticle({ asset, article, issue }) === bestScore
  ));
  const currentBest = bestMatches.find((asset) => asset.id === currentId && !recentlyUsed.has(asset.id));
  if (currentBest) return currentBest;
  const freshBest = bestMatches.find((asset) => !recentlyUsed.has(asset.id));
  return freshBest || stableAsset(bestMatches) || stableAsset(ranked);
};

export const assignLibraryPhotosToEdition = ({ issues = [], publicationId, mediaLibrary = [] }) => {
  const targetIndex = issues.findIndex((issue) => issue.publicationId === publicationId || issue.id === publicationId);
  if (targetIndex < 0) return issues;

  const targetIssue = issues[targetIndex];
  const targetFolder = getNewsroomIssueFolder(targetIssue);
  const candidates = mediaLibrary.filter((asset) => (
    (asset?.origin === NEWSROOM_MEDIA_ORIGINS.UPLOAD || asset?.allowAutoAssign === true)
    && !asset.isReference
    && asset.id
    && asset.downloadUrl
    && getNewsroomMediaFolder(asset) === targetFolder
  ));
  if (!candidates.length) return issues;

  const recentlyUsed = recentLibraryAssignments(issues, targetIndex);

  return issues.map((issue) => {
    if (issue.publicationId !== publicationId && issue.id !== publicationId) return issue;
    const usedThisEdition = new Set();
    return {
      ...issue,
      articles: (issue.articles || []).map((article) => {
        if (article.mediaAssetId && article.mediaAutoAssigned !== true) {
          usedThisEdition.add(article.mediaAssetId);
          return article;
        }

        const asset = chooseSmartLibraryPhoto({ candidates, article, issue, usedThisEdition, recentlyUsed });
        if (!asset) return article;
        usedThisEdition.add(asset.id);

        if (article.mediaAutoAssigned === true && article.mediaAssetId === asset.id) return article;

        return {
          ...article,
          mediaAssetId: asset.id,
          mediaSource: asset.origin,
          mediaDisclosure: asset.origin === NEWSROOM_MEDIA_ORIGINS.AI ? 'AI-generated editorial image' : '',
          mediaAutoAssigned: true,
          ...emptyPhotoQa(),
          mediaQaAssetId: asset.id,
        };
      }),
    };
  });
};

export const removeNewsroomMediaAsset = (state, assetId) => {
  const nextState = removeVisualProfileReference(state, assetId);
  return {
    ...nextState,
    newsroomMediaLibrary: (nextState.newsroomMediaLibrary || []).filter((asset) => asset.id !== assetId),
    newsroomIssues: (nextState.newsroomIssues || []).map((issue) => ({
      ...issue,
      articles: (issue.articles || []).map((article) => article.mediaAssetId !== assetId ? article : {
        ...article,
        mediaAssetId: '',
        mediaSource: '',
        mediaDisclosure: '',
        mediaAutoAssigned: false,
        ...emptyPhotoQa(),
      }),
    })),
    postgameFrontPages: removeFrontPageMediaAsset(nextState.postgameFrontPages || [], assetId),
  };
};

export const setNewsroomReferenceStatus = (library = [], assetId, isReference, referenceLabel = '') => (
  library.map((asset) => asset.id !== assetId ? asset : {
    ...asset,
    isReference: Boolean(isReference),
    referenceLabel: isReference ? cleanText(referenceLabel || asset.referenceLabel || asset.fileName, 120) : '',
  })
);

export const setNewsroomPhotoType = (library = [], assetId, photoType) => (
  library.map((asset) => asset.id !== assetId ? asset : { ...asset, photoType: normalizeNewsroomPhotoType(photoType) })
);

export const setNewsroomMediaFolder = (library = [], assetId, careerFolder) => (
  library.map((asset) => asset.id !== assetId ? asset : { ...asset, careerFolder: normalizeNewsroomMediaFolder(careerFolder) })
);

export const setNewsroomMediaIdentityTags = (library = [], assetId, { teamTag = '', conferenceTag = '', sceneTag = '' } = {}) => (
  library.map((asset) => asset.id !== assetId ? asset : {
    ...asset,
    teamTag: cleanText(teamTag, 120),
    conferenceTag: cleanText(conferenceTag, 120),
    sceneTag: normalizeNewsroomSceneTag(sceneTag),
  })
);

export const resolveNewsroomMedia = ({ article, mediaLibrary = [], fallbackUrl = '' }) => {
  const asset = mediaLibrary.find((entry) => entry.id === article?.mediaAssetId);
  return {
    asset: asset || null,
    url: asset?.downloadUrl || fallbackUrl || '',
    source: asset?.origin || (fallbackUrl ? 'legacy-fallback' : ''),
    disclosure: article?.mediaDisclosure || (asset?.origin === NEWSROOM_MEDIA_ORIGINS.AI ? 'AI-generated editorial image' : ''),
  };
};

export const buildNewsroomImageRequest = ({ issue, article, mediaLibrary = [] }) => {
  if (!issue || !article || article.groundingStatus !== 'verified') throw new Error('Only a verified published article can generate an editorial image.');
  const targetFolder = getNewsroomIssueFolder(issue);
  const references = mediaLibrary
    .filter((asset) => asset.isReference && asset.downloadUrl && getNewsroomMediaFolder(asset) === targetFolder)
    .slice(0, 4)
    .map((asset) => ({ assetId: asset.id, imageUrl: asset.downloadUrl, label: asset.referenceLabel || asset.fileName || 'Approved reference' }));

  return {
    issue: {
      publicationId: issue.publicationId || issue.id,
      season: issue.season,
      week: issue.week,
      careerPhase: issue.careerPhase,
    },
    article: {
      id: article.id,
      outletName: article.outletName,
      desk: article.desk,
      headline: article.headline,
      dek: article.dek,
      groundingStatus: article.groundingStatus,
      citedFactKeys: article.citedFactKeys || [],
    },
    sceneOverride: cleanText(article.imageSceneOverride || article.sceneOverride || 'auto', 60).toLowerCase() || 'auto',
    references,
  };
};

export const buildPublicNewsroomMediaLibrary = ({ issues = [], frontPages = [], mediaLibrary = [] }) => {
  const assignedIds = new Set([
    ...issues.flatMap((issue) => (issue.articles || []).map((article) => article.mediaAssetId).filter(Boolean)),
    ...getFrontPageMediaAssetIds(frontPages),
  ]);
  return mediaLibrary
    .filter((asset) => assignedIds.has(asset.id))
    .map((asset) => ({
      id: asset.id,
      downloadUrl: asset.downloadUrl,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      origin: asset.origin,
      photoType: getNewsroomPhotoType(asset),
      careerFolder: getNewsroomMediaFolder(asset),
      teamTag: asset.teamTag || '',
      conferenceTag: asset.conferenceTag || '',
      sceneTag: asset.sceneTag || '',
      createdAt: asset.createdAt,
    }));
};
