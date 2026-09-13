import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sessionImportUrl = new URL('../components/SessionImportPortal.jsx', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);

test('Session Import bypasses capture listeners by invoking the React-owned Game Hub handler', async () => {
  const [sessionImport, owner] = await Promise.all([
    readFile(sessionImportUrl, 'utf8'),
    readFile(ownerUrl, 'utf8'),
  ]);

  assert.match(sessionImport, /findReactOwnedGameHubButton/);
  assert.match(sessionImport, /Object\.getOwnPropertyNames\(button\)/);
  assert.match(sessionImport, /key\.startsWith\('__reactProps\$'\)/);
  assert.match(sessionImport, /onClick\(\)/);
  assert.match(sessionImport, /openVerifiedScannerDirectly/);
  assert.doesNotMatch(owner, /VerifiedScannerHandoffPortal/);
});

test('Session Import waits for the real verified scanner before dispatching files', async () => {
  const sessionImport = await readFile(sessionImportUrl, 'utf8');

  assert.match(sessionImport, /waitForScannerInput = \(timeoutMs = 12000\)/);
  assert.match(sessionImport, /const input = await waitForScannerInput\(\)/);
  assert.match(sessionImport, /input\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/);
  assert.match(sessionImport, /if \(invokeReactOnClick\(button\)\) return true/);
});
