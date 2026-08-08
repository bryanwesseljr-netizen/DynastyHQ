import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createEmptyHighSchoolEvaluation,
  highSchoolEvaluationFacts,
  normalizeHighSchoolEvaluation,
  summarizeHighSchoolMoments,
  validateHighSchoolEvaluation,
} from './highSchoolEvaluation.js';

test('models four objective moments and derives only verified snapshot movement', () => {
  const evaluation = normalizeHighSchoolEvaluation({
    gameNumber: 2,
    tapeScoreBefore: 900,
    tapeScoreAfter: 1350,
    recruitStarsBefore: 3,
    recruitStarsAfter: 4,
    moments: [
      { result: 'success', objective: 'Complete the drive objective' },
      { result: 'partial', objective: 'Complete both highlight objectives' },
      { result: 'failed' },
      { result: 'success' },
    ],
  });
  assert.equal(evaluation.moments.length, 4);
  assert.deepEqual(summarizeHighSchoolMoments(evaluation), {
    success: 2, partial: 1, failed: 1, completed: 4, tapeScoreDelta: 450, starDelta: 1,
  });
  assert.deepEqual(validateHighSchoolEvaluation(evaluation), []);
});

test('requires four outcomes and game-displayed Tape Score and star rating', () => {
  const empty = createEmptyHighSchoolEvaluation();
  assert.equal(validateHighSchoolEvaluation(empty).length, 2);
});

test('creates grounded facts without assigning invented score values to moments', () => {
  const facts = highSchoolEvaluationFacts({
    gameNumber: 1,
    tapeScoreBefore: 0,
    tapeScoreAfter: 640,
    recruitStarsBefore: 3,
    recruitStarsAfter: 3,
    moments: Array.from({ length: 4 }, (_, index) => ({ id: index + 1, result: index === 3 ? 'failed' : 'success' })),
  }, 'season-1-week-1');
  assert.equal(facts.some((entry) => entry.key === 'recruiting.profile.tapeScore' && entry.value === 640), true);
  assert.equal(facts.filter((entry) => entry.key.includes('.result')).length, 4);
  assert.equal(facts.some((entry) => /points|scoreEarned/.test(entry.key)), false);
});
