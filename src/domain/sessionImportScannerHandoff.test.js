import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sessionImportUrl = new URL('../components/SessionImportPortal.jsx', import.meta.url);
const routingPortalUrl = new URL('../components/SessionImportRoutingPortal.jsx', import.meta.url);
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

test('Session Import requires the actual data-entry workspace but not a legacy scanner input as transport', async () => {
  const sessionImport = await readFile(sessionImportUrl, 'utf8');

  assert.match(sessionImport, /main\.dhq-page-main\[data-active-tab="dataEntry"\]/);
  assert.match(sessionImport, /\.dhq-weekly-agenda-workspace/);
  assert.match(sessionImport, /waitForDataEntryWorkspace/);
  assert.match(sessionImport, /waitForSessionRouter/);
  assert.match(sessionImport, /dynastyhq:session-import-files/);
  assert.doesNotMatch(sessionImport, /findScannerInput/);
  assert.doesNotMatch(sessionImport, /choose weekly screenshots/i);
});

test('Session Import retries data-entry navigation until the workspace mounts, then hands the untouched batch and guided lanes to the router', async () => {
  const sessionImport = await readFile(sessionImportUrl, 'utf8');

  assert.match(sessionImport, /waitForDataEntryWorkspace = \(timeoutMs = 12000\)/);
  assert.match(sessionImport, /requestDataEntryWorkspace\(\)/);
  assert.match(sessionImport, /now - lastNavigationAttempt >= 300/);
  assert.match(sessionImport, /await waitForDataEntryWorkspace\(\)/);
  assert.match(sessionImport, /files: \[\.\.\.files\]/);
  assert.match(sessionImport, /guidedAssignments/);
  assert.doesNotMatch(sessionImport, /new DataTransfer\(\)/);
});

test('routing portal becomes the only owner that distributes Session Import files to specialized inputs', async () => {
  const routingPortal = await readFile(routingPortalUrl, 'utf8');

  assert.match(routingPortal, /window\.__dhqSessionRouterReady = true/);
  assert.match(routingPortal, /window\.addEventListener\('dynastyhq:session-import-files', processBatch\)/);
  assert.match(routingPortal, /const findCollegeGameInput/);
  assert.match(routingPortal, /const findHighSchoolPostgameInput/);
});
