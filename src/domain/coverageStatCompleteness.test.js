import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../../api/analyze-coverage-reference.js', import.meta.url);

test('coverage scanner preserves complete passing, rushing, receiving and defensive stat rows', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /required: \['screenType', 'screenTitle', 'summary', 'passingRows', 'rushingRows', 'receivingRows', 'defenseRows', 'facts'\]/);
  assert.match(source, /coverageRowSchema\(\['comp', 'att', 'yds', 'avg', 'td', 'int', 'sacks', 'rtg', 'long'\]\)/);
  assert.match(source, /coverageRowSchema\(\['att', 'yds', 'avg', 'td', 'btk', 'fum', 'yac', 'twentyPlus', 'long'\]\)/);
  assert.match(source, /coverageRowSchema\(\['rec', 'yds', 'avg', 'td', 'rac', 'racAvg', 'drops', 'long'\]\)/);
  assert.match(source, /coverageRowSchema\(\['total', 'solo', 'assisted', 'tfl', 'sacks', 'int', 'intYds', 'pd', 'ff', 'fr', 'defTd', 'safety'\]\)/);

  assert.match(source, /RTG means PASSER RATING; it is NOT Road to Glory/);
  assert.match(source, /AVG is passing yards per attempt/);
  assert.match(source, /Preserve ATT, YDS, AVG, TD, BTK, FUM, YAC, 20\+ YDS and LONG/);
  assert.match(source, /AVG is receiving yards per catch/);
  assert.match(source, /do not drop TFL, SACK or INT/);

  assert.match(source, /\['rtg', 'RTG \(Passer Rating\)'\]/);
  assert.match(source, /\['avg', 'AVG \(yards\/attempt\)'\]/);
  assert.match(source, /\['att', 'ATT \(Carries\)'\]/);
  assert.match(source, /\['btk', 'BTK \(Broken tackles\)'\]/);
  assert.match(source, /\['fum', 'FUM \(Fumbles\)'\]/);
  assert.match(source, /\['yac', 'YAC'\]/);
  assert.match(source, /\['twentyPlus', '20\+ YDS'\]/);
  assert.match(source, /\['avg', 'AVG \(yards\/catch\)'\]/);
  assert.match(source, /\['tfl', 'TFL'\]/);
  assert.match(source, /\['sacks', 'Sacks'\]/);
  assert.match(source, /\['int', 'Interceptions'\]/);
  assert.match(source, /augmentCoveragePlayerStatFacts/);
});
