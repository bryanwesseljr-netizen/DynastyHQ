import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../option-a-preview/PreviewApp.jsx', import.meta.url);

test('Game Hub keeps historical review context separate from the live playable week', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /REVIEW \/ UPDATE/);
  assert.match(source, /PROCESS/);
  assert.match(source, /data\.weekLabel/);
  assert.match(source, /const activeOpponent=liveCareerTarget\(data\)/);
  assert.match(source, /<b>THIS WEEK<\/b>/);
  assert.match(source, /PREPARE · \$\{activeOpponent\.displayLabel/);
  assert.match(source, /detailOpen==='prep'\?activeOpponent\.week:data\.game\.week/);
  assert.match(source, /LIVE CAREER MATCHUP/);
  assert.match(source, /scheduleDisplayLabel/);
  assert.doesNotMatch(source, /PREPARE NEXT WEEK/);
});
