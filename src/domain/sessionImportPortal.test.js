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

test('Session Import accepts up to 30 screenshots and the verified scanner can still process routed batches', async () => {
  const [portalSource, appSource] = await Promise.all([
    readFile(portalSourceUrl, 'utf8'),
    readFile(appSourceUrl, 'utf8'),
  ]);

  assert.match(portalSource, /const MAX_SCREENSHOTS = 30;/);
  assert.match(portalSource, /next\.slice\(0, MAX_SCREENSHOTS\)/);
  assert.match(appSource, /const files = \[\.\.\.targetInput\.files\];/);
  assert.match(appSource, /for \(let index = 0; index < files\.length; index \+= 1\)/);
});

test('Session Import uses guided Game, RTG and Coverage buckets before any specialized scanner receives files', async () => {
  const portalSource = await readFile(portalSourceUrl, 'utf8');

  assert.match(portalSource, /waitForSessionRouter/);
  assert.match(portalSource, /dynastyhq:session-import-files/);
  assert.match(portalSource, /guidedAssignments/);
  assert.match(portalSource, /Add Game Data/);
  assert.match(portalSource, /Add RTG Status/);
  assert.match(portalSource, /Add Coverage Data/);
  assert.match(portalSource, /No AI is spent guessing screenshot lanes/);
  assert.doesNotMatch(portalSource, /input\.dispatchEvent\(new Event\('change'/);
  assert.match(portalSource, /\.dhq-postgame-review/);
  assert.match(portalSource, /\.dhq-agenda-v3-applied-ready/);
  assert.match(portalSource, /PROCESS SESSION/);
});

test('Session Import surfaces a routing failure instead of hanging on the analyzing screen', async () => {
  const portalSource = await readFile(portalSourceUrl, 'utf8');

  assert.match(portalSource, /dynastyhq:session-routing-error/);
  assert.match(portalSource, /setPhase\('upload'\)/);
  assert.match(portalSource, /Nothing was applied/);
});

test('Session Import keeps the old agenda hidden while the review panel is presented as the verification desk', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /body\.dhq-session-import-review \.dhq-weekly-agenda-workspace/);
  assert.match(styles, /pointer-events: none !important/);
  assert.match(styles, /body\.dhq-session-import-review \.dhq-postgame-review/);
  assert.match(styles, /position: fixed !important/);
  assert.match(styles, /pointer-events: auto !important/);
});
