import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('local reader keeps the reference-style structure while deriving publication identity from the issue program', async () => {
  const [reader, styles, overrides] = await Promise.all([
    readFile(new URL('../components/NewsroomArticleReader.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../newsroom-local-bearcats.css', import.meta.url), 'utf8'),
    readFile(new URL('../newsroom-current-program-overrides.css', import.meta.url), 'utf8'),
  ]);

  assert.match(reader, /resolveIssueTeamMediaProfile/);
  assert.match(reader, /team\.localOutletName/);
  assert.match(reader, /team\.nickname/);
  assert.match(reader, /team\.school/);
  assert.match(reader, /--article-team-primary/);
  assert.match(reader, /YOUR SOURCE FOR \{schoolLabel\} \{nicknameLabel\} FOOTBALL/);
  assert.match(reader, /NEWS\. ANALYSIS\./);
  assert.match(reader, /dhq-bearcats-byline-row/);
  assert.match(reader, /dhq-bearcats-footer/);
  assert.doesNotMatch(reader, /const LOCAL_OUTLET = 'Bearcats Insider'/);
  assert.doesNotMatch(reader, /GOBEARCATS\.COM/);

  assert.match(styles, /data-audience="local"/);
  assert.match(styles, /\.dhq-bearcats-brand strong/);
  assert.match(styles, /column-count: 2/);
  assert.match(styles, /\.dhq-news-sidebar h2/);
  assert.doesNotMatch(styles, /data-audience="regional"/);
  assert.doesNotMatch(styles, /data-audience="national"/);

  assert.match(overrides, /var\(--article-team-primary/);
  assert.match(overrides, /\.dhq-bearcats-brand strong/);
  assert.match(overrides, /\.dhq-news-sidebar h2/);
});
