import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('../components/BroadcastDashboard.jsx', import.meta.url);
const immersionUrl = new URL('./gameWeekImmersion.js', import.meta.url);
const stylesUrl = new URL('../components/broadcast-dashboard.css', import.meta.url);
const referenceStylesUrl = new URL('../components/broadcast-reference.css', import.meta.url);
const immersionStylesUrl = new URL('../components/game-week-immersion.css', import.meta.url);
const appUrl = new URL('../App.jsx', import.meta.url);

test('broadcast dashboard uses the approved reference proportions and real workflow routes', async () => {
  const [source, immersion, styles, referenceStyles, immersionStyles, app] = await Promise.all([
    readFile(sourceUrl, 'utf8'),
    readFile(immersionUrl, 'utf8'),
    readFile(stylesUrl, 'utf8'),
    readFile(referenceStylesUrl, 'utf8'),
    readFile(immersionStylesUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);

  assert.match(source, /buildGameweekFlow\(state\)/);
  assert.match(source, /buildGameWeekImmersion\(state, model, flow\)/);
  assert.match(source, /open\(immersion\.primaryTarget\)/);
  assert.match(source, /open\(immersion\.secondaryTarget \|\| 'gameHub'\)/);
  assert.match(source, /dhq-gameweek-immersion/);
  assert.match(source, /import '\.\/broadcast-reference\.css';/);
  assert.match(source, /import '\.\/game-week-immersion\.css';/);
  assert.match(immersion, /THE STORY CONTINUES SATURDAY/);
  assert.match(immersion, /OPEN GAME DAY/);
  assert.match(immersion, /IMPORT AFTER GAME/);
  assert.match(immersion, /CONTINUE WRAP-UP/);
  assert.match(immersion, /THE NEXT CHAPTER AWAITS/);
  assert.match(app, /tab === 'importSession' \|\| tab === 'gameHub'/);
  assert.match(styles, /\.dhq-broadcast-hero \{[\s\S]*?width: min\(1002px, 100%\)/);
  assert.match(styles, /\.dhq-broadcast-hero \{[\s\S]*?height: 314px/);
  assert.match(styles, /\.dhq-broadcast-main \{[\s\S]*?width: min\(1340px, calc\(100% - 124px\)\)/);
  assert.match(styles, /\.dhq-broadcast-card \{[\s\S]*?min-height: 218px/);
  assert.match(styles, /\.dhq-broadcast-lower-row \{[\s\S]*?grid-template-columns: 1\.9fr 1fr/);
  assert.match(styles, /\.dhq-broadcast-cards \{[\s\S]*?grid-template-columns: 1\.03fr 0\.92fr 0\.92fr 1\.16fr/);
  assert.match(referenceStyles, /\.dhq-broadcast-header \{[\s\S]*?height: 108px !important/);
  assert.match(referenceStyles, /\.dhq-page-main\[data-active-tab="dashboard"\] \{[\s\S]*?padding-top: 108px !important/);
  assert.match(immersionStyles, /\.dhq-gameweek-immersion \{[\s\S]*?grid-template-columns: 1\.15fr 0\.95fr 0\.95fr/);
  assert.match(immersionStyles, /\.dhq-immersion-panel \{[\s\S]*?min-height: 154px/);
});

test('mobile dashboard preserves the compact information grid and stacks immersion panels', async () => {
  const [styles, immersionStyles, siteStyles] = await Promise.all([
    readFile(stylesUrl, 'utf8'),
    readFile(immersionStylesUrl, 'utf8'),
    readFile(new URL('../index.css', import.meta.url), 'utf8'),
  ]);
  assert.match(styles, /@media \(max-width: 767px\)/);
  assert.match(styles, /\.dhq-broadcast-cards \{ grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.dhq-broadcast-lower-row \{ grid-template-columns: 1fr/);
  assert.match(immersionStyles, /@media \(max-width: 767px\)[\s\S]*?\.dhq-gameweek-immersion \{[\s\S]*?grid-template-columns: 1fr/);
  assert.match(siteStyles, /\.dhq-broadcast-header \.dhq-primary-nav-item \{ order: initial !important/);
});

test('preview builds use an isolated Firebase namespace and seed only that copy', async () => {
  const [firebaseSource, appSource, configSource, apiSource] = await Promise.all([
    readFile(new URL('../firebase.js', import.meta.url), 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(new URL('../../vite.config.js', import.meta.url), 'utf8'),
    readFile(new URL('../../api/_userImageContext.js', import.meta.url), 'utf8'),
  ]);

  assert.match(configSource, /VERCEL_ENV \|\| 'development'/);
  assert.match(firebaseSource, /isPreviewDeployment \? 'dynasty-hq-preview' : productionAppId/);
  assert.match(appSource, /productionSnapshot\.exists\(\)/);
  assert.match(appSource, /seededFromProduction: Boolean\(previewSeed\)/);
  assert.match(apiSource, /VERCEL_ENV === 'production' \? 'dynasty-hq' : 'dynasty-hq-preview'/);
});
