import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../option-a-preview/PreviewApp.jsx', import.meta.url);

test('Game Hub distinguishes completed-week review from the active playable week', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /REVIEW \/ UPDATE WEEK/);
  assert.match(source, /PROCESS WEEK \$\{data\.game\.week\}/);
  assert.match(source, /prepIsCurrent/);
  assert.match(source, /PREPARE THIS WEEK · W/);
  assert.match(source, /detailOpen==='prep'\?activeOpponent\.week:data\.game\.week/);
  assert.match(source, /ACTIVE MATCHUP':'UPCOMING MATCHUP/);
  assert.doesNotMatch(source, /PREPARE NEXT WEEK/);
});
