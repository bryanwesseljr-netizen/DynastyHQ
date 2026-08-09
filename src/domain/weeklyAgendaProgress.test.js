import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createWeeklyAgendaProgress,
  getRecoverableWeeklyAgendaProgress,
} from './weeklyAgendaProgress.js';

const state = { currentSeason: 1, currentWeek: 1, careerPhase: 'Player' };

test('saves incomplete high-school agenda progress without playable moment results', () => {
  const draft = createWeeklyAgendaProgress({
    state,
    highSchoolEvaluation: { gameNumber: 1, tapeScoreBefore: 0, tapeScoreAfter: '' },
    newGame: { opponent: '' },
    savedAt: '2026-08-09T12:00:00.000Z',
  });

  assert.equal(draft.highSchoolEvaluation.moments.length, 4);
  assert.equal(draft.highSchoolEvaluation.moments.every((moment) => !moment.result), true);
  assert.equal(draft.savedAt, '2026-08-09T12:00:00.000Z');
});

test('recovers progress only for the same career phase and current week', () => {
  const draft = createWeeklyAgendaProgress({ state });

  assert.ok(getRecoverableWeeklyAgendaProgress(draft, state));
  assert.equal(getRecoverableWeeklyAgendaProgress(draft, { ...state, currentWeek: 2 }), null);
  assert.equal(getRecoverableWeeklyAgendaProgress(draft, { ...state, careerPhase: 'OC' }), null);
});
