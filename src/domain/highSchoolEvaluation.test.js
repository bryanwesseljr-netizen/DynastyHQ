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
      { objectives: [{ text: 'Complete the drive', result: 'passed' }, { text: 'Throw a touchdown', result: 'passed' }] },
      { objectives: [{ text: 'Complete the pass', result: 'passed' }, { text: 'Gain 20 yards', result: 'failed' }] },
      { objectives: [{ result: 'failed' }, { result: 'failed' }] },
      { type: 'scholarship', scholarshipSchool: 'Toledo', objectives: [{ text: 'Lead a touchdown drive', result: 'passed' }] },
    ],
  });
  assert.equal(evaluation.moments.length, 4);
  assert.deepEqual(summarizeHighSchoolMoments(evaluation), {
    success: 2, partial: 1, failed: 1, completed: 4, tapeScoreDelta: 450, starDelta: 1,
  });
  assert.deepEqual(validateHighSchoolEvaluation(evaluation), []);
  assert.equal(evaluation.moments[1].result, 'partial');
  assert.equal(evaluation.moments[3].result, 'success');
  assert.equal(evaluation.moments[3].objectives.length, 2);
});

test('keeps the older single-objective moment format compatible', () => {
  const evaluation = normalizeHighSchoolEvaluation({
    moments: [
      { result: 'success', objective: 'Legacy visible objective' },
      { result: 'partial' },
      { result: 'failed' },
      { result: 'success' },
    ],
  });
  assert.equal(evaluation.moments[0].objectives[0].text, 'Legacy visible objective');
  assert.equal(evaluation.moments[1].result, 'partial');
});

test('requires a school for a Scholarship Challenge and never allows a partial challenge result', () => {
  const evaluation = normalizeHighSchoolEvaluation({
    tapeScoreAfter: 500,
    recruitStarsAfter: 3,
    moments: [
      { type: 'scholarship', result: 'partial' },
      ...Array.from({ length: 3 }, () => ({ result: 'success' })),
    ],
  });
  assert.equal(evaluation.moments[0].result, '');
  assert.match(validateHighSchoolEvaluation(evaluation).join(' '), /objective results|Scholarship Challenge/);
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
    moments: [
      { objectives: [{ text: 'Complete the pass', result: 'passed' }, { text: 'Avoid a turnover', result: 'passed' }] },
      { objectives: [{ result: 'passed' }, { result: 'failed' }] },
      { objectives: [{ result: 'passed' }, { result: 'passed' }] },
      { type: 'scholarship', scholarshipSchool: 'Toledo', objectives: [{ text: 'Convert third down', result: 'failed' }] },
    ],
  }, 'season-1-week-1');
  assert.equal(facts.some((entry) => entry.key === 'recruiting.profile.tapeScore' && entry.value === 640), true);
  assert.equal(facts.filter((entry) => /^highSchool\.moment\.\d\.result$/.test(entry.key)).length, 4);
  assert.equal(facts.some((entry) => entry.key === 'highSchool.moment.4.scholarshipSchool' && entry.value === 'Toledo'), true);
  assert.equal(facts.some((entry) => entry.key === 'highSchool.moment.1.objective.2.result' && entry.value === 'passed'), true);
  assert.equal(facts.some((entry) => /points|scoreEarned/.test(entry.key)), false);
});
