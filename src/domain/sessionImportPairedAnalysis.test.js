import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rtgPortalUrl = new URL('../components/RtgStatusIntakePortal.jsx', import.meta.url);
const coveragePortalUrl = new URL('../components/CoverageDataIntakePortal.jsx', import.meta.url);
const rtgClientUrl = new URL('../services/rtgStatusScannerClient.js', import.meta.url);
const coverageClientUrl = new URL('../services/coverageReferenceClient.js', import.meta.url);
const sheetUrl = new URL('../services/sessionAnalysisContactSheet.js', import.meta.url);
const apiUrl = new URL('../../api/analyze-coverage-reference.js', import.meta.url);

test('Session Import pairs RTG screenshots but analyzes Coverage screenshots individually for reliability', async () => {
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
  assert.match(rtgClient, /scanKind: 'rtg_batch'/);
  assert.match(rtgClient, /reportSessionLaneResult\(\{ fileName/);

  assert.match(coveragePortal, /analyzeCoverageReference/);
  assert.doesNotMatch(coveragePortal, /analyzeCoverageReferencePair/);
  assert.doesNotMatch(coveragePortal, /buildSessionAnalysisContactSheet/);
  assert.match(coveragePortal, /MAX_REFERENCE_SCREENSHOTS = 30/);
  assert.match(coveragePortal, /Retrying Coverage screenshot/);
  assert.match(coveragePortal, /compressImage\(file, rescue \? 2600 : 2200, rescue \? 0\.94 : 0\.9\)/);
  assert.match(coveragePortal, /Coverage cannot be saved until every screenshot passes/);

  // Reliability rule: RTG may stay paired after passing the real-session test, while
  // Coverage deliberately keeps one screenshot per analysis and retains paired support only
  // as an inactive capability for future experiments.
  assert.match(coverageClient, /scanKind: 'coverage_batch'/);
  assert.match(api, /cfb27_rtg_status_batch_analysis/);
  assert.match(api, /cfb_coverage_reference_batch_analysis/);
  assert.match(api, /Never mix facts, names, values, evidence, or screen types between panels/);
});
