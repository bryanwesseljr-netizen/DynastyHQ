import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const telemetryUrl = new URL('../services/sessionImportTelemetry.js', import.meta.url);
const gameClientUrl = new URL('../services/screenshotClient.js', import.meta.url);
const coverageClientUrl = new URL('../services/coverageReferenceClient.js', import.meta.url);
const rtgClientUrl = new URL('../services/rtgStatusScannerClient.js', import.meta.url);
const coveragePortalUrl = new URL('../components/CoverageDataIntakePortal.jsx', import.meta.url);
const rtgPortalUrl = new URL('../components/RtgStatusIntakePortal.jsx', import.meta.url);
const auditPortalUrl = new URL('../components/SessionImportAuditPortal.jsx', import.meta.url);
const routingPortalUrl = new URL('../components/SessionImportRoutingPortal.jsx', import.meta.url);

test('Session Import analyzers report a per-file lane result for success and failure', async () => {
  const [telemetry, gameClient, coverageClient, rtgClient] = await Promise.all([
    readFile(telemetryUrl, 'utf8'),
    readFile(gameClientUrl, 'utf8'),
    readFile(coverageClientUrl, 'utf8'),
    readFile(rtgClientUrl, 'utf8'),
  ]);

  assert.match(telemetry, /dynastyhq:session-lane-result/);
  assert.match(telemetry, /factCount/);
  assert.match(telemetry, /status === 'failed' \? 'failed' : 'analyzed'/);
  assert.match(gameClient, /lane: 'game'/);
  assert.match(gameClient, /status: 'failed'/);
  assert.match(gameClient, /status: 'analyzed'/);
  assert.match(coverageClient, /lane: 'coverage'/);
  assert.match(rtgClient, /lane: 'rtg'/);
});

test('Coverage and RTG scanners continue the batch when one screenshot fails', async () => {
  const [coveragePortal, rtgPortal] = await Promise.all([
    readFile(coveragePortalUrl, 'utf8'),
    readFile(rtgPortalUrl, 'utf8'),
  ]);

  assert.match(coveragePortal, /for \(let index = 0; index < files\.length; index \+= 1\)/);
  assert.match(coveragePortal, /failedCount \+= 1/);
  assert.match(coveragePortal, /successful screenshots were kept/);
  assert.match(rtgPortal, /for \(let index = 0; index < files\.length; index \+= 1\)/);
  assert.match(rtgPortal, /failedCount \+= 1/);
  assert.match(rtgPortal, /successful RTG reads were kept/);
});

test('Session Import receipt distinguishes received, classified, analyzed, failed and unclassified files', async () => {
  const audit = await readFile(auditPortalUrl, 'utf8');

  assert.match(audit, /Session Import processing receipt/);
  assert.match(audit, /Received means the file reached DynastyHQ/);
  assert.match(audit, /Classified means the router identified its lane/);
  assert.match(audit, /Analyzed means that lane actually returned a usable response/);
  assert.match(audit, /\['Received', receipt\.total\]/);
  assert.match(audit, /\['Classified', receipt\.classified\]/);
  assert.match(audit, /\['Analyzed', receipt\.analyzed\]/);
  assert.match(audit, /\['Failed', receipt\.failed\]/);
  assert.match(audit, /\['Unclassified', receipt\.unclassified\]/);
  assert.match(audit, /dynastyhq:session-lane-result/);
  assert.match(audit, /Game Data fallback/);
  assert.match(audit, /Nothing below is applied to your career until you approve/);
});

test('each new Session Import batch clears processing telemetry before routing starts', async () => {
  const routing = await readFile(routingPortalUrl, 'utf8');

  assert.match(routing, /import \{ resetSessionImportTelemetry \}/);
  assert.match(routing, /resetSessionImportTelemetry\(\)/);
  assert.match(routing, /dynastyhq:session-routing-start/);
});
