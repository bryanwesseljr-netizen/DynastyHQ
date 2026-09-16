import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGameWeekImmersion } from './gameWeekImmersion.js';

const baseState = {
  currentSeason: 2,
  currentWeek: 3,
  player: { college: 'Oregon' },
  gameLogs: [
    { season: 2, week: 2, stage: 'college', opponent: 'Baylor', homeScore: 21, awayScore: 45, result: 'L' },
  ],
};

const dashboard = { institution: 'Oregon', week: 3 };

test('pregame mode uses configured active opponent and carries last result into the story', () => {
  const state = {
    ...baseState,
    currentWeekSetup: {
      type: 'game', week: 3, opponent: 'UCLA', opponentRecord: '2-0', kickoff: '7:30 PM', venue: 'Autzen Stadium',
    },
  };
  const flow = { mode: 'active-week', activeWeek: { configured: true, week: 3, type: 'game' } };
  const model = buildGameWeekImmersion(state, dashboard, flow);

  assert.equal(model.mode, 'pregame');
  assert.equal(model.opponent, 'UCLA');
  assert.equal(model.center, 'VS');
  assert.equal(model.centerLine, '7:30 PM');
  assert.equal(model.keysTitle, '3 KEYS TO THE GAME');
  assert.equal(model.primaryLabel, 'OPEN GAME DAY');
  assert.equal(model.primaryTarget, 'gameHub');
  assert.equal(model.secondaryLabel, 'IMPORT AFTER GAME');
  assert.equal(model.secondaryTarget, 'importSession');
  assert.match(model.previous.copy, /loss against Baylor, 21-45/);
  assert.equal(model.scout.team, 'UCLA');
  assert.deepEqual(model.scout.facts.map((fact) => fact.value), ['2-0', '7:30 PM', 'Autzen Stadium']);
});

test('postgame mode turns the hero into a final and points to wrap-up work', () => {
  const flow = {
    mode: 'wrap-up',
    activeWeek: { configured: false, week: 3, type: 'game' },
    nextAction: { label: 'Open Podcast', target: 'podcast' },
    steps: [
      { label: 'Newsroom', state: 'complete' },
      { label: 'Podcast', state: 'pending' },
    ],
  };
  const model = buildGameWeekImmersion(baseState, dashboard, flow);

  assert.equal(model.mode, 'postgame');
  assert.equal(model.center, 'FINAL');
  assert.equal(model.centerLine, '21-45');
  assert.equal(model.primaryLabel, 'CONTINUE WRAP-UP');
  assert.equal(model.primaryTarget, 'podcast');
  assert.equal(model.secondaryLabel, 'VIEW WEEK HUB');
  assert.equal(model.secondaryTarget, 'gameHub');
  assert.equal(model.keysTitle, 'WEEK WRAP-UP');
  assert.match(model.keys[1].detail, /Podcast/);
});

test('between weeks mode holds the latest result until the new week is configured', () => {
  const flow = { mode: 'active-week', activeWeek: { configured: false, week: 3, type: 'game' } };
  const model = buildGameWeekImmersion(baseState, dashboard, flow);

  assert.equal(model.mode, 'between');
  assert.equal(model.opponent, 'Baylor');
  assert.equal(model.headline, 'THE NEXT CHAPTER AWAITS');
  assert.equal(model.center, 'FINAL');
  assert.equal(model.primaryLabel, 'SET UP WEEK 3');
  assert.equal(model.primaryTarget, 'agenda');
  assert.equal(model.secondaryLabel, 'VIEW LAST GAME');
  assert.equal(model.secondaryTarget, 'gameHub');
  assert.match(model.previous.copy, /Set up Week 3/);
});

test('college fallback ignores older high-school games and evaluation entries', () => {
  const state = {
    ...baseState,
    gameLogs: [
      { season: 1, week: 12, stage: 'high-school', opponent: 'Westview', homeScore: 35, awayScore: 14, result: 'W' },
      { season: 2, week: 1, stage: 'college', opponent: 'UTSA', homeScore: 31, awayScore: 20, result: 'W', evaluation: true },
      { season: 2, week: 2, stage: 'college', opponent: 'Baylor', homeScore: 21, awayScore: 45, result: 'L' },
    ],
  };
  const flow = { mode: 'active-week', activeWeek: { configured: false, week: 3, type: 'game' } };
  const model = buildGameWeekImmersion(state, dashboard, flow);

  assert.equal(model.latestGame.opponent, 'Baylor');
  assert.equal(model.opponent, 'Baylor');
  assert.equal(model.centerLine, '21-45');
});
