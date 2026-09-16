import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiUrl = new URL('../../api/newsroom-media.js', import.meta.url);
const firebaseUrl = new URL('../firebase.js', import.meta.url);

test('newsroom media upload uses the same production and preview namespaces as Firebase career storage', async () => {
  const [apiSource, firebaseSource] = await Promise.all([
    readFile(apiUrl, 'utf8'),
    readFile(firebaseUrl, 'utf8'),
  ]);

  assert.match(apiSource, /process\.env\.VERCEL_ENV === 'production' \? 'dynasty-hq' : 'dynasty-hq-preview'/);
  assert.match(apiSource, /const ownerPrefix = \(userId\) => `\$\{mediaNamespace\(\)\}\/\$\{safePart\(userId, 'owner'\)\}\/newsroom-media\/`/);
  assert.match(firebaseSource, /isPreviewDeployment \? 'dynasty-hq-preview' : productionAppId/);
});
