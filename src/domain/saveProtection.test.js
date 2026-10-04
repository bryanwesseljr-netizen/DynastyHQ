import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkpointForCareerAdvance,
  detectDestructiveCareerRegression,
  publishedCareerProgress,
} from './saveProtection.js';

const base = () => ({
  weeklyUpdates: [],
  gameLogs: [],
  newsroomIssues: [],
  eaSportsNetworkArticles: [],
  podcastEpisodes: [],
  careerChronicle: [],
  factLedger: [],
});

test('published career progress uses the furthest preserved season/week archive entry', () => {
  const state = {
    ...base(),
    weeklyUpdates: [
      { season: 4, week: 1, publicationId: 'season-4-week-1' },
      { publicationId: 'season-4-week-7' },
    ],
    newsroomIssues: [{ season: 4, week: 6 }],
  };
  assert.deepEqual(publishedCareerProgress(state), { season: 4, week: 7, ordinal: 407 });
});


test('official EA Sports Network articles count as preserved published progress', () => {
  const state = {
    ...base(),
    eaSportsNetworkArticles: [{ publicationId: 'season-4-week-8', season: 4, week: 8 }],
  };

  assert.deepEqual(publishedCareerProgress(state), { season: 4, week: 8, ordinal: 408 });
});

test('stale lower-progress whole-save replacement is blocked', () => {
  const remote = {
    ...base(),
    weeklyUpdates: Array.from({ length: 7 }, (_, index) => ({ season: 4, week: index + 1 })),
    newsroomIssues: Array.from({ length: 7 }, (_, index) => ({ season: 4, week: index + 1 })),
    podcastEpisodes: Array.from({ length: 7 }, (_, index) => ({ season: 4, week: index + 1 })),
  };
  const incoming = {
    ...base(),
    weeklyUpdates: [{ season: 4, week: 1 }],
    newsroomIssues: [{ season: 4, week: 1 }],
    podcastEpisodes: [{ season: 4, week: 1 }],
  };

  const result = detectDestructiveCareerRegression(remote, incoming);
  assert.equal(result.blocked, true);
  assert.match(result.reason, /Season 4 Week 7/);
  assert.ok(result.shrunk.includes('weeklyUpdates'));
  assert.ok(result.shrunk.includes('newsroomIssues'));
  assert.ok(result.shrunk.includes('podcastEpisodes'));
});

test('normal forward progress is allowed and creates a deterministic weekly checkpoint', () => {
  const remote = {
    ...base(),
    weeklyUpdates: [{ season: 4, week: 6 }],
    newsroomIssues: [{ season: 4, week: 6 }],
  };
  const incoming = {
    ...remote,
    weeklyUpdates: [...remote.weeklyUpdates, { season: 4, week: 7 }],
    newsroomIssues: [...remote.newsroomIssues, { season: 4, week: 7 }],
  };

  assert.equal(detectDestructiveCareerRegression(remote, incoming).blocked, false);
  assert.deepEqual(checkpointForCareerAdvance(remote, incoming), {
    id: 'checkpoint-season-4-week-7',
    season: 4,
    week: 7,
  });
});

test('editing current data without shrinking archives remains allowed', () => {
  const remote = {
    ...base(),
    weeklyUpdates: [{ season: 4, week: 7, summary: 'old' }],
    newsroomIssues: [{ season: 4, week: 7, headline: 'old' }],
    podcastEpisodes: [{ season: 4, week: 7, title: 'old' }],
  };
  const incoming = {
    ...remote,
    weeklyUpdates: [{ season: 4, week: 7, summary: 'corrected' }],
  };

  assert.equal(detectDestructiveCareerRegression(remote, incoming).blocked, false);
});
