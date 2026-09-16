import assert from 'node:assert/strict';
import test from 'node:test';
import { buildImmersionModel } from './immersionEngine.js';

test('immersion engine derives stakes, memory, records and podcast plan without new user input', () => {
  const state = {
    careerPhase: 'Player',
    currentSeason: 2,
    currentWeek: 4,
    player: { name: 'Test QB', college: 'Cincinnati', pos: 'QB' },
    rtg: { rank: 'QB2', coachTrust: 4200, trustToNext: 300 },
    currentWeekSetup: { opponent: 'Boston College', venue: 'Nippert Stadium' },
    gameLogs: [
      { season: 1, week: 5, opponent: 'Boston College', result: 'W', homeScore: 31, awayScore: 27, passYds: 245, passTD: 2, rushYds: 41, rushTD: 1, int: 1 },
      { season: 2, week: 1, opponent: 'Miami (Ohio)', result: 'W', homeScore: 28, awayScore: 17, passYds: 265, passTD: 2, rushYds: 55, rushTD: 0, int: 0 },
      { season: 2, week: 2, opponent: 'Pitt', result: 'W', homeScore: 34, awayScore: 24, passYds: 310, passTD: 3, rushYds: 33, rushTD: 0, int: 1 },
      { season: 2, week: 3, opponent: 'Louisville', result: 'W', homeScore: 30, awayScore: 27, passYds: 299, passTD: 2, rushYds: 72, rushTD: 1, int: 0 },
    ],
  };

  const model = buildImmersionModel(state);
  assert.equal(model.seasonPulse.record, '3-0');
  assert.equal(model.streak.count, 3);
  assert.equal(model.previousMeeting.opponent, 'Boston College');
  assert.equal(model.series.wins, 1);
  assert.ok(model.stakes.some((entry) => /4-0/.test(entry.detail)));
  assert.ok(model.storylines.some((entry) => entry.id === 'win-streak'));
  assert.equal(model.recordBook.passingYards.value, 310);
  assert.equal(model.podcastPlan.level, 'feature');
  assert.equal(model.atmosphere, 'pregame');
});

test('season pulse uses the schedule-backed team record while keeping player production personal', () => {
  const state = {
    careerPhase: 'Player',
    currentSeason: 2,
    currentWeek: 4,
    player: { name: 'Bryan Wessel', college: 'Oregon', pos: 'QB' },
    rtg: { rank: 'QB1', coachTrust: 1148 },
    currentWeekSetup: { opponent: 'Michigan State' },
    seasonSchedules: [{
      season: 2,
      school: 'Oregon',
      entries: [
        { week: 0, opponent: 'BYE', isBye: true, status: 'bye' },
        { week: 1, opponent: 'North Dakota State', result: 'W', teamScore: 42, opponentScore: 24, status: 'completed' },
        { week: 2, opponent: 'Baylor', result: 'L', teamScore: 21, opponentScore: 45, status: 'completed' },
        { week: 3, opponent: 'Oregon State', result: 'W', teamScore: 33, opponentScore: 15, status: 'completed' },
        { week: 4, opponent: 'Michigan State', status: 'upcoming' },
      ],
    }],
    gameLogs: [
      { season: 2, week: 2, stage: 'college', opponent: 'Baylor', result: 'L', homeScore: 21, awayScore: 45, passYds: 203, passTD: 1, rushYds: -6, rushTD: 0, int: 1, didPlay: true },
    ],
  };

  const model = buildImmersionModel(state);
  assert.equal(model.seasonPulse.record, '2-1');
  assert.deepEqual(model.seasonPulse.results, ['W', 'L', 'W']);
  assert.equal(model.seasonPulse.passingYards, 203);
  assert.equal(model.seasonPulse.totalTouchdowns, 1);
  assert.match(model.todayBrief[0], /2-1/);
  assert.ok(model.stakes.some((entry) => /3-1/.test(entry.detail)));
});

test('immersion engine treats a fresh uncommitted career as high school', () => {
  const model = buildImmersionModel({
    careerPhase: 'Player',
    currentSeason: 1,
    currentWeek: 1,
    player: { college: '', school: 'Edsel Ford', stars: 3 },
    playerRecruiting: { highSchool: { recruitStars: 3, tapeScore: 0, evaluations: [] } },
    gameLogs: [],
  });

  assert.equal(model.stage, 'high_school');
  assert.equal(model.atmosphere, 'high-school');
  assert.equal(model.storylines[0].id, 'high-school-journey');
  assert.match(model.todayBrief[0], /High-school recruiting/);
});
