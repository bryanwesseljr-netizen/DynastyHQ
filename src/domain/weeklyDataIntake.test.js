import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const intakeUrl = new URL('../components/WeeklyDataIntakePortal.jsx', import.meta.url);
const rtgUrl = new URL('../components/RtgStatusIntakePortal.jsx', import.meta.url);
const coverageUrl = new URL('../components/CoverageDataIntakePortal.jsx', import.meta.url);
const reviewUrl = new URL('../components/WeeklyReviewPanel.jsx', import.meta.url);
const scannerApiUrl = new URL('../../api/analyze-coverage-reference.js', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const stylesUrl = new URL('../weekly-data-intake.css', import.meta.url);

test('college Weekly Agenda presents game, RTG, coverage, and official EA media as one ordered intake', async () => {
  const intake = await readFile(intakeUrl, 'utf8');
  const game = intake.indexOf('title="Game Data"');
  const rtg = intake.indexOf('title="RTG Status"');
  const coverage = intake.indexOf('title="Coverage Data"');
  const official = intake.indexOf('title="EA SPORTS Network"');

  assert.ok(game >= 0, 'Game Data lane should exist');
  assert.ok(rtg > game, 'RTG Status should follow Game Data');
  assert.ok(coverage > rtg, 'Coverage Data should follow RTG Status');
  assert.ok(official > coverage, 'EA SPORTS Network should follow Coverage Data');
  assert.match(intake, /Weekly Data Intake/);
  assert.match(intake, /Immediately after the game/);
  assert.match(intake, /Skip this lane when nothing changed/);
  assert.match(intake, /before generating weekly media/);
  assert.match(intake, /badge=\{coverageSaved \? 'Added' : 'Optional'\}/);
  assert.match(intake, /Upload EA SPORTS Network Article/);
  assert.match(intake, /officialCoverageForWeek/);
  assert.match(intake, /officialCoverageCandidateFromAnalysis/);
  assert.match(intake, /suppressAnalysisEvent: true/);
});

test('Game Data keeps screenshots and menu video separate while using the verified scanner', async () => {
  const intake = await readFile(intakeUrl, 'utf8');

  assert.match(intake, /findUniversalScannerInput/);
  assert.match(intake, /input\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/);
  assert.match(intake, /Upload Screens/);
  assert.match(intake, /Menu Video/);
  assert.match(intake, /extractMenuVideoFrames/);
  assert.match(intake, /slice\(0, MAX_SCREENSHOTS\)/);
  assert.doesNotMatch(intake, /Upload All Weekly Screenshots/i);
});

test('RTG Status uses its dedicated analyzer and records which weekly intake it updated', async () => {
  const rtg = await readFile(rtgUrl, 'utf8');

  assert.match(rtg, /analyzeRtgStatusScreenshot/);
  assert.match(rtg, /Apply Verified RTG Facts/);
  assert.match(rtg, /dynastyhq:rtg-status-save/);
  assert.doesNotMatch(rtg, /runTransaction/);
  assert.doesNotMatch(rtg, /transaction\.set\(/);
  assert.doesNotMatch(rtg, /hq_data['"],\s*['"]main/);
  assert.match(rtg, /publicationId: work\.publicationId/);
  assert.match(rtg, /season: work\.season/);
  assert.match(rtg, /week: work\.week/);
  assert.match(rtg, /#dhq-weekly-rtg-data-host/);
});

test('Coverage Data stays editorial-only and mounts inside its numbered lane', async () => {
  const coverage = await readFile(coverageUrl, 'utf8');

  assert.match(coverage, /analyzeCoverageReference/);
  assert.match(coverage, /dynastyhq:coverage-data-save/);
  assert.match(coverage, /Newsroom and Podcast can use them; your schedule, game history, RTG stats, and career totals are preserved/);
  assert.match(coverage, /never write into your player stat line/);
  assert.match(coverage, /#dhq-weekly-coverage-data-host/);
});

test('owner workflow uses intake-specific scanners and retires the scattered top-level cards', async () => {
  const [owner, styles] = await Promise.all([
    readFile(ownerUrl, 'utf8'),
    readFile(stylesUrl, 'utf8'),
  ]);

  assert.match(owner, /<WeeklyDataIntakePortal \/>/);
  assert.match(owner, /<RtgStatusIntakePortal \/>/);
  assert.match(owner, /<CoverageDataIntakePortal \/>/);
  assert.doesNotMatch(owner, /<RtgStatusScannerPortal \/>/);
  assert.doesNotMatch(owner, /<CoverageReferencesPortal \/>/);
  assert.match(styles, /dhq-weekly-data-intake-active[\s\S]*dhq-agenda-v3-import-card/);
  assert.match(styles, /dhq-weekly-data-intake-active[\s\S]*dhq-agenda-v3-tools-card/);
  assert.match(styles, /dhq-weekly-data-intake-active[\s\S]*dhq-agenda-v3-rtg-row/);
});


test('official article uploads use the game/article scanner without entering the Game Data review stream', async () => {
  const [intake, scanner] = await Promise.all([
    readFile(intakeUrl, 'utf8'),
    readFile(new URL('../services/screenshotClient.js', import.meta.url), 'utf8'),
  ]);

  assert.match(intake, /MAX_OFFICIAL_ARTICLE_SCREENSHOTS/);
  assert.match(intake, /compressImage\(file, 2000, 0\.88\)/);
  assert.match(intake, /careerPhase: 'Player'/);
  assert.match(scanner, /suppressAnalysisEvent = false/);
  assert.match(scanner, /typeof window !== 'undefined' && !suppressAnalysisEvent/);
  assert.match(scanner, /dynastyhq:official-coverage-captured/);
});


test('Game Data review makes failed screenshot analysis explicit and blocks accidental partial apply', async () => {
  const review = await readFile(reviewUrl, 'utf8');

  assert.match(review, /const failedSources = draft\.sources\.filter\(\(source\) => source\.error\)/);
  assert.match(review, /Failed scans/);
  assert.match(review, /Incomplete Game Data scan/);
  assert.match(review, /blockingCount === 0 && failedSources\.length === 0/);
  assert.match(review, /New scans automatically retry temporary provider failures/);
});


test('Coverage Data receiving scans preserve visible REC and YDS columns for every player row', async () => {
  const scanner = await readFile(scannerApiUrl, 'utf8');

  assert.match(scanner, /receivingRows/);
  assert.match(scanner, /RECEIVING TABLE GUARANTEE/);
  assert.match(scanner, /YDS means receiving yards/);
  assert.match(scanner, /\['yds', 'Receiving yards'\]/);
  assert.match(scanner, /augmentCoverageReceivingFacts/);
  assert.match(scanner, /analysis = augmentCoverageReceivingFacts\(analysis\)/);
});


test('Coverage Data cannot write the master career document independently', async () => {
  const coverage = await readFile(coverageUrl, 'utf8');
  const app = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');

  assert.doesNotMatch(coverage, /runTransaction/);
  assert.doesNotMatch(coverage, /transaction\.set\(/);
  assert.doesNotMatch(coverage, /hq_data['"],\s*['"]main/);
  assert.match(coverage, /dynastyhq:coverage-data-save/);
  assert.match(app, /dynastyhq:coverage-data-save/);
  assert.match(app, /replaceCoverageReferences\(appStateRef\.current/);
  assert.match(app, /persistCloudState/);
});


test('Coverage Data save button does not depend on a removed local Firestore db binding', async () => {
  const coverage = await readFile(coverageUrl, 'utf8');

  assert.doesNotMatch(coverage, /if \(!user \|\| !db \|\| busy\) return;/);
  assert.match(coverage, /if \(!user \|\| busy\) return;/);
  assert.match(coverage, /dynastyhq:coverage-data-save/);
});


test('RTG Status cannot independently replace the master career document', async () => {
  const rtg = await readFile(rtgUrl, 'utf8');
  const app = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');

  assert.doesNotMatch(rtg, /runTransaction/);
  assert.doesNotMatch(rtg, /transaction\.set\(/);
  assert.match(rtg, /dynastyhq:rtg-status-save/);
  assert.match(app, /dynastyhq:rtg-status-save/);
  assert.match(app, /lastStatusScan/);
  assert.match(app, /persistCloudState/);
});

test('central master save strips undefined values and reports real cloud errors', async () => {
  const app = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');

  assert.match(app, /const cloudState = stripUndefinedDeep\(\{ \.\.\.nextState \}\)/);
  assert.match(app, /dynastyhq:cloud-save-error/);
  assert.match(app, /dynastyhq:cloud-save-success/);
  assert.match(app, /publicationLocks\.delete/);
  assert.match(app, /estimatedBytes/);
});
