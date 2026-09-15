import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCompletePublishedWeekEvidence } from './editorialPacketSelectors.js';

test('published week completeness requires matchup, score and team comparison evidence', () => {
  assert.equal(hasCompletePublishedWeekEvidence({ publicationId: 'x', opponent: 'Baylor', score: '21-45', evidence: { hasTeamComparison: true } }), true);
  assert.equal(hasCompletePublishedWeekEvidence({ publicationId: 'x', opponent: 'Baylor', score: '21-45', evidence: { hasTeamComparison: false } }), false);
});
