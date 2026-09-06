import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const htmlUrl = new URL('../../index.html', import.meta.url);
const skinUrl = new URL('../../public/broadcast-workspaces.css', import.meta.url);

test('sitewide broadcast workspace skin is loaded last in the document chrome', async () => {
  const html = await readFile(htmlUrl, 'utf8');
  const skinIndex = html.indexOf('/broadcast-workspaces.css');
  const priorIndex = html.indexOf('/college-career-card.css');
  assert.ok(skinIndex > priorIndex, 'broadcast workspace CSS should load after legacy workspace styles');
});

test('broadcast workspace skin covers every internal tab while leaving dashboard layout to its dedicated stylesheet', async () => {
  const css = await readFile(skinUrl, 'utf8');
  assert.match(css, /data-active-tab\]:not\(\[data-active-tab="dashboard"\]\)/);
  assert.match(css, /main\[data-active-tab="dataEntry"\]/);
  assert.match(css, /main\[data-active-tab="newsroom"\]/);
  assert.match(css, /main\[data-active-tab="chronicle"\]/);
  assert.match(css, /main\[data-active-tab="podcast"\]/);
  assert.match(css, /main\[data-active-tab="recruiting"\]/);
  assert.match(css, /main\[data-active-tab="frontOffice"\]/);
  assert.match(css, /main\[data-active-tab="offseason"\]/);
});

test('broadcast workspace skin carries the homepage visual tokens and mobile framing', async () => {
  const css = await readFile(skinUrl, 'utf8');
  assert.match(css, /--dhq-broadcast-red: #ee1637/);
  assert.match(css, /width: min\(1340px, calc\(100% - 44px\)\)/);
  assert.match(css, /linear-gradient\(155deg, rgba\(4,17,28,0\.95\), rgba\(2,10,17,0\.93\)\)/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /width: calc\(100% - 24px\)/);
});
