import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('local reader keeps the Bearcats Insider publication identity and reference-style structure', async () => {
  const [reader, styles] = await Promise.all([
    readFile(new URL('../components/NewsroomArticleReader.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../newsroom-local-bearcats.css', import.meta.url), 'utf8'),
  ]);

  assert.match(reader, /const LOCAL_OUTLET = 'Bearcats Insider'/);
  assert.match(reader, /const LOCAL_AUTHOR = 'Justin Williams'/);
  assert.match(reader, /Senior Staff Writer, Bearcats Insider/);
  assert.match(reader, /BEARCATS/);
  assert.match(reader, /INSIDER/);
  assert.match(reader, /YOUR SOURCE FOR CINCINNATI BEARCATS FOOTBALL/);
  assert.match(reader, /NEWS\. ANALYSIS\./);
  assert.match(reader, /CINCINNATI TOUGH\./);
  assert.match(reader, /dhq-bearcats-byline-row/);
  assert.match(reader, /dhq-bearcats-footer/);
  assert.match(reader, /GOBEARCATS\.COM/);

  assert.match(styles, /data-audience="local"/);
  assert.match(styles, /\.dhq-bearcats-brand strong/);
  assert.match(styles, /column-count: 2/);
  assert.match(styles, /\.dhq-news-sidebar h2/);
  assert.match(styles, /background: #c8102e/);
  assert.doesNotMatch(styles, /data-audience="regional"/);
  assert.doesNotMatch(styles, /data-audience="national"/);
});
