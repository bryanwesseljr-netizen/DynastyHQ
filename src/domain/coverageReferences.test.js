import assert from 'node:assert/strict';
import test from 'node:test';
import { coverageReferenceFor } from './coverageReferences.js';

test('coverageReferenceFor is safe before career state finishes loading', () => {
  assert.equal(coverageReferenceFor(null, 'season-2-week-3'), null);
  assert.equal(coverageReferenceFor(undefined, 'season-2-week-3'), null);
});

test('coverageReferenceFor returns the matching publication when available', () => {
  const reference = { publicationId: 'season-2-week-3', factCount: 4 };
  assert.deepEqual(
    coverageReferenceFor({ coverageReferences: [reference] }, 'season-2-week-3'),
    reference,
  );
});
