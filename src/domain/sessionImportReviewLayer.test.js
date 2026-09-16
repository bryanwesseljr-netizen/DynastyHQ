import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mainUrl = new URL('../main.jsx', import.meta.url);
const cssUrl = new URL('../session-import-review-layer.css', import.meta.url);

test('Session Import Verify pins the app root to the viewport and exposes only the live React review', async () => {
  const [main, css] = await Promise.all([
    readFile(mainUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
  ]);

  assert.match(main, /import '\.\/session-import-review-layer\.css'/);
  assert.match(css, /body\.dhq-session-import-review #root\s*\{/);
  assert.match(css, /position:\s*fixed\s*!important/);
  assert.match(css, /inset:\s*0\s*!important/);
  assert.match(css, /z-index:\s*10050\s*!important/);
  assert.match(css, /visibility:\s*hidden\s*!important/);
  assert.match(css, /pointer-events:\s*none\s*!important/);
  assert.match(css, /main\.dhq-page-main\[data-active-tab="dataEntry"\]/);
  assert.match(css, /#root \.dhq-weekly-agenda-workspace/);
  assert.match(css, /display:\s*contents\s*!important/);
  assert.match(css, /#root \.dhq-postgame-review/);
  assert.match(css, /visibility:\s*visible\s*!important/);
  assert.match(css, /pointer-events:\s*auto\s*!important/);
});

test('Session Import Verify keeps an opaque shell and removes the empty review-flow spacer', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /\.dhq-session-import\.is-review\s*\{/);
  assert.doesNotMatch(css, /background:\s*transparent\s*!important/);
  assert.match(css, /background:\s*rgba\(2, 8, 14, 0\.96\)\s*!important/);
  assert.match(css, /pointer-events:\s*none\s*!important/);
  assert.match(css, /overflow:\s*hidden\s*!important/);
  assert.match(css, /\.dhq-session-import\.is-review \.dhq-session-import__topbar/);
  assert.match(css, /\.dhq-session-import\.is-review \.dhq-session-import__stepbar/);
  assert.match(css, /pointer-events:\s*auto\s*!important/);
  assert.match(css, /\.dhq-session-import\.is-review \.dhq-session-import__main\s*\{/);
  assert.match(css, /display:\s*none\s*!important/);
});
