import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../option-a-preview/PreviewApp.jsx', import.meta.url);

test('persistent live-career context does not rewind when browsing historical weeks', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /const liveCareerTarget=/);
  assert.match(source, /state\.currentWeekSetup/);
  assert.match(source, /state\.currentWeek/);
  assert.match(source, /<b>LIVE CAREER<\/b>/);
  assert.match(source, /const activeOpponent=liveCareerTarget\(data\)/);
  assert.match(source, /<b>THIS WEEK<\/b>/);
  assert.match(source, /PREPARE · \$\{activeOpponent\.displayLabel/);
  assert.match(source, /LIVE CAREER MATCHUP/);
  assert.match(source, /scheduleDisplayLabel/);
});
