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

test('automatic college coverage repair only patches Newsroom', async () => {
  const text = await source('../components/CollegeGameCoverageRepairPortal.jsx');
  assert.match(text, /transaction\.update\(ref/);
  assert.doesNotMatch(text, /transaction\.set\(ref/);
  assert.match(text, /newsroomIssues: repaired\.newsroomIssues/);
});

test('automatic career editorial sidecar only patches the fields it owns', async () => {
  const text = await source('../components/CareerEditorialEventPortal.jsx');
  assert.match(text, /transaction\.update\(careerRef/);
  assert.doesNotMatch(text, /transaction\.set\(careerRef/);
  assert.match(text, /factLedger: next\.factLedger/);
  assert.match(text, /newsroomIssues: next\.newsroomIssues/);
  assert.match(text, /careerTracking: next\.careerTracking/);
});
