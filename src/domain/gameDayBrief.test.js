import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGameDayBrief } from './gameDayBrief.js';

const state = {
  currentSeason: 2,
  currentWeek: 3,
  player: { name: 'Sam Jones', college: 'Oregon', pos: 'QB', number: 12, overall: 72 },
  rtg: { rank: 'QB1', coachTrust: 2140, skillPoints: 745 },
  currentWeekSetup: {
    type: 'game',
    week: 3,
    opponent: 'UCLA',
    opponentRank: 18,
    opponentRecord: '2-0',
    kickoff: '7:30 PM',
    venue: 'Autzen Stadium',
  },
  gameLogs: [
    { season: 1, week: 10, stage: 'high-school', opponent: 'Westview', homeScore: 28, awayScore: 14, result: 'W' },
    { season: 2, week: 1, stage: 'college', opponent: 'UTSA', homeScore: 31, awayScore: 20, result: 'W', evaluation: true },
    { season: 2, week: 2, stage: 'college', opponent: 'Baylor', homeScore: 21, awayScore: 45, result: 'L', passYds: 198, passTD: 1, rushYds: 42, rushTD: 1, int: 2 },
  ],
  weeklyUpdates: [
    { season: 2, week: 2, rtgChanges: [{ label: 'Depth chart', previous: 'QB2', current: 'QB1' }] },
  ],
};

test('builds a grounded pregame brief from saved week and previous-game data', () => {
  const brief = buildGameDayBrief(state);

  assert.equal(brief.ready, true);
  assert.equal(brief.school, 'Oregon');
  assert.equal(brief.opponent, 'UCLA');
  assert.equal(brief.record, '0-1');
  assert.equal(brief.previousGame.opponent, 'Baylor');
  assert.match(brief.previous.copy, /loss against Baylor, 21-45/);
  assert.deepEqual(brief.scout.facts.map((fact) => fact.value), ['#18', '2-0', '7:30 PM', 'Autzen Stadium']);
  assert.match(brief.keys[0].detail, /2 interceptions/);
  assert.equal(brief.keys[1].title, 'OWN THE QB1 ROLE');
  assert.equal(brief.player.seasonTotals.passYds, 198);
  assert.equal(brief.player.previousStats.rushYds, 42);
  assert.ok(brief.storylines.some((story) => story.label === 'RESPONSE GAME'));
  assert.ok(brief.storylines.some((story) => story.label === 'ROLE WATCH'));
  assert.ok(brief.storylines.some((story) => story.label === 'MATCHUP PROFILE'));
});

test('does not invent opponent tendencies when setup only contains the opponent name', () => {
  const brief = buildGameDayBrief({
    currentSeason: 1,
    currentWeek: 1,
    player: { college: 'Oregon', pos: 'QB' },
    currentWeekSetup: { type: 'game', week: 1, opponent: 'Boise State' },
    gameLogs: [],
  });

  assert.equal(brief.ready, true);
  assert.equal(brief.scout.facts.length, 0);
  assert.match(brief.scout.note, /intentionally blank/i);
  assert.match(brief.previous.copy, /no previous college result/i);
  assert.equal(brief.storylines[0].label, 'SEASON ARC');
});

test('ignores high-school and evaluation entries when finding the previous college game', () => {
  const brief = buildGameDayBrief(state);
  assert.equal(brief.previousGame.opponent, 'Baylor');
  assert.notEqual(brief.previousGame.opponent, 'Westview');
  assert.notEqual(brief.previousGame.opponent, 'UTSA');
});
