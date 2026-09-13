import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routingPortalUrl = new URL('../components/SessionImportRoutingPortal.jsx', import.meta.url);
const ownerEnhancementsUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const routeApiUrl = new URL('../../api/route-session-screenshot.js', import.meta.url);

test('Session Import routing bridge is mounted beside the existing import workspace', async () => {
  const [portalSource, ownerSource] = await Promise.all([
    readFile(routingPortalUrl, 'utf8'),
    readFile(ownerEnhancementsUrl, 'utf8'),
  ]);

  assert.match(ownerSource, /import SessionImportRoutingPortal from '\.\/SessionImportRoutingPortal\.jsx';/);
  assert.match(ownerSource, /<SessionImportPortal \/>[\s\S]*<SessionImportRoutingPortal \/>/);
  assert.match(portalSource, /choose weekly screenshots/i);
  assert.match(portalSource, /data-rtg-intake-scanner/);
  assert.match(portalSource, /data-coverage-intake-scanner/);
});

test('Session Import routes RTG, coverage and game screenshots without silently dropping unknown screens', async () => {
  const portalSource = await readFile(routingPortalUrl, 'utf8');

  assert.match(portalSource, /lanes\.has\('game'\)/);
  assert.match(portalSource, /lanes\.has\('rtg'\)/);
  assert.match(portalSource, /lanes\.has\('coverage'\)/);
  assert.match(portalSource, /unknown\.forEach/);
  assert.match(portalSource, /game\.push\(file\)/);
  assert.match(portalSource, /rtg\.push\(file\)/);
  assert.match(portalSource, /coverage\.push\(file\)/);
  assert.match(portalSource, /dispatchGameFiles\(input, groups\.game\.length \? groups\.game : files\)/);
});

test('session screenshot router recognizes game, RTG and editorial coverage screen families', async () => {
  const source = await readFile(routeApiUrl, 'utf8');

  assert.match(source, /enum: \['game', 'rtg', 'coverage'\]/);
  assert.match(source, /'player_stats'/);
  assert.match(source, /'scoring_summary'/);
  assert.match(source, /'rtg_overview'/);
  assert.match(source, /'rtg_academics'/);
  assert.match(source, /'rtg_leadership'/);
  assert.match(source, /'rtg_health'/);
  assert.match(source, /'rtg_fitness'/);
  assert.match(source, /'rtg_brand'/);
  assert.match(source, /BOTH game and coverage/);
  assert.match(source, /allowPaidFallback: false/);
});
