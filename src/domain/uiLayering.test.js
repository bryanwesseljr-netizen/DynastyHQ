import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSourceUrl = new URL('../App.jsx', import.meta.url);
const newsroomSourceUrl = new URL('../components/GroundedNewsroom.jsx', import.meta.url);
const newsroomEmptyStateSourceUrl = new URL('../components/NewsroomEmptyState.jsx', import.meta.url);
const commandCenterSourceUrl = new URL('../components/CareerCommandCenter.jsx', import.meta.url);

test('the fixed workspace background cannot intercept newsroom article clicks', async () => {
  const [appSource, newsroomSource] = await Promise.all([
    readFile(appSourceUrl, 'utf8'),
    readFile(newsroomSourceUrl, 'utf8'),
  ]);

  assert.match(
    appSource,
    /className="pointer-events-none absolute inset-0 z-0 fixed" aria-hidden="true"/,
  );
  assert.match(
    newsroomSource,
    /className="relative z-10 mx-auto max-w-5xl space-y-6 pb-20 animate-in fade-in"/,
  );
});

test('Career Chronicle ships with the app shell so commitment navigation cannot lose its lazy chunk', async () => {
  const appSource = await readFile(appSourceUrl, 'utf8');

  assert.match(appSource, /import CareerArchive from '\.\/components\/CareerArchive';/);
  assert.doesNotMatch(appSource, /lazy\(\(\) => import\('\.\/components\/CareerArchive'\)\)/);
});

test('the newsroom keeps podcast controls in the dedicated Gridiron Grind workspace', async () => {
  const [appSource, newsroomSource] = await Promise.all([
    readFile(appSourceUrl, 'utf8'),
    readFile(newsroomSourceUrl, 'utf8'),
  ]);

  assert.doesNotMatch(appSource, /setNewsTheme\('podcast'\)/);
  assert.doesNotMatch(newsroomSource, /Podcast Brief|Open Podcast Studio|openStory\('podcast'\)/);
  assert.match(appSource, /\{ id: 'podcast', icon: Radio, label: 'Gridiron Grind Podcast' \}/);
  assert.match(appSource, /activeTab === 'podcast'/);
});

test('the app opens on the command-center homepage with one responsive top navigation', async () => {
  const appSource = await readFile(appSourceUrl, 'utf8');

  assert.match(appSource, /useState\(frontPageParam \? 'newsroom' : 'dashboard'\)/);
  assert.match(appSource, /<header className="fixed inset-x-0 top-0/);
  assert.match(appSource, /aria-label="Primary navigation"/);
  assert.match(appSource, /Dynasty <span className="text-amber-400">HQ<\/span>/);
  assert.doesNotMatch(appSource, /\{ id: 'commandCenter', icon: Activity/);
  assert.doesNotMatch(appSource, /const commandCenterLabel =/);
  assert.match(appSource, /item\.id === 'podcast' \? 'Podcast' : item\.label/);
  assert.match(appSource, /dhq-primary-nav hidden min-w-0 flex-1 items-stretch overflow-hidden/);
  assert.doesNotMatch(appSource, /gridTemplateColumns/);
  assert.match(appSource, /dhq-settings-share-button/);
  assert.match(appSource, /getElementById\('recruit-command-center'\)/);
  assert.match(appSource, /getElementById\('dynastyhq-command-center'\)/);
  assert.match(appSource, /if \(tab === 'commandCenter'\)/);
  assert.doesNotMatch(appSource, /fixed inset-y-0 left-0/);
});

test('every workspace uses the same football-only presentation background', async () => {
  const appSource = await readFile(appSourceUrl, 'utf8');

  assert.match(appSource, /import footballStadiumBg from '\.\/assets\/dynastyhq-football-stadium-bg\.webp';/);
  assert.match(appSource, /const getBgImage = \(\) => footballStadiumBg;/);
  assert.match(appSource, /data-background-sport="football"/);
  assert.doesNotMatch(appSource, /case 'newsroom': return/);
  assert.doesNotMatch(appSource, /case 'podcast': return/);
});

test('the homepage mirrors the compact command-center dashboard without duplicate briefs', async () => {
  const source = await readFile(commandCenterSourceUrl, 'utf8');

  for (const title of [
    'Current Phase',
    'Season Snapshot',
    'Your Profile',
    'Road to Glory',
    'Career Timeline',
    'Career Journey',
    'Newsroom',
    'Recruiting Board',
    'Podcast',
    'Recent Schedule',
    'Verified Career Detail',
  ]) {
    assert.match(source, new RegExp(title));
  }
  assert.match(source, /Your hub for recruiting, development, and legacy\./);
  assert.match(source, /Track every decision\. Build your legacy\. Make history\./);
  assert.ok(source.indexOf('Current Phase') < source.indexOf('Season Snapshot'));
  assert.ok(source.indexOf('Season Snapshot') < source.indexOf('Your Profile'));
  assert.ok(source.indexOf('Road to Glory') < source.indexOf('Career Timeline'));
  assert.ok(source.indexOf('Career Timeline') < source.indexOf('Career Journey'));
  assert.ok(source.indexOf('<DashboardCard title="Newsroom"') < source.indexOf('<DashboardCard title="Recruiting Board"'));
  assert.ok(source.indexOf('<DashboardCard title="Recruiting Board"') < source.indexOf('<DashboardCard title="Podcast"'));
  assert.ok(source.indexOf('<DashboardCard title="Podcast"') < source.indexOf('<DashboardCard title="Recent Schedule"'));
  assert.doesNotMatch(source, /Dynasty Central/);
  assert.doesNotMatch(source, /Quick Actions/);
  assert.doesNotMatch(source, /Open Gridiron Grind|Open Gridiron Podcast/);
  assert.equal((source.match(/actionLabel="Open Newsroom"/g) || []).length, 1);
  assert.equal((source.match(/actionLabel="Listen to Podcast"/g) || []).length, 1);
  assert.equal((source.match(/actionLabel="Open Recruit Command Center"/g) || []).length, 1);
  assert.match(source, /actionLabel=\{showFullSchedule \? 'Show Compact Schedule' : 'View Schedule'\}/);
  assert.match(source, /Player headshot placeholder/);
  assert.match(source, /<details open/);
  assert.doesNotMatch(source, /View full snapshot|Career profile|View RTG career|View history/);
  assert.doesNotMatch(source, /dynastyhq-player-wessel|Wessel, number 2/);
});

test('schema v12 keeps an unpublished newsroom factual and empty', async () => {
  const [appSource, emptyStateSource] = await Promise.all([
    readFile(appSourceUrl, 'utf8'),
    readFile(newsroomEmptyStateSourceUrl, 'utf8'),
  ]);

  assert.match(appSource, /appState\.schemaVersion >= 12/);
  assert.match(emptyStateSource, /No edition published yet/);
  assert.match(emptyStateSource, /No placeholder players, invented statistics, Crystal Ball picks/);
  assert.doesNotMatch(emptyStateSource, /crystalBallText|Javion Butts|defHeadshot/);
});

test('player data entry presents Top Schools as preferences instead of interest sliders', async () => {
  const appSource = await readFile(appSourceUrl, 'utf8');

  assert.match(appSource, /This is your personal Top Schools order from the game—not a school-interest percentage/);
  assert.match(appSource, /isCoach \? '3\. Manual Recruiting Updates' : '3\. Top Schools Snapshot'/);
  assert.match(appSource, /school\.preferenceRank \|\| school\.customOrder/);
});
