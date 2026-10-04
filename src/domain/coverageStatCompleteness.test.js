import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../../api/analyze-coverage-reference.js', import.meta.url);

test('coverage scanner mirrors the visible CFB27 postgame stat-table columns', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /required: \['screenType', 'screenTitle', 'summary', 'passingRows', 'rushingRows', 'receivingRows', 'defenseRows', 'puntingRows', 'facts'\]/);

  assert.match(source, /coverageRowSchema\(\['rating', 'comp', 'att', 'yds', 'compPct', 'td', 'int', 'avg', 'long'\]\)/);
  assert.match(source, /RATING\/RTG means PASSER RATING/);
  assert.match(source, /COMP% is the game's displayed completion percentage/);
  assert.match(source, /\['rating', 'Passer Rating'\]/);
  assert.match(source, /\['compPct', 'Completion %'\]/);
  assert.match(source, /\['avg', 'AVG \(yards\/attempt\)'\]/);

  assert.match(source, /coverageRowSchema\(\['att', 'yds', 'avg', 'td', 'fumb', 'btk', 'yac', 'twentyPlus', 'long'\]\)/);
  assert.match(source, /Preserve ATT, YDS, AVG, TD, FUMB, BTK, YAC, 20\+YDS and LONG/);
  assert.match(source, /\['att', 'ATT \(Carries\)'\]/);
  assert.match(source, /\['fumb', 'FUMB \(Fumbles\)'\]/);
  assert.match(source, /\['btk', 'BTK \(Broken tackles\)'\]/);
  assert.match(source, /\['yac', 'YAC'\]/);
  assert.match(source, /\['twentyPlus', '20\+ YDS'\]/);

  assert.match(source, /coverageRowSchema\(\['rec', 'yds', 'avg', 'td', 'rac', 'racAvg', 'drops', 'long'\]\)/);
  assert.match(source, /AVG is receiving yards per catch/);
  assert.match(source, /\['avg', 'AVG \(yards\/catch\)'\]/);

  assert.match(source, /coverageRowSchema\(\['solo', 'assisted', 'total', 'tfl', 'sacks', 'int', 'intYds', 'intAvg', 'intLong', 'pd', 'ff', 'fr', 'defTd', 'safety'\]\)/);
  assert.match(source, /do not drop TFL, SACK or INT/);
  assert.match(source, /\['tfl', 'TFL'\]/);
  assert.match(source, /\['sacks', 'Sacks'\]/);
  assert.match(source, /\['int', 'Interceptions'\]/);
  assert.match(source, /\['intAvg', 'Interception Return AVG'\]/);
  assert.match(source, /\['intLong', 'Interception Return LONG'\]/);

  assert.match(source, /coverageRowSchema\(\['punts', 'yds', 'avg', 'netYds', 'netAvg', 'blocks', 'in20', 'tb', 'long'\]\)/);
  assert.match(source, /PUNTING TABLE GUARANTEE/);
  assert.match(source, /\['netYds', 'Net Punting Yards'\]/);
  assert.match(source, /\['netAvg', 'Net Punting Average'\]/);
  assert.match(source, /\['blocks', 'Punt Blocks'\]/);
  assert.match(source, /\['tb', 'Touchbacks'\]/);

  assert.match(source, /augmentCoveragePlayerStatFacts/);
});
