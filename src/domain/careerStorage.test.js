import test from 'node:test';
import assert from 'node:assert/strict';
import {
  archiveIdForEntry,
  estimatedJsonBytes,
  hydrateCareerStateFromArchives,
  SHARDED_CAREER_FIELDS,
  splitCareerStateForStorage,
  storageArchiveIds,
} from './careerStorage.js';

const state = {
  currentSeason: 4,
  currentWeek: 9,
  player: { name: 'Bryan Wessel', college: 'Oregon' },
  gameLogs: [{ season: 4, week: 8, opponent: 'Ohio State', result: 'W' }],
  weeklyUpdates: [
    { publicationId: 'season-4-week-8', season: 4, week: 8, status: 'published' },
    { publicationId: 'season-4-week-9', season: 4, week: 9, status: 'draft' },
  ],
  factLedger: [
    { id: 'f1', publicationId: 'season-4-week-8', key: 'game.opponent', value: 'Ohio State' },
    { id: 'f2', publicationId: 'season-4-week-9', key: 'game.opponent', value: 'Michigan' },
  ],
  newsroomIssues: [
    { id: 'season-4-week-8', publicationId: 'season-4-week-8', season: 4, week: 8, articles: [{ headline: 'Ohio State' }] },
  ],
  eaSportsNetworkArticles: [
    { id: 'ea8', publicationId: 'season-4-week-8', season: 4, week: 8, headline: 'Official recap' },
  ],
  podcastEpisodes: [
    { id: 'p8', publicationId: 'season-4-week-8', season: 4, week: 8, transcript: 'Long transcript' },
  ],
  careerChronicle: [
    { id: 'c8', publicationId: 'season-4-week-8', season: 4, week: 8, title: 'Week 8' },
  ],
  postgameFrontPages: [
    { publicationId: 'season-4-week-8', season: 4, week: 8, headline: 'Final' },
  ],
  coverageReferences: [
    { publicationId: 'season-4-week-9', season: 4, week: 9, factCount: 4 },
  ],
};

test('shards bulky per-week career arrays while keeping core career state in main', () => {
  const { mainState, archives } = splitCareerStateForStorage(state, '2026-09-30T18:00:00.000Z');

  assert.equal(mainState.currentSeason, 4);
  assert.equal(mainState.currentWeek, 9);
  assert.deepEqual(mainState.gameLogs, state.gameLogs);
  SHARDED_CAREER_FIELDS.forEach((field) => assert.deepEqual(mainState[field], []));
  assert.deepEqual(mainState._storage.archiveIds, ['season-4-week-8', 'season-4-week-9']);
  assert.equal(archives.length, 2);

  const week8 = archives.find((entry) => entry.archiveId === 'season-4-week-8');
  const week9 = archives.find((entry) => entry.archiveId === 'season-4-week-9');
  assert.equal(week8.weeklyUpdates.length, 1);
  assert.equal(week8.factLedger.length, 1);
  assert.equal(week8.newsroomIssues.length, 1);
  assert.equal(week8.eaSportsNetworkArticles.length, 1);
  assert.equal(week8.podcastEpisodes.length, 1);
  assert.equal(week9.weeklyUpdates.length, 1);
  assert.equal(week9.factLedger.length, 1);
  assert.equal(week9.coverageReferences.length, 1);
});

test('hydrates sharded archives back into the same application shape', () => {
  const { mainState, archives } = splitCareerStateForStorage(state);
  const hydrated = hydrateCareerStateFromArchives(mainState, archives);

  assert.deepEqual(hydrated.weeklyUpdates, state.weeklyUpdates);
  assert.deepEqual(hydrated.factLedger, state.factLedger);
  assert.deepEqual(hydrated.newsroomIssues, state.newsroomIssues);
  assert.deepEqual(hydrated.eaSportsNetworkArticles, state.eaSportsNetworkArticles);
  assert.deepEqual(hydrated.podcastEpisodes, state.podcastEpisodes);
  assert.deepEqual(hydrated.careerChronicle, state.careerChronicle);
  assert.deepEqual(hydrated.postgameFrontPages, state.postgameFrontPages);
  assert.deepEqual(hydrated.coverageReferences, state.coverageReferences);
  assert.deepEqual(hydrated.gameLogs, state.gameLogs);
});

test('derives stable archive ids from publication or season/week metadata', () => {
  assert.equal(archiveIdForEntry({ publicationId: 'season-4-week-9' }), 'season-4-week-9');
  assert.equal(archiveIdForEntry({ id: 'career-event-s4-w9-starter-123', season: 4, week: 9 }), 'season-4-week-9');
  assert.equal(archiveIdForEntry({ season: 4, week: 0 }), 'season-4-week-0');
  assert.equal(archiveIdForEntry({}), '');
});

test('storage manifest exposes archive ids and compact main is meaningfully smaller', () => {
  const inflated = {
    ...state,
    factLedger: Array.from({ length: 500 }, (_, index) => ({
      id: `f-${index}`,
      publicationId: `season-4-week-${8 + (index % 2)}`,
      season: 4,
      week: 8 + (index % 2),
      key: `program.coverage.fact.${index}`,
      value: 'x'.repeat(600),
      evidence: 'y'.repeat(200),
    })),
  };
  const { mainState } = splitCareerStateForStorage(inflated);
  assert.deepEqual(storageArchiveIds(mainState), ['season-4-week-8', 'season-4-week-9']);
  assert.ok(estimatedJsonBytes(mainState) < estimatedJsonBytes(inflated) / 4);
});
