import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const intakeUrl = new URL('../components/WeeklyDataIntakePortal.jsx', import.meta.url);
const rtgUrl = new URL('../components/RtgStatusIntakePortal.jsx', import.meta.url);
const coverageUrl = new URL('../components/CoverageDataIntakePortal.jsx', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const stylesUrl = new URL('../weekly-data-intake.css', import.meta.url);

test('college Weekly Agenda presents game, RTG, and coverage data as one ordered intake', async () => {
  const intake = await readFile(intakeUrl, 'utf8');
  const game = intake.indexOf('title="Game Data"');
  const rtg = intake.indexOf('title="RTG Status"');
  const coverage = intake.indexOf('title="Coverage Data"');

  assert.ok(game >= 0, 'Game Data lane should exist');
  assert.ok(rtg > game, 'RTG Status should follow Game Data');
  assert.ok(coverage > rtg, 'Coverage Data should follow RTG Status');
  assert.match(intake, /Weekly Data Intake/);
  assert.match(intake, /Immediately after the game/);
  assert.match(intake, /Skip this lane when nothing changed/);
  assert.match(intake, /before generating weekly media/);
  assert.match(intake, /badge=\{coverageSaved \? 'Added' : 'Optional'\}/);
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
  assert.match(rtg, /lastStatusScan/);
  assert.match(rtg, /publicationId: work\.publicationId/);
  assert.match(rtg, /season: work\.season/);
  assert.match(rtg, /week: work\.week/);
  assert.match(rtg, /#dhq-weekly-rtg-data-host/);
});

test('Coverage Data stays editorial-only and mounts inside its numbered lane', async () => {
  const coverage = await readFile(coverageUrl, 'utf8');

  assert.match(coverage, /analyzeCoverageReference/);
  assert.match(coverage, /replaceCoverageReferences/);
  assert.match(coverage, /Newsroom and Podcast can use them; your RTG stats and career totals cannot/);
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
