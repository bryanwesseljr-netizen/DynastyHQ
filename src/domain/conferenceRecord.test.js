import test from 'node:test';
import assert from 'node:assert/strict';
import {
  conferenceRecordForSeason,
  inferConferenceGame,
  resolveConferenceGame,
} from './conferenceRecord.js';
import { normalizeWeekSetup } from './weekSetup.js';

const base = {
  currentSeason: 1,
  currentWeek: 4,
  player: { college: 'Oregon', school: 'Oregon' },
  gameLogs: [],
  weeklyUpdates: [],
};

test('conference matchups are inferred from the saved school and opponent', () => {
  assert.equal(inferConferenceGame(base, 'Michigan State'), true);
  assert.equal(inferConferenceGame(base, 'Boise State'), false);

  const setup = normalizeWeekSetup({ week: 4, type: 'game', opponent: 'Michigan State' }, base);
  assert.equal(setup.isConferenceGame, true);
  assert.equal(setup.conferenceName, 'Big Ten');
  assert.equal(setup.opponentConference, 'Big Ten');
});

test('manual conference override wins over automatic detection', () => {
  const setup = normalizeWeekSetup({
    week: 4,
    type: 'game',
    opponent: 'Boise State',
    conferenceGameOverride: 'conference',
  }, base);
  assert.equal(setup.isConferenceGame, true);
  assert.equal(setup.conferenceGameSource, 'manual');
  assert.equal(resolveConferenceGame(base, setup), true);
});

test('conference record counts team results even when the tracked player did not appear', () => {
  const state = {
    ...base,
    gameLogs: [
      { season: 1, week: 1, opponent: 'Michigan State', result: 'W', didPlay: false },
      { season: 1, week: 2, opponent: 'Ohio State', result: 'L', didPlay: true },
      { season: 1, week: 3, opponent: 'Boise State', result: 'W', didPlay: false },
    ],
  };
  const record = conferenceRecordForSeason(state, 1);
  assert.deepEqual(record, { wins: 1, losses: 1, games: 2, conference: 'Big Ten' });
});
