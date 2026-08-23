import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../main.jsx', import.meta.url), 'utf8');
const portal = readFileSync(new URL('../components/WeeklyAgendaV2Portal.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../weekly-agenda-v2-nav.css', import.meta.url), 'utf8');

test('Weekly Agenda v2 is mounted from the application entry point', () => {
  assert.match(main, /import WeeklyAgendaV2Portal from '\.\/components\/WeeklyAgendaV2Portal\.jsx'/);
  assert.match(main, /<WeeklyAgendaV2Portal \/>/);
  assert.match(main, /weekly-agenda-v2-nav\.css/);
});

test('Weekly Agenda v2 exposes an unmistakable workspace header and navigator', () => {
  assert.match(portal, /Weekly Agenda Workspace/);
  assert.match(portal, /data-agenda-v2-navigator/);
  assert.match(portal, /data-weekly-agenda-v2-header/);
  assert.match(portal, /data-agenda-quick-import/);
  assert.match(styles, /STREAMLINED WEEKLY WORKSPACE/);
  assert.match(styles, /dhq-agenda-v2-nav/);
});
