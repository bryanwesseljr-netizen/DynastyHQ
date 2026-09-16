import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const portal = readFileSync(new URL('./GameDayPregamePortal.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./game-day-pregame.css', import.meta.url), 'utf8');
const ownerEnhancements = readFileSync(new URL('./OwnerEnhancements.jsx', import.meta.url), 'utf8');

test('Game Day portal replaces only the active pregame grid', () => {
  assert.match(portal, /\.dhq-gh-hero\.is-pregame/);
  assert.match(portal, /dhq-gh-pregame-grid--enhanced-hidden/);
  assert.match(portal, /progress\.insertAdjacentElement\('afterend'/);
  assert.match(styles, /\.dhq-gh-pregame-grid--enhanced-hidden\s*\{[\s\S]*display:\s*none\s*!important/);
});

test('Game Day brief exposes the immersive pregame modules and postgame handoff', () => {
  assert.match(portal, /PREVIOUSLY ON DYNASTYHQ/);
  assert.match(portal, /3 KEYS TO THE GAME/);
  assert.match(portal, /OPPONENT SCOUT/);
  assert.match(portal, /PLAYER GAME DAY/);
  assert.match(portal, /STORYLINES TO WATCH/);
  assert.match(portal, /GAME DAY HANDOFF/);
  assert.match(portal, /dynastyhq:open-session-import/);
  assert.match(portal, /IMPORT AFTER GAME/);
});

test('Game Day portal is mounted and stacks to one column on mobile', () => {
  assert.match(ownerEnhancements, /<GameDayPregamePortal \/>/);
  assert.match(styles, /@media \(max-width: 767px\)/);
  assert.match(styles, /\.dhq-gameday__editorial-grid,[\s\S]*\.dhq-gameday__lower-grid[\s\S]*grid-template-columns:\s*1fr/);
});
