import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { resolveNewsroomPresentation } from './newsroomPresentation.js';

test('regional newsroom keeps the newspaper layout while deriving publication identity from the issue program', async () => {
  const [reader, styles, overrides] = await Promise.all([
    readFile(new URL('../components/NewsroomArticleReader.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../newsroom-regional-enquirer.css', import.meta.url), 'utf8'),
    readFile(new URL('../newsroom-current-program-overrides.css', import.meta.url), 'utf8'),
  ]);

  assert.equal(resolveNewsroomPresentation({ audience: 'regional' }).layout, 'regional-report');
  assert.match(reader, /team\.regionalOutletName/);
  assert.match(reader, /dhq-enquirer-sports/);
  assert.match(reader, />SPORTS</);
  assert.match(reader, /\{nicknameLabel\}<\/strong><span>FOOTBALL<\/span>/);
  assert.match(reader, /dhq-enquirer-main-grid/);
  assert.match(reader, /dhq-enquirer-lower-copy/);
  assert.match(reader, /Latest \{team\.school\} football/);
  assert.doesNotMatch(reader, /const REGIONAL_OUTLET = 'Cincinnati Enquirer'/);
  assert.doesNotMatch(reader, /CINCINNATI\.COM/);
  assert.doesNotMatch(reader, /BEARCAT NATION:/);

  assert.match(styles, /grid-template-columns: minmax\(185px, 0\.72fr\) minmax\(0, 2\.2fr\) minmax\(205px, 0\.78fr\)/);
  assert.match(styles, /column-count: 4/);
  assert.match(overrides, /\.dhq-enquirer-masthead__meta/);
  assert.match(overrides, /var\(--article-team-primary/);
});

test('Cincinnati Enquirer identity overrides stale filmroom metadata in old saved archives', () => {
  const legacySavedArticle = {
    outletId: 'filmroom',
    outletName: 'Cincinnati Enquirer',
    audience: 'analysis',
    theme: 'filmroom',
  };
  const presentation = resolveNewsroomPresentation(legacySavedArticle);
  assert.equal(presentation.audience, 'regional');
  assert.equal(presentation.layout, 'regional-report');
});

test('college-regional assignment overrides a stale analysis theme even before a rewrite', () => {
  const migratedArticle = {
    outletId: 'college-regional',
    outletName: 'Legacy Regional Slot',
    audience: 'analysis',
    theme: 'filmroom',
  };
  const presentation = resolveNewsroomPresentation(migratedArticle);
  assert.equal(presentation.audience, 'regional');
  assert.equal(presentation.layout, 'regional-report');
});
