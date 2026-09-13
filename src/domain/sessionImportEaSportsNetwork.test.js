import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routerUrl = new URL('../services/sessionScreenshotRouterClient.js', import.meta.url);
const coverageApiUrl = new URL('../../api/analyze-coverage-reference.js', import.meta.url);

test('Session Import routes EA SPORTS Network articles to editorial coverage in the first pass', async () => {
  const [routerSource, apiSource] = await Promise.all([
    readFile(routerUrl, 'utf8'),
    readFile(coverageApiUrl, 'utf8'),
  ]);

  assert.match(routerSource, /scanKind: 'route'/);
  assert.match(apiSource, /EA SPORTS Network article screenshots MUST use screenType=ea_network_article and lane coverage/);
  assert.match(apiSource, /'ea_network_article'/);
  assert.match(apiSource, /items: \{ type: 'string', enum: \['game', 'rtg', 'coverage', 'high_school'\] \}/);
});
