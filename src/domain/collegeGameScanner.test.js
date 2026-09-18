import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('college Game Data scanner requires fixed player and team stat-line checks', async () => {
  const source = await readFile(new URL('../../api/analyze-coverage-reference.js', import.meta.url), 'utf8');

  assert.match(source, /playerStatLine: fixedStatLineSchema\(\['passYds', 'passTD', 'rushYds', 'rushTD', 'int'\]\)/);
  assert.match(source, /teamStatLine: fixedStatLineSchema/);
  assert.match(source, /A plainly visible zero MUST be returned as value="0"/);
  assert.match(source, /game\.teamRushYds/);
  assert.match(source, /game\.opponentRushYds/);
  assert.match(source, /augmentGameAnalysis\(result\.analysis\)/);
});
