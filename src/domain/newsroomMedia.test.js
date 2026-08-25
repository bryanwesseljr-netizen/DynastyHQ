import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assignNewsroomMedia,
  assignLibraryPhotosToEdition,
  buildNewsroomImageRequest,
  buildPublicNewsroomMediaLibrary,
  clearNewsroomMediaAssignment,
  createNewsroomMediaAsset,
  NEWSROOM_MEDIA_ORIGINS,
  removeNewsroomMediaAsset,
  resolveNewsroomMedia,
  setNewsroomMediaFolder,
  setNewsroomReferenceStatus,
} from './newsroomMedia.js';
import {
  getNewsroomIssueFolder,
  getNewsroomMediaFolder,
  NEWSROOM_MEDIA_FOLDERS,
} from './newsroomMediaFolders.js';

const issue = {
  id: 'season-1-week-1',
  publicationId: 'season-1-week-1',
  season: 1,
  week: 1,
  careerPhase: 'Player',
  coverageStage: 'college',
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
  careerFolder: NEWSROOM_MEDIA_FOLDERS.COLLEGE,
});

test('assigns and clears a media asset on exactly one article', () => {
  const assigned = assignNewsroomMedia({ issues: [issue], publicationId: issue.id, articleId: 'bolt', asset });
  assert.equal(assigned[0].articles[0].mediaAssetId, 'asset-1');
  assert.equal(assigned[0].articles[0].mediaSource, NEWSROOM_MEDIA_ORIGINS.UPLOAD);
  assert.equal(assigned[0].articles[0].mediaAutoAssigned, false);

  const cleared = clearNewsroomMediaAssignment({ issues: assigned, publicationId: issue.id, articleId: 'bolt' });
  assert.equal(cleared[0].articles[0].mediaAssetId, '');
});

test('automatically assigns stable uploaded library photos without spending AI credits', () => {
  const issueWithThreeStories = {
    ...issue,
    articles: [
      issue.articles[0],
      { ...issue.articles[0], id: 'local' },
      { ...issue.articles[0], id: 'filmroom', mediaAssetId: 'manual-photo' },
    ],
  };
  const uploaded = [
    asset,
    { ...asset, id: 'asset-2', downloadUrl: 'https://firebasestorage.googleapis.com/test-2.jpg' },
  ];
  const ignored = [
    { ...asset, id: 'reference', isReference: true },
    { ...asset, id: 'ai-photo', origin: NEWSROOM_MEDIA_ORIGINS.AI, allowAutoAssign: false },
  ];

  const first = assignLibraryPhotosToEdition({ issues: [issueWithThreeStories], publicationId: issue.id, mediaLibrary: [...uploaded, ...ignored] });
  const second = assignLibraryPhotosToEdition({ issues: [issueWithThreeStories], publicationId: issue.id, mediaLibrary: [...uploaded, ...ignored] });
  const assignedIds = first[0].articles.slice(0, 2).map((article) => article.mediaAssetId);

  assert.deepEqual(first, second);
  assert.equal(new Set(assignedIds).size, 2);
  assert.ok(assignedIds.every((id) => uploaded.some((entry) => entry.id === id)));
  assert.equal(first[0].articles[2].mediaAssetId, 'manual-photo');
  assert.ok(first[0].articles.slice(0, 2).every((article) => article.mediaAutoAssigned === true));
});

test('automatic photo assignment never crosses career-stage folders', () => {
  const highSchoolIssue = {
    ...issue,
    id: 'hs-week-1',
    publicationId: 'hs-week-1',
    coverageStage: 'high-school',
    editionType: 'high-school-evaluation',
  };
  const collegePhoto = { ...asset, id: 'college-only' };
  const highSchoolPhoto = { ...asset, id: 'hs-only', careerFolder: NEWSROOM_MEDIA_FOLDERS.HIGH_SCHOOL };

  const collegeOnlyResult = assignLibraryPhotosToEdition({
    issues: [highSchoolIssue],
    publicationId: highSchoolIssue.id,
    mediaLibrary: [collegePhoto],
  });
  assert.equal(collegeOnlyResult[0].articles[0].mediaAssetId, undefined);

  const matchingResult = assignLibraryPhotosToEdition({
    issues: [highSchoolIssue],
    publicationId: highSchoolIssue.id,
    mediaLibrary: [collegePhoto, highSchoolPhoto],
  });
  assert.equal(matchingResult[0].articles[0].mediaAssetId, 'hs-only');
  assert.equal(getNewsroomIssueFolder(highSchoolIssue), NEWSROOM_MEDIA_FOLDERS.HIGH_SCHOOL);
});

