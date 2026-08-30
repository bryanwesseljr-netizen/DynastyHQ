import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assignLibraryPhotosToEdition,
  createNewsroomMediaAsset,
  getNewsroomArticlePhotoPreferences,
  NEWSROOM_MEDIA_ORIGINS,
  NEWSROOM_PHOTO_TYPES,
} from './newsroomMedia.js';
import { NEWSROOM_MEDIA_FOLDERS } from './newsroomMediaFolders.js';

const makeAsset = ({ id, photoType = 'action', teamTag = 'Cincinnati', createdAt = '2026-08-30T12:00:00.000Z' }) => createNewsroomMediaAsset({
  id,
  downloadUrl: `https://firebasestorage.googleapis.com/${id}.jpg`,
  storagePath: `artifacts/test/newsroom_media/${id}.jpg`,
  fileName: `${id}.jpg`,
  careerFolder: NEWSROOM_MEDIA_FOLDERS.COLLEGE,
  photoType,
  teamTag,
  createdAt,
});

const makeIssue = ({ id, week, articles }) => ({
  id,
  publicationId: id,
  season: 2,
  week,
  coverageStage: 'college',
  outletProfile: { school: 'Cincinnati' },
  articles,
});

const baseStory = (id, overrides = {}) => ({
  id,
  outletId: 'bolt',
  outletName: 'Bearcats Insider',
  desk: 'Team News',
  headline: 'Cincinnati controls the game',
  dek: 'A verified Cincinnati football story.',
  groundingStatus: 'verified',
  ...overrides,
});

test('tough-loss stories prefer the new defeat/disappointment photo type', () => {
  const preferences = getNewsroomArticlePhotoPreferences(baseStory('loss', {
    sceneOverride: 'tough-loss',
    headline: 'Cincinnati comes up short in a tough loss',
  }));
  assert.equal(preferences[0], NEWSROOM_PHOTO_TYPES.DEFEAT);
});

test('loss coverage rejects a celebration image when a defeat image is available', () => {
  const celebration = makeAsset({ id: 'loss-celebration', photoType: 'celebration' });
  const defeat = makeAsset({ id: 'loss-defeat', photoType: 'defeat' });
  const lossStory = baseStory('loss-fit', {
    sceneOverride: 'tough-loss',
    headline: 'Cincinnati comes up short in a tough loss',
  });
  const issues = [makeIssue({ id: 's2-loss', week: 5, articles: [lossStory] })];

  const result = assignLibraryPhotosToEdition({
    issues,
    publicationId: 's2-loss',
    mediaLibrary: [celebration, defeat],
  });

  assert.equal(result[0].articles[0].mediaAssetId, defeat.id);
});

test('win coverage does not auto-select a defeat image', () => {
  const defeat = makeAsset({ id: 'win-defeat', photoType: 'defeat' });
  const winStory = baseStory('win-fit', {
    headline: 'Cincinnati wins in dominant fashion',
  });
  const issues = [makeIssue({ id: 's2-win', week: 6, articles: [winStory] })];

  const result = assignLibraryPhotosToEdition({
    issues,
    publicationId: 's2-win',
    mediaLibrary: [defeat],
  });

  assert.equal(result[0].articles[0].mediaAssetId, undefined);
  assert.equal(result[0].articles[0].mediaAutoRecommendation, 'generate');
});

test('auto selection rotates to a fresh similarly strong photo instead of repeating recent weeks', () => {
  const usedWeekOne = makeAsset({ id: 'action-1', photoType: 'action' });
  const usedWeekTwo = makeAsset({ id: 'action-2', photoType: 'action' });
  const freshWeekThree = makeAsset({ id: 'action-3', photoType: 'action' });

  const issues = [
    makeIssue({
      id: 's2-w1',
      week: 1,
      articles: [baseStory('w1', {
        mediaAssetId: usedWeekOne.id,
        mediaSource: NEWSROOM_MEDIA_ORIGINS.UPLOAD,
        mediaAutoAssigned: true,
      })],
    }),
    makeIssue({
      id: 's2-w2',
      week: 2,
      articles: [baseStory('w2', {
        mediaAssetId: usedWeekTwo.id,
        mediaSource: NEWSROOM_MEDIA_ORIGINS.UPLOAD,
        mediaAutoAssigned: true,
      })],
    }),
    makeIssue({ id: 's2-w3', week: 3, articles: [baseStory('w3')] }),
  ];

  const result = assignLibraryPhotosToEdition({
    issues,
    publicationId: 's2-w3',
    mediaLibrary: [usedWeekOne, usedWeekTwo, freshWeekThree],
  });

  assert.equal(result[2].articles[0].mediaAssetId, freshWeekThree.id);
  assert.equal(result[2].articles[0].mediaAutoAssigned, true);
  assert.equal(result[2].articles[0].mediaAutoRecommendation, '');
});

test('auto selection recommends a new generated photo when only recent credible repeats remain', () => {
  const usedWeekOne = makeAsset({ id: 'only-action-1', photoType: 'action' });
  const usedWeekTwo = makeAsset({ id: 'only-action-2', photoType: 'action' });

  const issues = [
    makeIssue({
      id: 's2-w1-repeat',
      week: 1,
      articles: [baseStory('w1-repeat', {
        mediaAssetId: usedWeekOne.id,
        mediaSource: NEWSROOM_MEDIA_ORIGINS.UPLOAD,
        mediaAutoAssigned: true,
      })],
    }),
    makeIssue({
      id: 's2-w2-repeat',
      week: 2,
      articles: [baseStory('w2-repeat', {
        mediaAssetId: usedWeekTwo.id,
        mediaSource: NEWSROOM_MEDIA_ORIGINS.UPLOAD,
        mediaAutoAssigned: true,
      })],
    }),
    makeIssue({ id: 's2-w3-repeat', week: 3, articles: [baseStory('w3-repeat')] }),
  ];

  const result = assignLibraryPhotosToEdition({
    issues,
    publicationId: 's2-w3-repeat',
    mediaLibrary: [usedWeekOne, usedWeekTwo],
  });

  const story = result[2].articles[0];
  assert.equal(story.mediaAssetId, undefined);
  assert.equal(story.mediaAutoRecommendation, 'generate');
  assert.equal(story.mediaAutoMatchQuality, 'exhausted');
  assert.match(story.mediaAutoReason, /fresh generated photo/i);
});

test('auto selection refuses a clearly wrong-team photo even when the scene type fits', () => {
  const wrongTeam = makeAsset({ id: 'wrong-team-action', photoType: 'action', teamTag: 'Missouri State' });
  const issues = [makeIssue({ id: 's2-w4', week: 4, articles: [baseStory('w4')] })];

  const result = assignLibraryPhotosToEdition({
    issues,
    publicationId: 's2-w4',
    mediaLibrary: [wrongTeam],
  });

  const story = result[0].articles[0];
  assert.equal(story.mediaAssetId, undefined);
  assert.equal(story.mediaAutoRecommendation, 'generate');
  assert.match(story.mediaAutoReason, /same-program photo/i);
});
