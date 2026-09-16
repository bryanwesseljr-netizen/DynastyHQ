import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { normalizeSessionRoute } from '../services/sessionScreenshotRouterClient.js';

const auditUrl = new URL('../components/SessionImportAuditPortal.jsx', import.meta.url);
const rtgUrl = new URL('../components/RtgStatusIntakePortal.jsx', import.meta.url);
const coverageUrl = new URL('../components/CoverageDataIntakePortal.jsx', import.meta.url);
const routingUrl = new URL('../components/SessionImportRoutingPortal.jsx', import.meta.url);

test('Session Import enforces deterministic lanes for known CFB27 screen types', () => {
  assert.deepEqual(normalizeSessionRoute({ screenType: 'scoring_summary', lanes: ['game'] }).lanes, ['coverage']);
  assert.deepEqual(normalizeSessionRoute({ screenType: 'ea_network_article', lanes: ['game'] }).lanes, ['coverage']);
  assert.deepEqual(normalizeSessionRoute({ screenType: 'team_stats', lanes: ['coverage'] }).lanes, ['game']);
  assert.deepEqual(normalizeSessionRoute({ screenType: 'rtg_fitness', lanes: ['game'] }).lanes, ['rtg']);
  assert.deepEqual(normalizeSessionRoute({ screenType: 'player_stats', lanes: ['game'] }).lanes, ['game', 'coverage']);
  assert.deepEqual(normalizeSessionRoute({ screenType: 'player_stats', lanes: ['coverage'] }).lanes, ['coverage']);
  assert.deepEqual(normalizeSessionRoute({ screenType: 'unknown', lanes: ['game', 'coverage'] }).lanes, []);
});

test('Session Import Verify mounts live RTG and Coverage review surfaces inside the visible postgame review', async () => {
  const [audit, rtg, coverage] = await Promise.all([
    readFile(auditUrl, 'utf8'),
    readFile(rtgUrl, 'utf8'),
    readFile(coverageUrl, 'utf8'),
  ]);

  assert.match(audit, /data-session-import-rtg-review-host/);
  assert.match(audit, /data-session-import-coverage-review-host/);
  assert.match(rtg, /querySelector\('\[data-session-import-rtg-review-host\]'\)/);
  assert.match(coverage, /querySelector\('\[data-session-import-coverage-review-host\]'\)/);
});

test('Session Import router keeps enough resolution for small RTG labels', async () => {
  const routing = await readFile(routingUrl, 'utf8');
  assert.match(routing, /compressImage\(file, 1800, 0\.84\)/);
});
