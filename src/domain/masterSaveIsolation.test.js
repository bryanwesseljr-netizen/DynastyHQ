import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('automatic Official Coverage sidecar never replaces the whole master career', async () => {
  const text = await source('../components/OfficialCoverageCapturePortal.jsx');
  assert.match(text, /transaction\.update\(ref/);
  assert.doesNotMatch(text, /transaction\.set\(ref/);
  assert.match(text, /eaSportsNetworkArticles: articles/);
});

test('automatic college coverage repair updates the hydrated archive-aware career', async () => {
  const text = await source('../components/CollegeGameCoverageRepairPortal.jsx');
  assert.match(text, /readHydratedCareerInTransaction/);
  assert.match(text, /writeHydratedCareerInTransaction/);
  assert.doesNotMatch(text, /transaction\.update\(ref/);
});

test('automatic career editorial sidecar updates the hydrated archive-aware career', async () => {
  const text = await source('../components/CareerEditorialEventPortal.jsx');
  assert.match(text, /readHydratedCareerInTransaction/);
  assert.match(text, /writeHydratedCareerInTransaction/);
  assert.doesNotMatch(text, /transaction\.update\(careerRef/);
  assert.match(text, /buildCareerEventPublication\(remote\)/);
});
