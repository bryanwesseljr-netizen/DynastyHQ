import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseBestLiveWeek7RecoveryCandidate,
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
