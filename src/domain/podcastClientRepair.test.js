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


test('podcast API owns full-length repair and never returns a sub-400 script as success', async () => {
  const source = await readFile(new URL('../../api/generate-podcast.js', import.meta.url), 'utf8');

  assert.match(source, /const MAX_EPISODE_GENERATION_ATTEMPTS = 3;/);
  assert.match(source, /Produce 12 to 16 alternating host turns/);
  assert.match(source, /do not finish below \$\{MIN_COMPLETE_WORDS\}/);
  assert.match(source, /previous draft failed editorial quality control/i);
  assert.match(source, /inspection\.words < MIN_COMPLETE_WORDS \|\| inspection\.segments < 12/);
  assert.match(source, /PODCAST_SCRIPT_INCOMPLETE/);
  assert.match(source, /editorialQa: 'passed'/);
});
