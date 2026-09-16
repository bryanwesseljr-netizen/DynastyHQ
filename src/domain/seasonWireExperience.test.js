import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

test('site-wide season wire replaces the static score ticker with useful career signals', async () => {
  const [owner, wire, styles] = await Promise.all([
    readSource('../components/OwnerEnhancements.jsx'),
    readSource('../components/SeasonWirePortal.jsx'),
    readSource('../components/season-wire.css'),
  ]);

  assert.ok(owner.includes("import SeasonWirePortal from './SeasonWirePortal.jsx'"));
  assert.ok(owner.includes('<SeasonWirePortal />'));
  for (const label of ['SEASON WIRE', 'PLAYER LINE', 'NEWSROOM', 'THE STORY', 'THE HUDDLE']) {
    assert.ok(wire.includes(label), `missing useful Season Wire signal: ${label}`);
  }
  assert.equal(wire.includes('verified official-coverage facts preserved'), false);
  assert.ok(styles.includes('.dhq-score-ticker[data-dhq-season-wire="true"]'));
  assert.ok(styles.includes('@keyframes dhq-season-wire-scroll'));
  assert.ok(styles.includes('prefers-reduced-motion'));
});

test('Game Hub overview keeps a compact season schedule in context', async () => {
  const [owner, portal, styles] = await Promise.all([
    readSource('../components/OwnerEnhancements.jsx'),
    readSource('../components/GameHubOverviewSchedulePortal.jsx'),
    readSource('../components/game-hub-overview-schedule.css'),
  ]);

  assert.ok(owner.includes("import GameHubOverviewSchedulePortal from './GameHubOverviewSchedulePortal.jsx'"));
  assert.ok(owner.includes('<GameHubOverviewSchedulePortal />'));
  assert.ok(portal.includes('SEASON SNAPSHOT'));
  assert.ok(portal.includes('WHERE THIS GAME FITS'));
  assert.ok(portal.includes('FULL SCHEDULE'));
  assert.ok(styles.includes('.dhq-v3-overview-schedule__track'));
  assert.ok(styles.includes('.is-selected'));
});
