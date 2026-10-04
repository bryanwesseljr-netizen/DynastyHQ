import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../main.jsx', import.meta.url), 'utf8');
const preview = readFileSync(new URL('../option-a-preview/PreviewApp.jsx', import.meta.url), 'utf8');
const ownerEnhancements = readFileSync(new URL('../components/OwnerEnhancements.jsx', import.meta.url), 'utf8');
const portal = readFileSync(new URL('../components/WeeklyAgendaV2Portal.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../weekly-agenda-v2.css', import.meta.url), 'utf8');

test('default owner weekly workflow mounts through the redesign while the legacy agenda remains available to preserved flows', () => {
  assert.match(main, /const PreviewApp = lazy\(\(\) => import\('\.\/option-a-preview\/PreviewApp\.jsx'\)\)/);
  assert.match(main, /<PreviewApp \/>/);
  assert.match(preview, /<WeekProcessingCenter/);
  assert.match(preview, /REAL SCANNERS · DRAFT UNTIL CONFIRMED/);
  assert.match(ownerEnhancements, /import WeeklyAgendaV2Portal from '\.\/WeeklyAgendaV2Portal\.jsx'/);
  assert.match(ownerEnhancements, /<WeeklyAgendaV2Portal \/>/);
});

test('Weekly Agenda v2 exposes one consolidated legacy workspace shell', () => {
  assert.match(portal, /data-weekly-agenda-v3-shell/);
  assert.match(portal, /Weekly Agenda ·/);
  assert.match(portal, /Quick Import/);
  assert.match(portal, /Manual Entry/);
  assert.match(portal, /markTopLevelContaining/);
  assert.match(styles, /dhq-agenda-v3-shell/);
  assert.match(styles, /dhq-agenda-v2-duplicate-block/);
  assert.match(styles, /dhq-agenda-v2-manual-open/);
});
