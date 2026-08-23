import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { resolveNewsroomPresentation } from './newsroomPresentation.js';

test('earned national coverage keeps the ESPN-style national desk shell', async () => {
  const [reader, styles, newsroom] = await Promise.all([
    readFile(new URL('../components/NewsroomArticleReader.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../newsroom-national-espn.css', import.meta.url), 'utf8'),
    readFile(new URL('../components/GroundedNewsroom.jsx', import.meta.url), 'utf8'),
  ]);

  assert.equal(resolveNewsroomPresentation({ audience: 'national' }).layout, 'national-desk');
  assert.equal(resolveNewsroomPresentation({ audience: 'national-lead' }).layout, 'national-desk');
  assert.match(reader, /const NATIONAL_OUTLET = 'ESPN'/);
  assert.match(reader, /dhq-espn-globalbar/);
  assert.match(reader, />NCAA FOOTBALL</);
  assert.match(reader, /dhq-espn-body-grid/);
  assert.match(reader, /nationalSidebarParts/);
  assert.match(reader, /nationalAsideSections/);
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\) minmax\(230px, 300px\)/);
  assert.match(styles, /color: #e3181e/);
  assert.match(newsroom, /return 'Bearcats Insider'/);
  assert.match(newsroom, /return 'Cincinnati Enquirer'/);
  assert.match(newsroom, /return 'ESPN'/);
});

test('national sidebar rendering does not invent placeholder statistics', async () => {
  const reader = await readFile(new URL('../components/NewsroomArticleReader.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(reader, /275 passing yards|31-27|No\. 8 Kansas State|13-play|80-yard/i);
  assert.match(reader, /section\.items\.map/);
});
