import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sessionImportUrl = new URL('../components/SessionImportPortal.jsx', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);

test('Session Import uses the real Weekly Agenda nav event instead of React internals', async () => {
  const [sessionImport, owner] = await Promise.all([
    readFile(sessionImportUrl, 'utf8'),
    readFile(ownerUrl, 'utf8'),
  ]);

  assert.match(sessionImport, /findDataEntryButton/);
  assert.match(sessionImport, /weekly agenda/i);
  assert.match(sessionImport, /window\.__dhqAllowLegacyGameHubOnce = true/);
  assert.match(sessionImport, /button\.click\(\)/);
  assert.doesNotMatch(sessionImport, /__reactProps\$/);
  assert.doesNotMatch(sessionImport, /invokeReactOnClick/);
  assert.doesNotMatch(owner, /VerifiedScannerHandoffPortal/);
});

test('Session Import requires the actual data-entry workspace and image scanner', async () => {
  const sessionImport = await readFile(sessionImportUrl, 'utf8');

  assert.match(sessionImport, /main\.dhq-page-main\[data-active-tab="dataEntry"\]/);
  assert.match(sessionImport, /\.dhq-weekly-agenda-workspace/);
  assert.match(sessionImport, /input\[type="file"\]\[accept\*="image"\]/);
  assert.match(sessionImport, /choose weekly screenshots/i);
});

test('Session Import retries data-entry navigation until the verified scanner mounts', async () => {
  const sessionImport = await readFile(sessionImportUrl, 'utf8');

  assert.match(sessionImport, /waitForScannerInput = \(timeoutMs = 12000\)/);
  assert.match(sessionImport, /requestDataEntryWorkspace\(\)/);
  assert.match(sessionImport, /now - lastNavigationAttempt >= 300/);
  assert.match(sessionImport, /const input = await waitForScannerInput\(\)/);
  assert.match(sessionImport, /input\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/);
});
