import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routingPortalUrl = new URL('../components/SessionImportRoutingPortal.jsx', import.meta.url);
const ownerEnhancementsUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const routingClientUrl = new URL('../services/sessionScreenshotRouterClient.js', import.meta.url);
const coverageApiUrl = new URL('../../api/analyze-coverage-reference.js', import.meta.url);

test('Session Import routing bridge is mounted beside the existing import workspace', async () => {
  const [portalSource, ownerSource] = await Promise.all([
    readFile(routingPortalUrl, 'utf8'),
    readFile(ownerEnhancementsUrl, 'utf8'),
  ]);

  assert.match(ownerSource, /import SessionImportRoutingPortal from '\.\/SessionImportRoutingPortal\.jsx';/);
  assert.match(ownerSource, /<SessionImportPortal \/>[\s\S]*<SessionImportRoutingPortal \/>/);
  assert.match(portalSource, /dynastyhq:session-import-files/);
  assert.match(portalSource, /data-rtg-intake-scanner/);
  assert.match(portalSource, /data-coverage-intake-scanner/);
});

test('Session Import no longer uses a Weekly Agenda file input as the mixed-batch transport', async () => {
  const portalSource = await readFile(routingPortalUrl, 'utf8');

  assert.match(portalSource, /window\.addEventListener\('dynastyhq:session-import-files', processBatch\)/);
  assert.doesNotMatch(portalSource, /document\.addEventListener\('change', intercept, true\)/);
  assert.match(portalSource, /findCollegeGameInput/);
  assert.match(portalSource, /choose weekly screenshots/i);
  assert.match(portalSource, /findHighSchoolPostgameInput/);
});

test('Session Import routes game, RTG, coverage and high-school screens without spraying unknowns across lanes', async () => {
  const portalSource = await readFile(routingPortalUrl, 'utf8');

  assert.match(portalSource, /lanes\.has\('game'\)/);
  assert.match(portalSource, /lanes\.has\('rtg'\)/);
  assert.match(portalSource, /lanes\.has\('coverage'\)/);
  assert.match(portalSource, /lanes\.has\('high_school'\)/);
  assert.match(portalSource, /high_school_postgame/);
  assert.match(portalSource, /high_school_moment/);
  assert.match(portalSource, /const collegeReviewFiles = gameInput \? uniqueFiles\(\[\.\.\.groups\.game, \.\.\.groups\.unknown\]\) : \[\];/);
  assert.doesNotMatch(portalSource, /unknown\.forEach[\s\S]*rtg\.push/);
  assert.doesNotMatch(portalSource, /unknown\.forEach[\s\S]*coverage\.push/);
});

test('Session Import repairs a stale legacy commitment flag only when the career-stage engine independently says College', async () => {
  const portalSource = await readFile(routingPortalUrl, 'utf8');

  assert.match(portalSource, /deriveCareerStage\(career \|\| \{\}\)/);
  assert.match(portalSource, /derivedStage === CAREER_STAGES\.COLLEGE/);
  assert.match(portalSource, /career\?\.careerPhase === 'Player'/);
  assert.match(portalSource, /career\?\.player\?\.isCommitted !== true/);
  assert.match(portalSource, /updateDoc\(careerRef, \{ 'player\.isCommitted': true \}\)/);
  assert.match(portalSource, /__dhqLegacyCollegeCommitmentRepairedAt/);
  assert.match(portalSource, /repaired the stale college-career flag/);
});

test('Session Import still refuses to send college Game Data into the high-school Postgame Tape Score lane', async () => {
  const portalSource = await readFile(routingPortalUrl, 'utf8');

  assert.match(portalSource, /current Weekly Agenda still does not expose the college Game Data scanner/);
  assert.match(portalSource, /Nothing was sent to the high-school Postgame Tape Score lane/);
  assert.doesNotMatch(portalSource, /dispatchGameFiles\(input, groups\.game/);
});

test('session screenshot router performs one lightweight free-first classification pass per screenshot', async () => {
  const [clientSource, apiSource] = await Promise.all([
    readFile(routingClientUrl, 'utf8'),
    readFile(coverageApiUrl, 'utf8'),
  ]);

  assert.match(clientSource, /fetch\('\/api\/analyze-coverage-reference'/);
  assert.match(clientSource, /scanKind: 'route'/);
  assert.doesNotMatch(clientSource, /scanKind: 'coverage'/);
  assert.doesNotMatch(clientSource, /scanKind: 'rtg'/);
  assert.match(clientSource, /allowPaidFallback: false/);
  assert.match(apiSource, /cfb27_session_import_route/);
  assert.match(apiSource, /ea_network_article/);
  assert.match(apiSource, /high_school_moment/);
  assert.match(apiSource, /Never send an unknown screen to every lane/);
});
