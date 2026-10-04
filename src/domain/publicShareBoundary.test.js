import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mainUrl = new URL('../main.jsx', import.meta.url);
const authUrl = new URL('../components/AuthAwareApp.jsx', import.meta.url);
const ownerUrl = new URL('../option-a-preview/PreviewApp.jsx', import.meta.url);
const guardUrl = new URL('../components/PublicShareGuard.jsx', import.meta.url);

const readSources = async () => Promise.all([
  readFile(mainUrl, 'utf8'),
  readFile(authUrl, 'utf8'),
  readFile(ownerUrl, 'utf8'),
  readFile(guardUrl, 'utf8'),
]);

test('the app entry has one explicit redesign-owner versus legacy-public boundary', async () => {
  const [mainSource, , ownerSource] = await readSources();

  assert.match(mainSource, /resolveViewContext\(window\.location\.search\)/);
  assert.match(mainSource, /viewContext\.isPublicShare \? \([\s\S]*<LegacyPublicShareShell \/>[\s\S]*\) : \([\s\S]*<PreviewApp \/>/);
  assert.match(mainSource, /const PreviewApp = lazy\(\(\) => import\('\.\/option-a-preview\/PreviewApp\.jsx'\)\)/);
  assert.match(mainSource, /const PublicShareGuard = lazy\(\(\) => import\('\.\/components\/PublicShareGuard\.jsx'\)\)/);
  assert.match(ownerSource, /<WeekProcessingCenter/);
  assert.match(ownerSource, /function PodcastPage\(/);
});

test('public share auth startup uses the centralized view contract', async () => {
  const [, authSource] = await readSources();

  assert.match(authSource, /resolveViewContext\(window\.location\.search\)/);
  assert.match(authSource, /if \(isPublicShareView\) return undefined;/);
  assert.match(authSource, /!isPublicShareView && \(!authReady \|\| transitioning\)/);
});

test('public share mode keeps a defense-in-depth lock on podcast production actions', async () => {
  const [, , , guardSource] = await readSources();

  assert.match(guardSource, /create\|regenerate\) transcript/);
  assert.match(guardSource, /generate\|regenerate\) humanized audio/);
  assert.match(guardSource, /dhqPublicShareLocked/);
  assert.match(guardSource, /View-only shared career/);
  assert.match(guardSource, /Shared career snapshot/);
});
