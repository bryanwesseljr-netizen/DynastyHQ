import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiUrl = new URL('../../api/newsroom-media.js', import.meta.url);
const firebaseUrl = new URL('../firebase.js', import.meta.url);

test('preview owner media uses the production DynastyHQ namespace because preview writes to the production career', async () => {
  const [apiSource, firebaseSource] = await Promise.all([
    readFile(apiUrl, 'utf8'),
    readFile(firebaseUrl, 'utf8'),
  ]);

  assert.match(apiSource, /const mediaNamespace = \(\) => 'dynasty-hq'/);
  assert.match(apiSource, /const ownerPrefix = \(userId\) => `\$\{mediaNamespace\(\)\}\/\$\{safePart\(userId, 'owner'\)\}\/newsroom-media\/`/);
  assert.match(firebaseSource, /export const productionAppId = 'dynasty-hq'/);
});
