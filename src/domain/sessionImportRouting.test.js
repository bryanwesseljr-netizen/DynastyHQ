import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routingPortalUrl = new URL('../components/SessionImportRoutingPortal.jsx', import.meta.url);
const ownerEnhancementsUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const routingClientUrl = new URL('../services/sessionScreenshotRouterClient.js', import.meta.url);

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

test('Session Import routes RTG, coverage and game screenshots without silently dropping uncertain screens', async () => {
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

test('session screenshot router reuses the existing free-first endpoint and recognizes all three lanes', async () => {
  const source = await readFile(routingClientUrl, 'utf8');

  assert.match(source, /fetch\('\/api\/analyze-coverage-reference'/);
  assert.match(source, /scanKind: 'coverage'/);
  assert.match(source, /scanKind: 'rtg'/);
  assert.match(source, /coverageType === 'scoring_summary'/);
  assert.match(source, /coverageType === 'team_stats'/);
  assert.match(source, /coverageType === 'player_stats'/);
  assert.match(source, /containsTrackedPlayer \? \['game', 'coverage'\] : \['coverage'\]/);
  assert.match(source, /lanes: \['rtg'\]/);
  assert.match(source, /lanes: \['game'\]/);
  assert.match(source, /allowPaidFallback: false/);
});
