import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { polishNewsroomCopy } from './newsroomCopyPolish.js';

test('corrects mistaken playoff-opener headlines without rewriting the sports facts', () => {
  const original='Oregon Crushes LSU 44-10 Behind Seven Sacks in Playover Opener';
  assert.equal(polishNewsroomCopy(original),'Oregon Crushes LSU 44-10 Behind Seven Sacks in Playoff Opener');
  assert.equal(polishNewsroomCopy('PLAYOVER OPENER'),'PLAYOFF OPENER');
  assert.equal(polishNewsroomCopy('playover opener'),'playoff opener');
  assert.equal(polishNewsroomCopy('The playoff opener at home against LSU.'),'The playoff opener at home against LSU.');
  assert.equal(polishNewsroomCopy('Oregon crushed LSU 44-10'),'Oregon crushed LSU 44-10');
  assert.equal(polishNewsroomCopy(null),null);
});

test('preview applies correction to previously saved news and to new generated editions', async () => {
  const [preview, generation] = await Promise.all([
    readFile(new URL('../option-a-preview/useReadOnlyLiveCareer.js', import.meta.url),'utf8'),
    readFile(new URL('./newsroomGeneration.js', import.meta.url),'utf8'),
  ]);
  assert.match(preview, /headline: polishNewsroomCopy\(clean\(article\?\.headline/);
  assert.match(preview, /dek: polishNewsroomCopy\(clean\(article\?\.dek/);
  assert.match(generation, /headline: polishNewsroomCopy\(clean\(entry\.headline/);
  assert.match(generation, /dek: polishNewsroomCopy\(clean\(entry\.dek/);
});
