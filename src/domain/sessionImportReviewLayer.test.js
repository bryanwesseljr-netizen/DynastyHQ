import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mainUrl = new URL('../main.jsx', import.meta.url);
const cssUrl = new URL('../session-import-review-layer.css', import.meta.url);

test('Session Import Verify lets the live React review escape the app root stacking box', async () => {
  const [main, css] = await Promise.all([
    readFile(mainUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
  ]);

  assert.match(main, /import '\.\/session-import-review-layer\.css'/);
  assert.match(css, /body\.dhq-session-import-review #root/);
  assert.match(css, /display:\s*contents\s*!important/);
  assert.doesNotMatch(css, /visibility:\s*hidden\s*!important/);
  assert.doesNotMatch(css, /z-index:\s*10050\s*!important/);
  assert.match(css, /body\.dhq-session-import-review \.dhq-postgame-review/);
  assert.match(css, /visibility:\s*visible\s*!important/);
  assert.match(css, /pointer-events:\s*auto\s*!important/);
});

test('Session Import Verify makes the overlay transparent and click-through on mobile', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /\.dhq-session-import\.is-review\s*\{/);
  assert.match(css, /background:\s*transparent\s*!important/);
  assert.match(css, /backdrop-filter:\s*none\s*!important/);
  assert.match(css, /pointer-events:\s*none\s*!important/);
  assert.match(css, /\.dhq-session-import\.is-review \.dhq-session-import__stadium/);
  assert.match(css, /display:\s*none\s*!important/);
  assert.match(css, /\.dhq-session-import\.is-review \.dhq-session-import__topbar/);
  assert.match(css, /\.dhq-session-import\.is-review \.dhq-session-import__stepbar/);
  assert.match(css, /pointer-events:\s*auto\s*!important/);
  assert.match(css, /\.dhq-session-import\.is-review \.dhq-session-import__review-heading/);
});
