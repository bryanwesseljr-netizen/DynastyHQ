import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mainUrl = new URL('../main.jsx', import.meta.url);
const portalUrl = new URL('../components/WeeklyAgendaV2Portal.jsx', import.meta.url);
const stylesUrl = new URL('../weekly-agenda-v2.css', import.meta.url);
const appUrl = new URL('../App.jsx', import.meta.url);

test('weekly agenda v2 mounts without replacing the existing weekly engine', async () => {
  const [main, portal, app] = await Promise.all([
    readFile(mainUrl, 'utf8'),
    readFile(portalUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);

  assert.match(main, /import WeeklyAgendaV2Portal from '\.\/components\/WeeklyAgendaV2Portal\.jsx'/);
  assert.match(main, /<WeeklyAgendaV2Portal \/>/);
  assert.match(portal, /document\.querySelector\('\.dhq-weekly-agenda-workspace'\)/);
  assert.match(portal, /findUniversalScannerInput/);
  assert.match(portal, /input\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/);
  assert.match(app, /const analyzeScreenshotFiles = async/);
  assert.match(app, /<WeeklyReviewPanel/);
  assert.match(app, /handleApplyScanDraft/);
});

test('weekly agenda quick import keeps screenshots and menu video as parallel options', async () => {
  const portal = await readFile(portalUrl, 'utf8');

  assert.match(portal, />Screenshots</);
  assert.match(portal, />Menu Video</);
  assert.match(portal, /accept="image\/\*" multiple/);
  assert.match(portal, /accept="video\/mp4,video\/quicktime,video\/x-m4v,video\/webm,video\/\*"/);
  assert.match(portal, /extractMenuVideoFrames/);
  assert.match(portal, /slice\(0, MAX_SCREENSHOTS\)/);
  assert.match(portal, /Nothing changes until you review and apply the extracted facts/);
});

test('weekly agenda v2 preserves guided high school import and the four existing work cards', async () => {
  const [portal, app] = await Promise.all([
    readFile(portalUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);

  assert.match(portal, /guided high-school scanner/i);
  assert.match(portal, /Open guided import/);
  const agendaCardOrder = [...app.matchAll(/data-agenda-card="([1-4])"/g)].map((match) => match[1]);
  assert.deepEqual(agendaCardOrder, ['1', '2', '3', '4']);
  assert.match(app, /dhq-weekly-agenda-milestone/);
  assert.match(app, /dhq-agenda-game-log-drawer/);
});

test('weekly agenda v2 styling flattens the card hierarchy and keeps publish actions reachable', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /\.dhq-weekly-agenda-v2 \.dhq-weekly-agenda-side-stack \{\s*display: contents !important;/);
  assert.match(styles, /\.dhq-weekly-agenda-v2 \.dhq-weekly-agenda-grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important;/);
  assert.match(styles, /\.dhq-weekly-agenda-v2 \.dhq-agenda-v2-legacy-scanner \{\s*display: none !important;/);
  assert.match(styles, /\.dhq-weekly-agenda-v2 \.dhq-agenda-v2-actions \{[\s\S]*?position: sticky;[\s\S]*?bottom: 10px;/);
  assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?grid-template-columns: 1fr !important;/);
});
