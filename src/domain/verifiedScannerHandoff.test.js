import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const handoffUrl = new URL('../components/VerifiedScannerHandoffPortal.jsx', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);

test('Session Import has a direct legacy scanner handoff guard', async () => {
  const [handoff, owner] = await Promise.all([
    readFile(handoffUrl, 'utf8'),
    readFile(ownerUrl, 'utf8'),
  ]);

  assert.match(owner, /VerifiedScannerHandoffPortal/);
  assert.match(handoff, /dhq-session-import\.is-analyzing/);
  assert.match(handoff, /\.dhq-primary-nav button, #mobile-primary-navigation button/);
  assert.match(handoff, /\^game hub\$/i);
  assert.match(handoff, /window\.__dhqAllowLegacyGameHubOnce = true/);
  assert.match(handoff, /button\.click\(\)/);
  assert.match(handoff, /choose weekly screenshots/i);
});

test('scanner handoff retries until the verified scanner mounts', async () => {
  const handoff = await readFile(handoffUrl, 'utf8');

  assert.match(handoff, /attempts >= 24/);
  assert.match(handoff, /window\.setTimeout\(ensureScanner/);
  assert.match(handoff, /findVerifiedScannerInput\(\)/);
});
