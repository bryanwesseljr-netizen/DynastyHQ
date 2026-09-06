import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const portalSourceUrl = new URL('../components/SessionImportPortal.jsx', import.meta.url);
const ownerEnhancementsUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const stylesUrl = new URL('../components/session-import.css', import.meta.url);

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

test('Session Import reuses the verified scanner and verification desk before anything is applied', async () => {
  const portalSource = await readFile(portalSourceUrl, 'utf8');

  assert.match(portalSource, /choose weekly screenshots/i);
  assert.match(portalSource, /new DataTransfer\(\)/);
  assert.match(portalSource, /input\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/);
  assert.match(portalSource, /\.dhq-postgame-review/);
  assert.match(portalSource, /\.dhq-agenda-v3-applied-ready/);
  assert.match(portalSource, /Nothing is published automatically/);
  assert.match(portalSource, /PROCESS SESSION/);
});

test('Session Import keeps the old agenda hidden while the review panel is presented as the verification desk', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /body\.dhq-session-import-review \.dhq-weekly-agenda-workspace/);
  assert.match(styles, /pointer-events: none !important/);
  assert.match(styles, /body\.dhq-session-import-review \.dhq-postgame-review/);
  assert.match(styles, /position: fixed !important/);
  assert.match(styles, /pointer-events: auto !important/);
});
