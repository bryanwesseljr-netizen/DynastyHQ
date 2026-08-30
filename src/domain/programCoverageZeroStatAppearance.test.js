import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProgramCoverageContext } from './programCoverage.js';

const issue = {
  id: 'season-2-week-2',
  publicationId: 'season-2-week-2',
  season: 2,
  week: 2,
  weekType: 'game',
  careerPhase: 'Player',
};

const baseGame = {
  opponent: 'Missouri State',
  result: 'W',
  homeScore: 42,
  awayScore: 10,
  passYds: 0,
  passTD: 0,
  rushYds: 0,
  rushTD: 0,
  int: 0,
  season: 2,
  week: 2,
};

const stateFor = (game) => ({
  player: { name: 'Tracked QB', school: 'Cincinnati', college: 'Cincinnati', isCommitted: true },
  rtg: { rank: 'QB3' },
  weeklyUpdates: [{
    id: 'season-2-week-2',
    weekKey: 'season-2-week-2',
    season: 2,
    week: 2,
    careerPhase: 'Player',
    weekType: 'game',
    game,
    rtgSnapshot: { rank: 'QB3' },
  }],
  gameLogs: [game],
  factLedger: [],
});

test('all-zero QB stats do not imply an appearance when didPlay is not explicitly true', () => {
  const context = buildProgramCoverageContext(stateFor(baseGame), issue);

  assert.equal(context.relevance.didPlay, false);
  assert.equal(context.relevance.firstAppearance, false);
  assert.equal(context.facts.find((fact) => fact.key === 'player.didPlay')?.value, false);
  assert.equal(context.coverageDecision.playerMentionPolicy, 'omit');
});

test('explicit didPlay true still supports a real all-zero appearance', () => {
  const context = buildProgramCoverageContext(stateFor({ ...baseGame, didPlay: true }), issue);

  assert.equal(context.relevance.didPlay, true);
  assert.equal(context.relevance.firstAppearance, true);
  assert.equal(context.facts.find((fact) => fact.key === 'player.didPlay')?.value, true);
});

test('non-zero negative production such as an interception proves an appearance', () => {
  const context = buildProgramCoverageContext(stateFor({ ...baseGame, int: 1 }), issue);

  assert.equal(context.relevance.didPlay, true);
  assert.equal(context.relevance.firstAppearance, true);
});
