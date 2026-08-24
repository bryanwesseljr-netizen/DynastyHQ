import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mainUrl = new URL('../main.jsx', import.meta.url);
const fitUrl = new URL('../tile-fit-v2.css', import.meta.url);
const duplicateGuardUrl = new URL('../components/DuplicateGuardPortal.jsx', import.meta.url);

test('sitewide fit rules are consolidated into one loaded layer', async () => {
  const [main, fit] = await Promise.all([
    readFile(mainUrl, 'utf8'),
    readFile(fitUrl, 'utf8'),
  ]);

  assert.match(main, /import '\.\/tile-fit-v2\.css'/);
  assert.doesNotMatch(main, /import '\.\/import-tile-sizing-v1\.css'/);
  assert.doesNotMatch(main, /import '\.\/milestone-card-layout-v1\.css'/);
  assert.match(fit, /data-dashboard-card="quick-import"[\s\S]*?button > svg[\s\S]*?width: 16px !important;/);
  assert.match(fit, /Career Milestones readability is now part of the dashboard fit contract/);
  assert.match(fit, /\.dhq-v2-list-row > \.min-w-0\.flex-1 > strong/);
});

test('duplicate display auditing watches only the DynastyHQ app root', async () => {
  const source = await readFile(duplicateGuardUrl, 'utf8');

  assert.match(source, /const appRoot = document\.getElementById\('root'\)/);
  assert.match(source, /observer\.observe\(appRoot, \{ childList: true, subtree: true, characterData: true \}\)/);
  assert.doesNotMatch(source, /observer\.observe\(document\.body/);
  assert.match(source, /appRoot\.querySelectorAll\('\[data-dhq-display-duplicate="true"\]'\)/);
});
