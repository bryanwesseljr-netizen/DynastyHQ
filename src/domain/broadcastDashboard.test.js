import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('../components/BroadcastDashboard.jsx', import.meta.url);
const stylesUrl = new URL('../components/broadcast-dashboard.css', import.meta.url);
const appUrl = new URL('../App.jsx', import.meta.url);

test('broadcast dashboard uses the approved hero, wider lower cards, and real workflow routes', async () => {
  const [source, styles, app] = await Promise.all([
    readFile(sourceUrl, 'utf8'),
    readFile(stylesUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);

  assert.match(source, /THE STORY CONTINUES SATURDAY/);
  assert.match(source, /IMPORT SESSION/);
  assert.match(source, /VIEW WEEK HUB/);
  assert.match(source, /buildGameweekFlow\(state\)/);
  assert.match(source, /open\('importSession'\)/);
  assert.match(source, /open\('gameHub'\)/);
  assert.match(app, /tab === 'importSession' \|\| tab === 'gameHub'/);
  assert.match(styles, /\.dhq-broadcast-hero \{[\s\S]*?width: min\(1140px, 100%\)/);
  assert.match(styles, /\.dhq-broadcast-main \{[\s\S]*?width: min\(1538px, calc\(100% - 126px\)\)/);
  assert.match(styles, /\.dhq-broadcast-cards \{[\s\S]*?grid-template-columns: 1\.03fr 0\.92fr 0\.92fr 1\.16fr/);
});

test('mobile dashboard preserves the compact two-column information grid', async () => {
  const [styles, siteStyles] = await Promise.all([
    readFile(stylesUrl, 'utf8'),
    readFile(new URL('../index.css', import.meta.url), 'utf8'),
  ]);
  assert.match(styles, /@media \(max-width: 767px\)/);
  assert.match(styles, /\.dhq-broadcast-cards \{ grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.dhq-broadcast-lower-row \{ grid-template-columns: 1fr/);
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
