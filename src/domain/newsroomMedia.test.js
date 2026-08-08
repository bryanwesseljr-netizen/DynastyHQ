import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assignNewsroomMedia,
  buildNewsroomImageRequest,
  buildPublicNewsroomMediaLibrary,
  clearNewsroomMediaAssignment,
  createNewsroomMediaAsset,
  NEWSROOM_MEDIA_ORIGINS,
  removeNewsroomMediaAsset,
  resolveNewsroomMedia,
  setNewsroomReferenceStatus,
} from './newsroomMedia.js';

const issue = {
  id: 'season-1-week-1',
  publicationId: 'season-1-week-1',
  season: 1,
  week: 1,
  careerPhase: 'Player',
  articles: [{
    id: 'bolt',
    outletName: 'The Bolt',
    desk: 'School Desk',
    headline: 'Test University wins',
    dek: 'A verified result.',
    groundingStatus: 'verified',
    citedFactKeys: ['game.result'],
  }],
};

const asset = createNewsroomMediaAsset({
  id: 'asset-1',
  downloadUrl: 'https://firebasestorage.googleapis.com/test.jpg',
  storagePath: 'artifacts/test/newsroom_media/asset-1.jpg',
  fileName: 'test.jpg',
});

test('assigns and clears a media asset on exactly one article', () => {
  const assigned = assignNewsroomMedia({ issues: [issue], publicationId: issue.id, articleId: 'bolt', asset });
  assert.equal(assigned[0].articles[0].mediaAssetId, 'asset-1');
  assert.equal(assigned[0].articles[0].mediaSource, NEWSROOM_MEDIA_ORIGINS.UPLOAD);

  const cleared = clearNewsroomMediaAssignment({ issues: assigned, publicationId: issue.id, articleId: 'bolt' });
  assert.equal(cleared[0].articles[0].mediaAssetId, '');
});

test('resolves article media before the legacy fallback and discloses AI images', () => {
  const aiAsset = { ...asset, id: 'ai-1', origin: NEWSROOM_MEDIA_ORIGINS.AI };
  const article = { ...issue.articles[0], mediaAssetId: 'ai-1' };
  const resolved = resolveNewsroomMedia({ article, mediaLibrary: [aiAsset], fallbackUrl: 'https://example.com/old.jpg' });
  assert.equal(resolved.url, aiAsset.downloadUrl);
  assert.equal(resolved.disclosure, 'AI-generated editorial image');
});

test('builds a bounded AI request from verified copy and approved references only', () => {
  const library = Array.from({ length: 6 }, (_, index) => ({
    ...asset,
    id: `asset-${index}`,
    isReference: index < 5,
    referenceLabel: `Reference ${index}`,
  }));
  const request = buildNewsroomImageRequest({ issue, article: issue.articles[0], mediaLibrary: library });
  assert.equal(request.references.length, 4);
  assert.deepEqual(request.article.citedFactKeys, ['game.result']);
  assert.throws(() => buildNewsroomImageRequest({ issue, article: { ...issue.articles[0], groundingStatus: 'partial' }, mediaLibrary: library }));
});

test('reference toggles and deletion cannot leave dangling assignments', () => {
  const referenced = setNewsroomReferenceStatus([asset], asset.id, true, 'Home uniform');
  assert.equal(referenced[0].referenceLabel, 'Home uniform');
  const assigned = assignNewsroomMedia({ issues: [issue], publicationId: issue.id, articleId: 'bolt', asset });
  const cleaned = removeNewsroomMediaAsset({
    newsroomMediaLibrary: referenced,
    newsroomIssues: assigned,
    postgameFrontPages: [{ publicationId: issue.id, gamePhotoAssetId: asset.id, player: {}, teammates: [] }],
  }, asset.id);
  assert.equal(cleaned.newsroomMediaLibrary.length, 0);
  assert.equal(cleaned.newsroomIssues[0].articles[0].mediaAssetId, '');
  assert.equal(cleaned.postgameFrontPages[0].gamePhotoAssetId, '');
});

test('public media projection excludes unassigned reference-locker photos and private storage metadata', () => {
  const assigned = assignNewsroomMedia({ issues: [issue], publicationId: issue.id, articleId: 'bolt', asset });
  const privateReference = { ...asset, id: 'reference-only', isReference: true, storagePath: 'private/reference.jpg' };
  const publicLibrary = buildPublicNewsroomMediaLibrary({ issues: assigned, mediaLibrary: [asset, privateReference] });
  assert.equal(publicLibrary.length, 1);
  assert.equal(publicLibrary[0].id, asset.id);
  assert.equal('storagePath' in publicLibrary[0], false);
  assert.equal('isReference' in publicLibrary[0], false);
});

test('public media projection includes photos used only by a postgame front page', () => {
  const publicLibrary = buildPublicNewsroomMediaLibrary({
    issues: [],
    frontPages: [{ publicationId: issue.id, gamePhotoAssetId: asset.id, player: {}, teammates: [] }],
    mediaLibrary: [asset],
  });
  assert.equal(publicLibrary.length, 1);
  assert.equal(publicLibrary[0].id, asset.id);
});
