import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../main.jsx', import.meta.url), 'utf8');
const portal = readFileSync(new URL('../components/WeeklyAgendaV2Portal.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../weekly-agenda-v2.css', import.meta.url), 'utf8');

test('Weekly Agenda v2 is mounted from the application entry point', () => {
  assert.match(main, /import WeeklyAgendaV2Portal from '\.\/components\/WeeklyAgendaV2Portal\.jsx'/);
  assert.match(main, /<WeeklyAgendaV2Portal \/>/);
});

test('Weekly Agenda v2 exposes one consolidated workspace shell', () => {
  assert.match(portal, /data-weekly-agenda-v3-shell/);
  assert.match(portal, /Weekly Agenda ·/);
  assert.match(portal, /Quick Import/);
  assert.match(portal, /Manual Entry/);
  assert.match(portal, /markTopLevelContaining/);
  assert.match(styles, /dhq-agenda-v3-shell/);
  assert.match(styles, /dhq-agenda-v2-duplicate-block/);
  assert.match(styles, /dhq-agenda-v2-manual-open/);
});
