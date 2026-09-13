import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiUrl = new URL('../../api/analyze-coverage-reference.js', import.meta.url);

test('coverage analysis recognizes EA SPORTS Network article context', async () => {
  const source = await readFile(apiUrl, 'utf8');
  assert.ok(source.includes("'ea_network_article'"));
  assert.ok(source.includes("'official_media'"));
  assert.ok(source.includes('EA SPORTS Network headline'));
  assert.ok(source.includes('OFFICIAL IN-GAME MEDIA CONTEXT'));
});
