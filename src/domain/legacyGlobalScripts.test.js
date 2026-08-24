import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const indexUrl = new URL('../../index.html', import.meta.url);
const duplicateGuardUrl = new URL('../components/DuplicateGuardPortal.jsx', import.meta.url);
const dashboardUrl = new URL('../components/CareerDashboardV2.jsx', import.meta.url);
const newsroomImmersiveUrl = new URL('../../public/newsroom-immersive.js', import.meta.url);
const appUrl = new URL('../App.jsx', import.meta.url);
const playerRecruitingUrl = new URL('../components/PlayerRecruitingWorkspace.jsx', import.meta.url);

test('the app shell no longer boots redundant global repair observers or retired navigation shims', async () => {
  const [index, duplicateGuard, dashboard, newsroomImmersive, app, playerRecruiting] = await Promise.all([
    readFile(indexUrl, 'utf8'),
    readFile(duplicateGuardUrl, 'utf8'),
    readFile(dashboardUrl, 'utf8'),
    readFile(newsroomImmersiveUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(playerRecruitingUrl, 'utf8'),
  ]);

  assert.doesNotMatch(index, /\/experience-fixes\.js/);
  assert.doesNotMatch(index, /\/final-polish\.js/);
  assert.doesNotMatch(index, /\/usability-fixes\.js/);
  assert.match(index, /\/theme-toggle\.js/);
  assert.match(index, /\/newsroom-immersive\.js/);
  assert.match(index, /\/final-polish\.css/);
  assert.match(index, /\/experience-fixes\.css/);

  // Commitment cleanup now belongs to the scoped React guard.
  assert.match(duplicateGuard, /isOneTimeCommitment/);
  assert.match(duplicateGuard, /observer\.observe\(appRoot/);

  // V2 dashboard cards use the new component contract, so the retired
  // final-polish.js V1 `.dhq-dashboard-card` profile tagger is unnecessary.
  assert.match(dashboard, /className=\{`dhq-v2-card/);
  assert.doesNotMatch(dashboard, /dhq-dashboard-card/);

  // The retired usability shim only intercepted a control no longer rendered
  // by the owner app or current player recruiting workspace.
  assert.doesNotMatch(app, /Open Recruit Command Center/i);
  assert.doesNotMatch(playerRecruiting, /Open Recruit Command Center/i);

  // The remaining Newsroom compatibility observer stays inside DynastyHQ.
  assert.match(newsroomImmersive, /const appRoot = document\.getElementById\('root'\)/);
  assert.match(newsroomImmersive, /new MutationObserver\(apply\)\.observe\(appRoot/);
  assert.doesNotMatch(newsroomImmersive, /observe\(document\.documentElement/);
});
