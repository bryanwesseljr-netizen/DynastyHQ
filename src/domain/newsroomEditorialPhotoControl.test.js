import test from 'node:test';
import assert from 'node:assert/strict';

import { buildNewsroomImageRequest } from './newsroomMedia.js';

const issue = {
  id: 'season-1-week-1',
  publicationId: 'season-1-week-1',
  season: 1,
  week: 1,
  careerPhase: 'Player',
  coverageStage: 'college',
};

const article = {
  id: 'story-1',
  outletName: 'The News-Herald',
  desk: 'College Football',
  headline: 'Cincinnati regroups after Week 1',
  dek: 'A verified team-focused Week 1 story.',
  groundingStatus: 'verified',
  citedFactKeys: ['game.result', 'game.opponent'],
};

test('editorial scene override is promoted into the existing image-generation request without mutating article copy', () => {
  const request = buildNewsroomImageRequest({
    issue,
    article: { ...article, sceneOverride: 'tough-loss' },
    mediaLibrary: [],
  });

  assert.equal(request.sceneOverride, 'tough-loss');
  assert.equal(request.article.headline, article.headline);
  assert.equal('sceneOverride' in request.article, false);
});

test('image-generation request defaults to Auto when the article control has no override', () => {
  const request = buildNewsroomImageRequest({ issue, article, mediaLibrary: [] });
  assert.equal(request.sceneOverride, 'auto');
});
