import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routerUrl = new URL('../services/sessionScreenshotRouterClient.js', import.meta.url);

test('Session Import routes EA SPORTS Network articles to editorial coverage', async () => {
  const source = await readFile(routerUrl, 'utf8');
  assert.match(source, /coverageType === 'ea_network_article'/);
  assert.match(source, /screenType: 'ea_network_article'/);
  assert.match(source, /EA SPORTS Network article is official in-game media context/);
});
