import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const indexUrl = new URL('../../index.html', import.meta.url);
const duplicateGuardUrl = new URL('../components/DuplicateGuardPortal.jsx', import.meta.url);
const dashboardUrl = new URL('../components/CareerDashboardV2.jsx', import.meta.url);

test('the app shell no longer boots redundant global repair observers', async () => {
  const [index, duplicateGuard, dashboard] = await Promise.all([
    readFile(indexUrl, 'utf8'),
    readFile(duplicateGuardUrl, 'utf8'),
    readFile(dashboardUrl, 'utf8'),
  ]);

  assert.doesNotMatch(index, /\/experience-fixes\.js/);
  assert.doesNotMatch(index, /\/final-polish\.js/);
  assert.match(index, /\/final-polish\.css/);
  assert.match(index, /\/experience-fixes\.css/);

  // Commitment cleanup now belongs to the scoped React guard.
  assert.match(duplicateGuard, /isOneTimeCommitment/);
  assert.match(duplicateGuard, /observer\.observe\(appRoot/);

  // V2 dashboard cards use the new component contract, so the retired
  // final-polish.js V1 `.dhq-dashboard-card` profile tagger is unnecessary.
  assert.match(dashboard, /className=\{`dhq-v2-card/);
  assert.doesNotMatch(dashboard, /dhq-dashboard-card/);
});
