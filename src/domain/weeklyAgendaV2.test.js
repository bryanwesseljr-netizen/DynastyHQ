import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mainUrl = new URL('../main.jsx', import.meta.url);
const ownerEnhancementsUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const portalUrl = new URL('../components/WeeklyAgendaV2Portal.jsx', import.meta.url);
const stylesUrl = new URL('../weekly-agenda-v2.css', import.meta.url);
const appUrl = new URL('../App.jsx', import.meta.url);

test('weekly agenda v2 mounts without replacing the existing weekly engine', async () => {
  const [main, ownerEnhancements, portal, app] = await Promise.all([
    readFile(mainUrl, 'utf8'),
    readFile(ownerEnhancementsUrl, 'utf8'),
    readFile(portalUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);

  assert.match(main, /import OwnerEnhancements from '\.\/components\/OwnerEnhancements\.jsx'/);
  assert.match(main, /<OwnerEnhancements \/>/);
  assert.match(ownerEnhancements, /import WeeklyAgendaV2Portal from '\.\/WeeklyAgendaV2Portal\.jsx'/);
  assert.match(ownerEnhancements, /<WeeklyAgendaV2Portal \/>/);
  assert.match(portal, /const appRoot = document\.getElementById\('root'\)/);
  assert.match(portal, /appRoot\.querySelector\('\.dhq-weekly-agenda-workspace'\)/);
  assert.match(portal, /observer\.observe\(appRoot, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(portal, /observer\.observe\(document\.body/);
  assert.match(portal, /findUniversalScannerInput/);
  assert.match(portal, /input\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/);
  assert.match(app, /const analyzeScreenshotFiles = async/);
  assert.match(app, /<WeeklyReviewPanel/);
  assert.match(app, /handleApplyScanDraft/);
});

test('weekly agenda keeps screenshots and menu video as parallel import options', async () => {
  const portal = await readFile(portalUrl, 'utf8');

  assert.match(portal, />Screenshots</);
  assert.match(portal, />Menu Video</);
  assert.match(portal, /accept="image\/\*" multiple/);
  assert.match(portal, /accept="video\/mp4,video\/quicktime,video\/x-m4v,video\/webm,video\/\*"/);
  assert.match(portal, /extractMenuVideoFrames/);
  assert.match(portal, /slice\(0, MAX_SCREENSHOTS\)/);
  assert.match(portal, /Nothing is written to the career until the extracted facts are reviewed and applied/);
});

test('weekly agenda consolidates duplicate workflow blocks instead of stacking them', async () => {
  const [portal, styles] = await Promise.all([
    readFile(portalUrl, 'utf8'),
    readFile(stylesUrl, 'utf8'),
  ]);

  assert.match(portal, /college game week command center/i);
  assert.match(portal, /faster weekly entry/i);
  assert.match(portal, /postgame\\s\*\[·•-\]\\s\*postgame scanner/i);
  assert.match(styles, /\.dhq-weekly-agenda-v2 \.dhq-agenda-v2-duplicate-block/);
  assert.match(styles, /\.dhq-weekly-agenda-v2 #dhq-gameweek-flow-agenda/);
  assert.match(styles, /\.dhq-weekly-agenda-v2 \[data-rtg-status-scanner\]/);
  assert.match(styles, /display: none !important;/);
});

test('weekly agenda makes setup, manual entry, and milestone progressive disclosure', async () => {
  const [portal, styles, app] = await Promise.all([
    readFile(portalUrl, 'utf8'),
    readFile(stylesUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);

  assert.match(portal, /setupOpen/);
  assert.match(portal, /manualOpen/);
  assert.match(portal, /moreOpen/);
  assert.match(portal, /Manual Entry/);
  assert.match(portal, /Milestone/);
  assert.match(styles, /dhq-agenda-v2-setup-open/);
  assert.match(styles, /dhq-agenda-v2-manual-open/);
  assert.match(styles, /dhq-agenda-v2-more-open/);
  assert.match(styles, /\.dhq-weekly-agenda-v2 \.dhq-weekly-agenda-grid \{[\s\S]*?display: none !important;/);
  assert.match(styles, /\.dhq-weekly-agenda-v2\.dhq-agenda-v2-manual-open \.dhq-weekly-agenda-grid \{ display: grid !important; \}/);
  const agendaCardOrder = [...app.matchAll(/data-agenda-card="([1-4])"/g)].map((match) => match[1]);
  assert.deepEqual(agendaCardOrder, ['1', '2', '3', '4']);
});

test('weekly agenda keeps publish reachable and scanner review visible when it exists', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /\.dhq-weekly-agenda-v2 \.dhq-postgame-review/);
  assert.match(styles, /\.dhq-weekly-agenda-v2 \.dhq-agenda-v2-actions \{[\s\S]*?position: sticky;[\s\S]*?bottom: 8px;/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*?grid-template-columns: 1fr !important;/);
});
