import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addTransferTarget,
  archiveHighSchoolRecruiting,
  closeTransferRecruiting,
  openTransferRecruiting,
  snapshotRecruitingChanges,
  toggleRecruitingFinalist,
  TRANSFER_STATUSES,
} from './playerRecruiting.js';

const state = () => ({
  currentSeason: 1,
  currentWeek: 6,
  player: { name: 'Test Player', school: 'Test High School', college: '', stars: 4 },
  recruiting: [
    { id: 1, name: 'Test University A', interest: 88, offered: true, customOrder: 1 },
    { id: 2, name: 'Test University B', interest: 82, offered: true, customOrder: 2 },
    { id: 3, name: 'Test University C', interest: 77, offered: true, customOrder: 3 },
    { id: 4, name: 'Test University D', interest: 70, offered: false, customOrder: 4 },
  ],
  gameLogs: Array.from({ length: 5 }, (_, index) => ({ week: index + 1, opponent: `Test Opponent ${index + 1}` })),
  playerRecruiting: {},
});

test('keeps no more than three Signing Day finalists', () => {
  let next = toggleRecruitingFinalist(state(), 1);
  next = toggleRecruitingFinalist(next, 2);
  next = toggleRecruitingFinalist(next, 3);
  next = toggleRecruitingFinalist(next, 4);
  assert.deepEqual(next.playerRecruiting.finalists, ['2', '3', '4']);
});

test('freezes the full five-game recruiting history at commitment', () => {
  let next = toggleRecruitingFinalist(state(), 1);
  next = toggleRecruitingFinalist(next, 2);
  next = toggleRecruitingFinalist(next, 3);
  next = archiveHighSchoolRecruiting(next, 'Test University A', '2026-09-01T12:00:00.000Z');
  assert.equal(next.playerRecruiting.highSchoolArchive.committedSchool, 'Test University A');
  assert.equal(next.playerRecruiting.highSchoolArchive.gamesCompleted, 5);
  assert.equal(next.playerRecruiting.highSchoolArchive.schools.length, 4);
  assert.deepEqual(next.playerRecruiting.highSchoolArchive.finalists.map((entry) => entry.name), [
    'Test University A', 'Test University B', 'Test University C',
  ]);
});

test('a closed transfer window does not change the current college', () => {
  const collegeState = {
    ...state(),
    currentSeason: 2,
    player: { ...state().player, school: 'Test University A', college: 'Test University A' },
  };
  const opened = addTransferTarget(openTransferRecruiting(collegeState), 'Test University B');
  assert.equal(opened.playerRecruiting.transfer.status, TRANSFER_STATUSES.EXPLORING);
  const stayed = closeTransferRecruiting(opened, 'stay');
  assert.equal(stayed.player.college, 'Test University A');
  assert.equal(stayed.playerRecruiting.transfer.status, TRANSFER_STATUSES.INACTIVE);
  assert.equal(stayed.playerRecruiting.transfer.decisions[0].decision, 'stay');
  assert.equal(stayed.playerRecruiting.transfer.targets.length, 0);
});

test('captures game-displayed progress and offer movement for the five-game timeline', () => {
  const changes = snapshotRecruitingChanges(
    [{ id: 1, name: 'Test University A', progressStage: 'partial', offered: false }],
    [{ id: 1, name: 'Test University A', progressStage: 'near', offered: true }],
  );
  assert.deepEqual(changes.map((entry) => entry.type), ['progress', 'offer']);
  assert.equal(changes[0].from, 'partial');
  assert.equal(changes[0].to, 'near');
});
