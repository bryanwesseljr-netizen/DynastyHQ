import test from 'node:test';
import assert from 'node:assert/strict';
import { dedupeCareerMilestones, findExistingCommitment } from './careerDataHygiene.js';

test('keeps only the newest duplicate commitment to the same institution', () => {
  const entries = [
    { id: 'old', type: 'commitment', institution: 'Cincinnati', season: 1, week: 5, title: 'Bryan Wessel commits to Cincinnati' },
    { id: 'new', type: 'commitment', institution: 'Cincinnati', season: 1, week: 6, title: 'Bryan Wessel commits to Cincinnati' },
  ];
  const result = dedupeCareerMilestones(entries);
  assert.deepEqual(result.map((entry) => entry.id), ['new']);
  assert.equal(findExistingCommitment(entries, 'Cincinnati')?.id, 'new');
});

test('collapses an exact same-week duplicate while preserving legitimate recurring awards', () => {
  const entries = [
    { id: 's1w4-a', type: 'award', season: 1, week: 4, title: 'Conference Player of the Week' },
    { id: 's1w4-b', type: 'award', season: 1, week: 4, title: 'Conference Player of the Week' },
    { id: 's1w5', type: 'award', season: 1, week: 5, title: 'Conference Player of the Week' },
    { id: 's2w4', type: 'award', season: 2, week: 4, title: 'Conference Player of the Week' },
  ];
  const result = dedupeCareerMilestones(entries);
  assert.deepEqual(result.map((entry) => entry.id), ['s1w4-b', 's1w5', 's2w4']);
});