test('legacy and manual article photo assignments remain locked even if their folder differs', () => {
  const manualArticle = { ...issue.articles[0], mediaAssetId: 'hs-photo', mediaSource: NEWSROOM_MEDIA_ORIGINS.UPLOAD };
  const lockedIssue = { ...issue, articles: [manualArticle] };
  const hsPhoto = { ...asset, id: 'hs-photo', careerFolder: NEWSROOM_MEDIA_FOLDERS.HIGH_SCHOOL };
  const collegePhoto = { ...asset, id: 'college-new' };
  const result = assignLibraryPhotosToEdition({ issues: [lockedIssue], publicationId: issue.id, mediaLibrary: [hsPhoto, collegePhoto] });
  assert.equal(result[0].articles[0].mediaAssetId, 'hs-photo');
});

test('custom AI library assets can opt into automatic matching inside their folder', () => {
  const customAi = { ...asset, id: 'custom-ai', origin: NEWSROOM_MEDIA_ORIGINS.AI, allowAutoAssign: true };
  const result = assignLibraryPhotosToEdition({ issues: [issue], publicationId: issue.id, mediaLibrary: [customAi] });
  assert.equal(result[0].articles[0].mediaAssetId, 'custom-ai');
  assert.equal(result[0].articles[0].mediaSource, NEWSROOM_MEDIA_ORIGINS.AI);
});

test('resolves article media before the legacy fallback and discloses AI images', () => {
  const aiAsset = { ...asset, id: 'ai-1', origin: NEWSROOM_MEDIA_ORIGINS.AI };
  const article = { ...issue.articles[0], mediaAssetId: 'ai-1' };
  const resolved = resolveNewsroomMedia({ article, mediaLibrary: [aiAsset], fallbackUrl: 'https://example.com/old.jpg' });
  assert.equal(resolved.url, aiAsset.downloadUrl);
  assert.equal(resolved.disclosure, 'AI-generated editorial image');
});

test('builds a bounded AI request from verified copy and approved same-folder references only', () => {
  const library = Array.from({ length: 6 }, (_, index) => ({
    ...asset,
    id: `asset-${index}`,
    isReference: index < 5,
    referenceLabel: `Reference ${index}`,
    careerFolder: index === 4 ? NEWSROOM_MEDIA_FOLDERS.HIGH_SCHOOL : NEWSROOM_MEDIA_FOLDERS.COLLEGE,
  }));
  const request = buildNewsroomImageRequest({ issue, article: issue.articles[0], mediaLibrary: library });
  assert.equal(request.references.length, 4);
  assert.ok(request.references.every((entry) => entry.assetId !== 'asset-4'));
  assert.deepEqual(request.article.citedFactKeys, ['game.result']);
  assert.throws(() => buildNewsroomImageRequest({ issue, article: { ...issue.articles[0], groundingStatus: 'partial' }, mediaLibrary: library }));
});

test('folder tagging moves photos without changing other metadata', () => {
  const moved = setNewsroomMediaFolder([asset], asset.id, NEWSROOM_MEDIA_FOLDERS.COACHING);
  assert.equal(getNewsroomMediaFolder(moved[0]), NEWSROOM_MEDIA_FOLDERS.COACHING);
  assert.equal(moved[0].photoType, asset.photoType);
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
  assert.equal(publicLibrary[0].careerFolder, NEWSROOM_MEDIA_FOLDERS.COLLEGE);
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
