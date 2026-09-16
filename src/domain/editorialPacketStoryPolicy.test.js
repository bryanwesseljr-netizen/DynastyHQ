import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSupportedNarrativeClaims, unsupportedNarrativeClaims } from './editorialPacketStoryPolicy.js';

test('story policy rejects unsupported rally language without scoring evidence', () => {
  const packet = { scoringSummary: [] };
  assert.deepEqual(unsupportedNarrativeClaims(packet, 'Oregon rally falls short'), ['rally']);
  assert.throws(() => assertSupportedNarrativeClaims(packet, 'Oregon rally falls short'), /Unsupported game-flow language/);
});

test('story policy allows rally language when scoring sequence exists', () => {
  const packet = { scoringSummary: [{ value: 'TD' }, { value: 'FG' }] };
  assert.equal(assertSupportedNarrativeClaims(packet, 'Oregon rally falls short'), true);
});
