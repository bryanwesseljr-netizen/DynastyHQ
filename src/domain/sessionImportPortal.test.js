import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const portalSourceUrl = new URL('../components/SessionImportPortal.jsx', import.meta.url);
const ownerEnhancementsUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const stylesUrl = new URL('../components/session-import.css', import.meta.url);
const appSourceUrl = new URL('../App.jsx', import.meta.url);

test('homepage Session Import opens a dedicated companion workspace instead of the old intake shortcut', async () => {
  const [portalSource, ownerSource] = await Promise.all([
    readFile(portalSourceUrl, 'utf8'),
    readFile(ownerEnhancementsUrl, 'utf8'),
  ]);

  assert.match(ownerSource, /import SessionImportPortal from '\.\/SessionImportPortal\.jsx';/);
  assert.match(ownerSource, /<SessionImportPortal \/>/);
  assert.match(portalSource, /button\.closest\('#dynastyhq-command-center'\)/);
  assert.match(portalSource, /\^import session\\b/i);
  assert.match(portalSource, /event\.stopImmediatePropagation\?\.\(\)/);
  assert.match(portalSource, /dhq-session-import-mode/);
});

test('Session Import keeps Game Data separate and hands the full selected batch to the verified game scanner', async () => {
  const [portalSource, appSource] = await Promise.all([
    readFile(portalSourceUrl, 'utf8'),
    readFile(appSourceUrl, 'utf8'),
  ]);

  assert.match(portalSource, /const MAX_SCREENSHOTS = 30;/);
  assert.match(portalSource, /next\.slice\(0, MAX_SCREENSHOTS\)/);
  assert.match(portalSource, /ANALYZE GAME DATA/);
  assert.match(portalSource, /hand(?:off)?GameFiles|handoffGameFiles/);
  assert.match(appSource, /const files = \[\.\.\.targetInput\.files\];/);
  assert.match(appSource, /for \(let index = 0; index < files\.length; index \+= 1\)/);
});

test('Session Import presents the three verified data lanes before Process Week', async () => {
  const portalSource = await readFile(portalSourceUrl, 'utf8');

  assert.match(portalSource, /1 · GAME DATA/);
  assert.match(portalSource, /2 · RTG STATUS/);
  assert.match(portalSource, /3 · COVERAGE DATA/);
  assert.match(portalSource, /4 · PROCESS WEEK/);
  assert.match(portalSource, /id="dhq-weekly-rtg-data-host"/);
  assert.match(portalSource, /id="dhq-weekly-coverage-data-host"/);
  assert.match(portalSource, /SKIP — NOTHING CHANGED/);
  assert.match(portalSource, /SKIP OPTIONAL COVERAGE/);
  assert.match(portalSource, /OPEN PROCESS WEEK/);
});

test('Session Import still reuses the verified game scanner and verification desk before Game Data is applied', async () => {
  const portalSource = await readFile(portalSourceUrl, 'utf8');

  assert.match(portalSource, /choose weekly screenshots/i);
  assert.match(portalSource, /new DataTransfer\(\)/);
  assert.match(portalSource, /input\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/);
  assert.match(portalSource, /\.dhq-postgame-review/);
  assert.match(portalSource, /\.dhq-agenda-v3-applied-ready/);
  assert.match(portalSource, /Nothing publishes from this screen/);
});

test('Session Import mounts the live React verification form inside its own scroll container', async () => {
  const [portal, panel, styles] = await Promise.all([
    readFile(portalSourceUrl, 'utf8'),
    readFile(new URL('../components/WeeklyReviewPanel.jsx', import.meta.url), 'utf8'),
    readFile(stylesUrl, 'utf8'),
  ]);
  assert.match(portal, /id="dhq-session-game-review-host"/);
  assert.match(panel, /createPortal\(panel, sessionHost\)/);
  assert.match(panel, /Apply Game Data & Continue to RTG Status/);
  assert.doesNotMatch(styles, /body\.dhq-session-import-review \.dhq-weekly-agenda-workspace/);
});

test('Session Import has responsive styling for the lane guide and Process Week summary', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /\.dhq-session-import__lane-guide/);
  assert.match(styles, /\.dhq-session-import__embedded-scanner/);
  assert.match(styles, /\.dhq-session-import__ready-summary/);
  assert.match(styles, /@media \(max-width: 720px\)/);
});


test('Session Import supports pinch zoom and native mobile scrolling without locking the body', async () => {
  const [portalSource, styles] = await Promise.all([
    readFile(portalSourceUrl, 'utf8'),
    readFile(stylesUrl, 'utf8'),
  ]);

  assert.doesNotMatch(portalSource, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(styles, /touch-action: pan-x pan-y pinch-zoom/);
  assert.match(styles, /-webkit-overflow-scrolling: touch/);
  assert.match(styles, /overflow-y: auto/);
});


test('Session Import advances only after the matching Game Data apply event', async () => {
  const [portal, app] = await Promise.all([readFile(portalSourceUrl, 'utf8'), readFile(appSourceUrl, 'utf8')]);
  assert.match(app, /dynastyhq:game-data-applied/);
  assert.match(portal, /event\.detail\?\.publicationId !== publicationId/);
  assert.match(portal, /dynastyhq:game-data-discarded/);
});

test('review flagged items focuses the form and the session owns the inbox mount', async () => {
  const [portal, process] = await Promise.all([
    readFile(portalSourceUrl, 'utf8'),
    readFile(new URL('../components/ProcessWeek2Portal.jsx', import.meta.url), 'utf8'),
  ]);
  assert.match(portal, /id="dhq-process-week2-inbox-host"/);
  assert.match(process, /dynastyhq:review-game-data/);
  assert.match(process, /#dhq-session-game-review-host \.dhq-postgame-review/);
  assert.match(process, /target\.focus/);
});
