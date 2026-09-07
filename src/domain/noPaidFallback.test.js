import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('paid vision fallback is opt-in and disabled by default', () => {
  const preference = read('../services/visionFallbackPreference.js');
  const router = read('../server/visionRouter.js');

  assert.match(preference, /getItem\(STORAGE_KEY\) === 'enabled'/);
  assert.match(preference, /if \(!storageAvailable\(\)\) return false/);
  assert.match(router, /allowPaidFallback = false/);
  assert.match(router, /if \(!allowPaidFallback\)/);
  assert.match(router, /paidFallbackBlocked: true/);
});

test('all active screenshot clients send the explicit paid-fallback preference', () => {
  const screenshotClient = read('../services/screenshotClient.js');
  const coverageClient = read('../services/coverageReferenceClient.js');
  const rtgClient = read('../services/rtgStatusScannerClient.js');

  [screenshotClient, coverageClient, rtgClient].forEach((source) => {
    assert.match(source, /readPaidVisionFallbackEnabled/);
    assert.match(source, /allowPaidFallback/);
  });
});

test('server endpoints require strict true before OpenAI fallback can run', () => {
  const screenshotEndpoint = read('../../api/analyze-screenshot.js');
  const sharedEndpoint = read('../../api/analyze-coverage-reference.js');
  const legacyRtgEndpoint = read('../../api/analyze-rtg-status.js');

  assert.match(screenshotEndpoint, /allowPaidFallback: allowPaidFallback === true/);
  assert.match(sharedEndpoint, /allowPaidFallback: body\.allowPaidFallback === true/);
  assert.doesNotMatch(legacyRtgEndpoint, /new OpenAI\(/);
  assert.match(legacyRtgEndpoint, /scanKind: 'rtg'/);
  assert.match(legacyRtgEndpoint, /analyze-coverage-reference/);
});

test('scan panel exposes the protection state and deliberate opt-in control', () => {
  const portal = read('../components/AiScanRoutingPortal.jsx');

  assert.match(portal, /No Paid Fallback · ON/);
  assert.match(portal, /OpenAI vision is blocked/);
  assert.match(portal, /Paid Fallback · ALLOWED/);
  assert.match(portal, /setPaidVisionFallbackEnabled/);
});
