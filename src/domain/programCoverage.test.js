import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProgramCoverageContext } from './programCoverage.js';

const issue = (week, extra = {}) => ({
  id: `season-1-week-${week}`,
  publicationId: `season-1-week-${week}`,
  season: 1,
  week,
  weekType: 'game',
  careerPhase: 'Player',
  ...extra,
});

const update = (week, { rank = 'QB3', game = null } = {}) => ({
  id: `season-1-week-${week}`,
  weekKey: `season-1-week-${week}`,
  season: 1,
  week,
  careerPhase: 'Player',
  weekType: game ? 'game' : 'bye',
  game,
  rtgSnapshot: { rank },
});

const baseState = (weeklyUpdates = [], gameLogs = []) => ({
  player: { name: 'Bryan Wessel', school: 'Cincinnati', college: 'Cincinnati', isCommitted: true },
  rtg: { rank: weeklyUpdates.at(-1)?.rtgSnapshot?.rank || 'QB3' },
  weeklyUpdates,
  gameLogs,
});

test('QB3 with no appearance remains a low-relevance program-first story', () => {
  const game = {
    opponent: 'Opponent', result: 'W', homeScore: 27, awayScore: 20,
    passYds: '', passTD: '', rushYds: '', rushTD: '', int: '', didPlay: false,
    season: 1, week: 1,
  };
  const state = baseState([
    update(0, { rank: 'QB3' }),
    update(1, { rank: 'QB3', game }),
  ], [game]);
  const context = buildProgramCoverageContext(state, issue(1));

  assert.equal(context.relevance.level, 'low');
  assert.equal(context.relevance.didPlay, false);
  assert.equal(context.program.record, '1-0');
  assert.deepEqual(context.storyPlans.map((plan) => plan.outletId), ['college-local', 'college-regional']);
  assert.match(context.storyPlans[0].playerMentionPolicy, /omit/);
});

test('QB3 to QB2 promotion creates a dedicated quarterback-room story even without playing', () => {
  const game = {
    opponent: 'Opponent', result: 'L', homeScore: 17, awayScore: 24,
    passYds: '', passTD: '', rushYds: '', rushTD: '', int: '', didPlay: false,
    season: 1, week: 2,
  };
  const state = baseState([
    update(1, { rank: 'QB3', game: { ...game, week: 1, result: 'W', homeScore: 24, awayScore: 14 } }),
    update(2, { rank: 'QB2', game }),
  ], []);
  const context = buildProgramCoverageContext(state, issue(2));
  const qbStory = context.storyPlans.find((plan) => plan.outletId === 'filmroom');

  assert.equal(context.relevance.roleChanged, true);
  assert.equal(context.relevance.promoted, true);
  assert.equal(context.relevance.level, 'developing');
  assert.equal(qbStory?.storyType, 'qb-room-analysis');
  assert.equal(qbStory?.playerMentionPolicy, 'focal');
  assert.equal(context.storyPlans.some((plan) => plan.outletId === 'national'), false);
});

test('QB1 with a game appearance becomes a primary storyline while preserving program coverage', () => {
  const game = {
    opponent: 'Opponent', result: 'W', homeScore: 35, awayScore: 21,
    passYds: 286, passTD: 3, rushYds: 42, rushTD: 1, int: 1, didPlay: true,
    season: 1, week: 5,
  };
  const state = baseState([
    update(4, { rank: 'QB1', game: { ...game, week: 4, passYds: 190, passTD: 1, rushYds: 25, rushTD: 0 } }),
    update(5, { rank: 'QB1', game }),
  ], [{ ...game, week: 4, passYds: 190, passTD: 1, rushYds: 25, rushTD: 0 }, game]);
  const context = buildProgramCoverageContext(state, issue(5));
  const local = context.storyPlans.find((plan) => plan.outletId === 'college-local');
  const analysis = context.storyPlans.find((plan) => plan.outletId === 'filmroom');

  assert.equal(context.relevance.starter, true);
  assert.equal(context.relevance.didPlay, true);
  assert.equal(context.relevance.level, 'primary');
  assert.equal(local?.subjectPriority, 'program-first');
  assert.equal(analysis?.storyType, 'performance-analysis');
  assert.equal(analysis?.playerMentionPolicy, 'focal');
  assert.equal(context.storyPlans.some((plan) => plan.outletId === 'national'), true);
});

test('preseason bye with an initial QB3 baseline does not manufacture player or national spotlight', () => {
  const state = baseState([update(0, { rank: 'QB3' })]);
  const context = buildProgramCoverageContext(state, issue(0, { weekType: 'bye', weekPhase: 'preseason', label: 'Preseason Bye' }));

  assert.equal(context.relevance.level, 'low');
  assert.equal(context.relevance.roleChanged, false);
  assert.equal(context.program.record, '0-0');
  assert.deepEqual(context.storyPlans.map((plan) => plan.outletId), ['college-local', 'college-regional']);
});

test('three-game team streak can earn a national program story even when tracked player is low relevance', () => {
  const games = [1, 2, 3].map((week) => ({
    opponent: `Opponent ${week}`, result: 'W', homeScore: 24 + week, awayScore: 17,
    passYds: '', passTD: '', rushYds: '', rushTD: '', int: '', didPlay: false,
    season: 1, week,
  }));
  const state = baseState(games.map((game) => update(game.week, { rank: 'QB3', game })), games);
  const context = buildProgramCoverageContext(state, issue(3));

  assert.equal(context.relevance.level, 'low');
  assert.equal(context.program.streakCount, 3);
  assert.equal(context.storyPlans.some((plan) => plan.outletId === 'national'), true);
});
