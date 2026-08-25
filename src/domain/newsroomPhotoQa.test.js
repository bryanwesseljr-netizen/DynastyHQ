import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildNewsroomPhotoQaReport,
  NEWSROOM_PHOTO_QA_STATUSES,
  NEWSROOM_PHOTO_VISUAL_CHECKS,
  setNewsroomPhotoQaDecision,
} from './newsroomPhotoQa.js';

test('photo QA passes structured Cincinnati Big 12 metadata and allows visual approval', () => {
  const state = {
    currentSeason: 1,
    player: { college: 'Cincinnati' },
    newsroomMediaSettings: { conferenceOverrides: {} },
  };
  const issue = { id: 'issue-1', publicationId: 'issue-1', season: 1, careerPhase: 'Player' };
  const article = {
    id: 'article-1',
    mediaAssetId: 'asset-1',
    headline: 'Bearcats win behind quarterback play',
    dek: 'Cincinnati controlled the game.',
    imageSceneOverride: 'pocket-action',
  };
  const asset = {
    id: 'asset-1',
    fileName: 'cincinnati-qb-action.jpg',
    careerFolder: 'college',
    photoType: 'action',
    teamTag: 'Cincinnati',
    conferenceTag: 'Big 12',
    sceneTag: 'pocket-action',
    generatedFrom: { publicationId: 'issue-1', articleId: 'article-1' },
  };

  const report = buildNewsroomPhotoQaReport({ state, issue, article, asset });
  assert.equal(report.canApprove, true);
  assert.equal(report.failures.length, 0);
  assert.equal(report.expectedConference, 'Big 12');
  assert.ok(report.passes.some((entry) => entry.id === 'conference-tag'));
  assert.ok(report.passes.some((entry) => entry.id === 'scene-tag'));
});

test('photo QA blocks a wrong conference tag after save-specific realignment', () => {
  const state = {
    currentSeason: 4,
    player: { college: 'Cincinnati' },
    newsroomMediaSettings: {
      conferenceOverrides: {
        cincinnati: { team: 'Cincinnati', conference: 'SEC', effectiveSeason: 3 },
      },
    },
  };
  const issue = { id: 'issue-4', season: 4, careerPhase: 'Player' };
  const article = { id: 'article-4', mediaAssetId: 'asset-4', headline: 'Conference opener', dek: 'A new league era begins.' };
  const asset = {
    id: 'asset-4',
    careerFolder: 'college',
    photoType: 'action',
    teamTag: 'Cincinnati',
    conferenceTag: 'Big 12',
  };

  const report = buildNewsroomPhotoQaReport({ state, issue, article, asset });
  assert.equal(report.expectedConference, 'SEC');
  assert.equal(report.canApprove, false);
  assert.ok(report.failures.some((entry) => entry.id === 'conference-tag'));
});

test('manual folder and scene reuse are warnings rather than approval blockers', () => {
  const state = {
    currentSeason: 1,
    player: { college: 'Cincinnati' },
    newsroomMediaSettings: { conferenceOverrides: {} },
  };
  const issue = { id: 'issue-1', season: 1, careerPhase: 'Player' };
  const article = {
    id: 'article-1',
    mediaAssetId: 'asset-1',
    headline: 'Pregame tunnel feature',
    dek: 'The Bearcats prepare for kickoff.',
    imageSceneOverride: 'tunnel',
  };
  const asset = {
    id: 'asset-1',
    careerFolder: 'high-school',
    photoType: 'action',
    teamTag: 'Cincinnati',
    conferenceTag: 'Big 12',
    sceneTag: 'sideline',
  };

  const report = buildNewsroomPhotoQaReport({ state, issue, article, asset });
  assert.equal(report.canApprove, true);
  assert.equal(report.failures.length, 0);
  assert.ok(report.warnings.some((entry) => entry.id === 'career-folder'));
  assert.ok(report.warnings.some((entry) => entry.id === 'scene-tag'));
});

test('a previously approved asset becomes Needs Review when a hard identity mismatch appears', () => {
  const state = {
    currentSeason: 4,
    player: { college: 'Cincinnati' },
    newsroomMediaSettings: {
      conferenceOverrides: {
        cincinnati: { team: 'Cincinnati', conference: 'SEC', effectiveSeason: 3 },
      },
    },
  };
  const issue = { id: 'issue-4', season: 4, careerPhase: 'Player' };
  const article = {
    id: 'article-4',
    mediaAssetId: 'asset-4',
    mediaQaAssetId: 'asset-4',
    mediaQaStatus: NEWSROOM_PHOTO_QA_STATUSES.APPROVED,
    mediaQaChecklist: NEWSROOM_PHOTO_VISUAL_CHECKS.map((entry) => entry.id),
    headline: 'New conference era',
    dek: 'Cincinnati is now in the SEC in this dynasty.',
  };
  const asset = {
    id: 'asset-4',
    careerFolder: 'college',
    photoType: 'action',
    teamTag: 'Cincinnati',
    conferenceTag: 'Big 12',
  };

  const report = buildNewsroomPhotoQaReport({ state, issue, article, asset });
  assert.equal(report.status, NEWSROOM_PHOTO_QA_STATUSES.NEEDS_REVIEW);
  assert.equal(report.canApprove, false);
  assert.ok(report.failures.some((entry) => entry.id === 'conference-tag'));
});

test('approval is stored against the exact asset and visual checklist', () => {
  const checklist = NEWSROOM_PHOTO_VISUAL_CHECKS.map((entry) => entry.id);
  const issues = [{
    id: 'issue-1',
    articles: [{ id: 'article-1', mediaAssetId: 'asset-1', mediaQaStatus: 'unreviewed' }],
  }];

  const next = setNewsroomPhotoQaDecision({
    issues,
    publicationId: 'issue-1',
    articleId: 'article-1',
    assetId: 'asset-1',
    status: NEWSROOM_PHOTO_QA_STATUSES.APPROVED,
    checklist,
    approvedAt: '2026-08-25T20:00:00.000Z',
  });
  const article = next[0].articles[0];
  assert.equal(article.mediaQaStatus, 'approved');
  assert.equal(article.mediaQaAssetId, 'asset-1');
  assert.equal(article.mediaQaApprovedAt, '2026-08-25T20:00:00.000Z');
  assert.deepEqual(article.mediaQaChecklist, checklist);
});
