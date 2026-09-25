import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeNavigationTarget } from './navigationBus.js';

test('canonical navigation target aliases stay stable', () => {
  assert.equal(normalizeNavigationTarget('Home'), 'dashboard');
  assert.equal(normalizeNavigationTarget('Game Hub'), 'gameHub');
  assert.equal(normalizeNavigationTarget('Verified Tools'), 'importSession');
  assert.equal(normalizeNavigationTarget('Career'), 'career');
  assert.equal(normalizeNavigationTarget('Offseason War Room'), 'offseason');
  assert.equal(normalizeNavigationTarget('The Newsroom'), 'newsroom');
});

test('Home and immersive surfaces use navigation requests instead of synthetic nav clicks', async () => {
  const [dashboard, immersive, mobile] = await Promise.all([
    readFile(new URL('../components/BroadcastDashboard.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/ImmersiveExperienceV3Portal.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/MobileBroadcastNavPortal.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(dashboard, /requestNavigation\(target\)/);
  assert.doesNotMatch(dashboard, /gameHubButton\.click\(\)/);
  assert.match(immersive, /requestNavigation\('career'\)/);
  assert.match(immersive, /requestNavigation\('newsroom'\)/);
  assert.match(mobile, /requestNavigation\(item\.id\)/);
});

test('portal-owned routes listen to the canonical navigation event', async () => {
  const [gameHub, career, offseason, app] = await Promise.all([
    readFile(new URL('../components/GameHubPortal.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/CareerOverviewPortal.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/PlayerOffseasonNavigationPortal.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../App.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(gameHub, /target === 'gameHub'/);
  assert.match(career, /target === 'career'/);
  assert.match(offseason, /target === 'offseason'/);
  assert.match(app, /target === 'gameHub' \|\| target === 'career' \|\| target === 'offseason'/);
  assert.match(app, /target === 'agenda' \|\| target === 'importSession' \|\| target === 'dataEntry'/);
});
