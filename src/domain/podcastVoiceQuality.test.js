import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MARK_VOICE,
  DEFAULT_SARAH_VOICE,
  MAX_PERFORMANCE_WORDS,
  MIN_GEMINI_CALL_SPACING_MS,
  TARGET_PERFORMANCE_WORDS,
  buildPerformancePrompt,
  parseGeminiRetryDelayMs,
  partitionSegments,
} from '../../api/synthesize-podcast-conversation.js';

const words = (count, seed = 'football') => Array.from({ length: count }, (_, index) => `${seed}${index + 1}`).join(' ');

const alternatingTranscript = (turns = 18, wordsPerTurn = 50) => Array.from({ length: turns }, (_, index) => ({
  id: `turn-${index + 1}`,
  speaker: index % 2 === 0 ? 'Mark' : 'Sarah',
  text: words(wordsPerTurn, index % 2 === 0 ? 'mark' : 'sarah'),
}));

test('uses warmer podcast-oriented default voices', () => {
  assert.equal(DEFAULT_MARK_VOICE, 'Sadaltager');
  assert.equal(DEFAULT_SARAH_VOICE, 'Sulafat');
});

test('uses quota-friendly natural performance sections for a long episode', () => {
  const transcript = alternatingTranscript(18, 50);
  const chunks = partitionSegments(transcript);

  assert.ok(TARGET_PERFORMANCE_WORDS >= 280);
  assert.ok(TARGET_PERFORMANCE_WORDS < MAX_PERFORMANCE_WORDS);
  assert.equal(chunks.length, 3, `expected three render sections for a 900-word episode, received ${chunks.length}`);
  assert.deepEqual(chunks.flat().map((entry) => entry.id), transcript.map((entry) => entry.id));

  for (const chunk of chunks) {
    const wordCount = chunk.reduce((total, entry) => total + entry.text.split(/\s+/).filter(Boolean).length, 0);
    assert.ok(wordCount <= MAX_PERFORMANCE_WORDS + 40, `render section was too long: ${wordCount} words`);
    if (chunk.length > 1) {
      assert.ok(new Set(chunk.map((entry) => entry.speaker)).size >= 2, 'multi-turn render section should preserve two-host interaction');
    }
  }
});

test('performance prompt explicitly asks for human inflection, speaker switching and stable volume', () => {
  const prompt = buildPerformancePrompt({
    title: 'Week 1 Recap',
    segments: [
      { speaker: 'Mark', text: 'That fourth quarter changed the whole feel of the game.' },
      { speaker: 'Sarah', text: 'Absolutely. The numbers finally started matching the momentum.' },
    ],
    chunkIndex: 1,
    chunkCount: 3,
  });

  assert.match(prompt, /must never sound monotone or robotic/i);
  assert.match(prompt, /Switch speakers immediately at every label/i);
  assert.match(prompt, /realistic inflection/i);
  assert.match(prompt, /Do not gradually fade, whisper, muffle/i);
  assert.match(prompt, /Do not create a fade-in or fade-out/i);
  assert.doesNotMatch(prompt, /Delivery should be plain, calm/i);
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
