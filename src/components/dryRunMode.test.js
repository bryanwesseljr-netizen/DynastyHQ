import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./DryRunModePortal.jsx', import.meta.url), 'utf8');
const ownerEnhancements = await readFile(new URL('./OwnerEnhancements.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('./dry-run-mode.css', import.meta.url), 'utf8');

test('dry run is session-scoped and blocks career-changing Weekly Agenda actions', () => {
  assert.match(source, /sessionStorage/);
  assert.match(source, /Apply\\b/i);
  assert.match(source, /Save\\b/i);
  assert.match(source, /Publish\\b/i);
  assert.match(source, /Finalize\\b/i);
  assert.match(source, /Process\\b/i);
  assert.match(source, /update game log/i);
  assert.match(source, /addEventListener\('click', blockClick, true\)/);
  assert.match(source, /addEventListener\('submit', blockSubmit, true\)/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /stopImmediatePropagation\(\)/);
});

test('dry run stays reviewable and visibly communicates no-save state', () => {
  assert.match(source, /Safe to use old screenshots/i);
  assert.match(source, /ON · NO SAVE/);
  assert.match(source, /Analyze and review normally/i);
  assert.match(styles, /DRY RUN · NO SAVE/);
  assert.match(styles, /data-dhq-dry-run-blocked/);
});

test('owner enhancements mount the dry run portal beside Weekly Data Intake', () => {
  assert.match(ownerEnhancements, /import DryRunModePortal/);
  const intakeIndex = ownerEnhancements.indexOf('<WeeklyDataIntakePortal />');
  const dryRunIndex = ownerEnhancements.indexOf('<DryRunModePortal />');
  assert.ok(intakeIndex >= 0 && dryRunIndex > intakeIndex);
});
