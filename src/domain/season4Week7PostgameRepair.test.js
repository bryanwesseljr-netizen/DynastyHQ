import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectSeason4Week7PostgameRepair,
  repairSeason4Week7Postgame,
} from './season4Week7PostgameRepair.js';

const fact = (key, value) => ({
  id: `season-4-week-7:${key}`,
  key,
  value,
  verified: true,
  publicationId: 'season-4-week-7',
});

const brokenWeek7 = {
  currentSeason: 4,
  currentWeek: 8,
  careerPhase: 'Player',
  player: {
    name: 'Bryan Wessel',
    school: 'Oregon',
    college: 'Oregon',
    isCommitted: true,
  },
  rtg: { coachTrust: 8000 },
  recruiting: [],
  playerRecruiting: { highSchool: {} },
  collegeNewsroom: { activeStopId: '', stops: [] },
  seasonSchedules: [{
    season: 4,
    school: 'Oregon',
    entries: [
      { week: 1, opponent: 'Vanderbilt', completed: true, result: 'W', teamScore: 38, opponentScore: 20 },
      { week: 2, opponent: 'Florida', completed: true, result: 'W', teamScore: 34, opponentScore: 26 },
      { week: 3, opponent: 'Oregon State', completed: true, result: 'W', teamScore: 35, opponentScore: 24 },
      { week: 4, opponent: 'BYE', isBye: true, status: 'bye' },
      { week: 5, opponent: 'UCLA', completed: true, result: 'L', teamScore: 24, opponentScore: 31 },
      { week: 6, opponent: 'BYE', isBye: true, status: 'bye' },
      { week: 7, opponent: 'Purdue', completed: false, status: 'upcoming', homeAway: 'away' },
      { week: 8, opponent: 'Ohio State', completed: false, status: 'upcoming', homeAway: 'home' },
    ],
  }],
  gameLogs: [
    { season: 4, week: 1, opponent: 'Vanderbilt', result: 'W', homeScore: 38, awayScore: 20 },
    { season: 4, week: 2, opponent: 'Florida', result: 'W', homeScore: 34, awayScore: 26 },
    { season: 4, week: 3, opponent: 'Oregon State', result: 'W', homeScore: 35, awayScore: 24 },
    { season: 4, week: 5, opponent: 'UCLA', result: 'L', homeScore: 24, awayScore: 31 },
  ],
  weeklyUpdates: [
    { id: 'season-4-week-1', publicationId: 'season-4-week-1', weekKey: 'season-4-week-1', season: 4, week: 1, game: { opponent: 'Vanderbilt', result: 'W' }, recruitingSnapshot: [], rtgSnapshot: { coachTrust: 7000 } },
    { id: 'season-4-week-2', publicationId: 'season-4-week-2', weekKey: 'season-4-week-2', season: 4, week: 2, game: { opponent: 'Florida', result: 'W' }, recruitingSnapshot: [], rtgSnapshot: { coachTrust: 7200 } },
    { id: 'season-4-week-3', publicationId: 'season-4-week-3', weekKey: 'season-4-week-3', season: 4, week: 3, game: { opponent: 'Oregon State', result: 'W' }, recruitingSnapshot: [], rtgSnapshot: { coachTrust: 7400 } },
    { id: 'season-4-week-5', publicationId: 'season-4-week-5', weekKey: 'season-4-week-5', season: 4, week: 5, game: { opponent: 'UCLA', result: 'L' }, recruitingSnapshot: [], rtgSnapshot: { coachTrust: 7600 } },
    {
      id: 'season-4-week-7',
      publicationId: 'season-4-week-7',
      weekKey: 'season-4-week-7',
      status: 'published',
      season: 4,
      week: 7,
      careerPhase: 'Player',
      weekType: 'game',
      publishedAt: '2026-09-30T14:00:00.000Z',
      sourceCount: 7,
      factCount: 9,
      recruitingSnapshot: [],
      rtgSnapshot: { coachTrust: 7900 },
      quote: '',
      // Broken state: game was not attached to the published update.
    },
  ],
  factLedger: [
    fact('game.opponent', 'Purdue'),
    fact('game.result', 'L'),
    fact('game.homeScore', 30),
    fact('game.awayScore', 31),
    fact('game.passYds', 216),
    fact('game.passTD', 1),
    fact('game.rushYds', 94),
    fact('game.rushTD', 2),
    fact('game.int', 1),
    fact('profile.player.name', 'Bryan Wessel'),
    fact('profile.player.school', 'Oregon'),
  ],
  careerChronicle: [
    { id: 'season-4-week-1', publicationId: 'season-4-week-1', season: 4, week: 1, type: 'game', title: 'W vs Vanderbilt' },
    { id: 'season-4-week-5', publicationId: 'season-4-week-5', season: 4, week: 5, type: 'game', title: 'L vs UCLA' },
    { id: 'season-4-week-7', publicationId: 'season-4-week-7', season: 4, week: 7, type: 'weekly-update', title: 'Week 7 update' },
  ],
  newsroomIssues: [
    { id: 'season-4-week-1', publicationId: 'season-4-week-1', season: 4, week: 1, articles: [{ outletId: 'college-local', headline: 'Vanderbilt' }] },
    { id: 'season-4-week-5', publicationId: 'season-4-week-5', season: 4, week: 5, editorialStatus: 'generated', articles: [{ outletId: 'college-local', headline: 'UCLA' }] },
  ],
  podcastEpisodes: [
    { id: 'podcast-season-4-week-1', publicationId: 'season-4-week-1', season: 4, week: 1, title: 'Vanderbilt episode', audioStatus: 'ready' },
    { id: 'podcast-season-4-week-5', publicationId: 'season-4-week-5', season: 4, week: 5, title: 'UCLA episode', audioStatus: 'ready' },
  ],
};

