import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { resolveNewsroomPresentation } from './newsroomPresentation.js';

test('regional newsroom keeps the Cincinnati Enquirer newspaper identity', async () => {
  const [reader, styles] = await Promise.all([
    readFile(new URL('../components/NewsroomArticleReader.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../newsroom-regional-enquirer.css', import.meta.url), 'utf8'),
  ]);

  assert.equal(resolveNewsroomPresentation({ audience: 'regional' }).layout, 'regional-report');
  assert.match(reader, /const REGIONAL_OUTLET = 'Cincinnati Enquirer'/);
  assert.match(reader, /dhq-enquirer-sports/);
  assert.match(reader, />SPORTS</);
  assert.match(reader, /<strong>BEARCATS<\/strong><span>FOOTBALL<\/span>/);
  assert.match(reader, /CINCINNATI\.COM/);
  assert.match(reader, /dhq-enquirer-main-grid/);
  assert.match(reader, /dhq-enquirer-lower-copy/);
  assert.match(reader, /BEARCAT NATION:/);
  assert.match(styles, /grid-template-columns: minmax\(185px, 0\.72fr\) minmax\(0, 2\.2fr\) minmax\(205px, 0\.78fr\)/);
  assert.match(styles, /column-count: 4/);
  assert.match(styles, /border-bottom: 4px solid #c41724/);
});
