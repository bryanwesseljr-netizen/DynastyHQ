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

const verifiedFact = (week, key, label, value) => ({
  id: `fact-${week}-${key}`,
  publicationId: `season-1-week-${week}`,
  verified: true,
  key,
  label,
  value,
});

const baseState = (weeklyUpdates = [], gameLogs = [], factLedger = []) => ({
  player: { name: 'Bryan Wessel', school: 'Cincinnati', college: 'Cincinnati', isCommitted: true },
  rtg: { rank: weeklyUpdates.at(-1)?.rtgSnapshot?.rank || 'QB3' },
  weeklyUpdates,
  gameLogs,
  factLedger,
});

test('QB3 with no appearance remains program-first while a completed game earns standard regional coverage', () => {
  const game = {
    opponent: 'Opponent', result: 'W', homeScore: 27, awayScore: 20,
    passYds: '', passTD: '', rushYds: '', rushTD: '', int: '', didPlay: false,
    season: 1, week: 1,
  };
  const state = baseState([
    update(0, { rank: 'QB3' }),
    update(1, { rank: 'QB3', game }),
  ], [game], [
    verifiedFact(1, 'game.opponent', 'Opponent', 'Opponent'),
    verifiedFact(1, 'game.result', 'Result', 'W'),
    verifiedFact(1, 'game.homeScore', 'Cincinnati score', 27),
    verifiedFact(1, 'game.awayScore', 'Opponent score', 20),
  ]);
  const context = buildProgramCoverageContext(state, issue(1));

  assert.equal(context.relevance.level, 'low');
  assert.equal(context.relevance.didPlay, false);
  assert.equal(context.program.record, '1-0');
  assert.equal(context.coverageDecision.tier, 'standard');
  assert.equal(context.coverageDecision.podcastEligible, true);
  assert.equal(context.coverageDecision.articleCount, 2);
  assert.equal(context.coverageDecision.playerMentionPolicy, 'omit');
  assert.equal(context.coverageDecision.audienceReach.regionalEligible, true);
  assert.equal(context.coverageDecision.audienceReach.nationalEligible, false);
  assert.deepEqual(context.storyPlans.map((plan) => plan.outletId), ['college-local', 'college-regional']);
});

test('QB3 to QB2 promotion creates a major quarterback-room story even without player production', () => {
  const game = {
    opponent: 'Opponent', result: 'L', homeScore: 17, awayScore: 24,
    passYds: '', passTD: '', rushYds: '', rushTD: '', int: '', didPlay: false,
    season: 1, week: 2,
  };
  const state = baseState([
    update(1, { rank: 'QB3', game: { ...game, week: 1, result: 'W', homeScore: 24, awayScore: 14 } }),
    update(2, { rank: 'QB2', game }),
  ]);
  const context = buildProgramCoverageContext(state, issue(2));
  const qbStory = context.storyPlans.find((plan) => plan.outletId === 'filmroom');

  assert.equal(context.relevance.roleChanged, true);
  assert.equal(context.relevance.promoted, true);
  assert.equal(context.relevance.level, 'developing');
  assert.equal(context.coverageDecision.tier, 'major');
  assert.equal(qbStory?.storyType, 'qb-room-analysis');
  assert.equal(qbStory?.playerMentionPolicy, 'focal');
  assert.equal(context.coverageDecision.storylineKeys.includes('player-role:QB2'), true);
  assert.equal(context.coverageDecision.audienceReach.nationalEligible, false);
});

test('QB1 with a meaningful appearance earns major player-and-program coverage', () => {
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
  const analysis = context.storyPlans.find((plan) => plan.outletId === 'filmroom');

  assert.equal(context.relevance.starter, true);
  assert.equal(context.relevance.didPlay, true);
  assert.equal(context.relevance.level, 'primary');
  assert.equal(context.coverageDecision.tier, 'major');
  assert.equal(context.coverageDecision.playerMentionPolicy, 'focal-when-story-requires');
  assert.equal(analysis?.storyType, 'performance-analysis');
});

test('preseason bye with no football event becomes an intentional no-coverage week', () => {
  const state = baseState([update(0, { rank: 'QB3' })]);
  const context = buildProgramCoverageContext(state, issue(0, { weekType: 'bye', weekPhase: 'preseason', label: 'Preseason Bye' }));

  assert.equal(context.relevance.level, 'low');
  assert.equal(context.program.record, '0-0');
  assert.equal(context.program.recordEstablished, false);
  assert.equal(context.facts.some((fact) => fact.key === 'program.seasonRecord'), false);
  assert.equal(context.coverageDecision.tier, 'no-coverage');
  assert.equal(context.coverageDecision.podcastEligible, false);
  assert.equal(context.coverageDecision.articleCount, 0);
  assert.deepEqual(context.storyPlans, []);
});

test('first appearance is a real storyline and is remembered as a thread', () => {
  const game = {
    opponent: 'Opponent', result: 'W', homeScore: 31, awayScore: 13,
    passYds: 42, passTD: 0, rushYds: 17, rushTD: 0, int: 0, didPlay: true,
    season: 1, week: 3,
  };
  const state = baseState([
    update(2, { rank: 'QB3', game: { ...game, week: 2, didPlay: false, passYds: '', rushYds: '', passTD: '', rushTD: '', int: '' } }),
    update(3, { rank: 'QB3', game }),
  ], [game]);
  const context = buildProgramCoverageContext(state, issue(3));

  assert.equal(context.relevance.firstAppearance, true);
  assert.equal(context.coverageDecision.tier, 'major');
  assert.equal(context.coverageDecision.storylineKeys.includes('player:first-appearance'), true);
});

test('three-game team streak becomes a major regional program storyline when threshold is first crossed', () => {
  const games = [1, 2, 3].map((week) => ({
    opponent: `Opponent ${week}`, result: 'W', homeScore: 24 + week, awayScore: 17,
    passYds: '', passTD: '', rushYds: '', rushTD: '', int: '', didPlay: false,
    season: 1, week,
  }));
  const state = baseState(
    games.map((game) => update(game.week, { rank: 'QB3', game })),
    games,
    [verifiedFact(3, 'game.result', 'Result', 'W')],
  );
  const context = buildProgramCoverageContext(state, issue(3));

  assert.equal(context.relevance.level, 'low');
  assert.equal(context.program.streakCount, 3);
  assert.equal(context.program.previousStreakCount, 2);
  assert.equal(context.facts.find((fact) => fact.key === 'program.streak')?.editorialUse, 'primary');
  assert.equal(context.coverageDecision.tier, 'major');
  assert.equal(context.coverageDecision.storylineKeys.includes('program:winning-streak'), true);
  assert.equal(context.coverageDecision.audienceReach.regionalEligible, true);
  assert.equal(context.coverageDecision.audienceReach.nationalEligible, false);
  assert.equal(context.storyPlans.some((plan) => plan.outletId === 'national'), false);
});
