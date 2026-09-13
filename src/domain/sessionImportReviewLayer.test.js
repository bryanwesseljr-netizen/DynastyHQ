import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mainUrl = new URL('../main.jsx', import.meta.url);
const cssUrl = new URL('../session-import-review-layer.css', import.meta.url);

test('Session Import Verify raises the real React review panel above the body overlay', async () => {
  const [main, css] = await Promise.all([
    readFile(mainUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
  ]);

  assert.match(main, /import '\.\/session-import-review-layer\.css'/);
  assert.match(css, /body\.dhq-session-import-review #root/);
  assert.match(css, /z-index:\s*10050\s*!important/);
  assert.match(css, /visibility:\s*hidden\s*!important/);
  assert.match(css, /#root \.dhq-postgame-review/);
  assert.match(css, /visibility:\s*visible\s*!important/);
  assert.match(css, /pointer-events:\s*auto\s*!important/);
});
