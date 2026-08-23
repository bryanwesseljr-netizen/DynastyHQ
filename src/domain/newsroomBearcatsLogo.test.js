import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('newsroom uses the supplied Bearcats PNG in intentional team-logo slots', async () => {
  const [styles, main, logo] = await Promise.all([
    readFile(new URL('../newsroom-bearcats-logo.css', import.meta.url), 'utf8'),
    readFile(new URL('../main.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../assets/bearcats-mark.png', import.meta.url)),
  ]);

  assert.equal(logo[0], 0x89);
  assert.equal(logo.subarray(1, 4).toString('ascii'), 'PNG');
  assert.ok(logo.length > 1000);
  assert.match(main, /newsroom-bearcats-logo\.css/);
  assert.match(styles, /\.dhq-bearcats-mark/);
  assert.match(styles, /\.dhq-bearcats-footer__left b/);
  assert.match(styles, /\.dhq-enquirer-footer__mark/);
  assert.match(styles, /url\('\.\/assets\/bearcats-mark\.png'\)/);
});
