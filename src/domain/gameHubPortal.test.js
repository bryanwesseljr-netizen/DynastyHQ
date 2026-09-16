import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const gameHubUrl = new URL('../components/GameHubPortal.jsx', import.meta.url);
const gameHubBaseUrl = new URL('../components/GameHubPortalBase.jsx', import.meta.url);
const ownerEnhancementsUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const sessionImportUrl = new URL('../components/SessionImportPortal.jsx', import.meta.url);
const stylesUrl = new URL('../components/game-hub.css', import.meta.url);

test('Game Hub is mounted as a broadcast companion page instead of exposing Weekly Agenda by default', async () => {
  const [gameHub, gameHubBase, owner] = await Promise.all([
    readFile(gameHubUrl, 'utf8'),
    readFile(gameHubBaseUrl, 'utf8'),
    readFile(ownerEnhancementsUrl, 'utf8'),
  ]);

  assert.match(owner, /import GameHubPortal from '\.\/GameHubPortal\.jsx';/);
  assert.match(owner, /<GameHubPortal \/>/);
  assert.match(gameHub, /<GameHubPortalBase \/>/);
  assert.match(gameHub, /<GameHubOfficialMediaBridgePortal \/>/);
  assert.match(gameHub, /<GameHubStoryDirectorBridgePortal \/>/);
  assert.match(gameHubBase, /GAME HUB/);
  assert.match(gameHubBase, /THE GAME\. THE STORY\. THE IMPACT\./);
  assert.match(gameHubBase, /ADVANCED \/ CORRECTIONS/);
  assert.match(gameHubBase, /EA SPORTS NETWORK/);
  assert.match(gameHubBase, /DYNASTYHQ NEWSROOM/);
  assert.match(gameHubBase, /STORY DIRECTOR/);
});

test('Game Hub preserves the verified scanner through an explicit one-shot legacy pass-through', async () => {
  const [gameHubBase, sessionImport] = await Promise.all([
    readFile(gameHubBaseUrl, 'utf8'),
    readFile(sessionImportUrl, 'utf8'),
  ]);

  assert.match(gameHubBase, /window\.__dhqAllowLegacyGameHubOnce/);
  assert.match(sessionImport, /window\.__dhqAllowLegacyGameHubOnce = true;/);
  assert.match(sessionImport, /findButton\(\/\^game hub\$\/i\)/);
});

test('Game Hub can launch Session Import without routing through the old page', async () => {
  const [gameHubBase, sessionImport] = await Promise.all([
    readFile(gameHubBaseUrl, 'utf8'),
    readFile(sessionImportUrl, 'utf8'),
  ]);

  assert.match(gameHubBase, /dynastyhq:open-session-import/);
  assert.match(sessionImport, /addEventListener\('dynastyhq:open-session-import'/);
  assert.match(sessionImport, /CONTINUE TO GAME HUB/);
});

test('Game Hub matches the broadcast homepage framing and remains responsive', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /width: min\(1340px, calc\(100% - 44px\)\)/);
  assert.match(styles, /\.dhq-gh-hero/);
  assert.match(styles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 640px\)/);
});
