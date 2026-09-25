import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const gameHubUrl = new URL('../components/GameHubPortal.jsx', import.meta.url);
const ownerEnhancementsUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const sessionImportUrl = new URL('../components/SessionImportPortal.jsx', import.meta.url);
const stylesUrl = new URL('../components/game-hub.css', import.meta.url);

test('Game Hub is mounted as a broadcast companion page instead of exposing Weekly Agenda by default', async () => {
  const [gameHub, owner] = await Promise.all([
    readFile(gameHubUrl, 'utf8'),
    readFile(ownerEnhancementsUrl, 'utf8'),
  ]);

  assert.match(owner, /import GameHubPortal from '\.\/GameHubPortal\.jsx';/);
  assert.match(owner, /<GameHubPortal \/>/);
  assert.match(gameHub, /GAME HUB/);
  assert.match(gameHub, /THE GAME\. THE STORY\. THE IMPACT\./);
  assert.match(gameHub, /ADVANCED \/ CORRECTIONS/);
  assert.match(gameHub, /EA SPORTS NETWORK/);
  assert.match(gameHub, /DYNASTYHQ NEWSROOM/);
  assert.match(gameHub, /STORY DIRECTOR/);
});

test('Game Hub and Session Import use canonical routing for the verified scanner', async () => {
  const [gameHub, sessionImport] = await Promise.all([
    readFile(gameHubUrl, 'utf8'),
    readFile(sessionImportUrl, 'utf8'),
  ]);

  assert.doesNotMatch(gameHub, /__dhqAllowLegacyGameHubOnce/);
  assert.match(sessionImport, /import \{ requestNavigation \} from '\.\.\/domain\/navigationBus\.js';/);
  assert.match(sessionImport, /requestNavigation\('importSession'\)/);
  assert.doesNotMatch(sessionImport, /__dhqAllowLegacyGameHubOnce/);
  assert.doesNotMatch(sessionImport, /findButton\(\/\^game hub\$\/i\)/);
});

test('Game Hub can launch Session Import and the redesigned session hands back to Process Week', async () => {
  const [gameHub, sessionImport] = await Promise.all([
    readFile(gameHubUrl, 'utf8'),
    readFile(sessionImportUrl, 'utf8'),
  ]);

  assert.match(gameHub, /dynastyhq:open-session-import/);
  assert.match(sessionImport, /addEventListener\('dynastyhq:open-session-import'/);
  assert.match(sessionImport, /OPEN PROCESS WEEK/);
  assert.match(sessionImport, /closeWorkspace\(\{ focusApplied: true \}\)/);
});

test('Game Hub matches the broadcast homepage framing and remains responsive', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /width: min\(1340px, calc\(100% - 44px\)\)/);
  assert.match(styles, /\.dhq-gh-hero/);
  assert.match(styles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 640px\)/);
});


test('Game Hub opens on the current week and exposes the no-appearance and verified-data shortcuts', async () => {
  const [gameHub, sessionImport] = await Promise.all([
    readFile(gameHubUrl, 'utf8'),
    readFile(sessionImportUrl, 'utf8'),
  ]);

  assert.match(gameHub, /useState\('current'\)/);
  assert.match(gameHub, /setSelection\('current'\)/);
  assert.match(gameHub, /I DID NOT PLAY/);
  assert.match(gameHub, /VERIFIED DATA TOOLS/);
  assert.match(gameHub, /detail: \{ noAppearance: true \}/);
  assert.match(sessionImport, /noAppearanceMode/);
  assert.match(sessionImport, /value = 'no-appearance'/);
  assert.match(sessionImport, /NOT NEEDED/);
});


test('backup season mode is exposed from Game Hub only for saved backup roles', async () => {
  const [gameHub, gameDay, owner, backupPortal] = await Promise.all([
    readFile(gameHubUrl, 'utf8'),
    readFile(new URL('../components/GameDayPregamePortal.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/OwnerEnhancements.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/BackupSeasonPortal.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(gameHub, /FAST-FORWARD BACKUP WEEKS/);
  assert.match(gameHub, /isBackupRole\(model\.rtg\?\.rank\)/);
  assert.match(gameDay, /isBackupRole\(live\.player\?\.role\)/);
  assert.match(owner, /<BackupSeasonPortal \/>/);
  assert.match(backupPortal, /dynastyhq:open-backup-season-mode/);
  assert.match(backupPortal, /Skip the weekly homework/);
  assert.match(backupPortal, /Record several games now — or do them later/);
});