test('inspection recovers Week 7 Purdue from verified facts without guessing', () => {
  const inspection = inspectSeason4Week7PostgameRepair(brokenWeek7);
  assert.equal(inspection.updateExists, true);
  assert.equal(inspection.gameLogExists, false);
  assert.equal(inspection.newsroomExists, false);
  assert.equal(inspection.currentWeek, 8);
  assert.equal(inspection.game.opponent, 'Purdue');
  assert.equal(inspection.game.result, 'L');
  assert.equal(inspection.game.homeScore, 30);
  assert.equal(inspection.game.awayScore, 31);
  assert.equal(inspection.game.passYds, 216);
  assert.equal(inspection.game.passTD, 1);
  assert.equal(inspection.game.rushYds, 94);
  assert.equal(inspection.game.rushTD, 2);
  assert.equal(inspection.game.int, 1);
  assert.equal(inspection.coreComplete, true);
  assert.equal(inspection.needsRepair, true);
});

test('Week 7 repair rebuilds canonical game and Newsroom while preserving career position and prior media', () => {
  const repaired = repairSeason4Week7Postgame(brokenWeek7);

  assert.equal(repaired.currentSeason, 4);
  assert.equal(repaired.currentWeek, 8);

  const game = repaired.gameLogs.find((entry) => entry.season === 4 && entry.week === 7);
  assert.ok(game);
  assert.equal(game.opponent, 'Purdue');
  assert.equal(game.result, 'L');
  assert.equal(game.homeScore, 30);
  assert.equal(game.awayScore, 31);
  assert.equal(game.passYds, 216);
  assert.equal(game.passTD, 1);
  assert.equal(game.rushYds, 94);
  assert.equal(game.rushTD, 2);
  assert.equal(game.int, 1);

  const update = repaired.weeklyUpdates.find((entry) => entry.publicationId === 'season-4-week-7');
  assert.equal(update.game.opponent, 'Purdue');
  assert.equal(update.game.result, 'L');

  const issue = repaired.newsroomIssues.find((entry) => entry.publicationId === 'season-4-week-7');
  assert.ok(issue);
  assert.equal(issue.season, 4);
  assert.equal(issue.week, 7);
  assert.ok(Array.isArray(issue.articles));
  assert.ok(issue.articles.length > 0);
  assert.match(issue.articles[0].headline, /Purdue/i);

  const schedule = repaired.seasonSchedules.find((entry) => entry.season === 4);
  const week7 = schedule.entries.find((entry) => entry.week === 7);
  const week8 = schedule.entries.find((entry) => entry.week === 8);
  assert.equal(week7.opponent, 'Purdue');
  assert.equal(week7.completed, true);
  assert.equal(week7.result, 'L');
  assert.equal(week7.teamScore, 30);
  assert.equal(week7.opponentScore, 31);
  assert.equal(week8.opponent, 'Ohio State');
  assert.equal(week8.completed, false);

  assert.equal(repaired.newsroomIssues.some((entry) => entry.publicationId === 'season-4-week-5'), true);
  assert.deepEqual(repaired.podcastEpisodes, brokenWeek7.podcastEpisodes);
  assert.equal(repaired.podcastEpisodes.length, 2);
  assert.equal(repaired.gameLogs.some((entry) => entry.week === 1 && entry.opponent === 'Vanderbilt'), true);

  const chronicle = repaired.careerChronicle.find((entry) => entry.publicationId === 'season-4-week-7');
  assert.equal(chronicle.type, 'game');
  assert.equal(chronicle.title, 'L vs. Purdue, 30-31');
  assert.match(chronicle.summary, /216 passing yards/);
});

test('Week 7 repair blocks a write when required verified facts are incomplete', () => {
  const incomplete = {
    ...brokenWeek7,
    factLedger: brokenWeek7.factLedger.filter((entry) => entry.key !== 'game.awayScore'),
  };
  const inspection = inspectSeason4Week7PostgameRepair(incomplete);
  assert.equal(inspection.coreComplete, false);
  assert.throws(
    () => repairSeason4Week7Postgame(incomplete),
    /does not contain enough verified game facts/i,
  );
});
