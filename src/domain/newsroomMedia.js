const cleanText = (value, maxLength = 180) => String(value || '').trim().slice(0, maxLength);

export const NEWSROOM_MEDIA_ORIGINS = Object.freeze({
  UPLOAD: 'upload',
  AI: 'ai-generated',
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
  generatedFrom = null,
}) => {
  const assetId = cleanText(id, 120);
  const url = cleanText(downloadUrl, 2400);
  const path = cleanText(storagePath, 600);
  if (!assetId || !url || !path) throw new Error('A saved newsroom image requires an id, URL, and storage path.');

  return {
    id: assetId,
    downloadUrl: url,
    storagePath: path,
    fileName: cleanText(fileName || 'newsroom-photo.jpg', 180),
    mimeType: cleanText(mimeType, 80) || 'image/jpeg',
    sizeBytes: Math.max(0, Number(sizeBytes) || 0),
    origin: origin === NEWSROOM_MEDIA_ORIGINS.AI ? NEWSROOM_MEDIA_ORIGINS.AI : NEWSROOM_MEDIA_ORIGINS.UPLOAD,
    createdAt,
    isReference: Boolean(isReference),
    referenceLabel: cleanText(referenceLabel, 120),
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
    }),
  })
);

export const removeNewsroomMediaAsset = (state, assetId) => ({
  ...state,
  newsroomMediaLibrary: (state.newsroomMediaLibrary || []).filter((asset) => asset.id !== assetId),
  newsroomIssues: (state.newsroomIssues || []).map((issue) => ({
    ...issue,
    articles: (issue.articles || []).map((article) => article.mediaAssetId !== assetId ? article : {
      ...article,
      mediaAssetId: '',
      mediaSource: '',
      mediaDisclosure: '',
    }),
  })),
});

export const setNewsroomReferenceStatus = (library = [], assetId, isReference, referenceLabel = '') => (
  library.map((asset) => asset.id !== assetId ? asset : {
    ...asset,
    isReference: Boolean(isReference),
    referenceLabel: isReference ? cleanText(referenceLabel || asset.referenceLabel || asset.fileName, 120) : '',
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
  if (!issue || !article || article.groundingStatus !== 'verified') {
    throw new Error('Only a verified published article can generate an editorial image.');
  }
  const references = mediaLibrary
    .filter((asset) => asset.isReference && asset.downloadUrl)
    .slice(0, 4)
    .map((asset) => ({
      assetId: asset.id,
      imageUrl: asset.downloadUrl,
      label: asset.referenceLabel || asset.fileName || 'Approved reference',
    }));

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
    references,
  };
};

export const buildPublicNewsroomMediaLibrary = ({ issues = [], mediaLibrary = [] }) => {
  const assignedIds = new Set(
    issues.flatMap((issue) => (issue.articles || []).map((article) => article.mediaAssetId).filter(Boolean)),
  );
  return mediaLibrary
    .filter((asset) => assignedIds.has(asset.id))
    .map((asset) => ({
      id: asset.id,
      downloadUrl: asset.downloadUrl,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      origin: asset.origin,
      createdAt: asset.createdAt,
    }));
};
