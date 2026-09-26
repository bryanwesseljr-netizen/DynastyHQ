import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('college Game Data scanner requires fixed player and team stat-line checks', async () => {
  const source = await readFile(new URL('../../api/analyze-coverage-reference.js', import.meta.url), 'utf8');

  assert.match(source, /playerStatLine: \{[\s\S]*?\.\.\.fixedStatLineSchema\(\['passYds', 'passTD', 'rushYds', 'rushTD', 'int'\]\)/);
  assert.match(source, /teamStatLine: fixedStatLineSchema/);
  assert.match(source, /A plainly visible zero MUST be returned as value="0"/);
  assert.match(source, /game\.teamRushYds/);
  assert.match(source, /game\.opponentRushYds/);
  assert.match(source, /analysis = augmentGameAnalysis\(analysis\)/);
  assert.match(source, /TD COLUMN RULE:/);
  assert.match(source, /PASSING table\/section[\s\S]*playerStatLine\.passTD/);
  assert.match(source, /RUSHING table\/section[\s\S]*playerStatLine\.rushTD/);
  assert.match(source, /MULTI-SECTION PLAYER SCREEN RULE:/);
  assert.match(source, /description: 'Tracked player PASSING table TD column only\. This is passing touchdowns\.'/);
  assert.match(source, /description: 'Tracked player RUSHING table TD column only\. This is rushing touchdowns\.'/);
  assert.match(source, /const needsPlayerTdRecovery =/);
  assert.match(source, /cfb27_player_touchdown_recovery/);
  assert.match(source, /A visible 0 is a valid touchdown total and MUST be returned as "0"/);
  assert.match(source, /PASSING: if the tracked player's row is visible/);
  assert.match(source, /RUSHING: if the tracked player's row is visible/);
  assert.match(source, /analysis = await recoverMissingPlayerTouchdowns/);
  assert.match(source, /analysis = augmentGameAnalysis\(analysis\)/);
});
