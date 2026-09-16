import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeSeasonSchedule,
  nextScheduledGame,
  normalizeScheduleEntry,
  scheduleWeekSetup,
  syncScheduleWithCareer,
  teamRecordForSeason,
  upsertSeasonSchedule,
} from './seasonSchedule.js';

test('team record includes schedule results for games the tracked player did not play', () => {
  const state = {
    currentSeason: 1,
    currentWeek: 3,
    seasonSchedules: [{
      season: 1,
      school: 'Baylor',
      entries: [
        { week: 1, opponent: 'SMU', status: 'completed', result: 'W', teamScore: 31, opponentScore: 17 },
        { week: 2, opponent: 'Oregon', status: 'completed', result: 'L', teamScore: 21, opponentScore: 45 },
        { week: 3, opponent: 'TCU', status: 'upcoming' },
      ],
    }],
    gameLogs: [
      { season: 1, week: 2, opponent: 'Oregon', result: 'L', homeScore: 21, awayScore: 45, didPlay: true },
    ],
  };

  assert.deepEqual(teamRecordForSeason(state), { wins: 1, losses: 1, games: 2, source: 'schedule' });
  assert.equal(nextScheduledGame(state)?.opponent, 'TCU');
  assert.equal(scheduleWeekSetup(state)?.opponent, 'TCU');
});

test('published game data updates the matching schedule row without erasing schedule-only results', () => {
  const state = {
    currentSeason: 1,
    gameLogs: [{ season: 1, week: 2, opponent: 'Oregon', result: 'W', homeScore: 45, awayScore: 21, didPlay: true }],
  };
  const schedule = {
    season: 1,
    entries: [
      { week: 1, opponent: 'SMU', result: 'W', teamScore: 24, opponentScore: 10, status: 'completed' },
      { week: 2, opponent: 'Oregon', status: 'upcoming' },
    ],
  };
  const synced = syncScheduleWithCareer(state, schedule);
  assert.equal(synced.entries[0].result, 'W');
  assert.equal(synced.entries[1].result, 'W');
  assert.equal(synced.entries[1].teamScore, 45);
  assert.equal(synced.entries[1].opponentScore, 21);
});

test('multiple schedule screenshots merge by week and preserve known finals', () => {
  const first = mergeSeasonSchedule(null, {
    season: 2,
    entries: [
      { week: 1, opponent: 'Utah', result: 'W', teamScore: 28, opponentScore: 17, status: 'completed' },
      { week: 2, opponent: 'Kansas State', status: 'upcoming' },
    ],
  }, 2);
  const merged = mergeSeasonSchedule(first, {
    season: 2,
    entries: [
      { week: 2, opponent: 'Kansas State', homeAway: 'away', status: 'upcoming' },
      { week: 3, opponent: 'BYE', isBye: true, status: 'bye' },
    ],
  }, 2);
  assert.equal(merged.entries.length, 3);
  assert.equal(merged.entries[0].result, 'W');
  assert.equal(merged.entries[1].homeAway, 'away');
  assert.equal(merged.entries[2].isBye, true);
});

test('schedule setup identifies a current bye without skipping to the next opponent', () => {
  const state = {
    currentSeason: 1,
    currentWeek: 3,
    seasonSchedules: [{
      season: 1,
      entries: [
        { week: 3, opponent: 'BYE', isBye: true, status: 'bye' },
        { week: 4, opponent: 'Iowa State', status: 'upcoming' },
      ],
    }],
  };
  const setup = scheduleWeekSetup(state);
  assert.equal(setup.week, 3);
  assert.equal(setup.type, 'bye');
  assert.equal(setup.opponent, '');
  assert.equal(nextScheduledGame(state)?.opponent, 'Iowa State');
});

test('Week 0 is preserved when the game schedule explicitly includes it', () => {
  const entry = normalizeScheduleEntry({ week: 0, opponent: 'Colorado', status: 'upcoming' }, 7);
  assert.equal(entry.week, 0);
  assert.equal(entry.opponent, 'Colorado');
});

test('upsert keeps schedules separated by season', () => {
  const initial = { currentSeason: 2, seasonSchedules: [{ season: 1, entries: [{ week: 1, opponent: 'Old' }] }] };
  const next = upsertSeasonSchedule(initial, { season: 2, entries: [{ week: 1, opponent: 'New' }] });
  assert.equal(next.seasonSchedules.length, 2);
  assert.equal(next.seasonSchedules.find((entry) => entry.season === 1).entries[0].opponent, 'Old');
  assert.equal(next.seasonSchedules.find((entry) => entry.season === 2).entries[0].opponent, 'New');
});
