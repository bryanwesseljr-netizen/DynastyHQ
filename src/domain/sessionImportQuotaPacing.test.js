import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const queueUrl = new URL('../services/freeVisionQuotaQueue.js', import.meta.url);
const routerUrl = new URL('../services/sessionScreenshotRouterClient.js', import.meta.url);
const gameUrl = new URL('../services/screenshotClient.js', import.meta.url);
const rtgUrl = new URL('../services/rtgStatusScannerClient.js', import.meta.url);
const coverageUrl = new URL('../services/coverageReferenceClient.js', import.meta.url);

test('Session Import shares one paced free-vision queue with bounded quota and transient retries', async () => {
  const [queue, router, game, rtg, coverage] = await Promise.all([
    readFile(queueUrl, 'utf8'),
    readFile(routerUrl, 'utf8'),
    readFile(gameUrl, 'utf8'),
    readFile(rtgUrl, 'utf8'),
    readFile(coverageUrl, 'utf8'),
  ]);

  assert.match(queue, /const REQUEST_SPACING_MS = 4300/);
  assert.match(queue, /const DEFAULT_QUOTA_COOLDOWN_MS = 65000/);
  assert.match(queue, /const TRANSIENT_COOLDOWN_MS = 9000/);
  assert.match(queue, /MAX_QUOTA_RETRIES = 2/);
  assert.match(queue, /MAX_TRANSIENT_RETRIES = 1/);
  assert.match(queue, /TRANSIENT_STATUSES = new Set\(\[502, 503, 504\]\)/);
  assert.match(queue, /response\.status === 429/);
  assert.match(queue, /temporary-provider-failure/);
  assert.match(queue, /dynastyhq:free-vision-wait/);

  for (const source of [router, game, rtg, coverage]) {
    assert.match(source, /postFreeVisionJson/);
  }
});
