import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beginCollegeCareer,
  createCoachingUniverse,
  isGraduationReady,
  updateGraduationChecklist,
} from './careerTransitions.js';

test('begins college only after commitment and preserves the high-school archive', () => {
  const state = {
    currentSeason: 1,
    currentWeek: 6,
    careerPhase: 'Player',
    player: { name: 'Test Player', school: 'Test High School', college: 'Test University', isCommitted: true },
    playerRecruiting: { highSchoolArchive: { schools: [{ name: 'Test University' }] } },
    careerChronicle: [],
  };
  const next = beginCollegeCareer(state, {
    city: 'Test City',
    state: 'Michigan',
    localOutletName: 'Test City Herald',
    regionalOutletName: 'Great Lakes Sports',
  }, '2026-09-01T12:00:00.000Z');
  assert.equal(next.currentSeason, 2);
  assert.equal(next.currentWeek, 1);
  assert.equal(next.player.school, 'Test University');
  assert.equal(next.careerStage, 'College');
  assert.equal(next.playerRecruiting.highSchoolArchive.schools.length, 1);
  assert.equal(next.careerChronicle.at(-1).type, 'college-enrollment');
  assert.equal(next.collegeNewsroom.stops[0].localOutletName, 'Test City Herald');
});

test('requires the complete graduation checklist before the RTG archive can close', () => {
  let state = { careerTransitions: {} };
  assert.equal(isGraduationReady(state), false);
  ['finalSeasonComplete', 'statsArchived', 'awardsReviewed', 'transferDecisionClosed'].forEach((field) => {
    state = updateGraduationChecklist(state, field, true);
  });
  assert.equal(isGraduationReady(state), true);
});

test('creates a clean coaching universe while preserving the player career history', () => {
  const state = {
    currentSeason: 5,
    currentWeek: 15,
    player: { name: 'Test Player', graduated: true, graduationSchool: 'Test University' },
    recruiting: [{ id: 1, name: 'Old High School Target' }],
    playerRecruiting: { transfer: { decisions: [{ decision: 'stay' }] } },
    gameLogs: [{ opponent: 'Test Opponent' }],
    careerChronicle: [{ id: 'graduation', type: 'graduation' }],
  };
  const next = createCoachingUniverse(state, '2029-01-01T12:00:00.000Z');
  assert.deepEqual(next.recruiting, []);
  assert.equal(next.gameLogs.length, 1);
  assert.equal(next.careerTransitions.coachingUniverseCreated, true);
  assert.equal(next.playerRecruiting.transfer.decisions.length, 1);
  assert.equal(next.careerChronicle.at(-1).type, 'coaching-universe');
});
