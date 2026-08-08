import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPostgameFrontPageTextPatch,
  buildPostgameFrontPage,
  createPostgameFrontPageTextDraft,
  markPostgameFrontPageStale,
  updatePostgameFrontPage,
  upsertPostgameFrontPage,
} from './postgameFrontPage.js';

const state = {
  player: { name: 'Test Player', school: 'Test University', pos: 'QB', number: 2, headshot: 'player.jpg' },
  gameLogs: [{ season: 2, week: 1, opponent: 'Test State', result: 'W', homeScore: 31, awayScore: 21, passYds: 250, passTD: 2, rushYds: 60, rushTD: 1, int: 0 }],
  weeklyUpdates: [{ publicationId: 'season-2-week-1', season: 2, week: 1, game: { opponent: 'Test State', result: 'W', homeScore: 31, awayScore: 21, passYds: 250, passTD: 2, rushYds: 60, rushTD: 1, int: 0 } }],
  newsroomIssues: [{
    publicationId: 'season-2-week-1', season: 2, week: 1, careerPhase: 'Player',
    articles: [
      { outletName: 'Test City Herald', headline: 'Test Player leads the way', dek: 'A verified win.', paragraphs: ['The first verified paragraph is long enough for a newspaper story.', 'The second verified paragraph carries the player statistics.'], citedFactKeys: ['game.result'], mediaAssetId: 'game-photo' },
      { outletName: 'Regional Report', paragraphs: ['Regional lead.', 'Regional stats.', 'The regional comparison is grounded in the weekly record.'], citedFactKeys: ['game.passYds'] },
    ],
  }],
  postgameFrontPages: [],
};

test('builds a printable front page from a published game and verified newsroom copy', () => {
  const page = buildPostgameFrontPage({ state, publicationId: 'season-2-week-1', generatedAt: '2026-09-01T12:00:00.000Z' });
  assert.equal(page.masthead, 'Test City Herald');
  assert.equal(page.gamePhotoAssetId, 'game-photo');
  assert.equal(page.score.teamScore, 31);
  assert.match(page.player.statLine, /250 PASS YDS/);
  assert.equal(page.teammates.length, 2);
  assert.equal(page.needsRegeneration, false);
});

test('preserves edits and photo choices while regenerating corrected story facts', () => {
  let next = upsertPostgameFrontPage(state, buildPostgameFrontPage({ state, publicationId: 'season-2-week-1' }));
  next = updatePostgameFrontPage(next, 'season-2-week-1', { headline: 'My custom headline', photoCredit: 'Family photo' });
  next.postgameFrontPages = markPostgameFrontPageStale(next.postgameFrontPages, 'season-2-week-1', '2026-09-02T12:00:00.000Z');
  assert.equal(next.postgameFrontPages[0].needsRegeneration, true);
  const regenerated = buildPostgameFrontPage({ state: next, publicationId: 'season-2-week-1', generatedAt: '2026-09-03T12:00:00.000Z' });
  assert.equal(regenerated.headline, 'My custom headline');
  assert.equal(regenerated.photoCredit, 'Family photo');
  assert.equal(regenerated.needsRegeneration, false);
});

test('keeps front-page typing in a draft until one explicit save patch is built', () => {
  const page = {
    headline: 'Original headline',
    subheadline: 'Original deck',
    teammates: [
      { id: 'teammate-1', name: '', position: '', statLine: '', headshotAssetId: 'headshot-1' },
      { id: 'teammate-2', name: '', position: '', statLine: '', headshotAssetId: '' },
    ],
  };
  const draft = createPostgameFrontPageTextDraft(page);

  draft.teammates[0].name = 'Jordan';
  draft.teammates[0].position = 'WR';
  draft.teammates[0].statLine = '7 REC · 112 YDS · 2 TD';

  assert.equal(page.teammates[0].name, '');
  const patch = buildPostgameFrontPageTextPatch(page, draft);
  assert.equal(patch.teammates[0].name, 'Jordan');
  assert.equal(patch.teammates[0].headshotAssetId, 'headshot-1');
  assert.equal(patch.teammates[0].statLine, '7 REC · 112 YDS · 2 TD');
});
