import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { normalizeNavigationTarget } from '../domain/navigationBus.js';
import { resolveViewContext } from '../domain/viewMode.js';
import { createPublishedWeek } from '../domain/weeklyEngine.js';

const mainUrl = new URL('../main.jsx', import.meta.url);
const appUrl = new URL('../App.jsx', import.meta.url);
const ownerEnhancementsUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const gameHubUrl = new URL('../components/GameHubPortal.jsx', import.meta.url);
const sessionImportUrl = new URL('../components/SessionImportPortal.jsx', import.meta.url);
const processWeekUrl = new URL('../components/ProcessWeek2Portal.jsx', import.meta.url);
const careerUrl = new URL('../components/CareerOverviewPortal.jsx', import.meta.url);
const publicProfileUrl = new URL('../components/PublicMediaProfilePage.jsx', import.meta.url);

test('smoke: canonical navigation keeps every primary DynastyHQ destination addressable', () => {
  assert.equal(normalizeNavigationTarget('Home'), 'dashboard');
  assert.equal(normalizeNavigationTarget('Game Hub'), 'gameHub');
  assert.equal(normalizeNavigationTarget('Verified Tools'), 'importSession');
  assert.equal(normalizeNavigationTarget('Newsroom'), 'newsroom');
  assert.equal(normalizeNavigationTarget('Podcast'), 'podcast');
  assert.equal(normalizeNavigationTarget('Career'), 'career');
  assert.equal(normalizeNavigationTarget('Chronicle'), 'chronicle');
  assert.equal(normalizeNavigationTarget('Recruiting'), 'recruiting');
  assert.equal(normalizeNavigationTarget('Offseason War Room'), 'offseason');
});

test('smoke: owner boot and public read-only routes remain separated and lazy-loaded', async () => {
  const [main, publicProfile] = await Promise.all([
    readFile(mainUrl, 'utf8'),
    readFile(publicProfileUrl, 'utf8'),
  ]);

  const owner = resolveViewContext('');
  const shared = resolveViewContext('?view=career-share-123');
  assert.equal(owner.isReadOnly, false);
  assert.equal(owner.ownerEnhancementsAllowed, true);
  assert.equal(shared.isReadOnly, true);
  assert.equal(shared.ownerEnhancementsAllowed, false);

  assert.match(main, /const OwnerEnhancements = lazy\(\(\) => import\('\.\/components\/OwnerEnhancements\.jsx'\)\)/);
  assert.match(main, /const PublicNewsroomArticlePage = lazy\(\(\) => import\('\.\/components\/PublicNewsroomArticlePage\.jsx'\)\)/);
  assert.match(main, /const PublicMediaProfilePage = lazy\(\(\) => import\('\.\/components\/PublicMediaProfilePage\.jsx'\)\)/);
  assert.match(main, /viewContext\.isPublicShare \? <PublicShareGuard \/> : <OwnerEnhancements \/>/);
  assert.match(publicProfile, /const GroundedNewsroom = lazy\(\(\) => import\('\.\/GroundedNewsroom'\)\)/);
  assert.match(publicProfile, /const PodcastStudio = lazy\(\(\) => import\('\.\/PodcastStudio'\)\)/);
  assert.match(publicProfile, /readOnly/);
});

test('smoke: Game Hub -> Session Import -> Process Week -> Publish remains wired end to end', async () => {
  const [ownerEnhancements, gameHub, sessionImport, processWeek] = await Promise.all([
    readFile(ownerEnhancementsUrl, 'utf8'),
    readFile(gameHubUrl, 'utf8'),
    readFile(sessionImportUrl, 'utf8'),
    readFile(processWeekUrl, 'utf8'),
  ]);

  assert.match(ownerEnhancements, /<GameHubPortal \/>/);
  assert.match(ownerEnhancements, /<SessionImportPortal \/>/);
  assert.match(ownerEnhancements, /<ProcessWeek2Portal \/>/);

  assert.match(gameHub, /dynastyhq:open-session-import/);
  assert.match(sessionImport, /addEventListener\('dynastyhq:open-session-import'/);
  assert.match(sessionImport, /OPEN PROCESS WEEK/);
  assert.match(sessionImport, /requestNavigation\('importSession'\)/);

  assert.match(processWeek, /PUBLISH WEEK/);
  assert.match(processWeek, /dynastyhq:process-week-published/);
  assert.match(processWeek, /dhq-process-week2-publishing/);
});

test('smoke: publishing one verified week advances the career atomically', () => {
  const state = {
    schemaVersion: 12,
    currentSeason: 1,
    currentWeek: 3,
    careerPhase: 'Player',
    latestQuote: '',
    gameLogs: [],
    recruiting: [],
    rtg: {},
    weeklyUpdates: [],
    factLedger: [],
    careerChronicle: [],
    newsroomIssues: [],
  };

  const next = createPublishedWeek({
    state,
    game: {
      opponent: 'Smoke Test State',
      result: 'W',
      homeScore: 31,
      awayScore: 17,
      passYds: 244,
      passTD: 2,
      rushYds: 36,
      rushTD: 1,
      int: 0,
    },
    rtg: { gpa: 3.2 },
    recruitingPatches: [],
    quote: '',
    facts: [{
      id: 'smoke-pass',
      key: 'game.passYds',
      label: 'Passing yards',
      value: 244,
      confidence: 0.99,
      sourceId: 'smoke-box',
      verified: true,
    }],
    sources: [{ id: 'smoke-box' }],
  });

  assert.equal(state.currentWeek, 3);
  assert.equal(state.gameLogs.length, 0);
  assert.equal(next.currentWeek, 4);
  assert.equal(next.gameLogs.length, 1);
  assert.equal(next.weeklyUpdates.length, 1);
  assert.equal(next.weeklyUpdates[0].weekKey, 'season-1-week-3');
  assert.equal(next.careerChronicle.length, 1);
  assert.match(next.careerChronicle[0].title, /Smoke Test State/);
});

test('smoke: primary media, career and recruiting surfaces stay reachable after code splitting', async () => {
  const [app, career] = await Promise.all([
    readFile(appUrl, 'utf8'),
    readFile(careerUrl, 'utf8'),
  ]);

  assert.match(app, /activeTab === 'newsroom' && renderNewsroom\(\)/);
  assert.match(app, /activeTab === 'podcast'/);
  assert.match(app, /activeTab === 'chronicle'/);
  assert.match(app, /activeTab === 'recruiting' && renderRecruiting\(\)/);
  assert.match(app, /const CareerArchive = lazy\(\(\) => import\('\.\/components\/CareerArchive'\)\);/);
  assert.match(app, /const PlayerRecruitingWorkspace = lazy\(\(\) => import\('\.\/components\/PlayerRecruitingWorkspace'\)\);/);

  assert.match(career, /target === 'career'/);
  assert.match(career, /requestNavigation\('dashboard'\)/);
});
