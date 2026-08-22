import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProgramCoverageContext } from './programCoverage.js';
import { buildPodcastGenerationPayload } from './podcastEngine.js';
import { buildNewsroomGenerationPayload } from './newsroomGeneration.js';

const makeIssue = (week, extra = {}) => ({
  id: `season-1-week-${week}`,
  publicationId: `season-1-week-${week}`,
  season: 1,
  week,
  weekType: 'game',
  weekPhase: 'regular-season',
  careerPhase: 'Player',
  label: `Week ${week}`,
  podcastBrief: { title: `Week ${week}`, summary: 'Weekly football show.', citedFactKeys: ['game.result'] },
  articles: [
    { id: 'local', outletId: 'college-local', outletName: 'Cincinnati Local', theme: 'local', desk: 'Bearcats' },
    { id: 'regional', outletId: 'college-regional', outletName: 'Regional Football', theme: 'regional', desk: 'College Football' },
    { id: 'filmroom', outletId: 'filmroom', outletName: 'Film Room', theme: 'filmroom', desk: 'Analysis' },
    { id: 'national', outletId: 'national', outletName: 'National Desk', theme: 'national', desk: 'College Football' },
  ],
  ...extra,
});

const makeUpdate = (week, { rank = 'QB3', game = null } = {}) => ({
  id: `season-1-week-${week}`,
  publicationId: `season-1-week-${week}`,
  weekKey: `season-1-week-${week}`,
  season: 1,
  week,
  careerPhase: 'Player',
  weekType: game ? 'game' : 'bye',
  game,
  rtgSnapshot: { rank },
});

const fact = (week, key, label, value, editorialUse = 'primary') => ({
  id: `fact-${week}-${key}`,
  publicationId: `season-1-week-${week}`,
  verified: true,
  key,
  label,
  value,
  editorialUse,
});

const baseState = ({ issues = [], updates = [], gameLogs = [], facts = [], rtg = {} } = {}) => ({
  player: { name: 'Bryan Wessel', school: 'Cincinnati', college: 'Cincinnati', isCommitted: true, pos: 'QB', number: '2', overall: 71 },
  rtg: { rank: updates.at(-1)?.rtgSnapshot?.rank || 'QB3', coachTrust: 551, skillPoints: 7, energy: 0, gpa: 2.8, followers: 13600, valuation: 0, ...rtg },
  newsroomIssues: issues,
  podcastEpisodes: [],
  weeklyUpdates: updates,
  gameLogs,
  factLedger: facts,
});

const game = (week, result = 'W', didPlay = false, extra = {}) => ({
  opponent: `Opponent ${week}`,
  result,
  homeScore: result === 'W' ? 27 : 17,
  awayScore: result === 'W' ? 20 : 24,
  passYds: didPlay ? 42 : '',
  passTD: didPlay ? 0 : '',
  rushYds: didPlay ? 17 : '',
  rushTD: didPlay ? 0 : '',
  int: didPlay ? 0 : '',
  didPlay,
  season: 1,
  week,
  ...extra,
});

test('quiet preseason Week 0 blocks both newsroom and podcast instead of inventing coverage', () => {
  const issue = makeIssue(0, { weekType: 'bye', weekPhase: 'preseason', label: 'Preseason Bye' });
  const state = baseState({
    issues: [issue],
    updates: [makeUpdate(0, { rank: 'QB3' })],
    facts: [
      fact(0, 'profile.player.overall', 'Overall rating', 71),
      fact(0, 'rtg.rank', 'Depth chart', 'QB3'),
      fact(0, 'rtg.coachTrust', 'Coach Trust', 551),
    ],
  });

  const context = buildProgramCoverageContext(state, issue);
  assert.equal(context.coverageDecision.tier, 'no-coverage');
  assert.equal(context.coverageDecision.podcastEligible, false);
  assert.equal(context.storyPlans.length, 0);

  assert.throws(() => buildPodcastGenerationPayload(state, issue.publicationId), (error) => error?.code === 'NO_NEWSWORTHY_PODCAST');
  assert.throws(() => buildNewsroomGenerationPayload(state, issue.publicationId), (error) => error?.code === 'NO_NEWSWORTHY_NEWSROOM');
});

test('QB3 with no snaps gets game coverage but no tracked-player or RTG-mechanic podcast facts', () => {
  const issue = makeIssue(1);
  const currentGame = game(1, 'W', false);
  const state = baseState({
    issues: [issue],
    updates: [makeUpdate(0, { rank: 'QB3' }), makeUpdate(1, { rank: 'QB3', game: currentGame })],
    gameLogs: [currentGame],
    facts: [
      fact(1, 'game.opponent', 'Opponent', currentGame.opponent),
      fact(1, 'game.result', 'Result', 'W'),
      fact(1, 'game.homeScore', 'Cincinnati score', 27),
      fact(1, 'game.awayScore', 'Opponent score', 20),
      fact(1, 'profile.player.overall', 'Overall rating', 71),
      fact(1, 'rtg.rank', 'Depth chart', 'QB3'),
      fact(1, 'rtg.coachTrust', 'Coach Trust', 551),
      fact(1, 'rtg.skillPoints', 'Skill Points', 7),
      fact(1, 'rtg.energy', 'Energy', 0),
      fact(1, 'rtg.gpa', 'GPA', 2.8),
      fact(1, 'rtg.followers', 'Followers', 13600),
      fact(1, 'rtg.valuation', 'NIL valuation', 0),
    ],
  });

  const podcast = buildPodcastGenerationPayload(state, issue.publicationId);
  assert.equal(podcast.coverageDecision.tier, 'standard');
  assert.equal(podcast.coveragePlan.playerMentionPolicy, 'omit');
  assert.equal(podcast.facts.some((entry) => entry.key.startsWith('rtg.')), false);
  assert.equal(podcast.facts.some((entry) => entry.key.startsWith('profile.player.')), false);
  assert.equal(podcast.facts.some((entry) => entry.key.startsWith('player.')), false);

  const newsroom = buildNewsroomGenerationPayload(state, issue.publicationId);
  assert.equal(newsroom.coverageDecision.tier, 'standard');
  assert.equal(newsroom.articleBriefs.length, 2);
  assert.equal(newsroom.facts.some((entry) => entry.key.startsWith('rtg.')), false);
  assert.equal(newsroom.facts.some((entry) => entry.key === 'profile.player.overall'), false);
});

