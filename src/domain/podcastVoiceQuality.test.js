import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MARK_VOICE,
  DEFAULT_SARAH_VOICE,
  FALLBACK_MODEL,
  MAX_PERFORMANCE_WORDS,
  MIN_GEMINI_CALL_SPACING_MS,
  SINGLE_RENDER_MAX_WORDS,
  TARGET_PERFORMANCE_WORDS,
  TWO_RENDER_MAX_WORDS,
  buildPerformancePrompt,
  geminiQuotaIds,
  isDailyGeminiFreeTierQuota,
  parseGeminiRetryDelayMs,
  partitionSegments,
} from '../../api/synthesize-podcast-conversation.js';

const words = (count, seed = 'football') => Array.from({ length: count }, (_, index) => `${seed}${index + 1}`).join(' ');

const alternatingTranscript = (turns = 18, wordsPerTurn = 50) => Array.from({ length: turns }, (_, index) => ({
  id: `turn-${index + 1}`,
  speaker: index % 2 === 0 ? 'Mark' : 'Sarah',
  text: words(wordsPerTurn, index % 2 === 0 ? 'mark' : 'sarah'),
}));

const assertPreserved = (transcript, chunks) => {
  assert.deepEqual(chunks.flat().map((entry) => entry.id), transcript.map((entry) => entry.id));
  for (const chunk of chunks) {
    const wordCount = chunk.reduce((total, entry) => total + entry.text.split(/\s+/).filter(Boolean).length, 0);
    assert.ok(wordCount <= MAX_PERFORMANCE_WORDS, `render section was too long: ${wordCount} words`);
    if (chunk.length > 1) {
      assert.ok(new Set(chunk.map((entry) => entry.speaker)).size >= 2, 'multi-turn render section should preserve two-host interaction');
    }
  }
};

test('keeps the established podcast host voices and a separate free-tier TTS fallback', () => {
  assert.equal(DEFAULT_MARK_VOICE, 'Sadaltager');
  assert.equal(DEFAULT_SARAH_VOICE, 'Sulafat');
  assert.equal(FALLBACK_MODEL, 'gemini-2.5-flash-preview-tts');
});

test('uses as few stable render sections as episode length allows', () => {
  assert.ok(TARGET_PERFORMANCE_WORDS < MAX_PERFORMANCE_WORDS);
  assert.equal(SINGLE_RENDER_MAX_WORDS, MAX_PERFORMANCE_WORDS);
  assert.ok(TWO_RENDER_MAX_WORDS > SINGLE_RENDER_MAX_WORDS);

  const shortEpisode = alternatingTranscript(10, 50);
  const mediumEpisode = alternatingTranscript(14, 50);
  const longEpisode = alternatingTranscript(18, 50);

  const shortChunks = partitionSegments(shortEpisode);
  const mediumChunks = partitionSegments(mediumEpisode);
  const longChunks = partitionSegments(longEpisode);

  assert.equal(shortChunks.length, 1, 'a 500-word weekly show should stay in one continuous render');
  assert.equal(mediumChunks.length, 2, 'a 700-word show should use two balanced renders');
  assert.equal(longChunks.length, 3, 'a 900-word show should use three balanced renders');

  assertPreserved(shortEpisode, shortChunks);
  assertPreserved(mediumEpisode, mediumChunks);
  assertPreserved(longEpisode, longChunks);
});

test('performance prompt anchors voices while preserving natural human texture', () => {
  const prompt = buildPerformancePrompt({
    title: 'Week 1 Recap',
    segments: [
      { speaker: 'Mark', text: 'That fourth quarter changed the whole feel of the game.' },
      { speaker: 'Sarah', text: 'Yeah... and the offense never really found an answer after that.' },
    ],
    chunkIndex: 1,
    chunkCount: 2,
  });

  assert.match(prompt, /Lock each host's identity/i);
  assert.match(prompt, /same apparent age, pitch range, accent, timbre and vocal weight/i);
  assert.match(prompt, /consistent conversational microphone distance and perceived loudness/i);
  assert.match(prompt, /Small human texture is good when it happens naturally/i);
  assert.match(prompt, /Do not force these quirks/i);
  assert.match(prompt, /tight handoffs/i);
  assert.match(prompt, /Do not fade in or fade out/i);
  assert.doesNotMatch(prompt, /force emotion onto every sentence.*force emotion onto every sentence/i);
});

test('paces chunked Gemini TTS calls below the free-tier burst ceiling', () => {
  assert.ok(MIN_GEMINI_CALL_SPACING_MS >= 6000);
});

test('honors Gemini quota retry hints from headers, RetryInfo, and error text', () => {
  assert.equal(parseGeminiRetryDelayMs({
    response: { headers: { get: (name) => name === 'retry-after' ? '12' : null } },
  }), 12_000);

  assert.equal(parseGeminiRetryDelayMs({
    body: {
      error: {
        details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '18.25s' }],
      },
    },
  }), 18_250);

  assert.equal(parseGeminiRetryDelayMs({
    message: 'Quota exceeded. Please retry in 18.261147622s.',
  }), 18_262);
});

test('distinguishes the daily free-tier TTS cap from a temporary retry window', () => {
  const body = {
    error: {
      details: [{
        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
        violations: [{
          quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests',
          quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
          quotaDimensions: { location: 'global', model: 'gemini-3.1-flash-tts' },
          quotaValue: '10',
        }],
      }],
    },
  };

  assert.deepEqual(geminiQuotaIds(body), ['GenerateRequestsPerDayPerProjectPerModel-FreeTier']);
  assert.equal(isDailyGeminiFreeTierQuota(body), true);
  assert.equal(isDailyGeminiFreeTierQuota({ error: { details: [] } }), false);
});