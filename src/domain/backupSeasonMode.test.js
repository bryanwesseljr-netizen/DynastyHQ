import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyBackupSeasonCatchUp,
  backupSeasonRange,
  isBackupRole,
} from './backupSeasonMode.js';

const state = () => ({
  careerPhase: 'Player',
  currentSeason: 3,
  currentWeek: 1,
  player: { name: 'Bryan Wessel', college: 'Oregon', school: 'Oregon', isCommitted: true },
  rtg: { rank: 'QB2', coachTrust: 1400 },
  gameLogs: [],
  weeklyUpdates: [],
  careerChronicle: [],
  newsroomIssues: [],
  podcastEpisodes: [],
  seasonSchedules: [{
    season: 3,
    school: 'Oregon',
    entries: [
      { week: 1, opponent: 'Boise State', homeAway: 'home', status: 'upcoming' },
      { week: 2, opponent: 'Michigan State', homeAway: 'away', status: 'upcoming' },
      { week: 3, opponent: 'BYE', isBye: true, status: 'bye' },
      { week: 4, opponent: 'Ohio State', homeAway: 'home', status: 'upcoming' },
      { week: 5, opponent: 'Washington', homeAway: 'away', status: 'upcoming' },
    ],
  }],
});

test('backup roles are recognized without treating QB1 as a backup', () => {
  assert.equal(isBackupRole('QB2'), true);
  assert.equal(isBackupRole('QB3'), true);
  assert.equal(isBackupRole('Backup quarterback'), true);
  assert.equal(isBackupRole('QB1'), false);
});

test('backup range spans multiple weeks without requiring weekly publishing', () => {
  const range = backupSeasonRange(state(), 5);
  assert.deepEqual(range.map((entry) => entry.week), [1, 2, 3, 4]);
  assert.equal(range[2].isBye, true);
});

test('fast-forward creates one quiet chronicle marker and no newsroom or podcast content', () => {
  const next = applyBackupSeasonCatchUp({
    state: state(),
    targetWeek: 5,
    results: [],
    now: '2026-09-20T20:00:00.000Z',
  });
  assert.equal(next.currentWeek, 5);
  assert.equal(next.careerChronicle.length, 1);
  assert.equal(next.careerChronicle[0].type, 'backup-stretch');
  assert.match(next.careerChronicle[0].title, /Weeks 1–4/);
  assert.equal(next.weeklyUpdates.length, 0);
  assert.equal(next.newsroomIssues.length, 0);
  assert.equal(next.podcastEpisodes.length, 0);
  assert.equal(next.gameLogs.length, 0);
  assert.equal(next.currentWeekSetup.opponent, 'Washington');
});

test('bulk results update the team schedule and create no-appearance game logs', () => {
  const next = applyBackupSeasonCatchUp({
    state: state(),
    targetWeek: 5,
    results: [
      { week: 1, result: 'W', teamScore: 31, opponentScore: 17 },
      { week: 2, result: 'L', teamScore: 20, opponentScore: 24 },
      { week: 4, result: 'W', teamScore: 27, opponentScore: 21 },
    ],
    now: '2026-09-20T20:00:00.000Z',
  });
  assert.equal(next.gameLogs.length, 3);
  assert.ok(next.gameLogs.every((game) => game.didPlay === false));
  assert.ok(next.gameLogs.every((game) => game.bulkBackup === true));
  assert.equal(next.seasonSchedules[0].entries.find((entry) => entry.week === 1).result, 'W');
  assert.equal(next.seasonSchedules[0].entries.find((entry) => entry.week === 2).result, 'L');
  assert.equal(next.newsroomIssues.length, 0);
});

test('fast-forward is blocked if the saved role is starter', () => {
  const starter = { ...state(), rtg: { rank: 'QB1' } };
  assert.throws(() => applyBackupSeasonCatchUp({ state: starter, targetWeek: 4 }), /only available while the saved RTG role is a backup/i);
});