test('unchanged QB2 is remembered and does not become a new QB-room story the following week', () => {
  const priorIssue = makeIssue(2, { storylineKeys: ['player-role:QB2'], coverageDecision: { storylineKeys: ['player-role:QB2'] } });
  const currentIssue = makeIssue(3);
  const game2 = game(2, 'W', false);
  const game3 = game(3, 'W', false);
  const state = baseState({
    issues: [priorIssue, currentIssue],
    updates: [makeUpdate(1, { rank: 'QB3', game: game(1) }), makeUpdate(2, { rank: 'QB2', game: game2 }), makeUpdate(3, { rank: 'QB2', game: game3 })],
    gameLogs: [game2, game3],
    facts: [fact(3, 'game.result', 'Result', 'W'), fact(3, 'game.opponent', 'Opponent', game3.opponent)],
  });

  const context = buildProgramCoverageContext(state, currentIssue);
  const roleThread = context.storylineThreads.find((thread) => thread.key === 'player-role:QB2');
  assert.equal(context.relevance.roleChanged, false);
  assert.equal(roleThread?.recentlyCovered, true);
  assert.equal(roleThread?.editorialUse, 'background-only');
  assert.equal(context.storyPlans.some((plan) => plan.storyType === 'qb-room-analysis'), false);
});

test('QB3 to QB2 promotion creates a fresh major player storyline', () => {
  const issue = makeIssue(2);
  const game1 = game(1, 'W', false);
  const game2 = game(2, 'L', false);
  const state = baseState({
    issues: [issue],
    updates: [makeUpdate(1, { rank: 'QB3', game: game1 }), makeUpdate(2, { rank: 'QB2', game: game2 })],
    gameLogs: [game1, game2],
    facts: [fact(2, 'game.result', 'Result', 'L')],
  });

  const context = buildProgramCoverageContext(state, issue);
  assert.equal(context.relevance.promoted, true);
  assert.equal(context.coverageDecision.tier, 'major');
  assert.equal(context.coverageDecision.storylineKeys.includes('player-role:QB2'), true);
  assert.equal(context.storyPlans.some((plan) => plan.storyType === 'qb-room-analysis'), true);
});

test('first college appearance elevates the tracked player without requiring a starting role', () => {
  const issue = makeIssue(3);
  const currentGame = game(3, 'W', true);
  const state = baseState({
    issues: [issue],
    updates: [makeUpdate(2, { rank: 'QB3', game: game(2, 'W', false) }), makeUpdate(3, { rank: 'QB3', game: currentGame })],
    gameLogs: [currentGame],
    facts: [fact(3, 'game.result', 'Result', 'W')],
  });

  const context = buildProgramCoverageContext(state, issue);
  assert.equal(context.relevance.firstAppearance, true);
  assert.equal(context.coverageDecision.tier, 'major');
  assert.equal(context.coverageDecision.storylineKeys.includes('player:first-appearance'), true);
});

test('a newly established three-game streak gets wider program coverage once without manufacturing national attention', () => {
  const games = [1, 2, 3].map((week) => game(week, 'W', false));
  const issue = makeIssue(3);
  const state = baseState({
    issues: [issue],
    updates: games.map((entry) => makeUpdate(entry.week, { rank: 'QB3', game: entry })),
    gameLogs: games,
    facts: [fact(3, 'game.result', 'Result', 'W')],
  });

  const context = buildProgramCoverageContext(state, issue);
  assert.equal(context.program.streakCount, 3);
  assert.equal(context.program.previousStreakCount, 2);
  assert.equal(context.coverageDecision.tier, 'major');
  assert.equal(context.coverageDecision.storylineKeys.includes('program:winning-streak'), true);
  assert.equal(context.coverageDecision.audienceReach.regionalEligible, true);
  assert.equal(context.coverageDecision.audienceReach.nationalEligible, false);
  assert.equal(context.storyPlans.some((plan) => plan.outletId === 'national'), false);
});

test('transfer and portal decisions are automatically major coverage events', () => {
  const issue = makeIssue(6, { weekType: 'bye' });
  const state = baseState({
    issues: [issue],
    updates: [makeUpdate(6, { rank: 'QB3' })],
    facts: [fact(6, 'transfer.decision', 'Transfer decision', 'Entered transfer portal')],
  });

  const context = buildProgramCoverageContext(state, issue);
  assert.equal(context.coverageDecision.tier, 'major');
  assert.equal(context.coverageDecision.podcastEligible, true);
  assert.equal(context.coverageDecision.storylineKeys.includes('event:transfer.decision'), true);
});
