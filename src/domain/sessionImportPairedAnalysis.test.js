import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rtgPortalUrl = new URL('../components/RtgStatusIntakePortal.jsx', import.meta.url);
const coveragePortalUrl = new URL('../components/CoverageDataIntakePortal.jsx', import.meta.url);
const rtgClientUrl = new URL('../services/rtgStatusScannerClient.js', import.meta.url);
const coverageClientUrl = new URL('../services/coverageReferenceClient.js', import.meta.url);
const sheetUrl = new URL('../services/sessionAnalysisContactSheet.js', import.meta.url);
const apiUrl = new URL('../../api/analyze-coverage-reference.js', import.meta.url);

test('Session Import pairs RTG and Coverage screenshots to reduce free-tier AI requests without losing original file accounting', async () => {
  const [rtgPortal, coveragePortal, rtgClient, coverageClient, sheet, api] = await Promise.all([
    readFile(rtgPortalUrl, 'utf8'),
    readFile(coveragePortalUrl, 'utf8'),
    readFile(rtgClientUrl, 'utf8'),
    readFile(coverageClientUrl, 'utf8'),
    readFile(sheetUrl, 'utf8'),
    readFile(apiUrl, 'utf8'),
  ]);

  assert.match(sheet, /SESSION_ANALYSIS_BATCH_SIZE = 2/);
  assert.match(sheet, /SCREEN \$\{index \+ 1\}/);
  assert.match(rtgPortal, /analyzeRtgStatusScreenshotPair/);
  assert.match(rtgPortal, /SESSION_ANALYSIS_BATCH_SIZE/);
  assert.match(coveragePortal, /analyzeCoverageReferencePair/);
  assert.match(coveragePortal, /SESSION_ANALYSIS_BATCH_SIZE/);
  assert.match(rtgClient, /scanKind: 'rtg_batch'/);
  assert.match(coverageClient, /scanKind: 'coverage_batch'/);
  assert.match(rtgClient, /reportSessionLaneResult\(\{ fileName/);
  assert.match(coverageClient, /reportSessionLaneResult\(\{ fileName/);
  assert.match(api, /cfb27_rtg_status_batch_analysis/);
  assert.match(api, /cfb_coverage_reference_batch_analysis/);
  assert.match(api, /Never mix facts, names, values, evidence, or screen types between panels/);
});
