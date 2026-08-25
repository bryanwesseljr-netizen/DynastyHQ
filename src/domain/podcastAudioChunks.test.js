import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIRESTORE_AUDIO_DATA_MAX_CHARS,
  chunkPodcastAudioForStorage,
  reassemblePodcastAudioFromStorage,
} from './podcastAudioChunks.js';

test('splits oversized continuous podcast audio below the Firestore-safe data ceiling and restores it exactly', () => {
  const originalData = 'QUJD'.repeat(300_000);
  const stored = chunkPodcastAudioForStorage([{
    index: 0,
    data: originalData,
    mimeType: 'audio/mpeg',
    hostId: 'mark+sarah',
    continuous: true,
  }]);

  assert.ok(stored.length > 1);
  assert.ok(stored.every((entry) => entry.data.length <= FIRESTORE_AUDIO_DATA_MAX_CHARS));
  assert.ok(stored.every((entry) => entry.data.length < 1_048_487));
  assert.deepEqual(stored.map((entry) => entry.chunkIndex), stored.map((_, index) => index));
  assert.ok(stored.every((entry) => entry.segmentIndex === 0));
  assert.ok(stored.every((entry) => entry.continuous === true));

  const restored = reassemblePodcastAudioFromStorage(stored);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].data, originalData);
  assert.equal(restored[0].mimeType, 'audio/mpeg');
  assert.equal(restored[0].hostId, 'mark+sarah');
  assert.equal(restored[0].continuous, true);
});

test('preserves multiple logical audio segments while chunking only the oversized ones', () => {
  const segments = [
    { index: 0, data: 'QUJD'.repeat(5), mimeType: 'audio/mpeg', hostId: 'a' },
    { index: 1, data: 'REVG'.repeat(12), mimeType: 'audio/mpeg', hostId: 'b' },
  ];
  const stored = chunkPodcastAudioForStorage(segments, 24);
  assert.ok(stored.every((entry) => entry.data.length <= 24));

  const restored = reassemblePodcastAudioFromStorage(stored);
  assert.deepEqual(restored, segments.map((segment, index) => ({ ...segment, index, continuous: false })));
});

test('keeps legacy unchunked Firestore audio documents readable', () => {
  const legacy = [
    { index: 0, data: 'AAAA', mimeType: 'audio/mpeg', hostId: 'one', continuous: false },
    { index: 1, data: 'BBBB', mimeType: 'audio/mpeg', hostId: 'two', continuous: false },
  ];
  assert.deepEqual(reassemblePodcastAudioFromStorage(legacy), legacy);
});

test('uses base64-safe four-character chunk boundaries even with an odd requested limit', () => {
  const stored = chunkPodcastAudioForStorage([{ data: 'QUJD'.repeat(8) }], 11);
  assert.ok(stored.length > 1);
  assert.ok(stored.slice(0, -1).every((entry) => entry.data.length === 8));
  assert.ok(stored.every((entry) => entry.data.length % 4 === 0));
});
