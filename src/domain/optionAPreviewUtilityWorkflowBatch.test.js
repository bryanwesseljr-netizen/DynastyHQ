import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../option-a-preview/PreviewApp.jsx', import.meta.url);
const cssUrl = new URL('../option-a-preview/preview.css', import.meta.url);

test('global search and career alerts replace mockup-only header actions', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /GlobalSearchModal/);
  assert.match(source, /NotificationPanel/);
  assert.match(source, /searchItems=useMemo/);
  assert.match(source, /notificationItems=useMemo/);
  assert.match(source, /Ctrl\/⌘ K/);
  assert.doesNotMatch(source, /notify\('Search preview'\)/);
  assert.doesNotMatch(source, /No new notifications in the mockup/);
});

test('Game Hub week preparation is useful before a new game exists', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /setDetailOpen\('prep'\)/);
  assert.match(source, /POSTGAME CAPTURE CHECKLIST/);
  assert.match(source, /copyPrepChecklist/);
  assert.match(source, /Play first\. Upload after the final\./);
  assert.doesNotMatch(source, /preparation workspace is not part of the redesigned RTG flow yet/);
});

test('Newsroom Archive browses preserved career editions', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /newsroomArchive=/);
  assert.match(source, /Every saved edition/);
  assert.match(source, /openArchiveMoment\(entry\.season,entry\.week,'newsroom'\)/);
  assert.doesNotMatch(source, /Full archive browsing is coming in the archive workflow pass/);
});

test('Podcast chapters jump into the saved transcript instead of showing a toast', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /const openChapter=/);
  assert.match(source, /data-podcast-chapter/);
  assert.match(source, /onClick=\{\(\)=>openChapter\(chapter,index\)\}/);
});

test('career follower share can be disabled without deleting the public master document', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /disableFollowerShare/);
  assert.match(source, /setDoc\(publicRef,\{redesignFollower:null\},\{merge:true\}\)/);
  assert.match(source, /DISABLE FOLLOW LINK/);
});

test('safe-preview wording names every explicit live write lane', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /confirmed Week Processing, master-audio attachment, or career sharing/);
});

test('new workflow surfaces have mobile styles', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /utility workflow batch/);
  assert.match(css, /\.global-search-modal/);
  assert.match(css, /\.notification-panel/);
  assert.match(css, /\.week-prep-checklist/);
  assert.match(css, /\.newsroom-archive-grid/);
});
