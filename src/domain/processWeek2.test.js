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
