import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../option-a-preview/PreviewApp.jsx', import.meta.url);

test('Week Processing keeps scanner work draft-only until an explicit final owner confirmation', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /REAL SCANNERS · DRAFT UNTIL CONFIRMED/);
  assert.match(source, /FINAL OWNER CONFIRMATION/);
  assert.match(source, /PUBLISH VERIFIED WEEK/);
  assert.match(source, /UPDATE VERIFIED WEEK/);
  assert.match(source, /YES · PUBLISH WEEK/);
  assert.match(source, /YES · UPDATE WEEK/);
  assert.doesNotMatch(source, /FINISH PREVIEW/);
});

test('Week Processing publishes through an archive-aware protected transaction', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /runTransaction\(db,async\(transaction\)=>/);
  assert.match(source, /readHydratedCareerInTransaction/);
  assert.match(source, /writeHydratedCareerInTransaction/);
  assert.match(source, /splitCareerStateForStorage/);
  assert.match(source, /detectDestructiveCareerRegression/);
  assert.match(source, /careerArchiveRef/);
  assert.match(source, /Automatic safety checkpoint before redesign Week Processing write/);
});

test('new weeks and published-week corrections use the existing weekly engine instead of replacing whole history', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /findPublishedWeekConflict/);
  assert.match(source, /createPublishedWeek\(/);
  assert.match(source, /correctPublishedWeek\(/);
  assert.match(source, /replaceCoverageReferences\(/);
  assert.match(source, /applyCorrectedRtgSnapshot/);
  assert.match(source, /This week was published after you opened Week Processing/);
  assert.match(source, /The selected week changed in the cloud after you opened Week Processing/);
});

test('new-week publish validates the verified core game line before any transaction write', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  for (const label of [
    'Result',
    'Team score',
    'Opponent score',
    'Passing yards',
    'Passing touchdowns',
    'Rushing yards',
    'Rushing touchdowns',
    'Interceptions',
  ]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /The verified packet is missing:/);
  assert.match(source, /STORAGE_SHARD_TOO_LARGE/);
  assert.match(source, /CAREER_REGRESSION_BLOCKED/);
});
