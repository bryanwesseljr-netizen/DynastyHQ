const clean = (value, maxLength = 400) => String(value ?? '').trim().slice(0, maxLength);

const safePart = (value) => encodeURIComponent(clean(value, 500));

export const buildNewsroomArticleShareId = ({ ownerId, publicationId, articleId }) => {
  if (!ownerId || !publicationId || !articleId) return '';
  return `${safePart(ownerId)}--${safePart(publicationId)}--${safePart(articleId)}`;
};

export const buildNewsroomArticleShareUrl = ({ baseUrl, shareId }) => {
  if (!baseUrl || !shareId) return '';
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = '';
  url.searchParams.set('sharedArticle', shareId);
  return url.toString();
};

export const readSharedNewsroomArticleId = (search = '') => (
  new URLSearchParams(String(search || '')).get('sharedArticle') || ''
);

export const buildSharedNewsroomArticlePayload = ({
  ownerId,
  issue = {},
  story = {},
  featureImage = '',
  currentMedia = {},
  sharedAt = new Date().toISOString(),
}) => ({
  version: 1,
  ownerId: clean(ownerId, 180),
  sharedAt,
  issue: {
    id: clean(issue.id, 220),
    publicationId: clean(issue.publicationId || issue.id, 220),
    season: Number(issue.season) || 1,
    week: Number(issue.week) || 0,
    label: clean(issue.label, 220),
    editionType: clean(issue.editionType, 80),
    publishedAt: clean(issue.publishedAt, 80),
    editorialGeneratedAt: clean(issue.editorialGeneratedAt, 80),
  },
  story: { ...story },
  featureImage: clean(featureImage, 4000),
  currentMedia: {
    source: clean(currentMedia?.source, 80),
    disclosure: clean(currentMedia?.disclosure, 500),
  },
});
