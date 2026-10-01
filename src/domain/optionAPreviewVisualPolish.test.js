import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const previewSourceUrl = new URL('../option-a-preview/PreviewApp.jsx', import.meta.url);
const previewCssUrl = new URL('../option-a-preview/preview.css', import.meta.url);

test('redesign preview keeps a separate per-career profile photo for player identity surfaces', async () => {
  const source = await readFile(previewSourceUrl, 'utf8');

  assert.match(source, /PROFILE_PHOTO_STORAGE_KEY/);
  assert.match(source, /profilePhotoKey/);
  assert.match(source, /profileVisual=\{profileVisual\}/);
  assert.match(source, /Change career profile photo/);
  assert.match(source, /Verified Game Data, the Newsroom Career File, and the Career page/);
  assert.match(source, /Saved only in this browser’s redesign preview for this career/);
});

test('newsroom photo provenance uses week-game wording instead of the misleading career-photo-library label', async () => {
  const source = await readFile(previewSourceUrl, 'utf8');

  assert.doesNotMatch(source, /Career Photo Library/i);
  assert.match(source, /WEEK GAME PHOTO/);
  assert.match(source, /Week Game Photo/);
});

test('opened select menus use readable paper/dark contrast and desktop display headlines use a lighter condensed stack', async () => {
  const css = await readFile(previewCssUrl, 'utf8');

  assert.match(css, /select option\{/);
  assert.match(css, /background:#f4f1e8!important/);
  assert.match(css, /color:#0a2119!important/);
  assert.match(css, /@media\(min-width:701px\)/);
  assert.match(css, /--display:"Arial Narrow","Roboto Condensed","Helvetica Neue Condensed",sans-serif/);
  assert.match(css, /font-weight:700!important/);
});
