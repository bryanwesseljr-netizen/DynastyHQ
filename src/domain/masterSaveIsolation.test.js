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


test('supplemental data lanes acknowledge the protected save handler before waiting on archive persistence', async () => {
  const [app, coverage, rtg] = await Promise.all([
    source('../App.jsx'),
    source('../components/CoverageDataIntakePortal.jsx'),
    source('../components/RtgStatusIntakePortal.jsx'),
  ]);

  assert.match(app, /const handleCoverageDataSave = \(event\) => \{\s+const detail = event\?\.detail \|\| \{\};\s+detail\.acknowledge\?\.\(\);/);
  assert.match(app, /const handleRtgStatusSave = \(event\) => \{\s+const detail = event\?\.detail \|\| \{\};\s+detail\.acknowledge\?\.\(\);/);

  assert.match(coverage, /let acknowledged = false;/);
  assert.match(coverage, /acknowledge,/);
  assert.match(coverage, /if \(!acknowledged && !settled\)/);
  assert.doesNotMatch(coverage, /5000/);

  assert.match(rtg, /let acknowledged = false;/);
  assert.match(rtg, /acknowledge,/);
  assert.match(rtg, /if \(!acknowledged && !settled\)/);
  assert.doesNotMatch(rtg, /12000/);
});
