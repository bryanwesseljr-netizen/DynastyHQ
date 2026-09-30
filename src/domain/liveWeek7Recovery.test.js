import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseBestLiveWeek7RecoveryCandidate,
  prepareVerifiedWeek7RecoveryState,
  summarizeLiveWeek7RecoveryCandidate,
} from './liveWeek7Recovery.js';

const goodState = {
  currentSeason: 4,
  currentWeek: 8,
  player: { college: 'Oregon' },
  seasonSchedules: [{
    season: 4,
    entries: [
      { week: 1, opponent: 'Vanderbilt' },
      { week: 7, opponent: 'Purdue' },
      { week: 8, opponent: 'Ohio State' },
    ],
  }],
  weeklyUpdates: [
    { publicationId: 'season-4-week-1', season: 4, week: 1 },
    { publicationId: 'season-4-week-7', season: 4, week: 7 },
  ],
  gameLogs: [
    { season: 4, week: 1, opponent: 'Vanderbilt' },
  ],
  newsroomIssues: [],
  podcastEpisodes: [],
  careerChronicle: [{ publicationId: 'season-4-week-7', season: 4, week: 7 }],
  factLedger: [{ publicationId: 'season-4-week-7', key: 'game.opponent', value: 'Purdue' }],
};

test('qualifies a Vanderbilt-to-Purdue Week 7 recovery candidate', () => {
  const candidate = summarizeLiveWeek7RecoveryCandidate({
    id: 'checkpoint-season-4-week-7',
    state: {
      ...goodState,
      _checkpoint: { immutable: true, season: 4, week: 7 },
    },
  });

  assert.equal(candidate.qualifies, true);
  assert.equal(candidate.week1Opponent, 'Vanderbilt');
  assert.equal(candidate.week7Opponent, 'Purdue');
  assert.equal(candidate.latestContentWeek, 7);
  assert.equal(candidate.exactCheckpoint, true);
  assert.equal(candidate.immutableCheckpoint, true);
});

test('rejects the corrupted Ohio State Week 1 timeline', () => {
  const corrupted = structuredClone(goodState);
  corrupted.seasonSchedules[0].entries[0].opponent = 'Ohio State';
  const candidate = summarizeLiveWeek7RecoveryCandidate({ id: 'main', state: corrupted });
  assert.equal(candidate.qualifies, false);
});

test('prefers the immutable exact Week 7 checkpoint over weaker backups', () => {
  const backup = summarizeLiveWeek7RecoveryCandidate({
    id: 'before-season4-week7-postgame-repair-123',
    state: goodState,
  });
  const checkpoint = summarizeLiveWeek7RecoveryCandidate({
    id: 'checkpoint-season-4-week-7',
    state: { ...goodState, _checkpoint: { immutable: true, season: 4, week: 7 } },
  });

  const best = chooseBestLiveWeek7RecoveryCandidate([backup, checkpoint]);
  assert.equal(best.id, 'checkpoint-season-4-week-7');
});


test('recovery strips failed Week 8 publication fragments but keeps the career at Week 8', () => {
  const dirty = structuredClone(goodState);
  dirty.weeklyUpdates.push({ publicationId: 'season-4-week-8', season: 4, week: 8, status: 'published' });
  dirty.gameLogs.push({ season: 4, week: 8, opponent: 'Ohio State', result: 'L' });
  dirty.newsroomIssues.push({ publicationId: 'season-4-week-8', season: 4, week: 8 });
  dirty.podcastEpisodes.push({ publicationId: 'season-4-week-8', season: 4, week: 8 });
  dirty.careerChronicle.push({ publicationId: 'season-4-week-8', season: 4, week: 8 });
  dirty.factLedger.push({ publicationId: 'season-4-week-8', season: 4, week: 8, key: 'game.opponent', value: 'Ohio State' });
  dirty.postgameFrontPages = [{ publicationId: 'season-4-week-8', season: 4, week: 8 }];
  dirty.eaSportsNetworkArticles = [{ publicationId: 'season-4-week-8', season: 4, week: 8 }];
  dirty.coverageReferences = [{ publicationId: 'season-4-week-8', season: 4, week: 8 }];
  dirty.weekFinalizations = [{ publicationId: 'season-4-week-8', season: 4, week: 8 }];
  dirty.weeklyAgendaDraft = { season: 4, week: 8, savedAt: 'now' };

  const clean = prepareVerifiedWeek7RecoveryState(dirty);
  const summary = summarizeLiveWeek7RecoveryCandidate({ id: 'checkpoint-season-4-week-8', state: clean });

  assert.equal(clean.currentSeason, 4);
  assert.equal(clean.currentWeek, 8);
  assert.equal(clean.weeklyAgendaDraft, null);
  assert.equal(summary.latestContentWeek, 7);
  assert.equal(clean.weeklyUpdates.some((entry) => entry.week === 8), false);
  assert.equal(clean.gameLogs.some((entry) => entry.week === 8), false);
  assert.equal(clean.newsroomIssues.some((entry) => entry.week === 8), false);
  assert.equal(clean.podcastEpisodes.some((entry) => entry.week === 8), false);
  assert.equal(clean.careerChronicle.some((entry) => entry.week === 8), false);
  assert.equal(clean.factLedger.some((entry) => entry.week === 8), false);
  assert.equal(clean.postgameFrontPages.length, 0);
  assert.equal(clean.eaSportsNetworkArticles.length, 0);
  assert.equal(clean.coverageReferences.length, 0);
  assert.equal(clean.weekFinalizations.length, 0);
  assert.equal(clean.seasonSchedules[0].entries.find((entry) => entry.week === 8).opponent, 'Ohio State');
});
