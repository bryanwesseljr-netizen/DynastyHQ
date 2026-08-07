import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSourceUrl = new URL('../App.jsx', import.meta.url);
const newsroomSourceUrl = new URL('../components/GroundedNewsroom.jsx', import.meta.url);

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
