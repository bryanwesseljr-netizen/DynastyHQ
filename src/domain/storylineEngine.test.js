import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStorylineEngine } from './storylineEngine.js';

const baseState = {
  currentSeason: 2,
  currentWeek: 4,
  player: { name: 'Sam Jones', college: 'Oregon', pos: 'QB' },
  rtg: { rank: 'QB1', coachTrust: 4821 },
  currentWeekSetup: { type: 'game', week: 4, opponent: 'UCLA', opponentRank: 18, opponentRecord: '3-0' },
  weeklyUpdates: [
    { season: 2, week: 1, rtgSnapshot: { rank: 'QB2' }, game: { stage: 'college', opponent: 'UTSA', result: 'W' } },
    { season: 2, week: 2, rtgSnapshot: { rank: 'QB2' }, game: { stage: 'college', opponent: 'Baylor', result: 'L' } },
    { season: 2, week: 3, rtgSnapshot: { rank: 'QB1' }, game: { stage: 'college', opponent: 'UCLA', result: 'W' } },
  ],
  gameLogs: [
    { season: 2, week: 1, stage: 'college', opponent: 'UTSA', homeScore: 31, awayScore: 20, result: 'W', passYds: 110, passTD: 1, rushYds: 20, rushTD: 0, int: 0 },
    { season: 2, week: 2, stage: 'college', opponent: 'Baylor', homeScore: 21, awayScore: 45, result: 'L', passYds: 205, passTD: 1, rushYds: 41, rushTD: 1, int: 3 },
    { season: 2, week: 3, stage: 'college', opponent: 'UCLA', homeScore: 34, awayScore: 28, result: 'W', passYds: 282, passTD: 3, rushYds: 67, rushTD: 1, int: 1 },
  ],
};

test('carries a verified role arc forward and recognizes the new starter chapter', () => {
  const model = buildStorylineEngine(baseState, { season: 2, week: 3, phase: 'postgame', opponent: 'UCLA' });

  assert.equal(model.roleArc.currentRole, 'QB1');
  assert.equal(model.roleArc.previousRole, 'QB2');
  assert.equal(model.roleArc.changedThisWeek, true);
  assert.ok(model.activeThreads.some((thread) => thread.key === 'role:qb1' && thread.changedThisWeek));
  assert.ok(model.activeThreads.some((thread) => thread.key === 'role:first-qb1-window'));
});

test('builds a response thread from the last loss during the next pregame', () => {
  const state = {
    ...baseState,
    currentWeek: 3,
    currentWeekSetup: { type: 'game', week: 3, opponent: 'UCLA' },
    gameLogs: baseState.gameLogs.slice(0, 2),
    weeklyUpdates: baseState.weeklyUpdates.slice(0, 2),
    rtg: { rank: 'QB2' },
  };
  const model = buildStorylineEngine(state, { season: 2, week: 3, phase: 'pregame', opponent: 'UCLA' });

  const response = model.activeThreads.find((thread) => thread.key === 'team:response-after-loss');
  assert.ok(response);
  assert.match(response.title, /Baylor loss/);
  assert.match(model.previous.copy, /loss against Baylor, 21-45/);
});

test('remembers opponent history and ranked context without inventing tendencies', () => {
  const model = buildStorylineEngine(baseState, { season: 2, week: 4, phase: 'pregame', opponent: 'UCLA' });

  const ranked = model.activeThreads.find((thread) => thread.key === 'opponent:ranked-matchup');
  const rematch = model.activeThreads.find((thread) => thread.key.startsWith('opponent:history:ucla'));
  assert.equal(ranked.title, 'UCLA is saved at No. 18');
  assert.ok(rematch);
  assert.match(rematch.detail, /Saved record against UCLA: 1-0/);
  assert.doesNotMatch(rematch.detail, /defense|scheme|pressure|coverage/i);
});

test('tracks verified performance arcs from saved stats', () => {
  const model = buildStorylineEngine(baseState, { season: 2, week: 3, phase: 'postgame', opponent: 'UCLA' });
  const impact = model.activeThreads.find((thread) => thread.key === 'performance:impact-game');

  assert.ok(impact);
  assert.match(impact.title, /349 total yards · 4 total TD/);
  assert.equal(impact.editorialUse, 'primary');
});

test('marks previously covered stable threads as background instead of pretending they are new', () => {
  const state = {
    ...baseState,
    newsroomIssues: [
      {
        season: 2,
        week: 3,
        publicationId: 'season-2-week-3',
        storylineThreads: [{ key: 'role:qb1' }],
      },
    ],
  };
  const model = buildStorylineEngine(state, { season: 2, week: 4, phase: 'pregame', opponent: 'UCLA' });
  const role = model.activeThreads.find((thread) => thread.key === 'role:qb1');

  assert.ok(role);
  assert.equal(role.recentlyCovered, true);
  assert.equal(role.editorialUse, 'background-only');
});

test('as-of-week context does not pull future games into an older story', () => {
  const model = buildStorylineEngine(baseState, { season: 2, week: 2, phase: 'postgame', opponent: 'Baylor' });

  assert.equal(model.latestGame.opponent, 'Baylor');
  assert.doesNotMatch(model.previous.copy, /UCLA/);
  assert.ok(model.activeThreads.some((thread) => thread.key === 'performance:turnover-watch'));
});
