import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProcessWeekInbox, classifyProcessWeekAnalysis } from './processWeek2.js';

test('classifies a verified game screen into useful Process Week buckets', () => {
  const categories = classifyProcessWeekAnalysis({
    screenTypes: ['box_score'],
    facts: [
      { key: 'game.result' },
      { key: 'game.homeScore' },
      { key: 'game.passYds' },
      { key: 'game.teamTotalYards' },
      { key: 'game.opponentRank' },
    ],
  });
  assert.deepEqual(categories.sort(), ['playerStats', 'rankings', 'result', 'teamStats'].sort());
});

test('recognizes official EA SPORTS Network article screens', () => {
  const categories = classifyProcessWeekAnalysis({
    screenTypes: ['ea_sports_network_article'],
    screenTitle: 'Ducks regroup after road loss',
    facts: [],
  });
  assert.deepEqual(categories, ['officialCoverage']);
});

test('marks applied verified session ready to publish when result exists and nothing needs review', () => {
  const inbox = buildProcessWeekInbox({
    analyses: [{ categories: ['result', 'playerStats'] }, { categories: ['officialCoverage'] }],
    expectedScreens: 2,
    review: { hasApplied: true, attention: 0, missing: 0 },
  });
  assert.equal(inbox.state, 'ready-to-publish');
  assert.equal(inbox.canPublish, true);
  assert.equal(inbox.counts.officialCoverage, 1);
});

test('keeps a session in attention state if final result is absent', () => {
  const inbox = buildProcessWeekInbox({
    analyses: [{ categories: ['playerStats'] }],
    expectedScreens: 1,
    review: { hasApplied: true, attention: 0, missing: 0 },
  });
  assert.equal(inbox.state, 'needs-attention');
  assert.equal(inbox.canPublish, false);
});


test('Process Week final publish uses the protected direct publisher instead of clicking legacy UI', async () => {
  const { readFile } = await import('node:fs/promises');
  const [portal, app] = await Promise.all([
    readFile(new URL('../components/ProcessWeek2Portal.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../App.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(portal, /dynastyhq:process-week-publish-request/);
  assert.doesNotMatch(portal, /roleplayBypass/);
  assert.doesNotMatch(portal, /button\.click\(\)/);
  assert.match(portal, /protected Week publisher did not answer/i);
  assert.match(app, /dynastyhq:process-week-publish-request/);
  assert.match(app, /createPublishedWeek\(/);
  assert.match(app, /persistCloudState\(/);
  assert.match(app, /clearDraftAfterSave: true/);
});


test('Process Week publish button has a mobile pointer-release fallback without double firing', async () => {
  const { readFile } = await import('node:fs/promises');
  const [portal, styles] = await Promise.all([
    readFile(new URL('../components/ProcessWeek2Portal.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/process-week-2.css', import.meta.url), 'utf8'),
  ]);

  assert.match(portal, /data-dhq-publish-week="true"/);
  assert.match(portal, /onPointerUp=\{publishFromPointer\}/);
  assert.match(portal, /Date\.now\(\) - pointerPublishRef\.current < 900/);
  assert.match(portal, /touchAction: 'manipulation'/);
  assert.match(styles, /\.dhq-process2-confirm__actions button[\s\S]*pointer-events: auto/);
  assert.match(styles, /touch-action: manipulation/);
});


test('Process Week visibly reports an active master save and disables modal exit while saving', async () => {
  const { readFile } = await import('node:fs/promises');
  const portal = await readFile(new URL('../components/ProcessWeek2Portal.jsx', import.meta.url), 'utf8');

  assert.match(portal, /Saving the verified week to your career/);
  assert.match(portal, /master save is being committed first/);
  assert.match(portal, /disabled=\{busy\}/);
  assert.match(portal, /SAVE IN PROGRESS/);
});


test('direct Process Week publisher rebuilds its canonical game from verified draft facts and opens postgame Newsroom', async () => {
  const { readFile } = await import('node:fs/promises');
  const app = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');

  assert.ok(app.includes('const verifiedGameFacts = new globalThis.Map('));
  assert.match(app, /draft\.gamePatch\?\.opponent/);
  assert.match(app, /verifiedGameFacts\.get\('game\.opponent'\)/);
  assert.match(app, /currentState\.currentWeekSetup\?\.opponent/);
  assert.match(app, /game: publishGame/);
  assert.match(app, /setNewsroomFocusId\(target\.weekKey\)/);
  assert.match(app, /setPodcastFocusId\(target\.weekKey\)/);
  assert.match(app, /setActiveTab\('newsroom'\)/);
});

test('LIVE Week 7 postgame repair is explicit and backed up before writing', async () => {
  const { readFile } = await import('node:fs/promises');
  const app = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');

  assert.match(app, /repairSeason4Week7Postgame=purdue|repairSeason4Week7Postgame/);
  assert.match(app, /before-season4-week7-postgame-repair-/);
  assert.match(app, /inspectSeason4Week7PostgameRepair/);
  assert.match(app, /repairSeason4Week7Postgame\(remoteState\)/);
  assert.match(app, /Backup \+ Rebuild Week 7 Postgame/);
  assert.match(app, /Week 7 Purdue postgame record rebuilt from the verified Week 7 Fact Ledger/);
});


test('completed Week 7 repair URL clears itself and never reopens the repair splash', async () => {
  const { readFile } = await import('node:fs/promises');
  const app = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');

  assert.match(app, /week7PostgameInspection\.needsRepair/);
  assert.match(app, /searchParams\.delete\('repairSeason4Week7Postgame'\)/);
  assert.match(app, /loadedOwnerId === userState\.uid/);
  assert.match(app, /repairSeason4Week7PostgameMode[\s\S]*week7PostgameInspection\.needsRepair && \(/);
});


test('direct Week publisher uses the native Map constructor, not the Lucide Map icon', async () => {
  const { readFile } = await import('node:fs/promises');
  const app = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');

  assert.match(app, /const verifiedGameFacts = new globalThis\.Map\(/);
  assert.doesNotMatch(app, /const verifiedGameFacts = new Map\(/);
});
