import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_GEMINI_RETRY_WAIT_MS,
  parseGeminiRetryDelayMs,
} from '../../api/synthesize-podcast-conversation.js';

test('Gemini podcast retry parser honors a minute-long retry window', () => {
  const retryMs = parseGeminiRetryDelayMs({
    message: 'Quota exceeded. Please retry in 59.297981963s.',
  });

  assert.equal(retryMs, 59298);
  assert.ok(retryMs > 30000);
  assert.ok(retryMs < MAX_GEMINI_RETRY_WAIT_MS);
});

test('Gemini podcast retry parser respects Retry-After headers up to the safe ceiling', () => {
  const response = {
    headers: {
      get(name) {
        return String(name).toLowerCase() === 'retry-after' ? '60' : null;
      },
    },
  };

  assert.equal(parseGeminiRetryDelayMs({ response }), 60000);
  assert.equal(
    parseGeminiRetryDelayMs({ message: 'Please retry in 120s.' }),
    MAX_GEMINI_RETRY_WAIT_MS,
  );
});
