import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const podcastClientUrl = new URL('../services/podcastClient.js', import.meta.url);

test('short podcast transcripts automatically retry with a safer word target', async () => {
  const source = await readFile(podcastClientUrl, 'utf8');

  assert.match(source, /const MAX_SCRIPT_GENERATION_ATTEMPTS = 3;/);
  assert.match(source, /const RETRY_TARGET_MIN_WORDS = 500;/);
  assert.match(source, /const RETRY_TARGET_MAX_WORDS = 700;/);
  assert.match(source, /payloadForScriptAttempt\(payload, attempt, inspection\)/);
  assert.match(source, /podcastWordRange: \{ min, max \}/);
  assert.match(source, /body: requestPayload/);
});

test('podcast validation measures the conversation body instead of branded bookends', async () => {
  const source = await readFile(podcastClientUrl, 'utf8');

  assert.match(source, /const isShowBookend =/);
  assert.match(source, /!isShowBookend\(segment\)/);
  assert.match(source, /still incomplete after automatic repair/);
});
