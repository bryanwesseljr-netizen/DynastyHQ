import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('owner enhancements mount the zero-work immersion and universal podcast layers', () => {
  const owner = read('../components/OwnerEnhancements.jsx');
  assert.match(owner, /import ImmersionPortal from '\.\/ImmersionPortal\.jsx';/);
  assert.match(owner, /<ImmersionPortal \/>/);
  assert.match(owner, /import PodcastUniversalBrandPortal from '\.\/PodcastUniversalBrandPortal\.jsx';/);
  assert.match(owner, /<PodcastUniversalBrandPortal \/>/);
});

test('Game Day Live owns pregame storytelling while legacy immersion keeps postgame and career history', () => {
  const portal = read('../components/ImmersionPortal.jsx');
  const gameDay = read('../components/GameDayPregamePortal.jsx');

  assert.match(portal, /SEASON PULSE/);
  assert.match(portal, /DYNASTYHQ BROADCAST WRAP/);
  assert.match(portal, /Career Record Book/);
  assert.match(portal, /THE HUDDLE PODCAST/);
  assert.doesNotMatch(portal, /WHAT'S AT STAKE/);
  assert.doesNotMatch(portal, /MEMORY LANE/);

  assert.match(gameDay, /GAME DAY LIVE/);
  assert.match(gameDay, /WHAT'S AT STAKE/);
  assert.match(gameDay, /AROUND THE PROGRAM/);
  assert.match(gameDay, /PLAYER SPOTLIGHT/);
});
