import test from 'node:test';
import assert from 'node:assert/strict';
import { editorialPacketSanity } from './editorialPacketSanity.js';

test('editorial packet sanity reports evidence counts', () => {
  assert.deepEqual(editorialPacketSanity({ publicationId: 'x', opponent: 'Baylor', score: '21-45', playerStats: [1, 2], scoringSummary: [1], officialMedia: { captured: true } }), {
    publicationId: 'x', hasGame: true, coverageFacts: 2, scoringFacts: 1, officialMediaCaptured: true,
  });
});
