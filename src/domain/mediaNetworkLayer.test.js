import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMediaNetworkLayer } from './mediaNetworkLayer.js';

test('media network keeps official in-game coverage separate from DynastyHQ editorial media', () => {
  const state = {
    currentSeason: 2,
    currentWeek: 3,
    gameLogs: [{ season: 2, week: 2, opponent: 'Baylor', result: 'L', homeScore: 21, awayScore: 45 }],
    officialCoverage: [{ season: 2, week: 2, publicationId: 'season-2-week-2', headline: 'Baylor powers past Oregon', summary: 'Official in-game recap.' }],
    newsroomIssues: [{
      season: 2,
      week: 2,
      publicationId: 'season-2-week-2',
      articles: [{ outletId: 'local', headline: 'Oregon Week 2: The Reality Check', dek: 'DynastyHQ analysis.' }],
    }],
    podcastEpisodes: [{ season: 2, week: 2, publicationId: 'season-2-week-2', title: 'Oregon Week 2: The Reality Check', status: 'published', audioStatus: 'ready', audioSource: 'notebooklm' }],
  };

  const model = buildMediaNetworkLayer(state, { season: 2, week: 2 });
  assert.equal(model.official.status, 'captured');
  assert.equal(model.official.headline, 'Baylor powers past Oregon');
  assert.equal(model.dynasty.headline, 'Oregon Week 2: The Reality Check');
  assert.equal(model.dynasty.podcastReady, true);
  assert.equal(model.dynasty.finishedPodcast, true);
  assert.ok(model.ticker.some((item) => item.source === 'EA SPORTS NETWORK'));
  assert.ok(model.ticker.some((item) => item.source === 'DYNASTYHQ'));
});

test('legacy official evidence stays available as archive metadata but never becomes a ticker headline', () => {
  const state = {
    currentSeason: 2,
    currentWeek: 2,
    weeklyUpdates: [{ season: 2, week: 2, publicationId: 'season-2-week-2', sourceCount: 9, game: { opponent: 'Baylor', result: 'L', homeScore: 21, awayScore: 45 } }],
    coverageReferences: [{ publicationId: 'season-2-week-2', season: 2, week: 2, factCount: 23 }],
  };

  const model = buildMediaNetworkLayer(state, { season: 2, week: 2 });
  assert.equal(model.official.status, 'legacy-evidence');
  assert.equal(model.official.factCount, 23);
  assert.equal(model.official.headline, '');
  assert.equal(model.ticker.some((item) => item.source === 'EA SPORTS NETWORK'), false);
  assert.equal(model.ticker.some((item) => /verified official-coverage facts preserved/i.test(item.text)), false);
});
