import { getFrontPageMediaAssetIds, removeFrontPageMediaAsset } from './postgameFrontPage.js';
import { removeVisualProfileReference } from './playerVisualProfile.js';
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
});

const VALID_PHOTO_TYPES = new Set(Object.values(NEWSROOM_PHOTO_TYPES));

export const normalizeNewsroomPhotoType = (value) => (
  VALID_PHOTO_TYPES.has(String(value || '').toLowerCase())
    ? String(value).toLowerCase()
    : NEWSROOM_PHOTO_TYPES.GENERAL
);

const inferPhotoTypeFromText = (value = '') => {
  const text = String(value || '').toLowerCase();
  if (/headshot|portrait|profile|selfie|media day|posed|pose\b/.test(text)) return NEWSROOM_PHOTO_TYPES.PORTRAIT;
  if (/recruit|commit|signing|offer|visit|camp|top school|scholarship/.test(text)) return NEWSROOM_PHOTO_TYPES.RECRUITING;
  if (/celebrat|trophy|award|champ|victory|win\b|touchdown|td\b|cheer|gatorade/.test(text)) return NEWSROOM_PHOTO_TYPES.CELEBRATION;
  if (/action|game|throw|pass|scrambl|run\b|rush|pocket|field|warmup|practice|snap|qb|quarterback/.test(text)) return NEWSROOM_PHOTO_TYPES.ACTION;
  return NEWSROOM_PHOTO_TYPES.GENERAL;
};

export const getNewsroomPhotoType = (asset = {}) => {
  if (VALID_PHOTO_TYPES.has(String(asset.photoType || '').toLowerCase())) {
    return String(asset.photoType).toLowerCase();
  }
  return inferPhotoTypeFromText(`${asset.referenceLabel || ''} ${asset.fileName || ''}`);
};

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
    generatedFrom: generatedFrom ? {
      publicationId: cleanText(generatedFrom.publicationId, 120),
      articleId: cleanText(generatedFrom.articleId, 120),
      model: cleanText(generatedFrom.model, 100),
      referenceAssetIds: [...new Set((generatedFrom.referenceAssetIds || []).map((entry) => cleanText(entry, 120)).filter(Boolean))].slice(0, 4),
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
    }),
  })
);

const articlePhotoPreferences = (article = {}) => {
  const text = [
    article.outletId,
    article.theme,
    article.desk,
    article.kicker,
    article.headline,
    article.dek,
  ].filter(Boolean).join(' ').toLowerCase();

  if (/recruit|signing|commit|offer|scholarship|visit|prospect/.test(text)) {
    return [NEWSROOM_PHOTO_TYPES.RECRUITING, NEWSROOM_PHOTO_TYPES.PORTRAIT, NEWSROOM_PHOTO_TYPES.ACTION, NEWSROOM_PHOTO_TYPES.GENERAL, NEWSROOM_PHOTO_TYPES.CELEBRATION];
  }
  if (/film|scheme|analysis|breakdown|evaluation|scouting/.test(text)) {
    return [NEWSROOM_PHOTO_TYPES.ACTION, NEWSROOM_PHOTO_TYPES.GENERAL, NEWSROOM_PHOTO_TYPES.PORTRAIT, NEWSROOM_PHOTO_TYPES.RECRUITING, NEWSROOM_PHOTO_TYPES.CELEBRATION];
  }
  if (/champ|award|victory|win\b|touchdown|milestone|celebrat/.test(text)) {
    return [NEWSROOM_PHOTO_TYPES.CELEBRATION, NEWSROOM_PHOTO_TYPES.ACTION, NEWSROOM_PHOTO_TYPES.GENERAL, NEWSROOM_PHOTO_TYPES.PORTRAIT, NEWSROOM_PHOTO_TYPES.RECRUITING];
  }
  if (/profile|spotlight|feature|future|watch|inside|journey|story/.test(text)) {
    return [NEWSROOM_PHOTO_TYPES.PORTRAIT, NEWSROOM_PHOTO_TYPES.ACTION, NEWSROOM_PHOTO_TYPES.GENERAL, NEWSROOM_PHOTO_TYPES.RECRUITING, NEWSROOM_PHOTO_TYPES.CELEBRATION];
  }
  return [NEWSROOM_PHOTO_TYPES.ACTION, NEWSROOM_PHOTO_TYPES.GENERAL, NEWSROOM_PHOTO_TYPES.CELEBRATION, NEWSROOM_PHOTO_TYPES.PORTRAIT, NEWSROOM_PHOTO_TYPES.RECRUITING];
};

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

const chooseSmartLibraryPhoto = ({ candidates, article, usedThisEdition, recentlyUsed }) => {
  const preferences = articlePhotoPreferences(article);
  const currentId = article.mediaAssetId || '';
  const available = candidates.filter((asset) => !usedThisEdition.has(asset.id));
  const editionPool = available.length ? available : candidates;

  for (const photoType of preferences) {
    const typed = editionPool.filter((asset) => getNewsroomPhotoType(asset) === photoType);
    if (!typed.length) continue;
    const fresh = typed.filter((asset) => !recentlyUsed.has(asset.id) && asset.id !== currentId);
    if (fresh.length) return stableAsset(fresh);
    const notCurrent = typed.filter((asset) => asset.id !== currentId);
    if (notCurrent.length) return stableAsset(notCurrent);
    return stableAsset(typed);
  }

  const freshAny = editionPool.filter((asset) => !recentlyUsed.has(asset.id) && asset.id !== currentId);
  if (freshAny.length) return stableAsset(freshAny);
  const notCurrentAny = editionPool.filter((asset) => asset.id !== currentId);
  return stableAsset(notCurrentAny.length ? notCurrentAny : editionPool);
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

  const assetById = new Map(mediaLibrary.map((entry) => [entry?.id, entry]));
  const recentlyUsed = recentLibraryAssignments(issues, targetIndex);

  return issues.map((issue) => {
    if (issue.publicationId !== publicationId && issue.id !== publicationId) return issue;
    const usedThisEdition = new Set();
    return {
      ...issue,
      articles: (issue.articles || []).map((article) => {
        const currentAsset = article.mediaAssetId ? assetById.get(article.mediaAssetId) : null;
        const currentMatchesFolder = currentAsset && getNewsroomMediaFolder(currentAsset) === targetFolder;

        if (article.mediaAssetId && article.mediaAutoAssigned !== true) {
          usedThisEdition.add(article.mediaAssetId);
          return article;
        }
        if (article.mediaAssetId && article.mediaAutoAssigned === true && currentMatchesFolder) {
          usedThisEdition.add(article.mediaAssetId);
          return article;
        }

        const asset = chooseSmartLibraryPhoto({ candidates, article, usedThisEdition, recentlyUsed });
        if (!asset) return article;
        usedThisEdition.add(asset.id);
        return {
          ...article,
          mediaAssetId: asset.id,
          mediaSource: asset.origin,
          mediaDisclosure: asset.origin === NEWSROOM_MEDIA_ORIGINS.AI ? 'AI-generated editorial image' : '',
          mediaAutoAssigned: true,
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
    sceneOverride: cleanText(article.sceneOverride || 'auto', 60).toLowerCase() || 'auto',
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
      createdAt: asset.createdAt,
    }));
};
