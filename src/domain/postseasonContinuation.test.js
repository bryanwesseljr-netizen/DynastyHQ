import test from 'node:test';
import assert from 'node:assert/strict';

import {
  advancePostseasonCareer,
  elevatePostseasonCoverageDecision,
  postseasonAdvanceCandidate,
  postseasonContextForWeek,
} from './postseasonContext.js';
import { createPublishedWeek } from './weeklyEngine.js';
import { buildNewsroomGenerationPayload } from './newsroomGeneration.js';
import { buildPodcastGenerationPayload } from './podcastEngine.js';
import { buildCareerChronicle2 } from './careerChronicle2.js';

const postseasonSchedule = [{
  season: 4,
  school: 'Oregon',
  entries: [
    { week: 15, opponent: 'BYE', isBye: true, status: 'bye' },
    { week: 16, opponent: 'BYE', isBye: true, status: 'bye', label: 'Conf Champ' },
    { week: 17, opponent: 'LSU', isBye: false, status: 'upcoming', label: 'Bowl 1', date: 'Sat, Dec 21', homeAway: 'neutral' },
  ],
}];

const baseCareer = () => ({
  schemaVersion: 12,
  currentSeason: 4,
  currentWeek: 15,
  careerPhase: 'Player',
  player: {
    name: 'Bryan Wessel',
    school: 'Oregon',
    college: 'Oregon',
    isCommitted: true,
    pos: 'QB',
    number: '6',
  },
  currentWeekSetup: {
    week: 15,
    type: 'bye',
    phase: 'regular-season',
    label: 'Week 15 Bye',
    opponent: '',
  },
  seasonSchedules: postseasonSchedule,
  gameLogs: [
    { season: 4, week: 13, opponent: 'Washington', result: 'W', homeScore: 42, awayScore: 35, passYds: 310, passTD: 3, rushYds: 62, rushTD: 1, int: 1, didPlay: true },
    { season: 4, week: 14, opponent: 'Michigan State', result: 'W', homeScore: 38, awayScore: 30, passYds: 275, passTD: 2, rushYds: 70, rushTD: 1, int: 0, didPlay: true },
  ],
  rtg: { rank: 'QB1', coachTrust: 12801 },
  recruiting: [],
  retentionBoard: [],
  playerRecruiting: { transfer: { decisions: [] } },
  weeklyUpdates: [],
  factLedger: [],
  careerChronicle: [],
  careerMilestones: [],
  newsroomIssues: [],
  podcastEpisodes: [],
  eaSportsNetworkArticles: [],
  newsroomMediaLibrary: [],
  postgameFrontPages: [],
});

test('postseason continuation skips the Week 15 and Conf Champ byes and activates Bowl 1 vs LSU', () => {
  const state = baseCareer();
  const candidate = postseasonAdvanceCandidate(state);

  assert.equal(candidate?.week, 17);
  assert.equal(candidate?.displayLabel, 'BOWL 1');
  assert.equal(candidate?.opponent, 'LSU');
  assert.equal(candidate?.playoffGame, true);

  const activated = advancePostseasonCareer(state);
  assert.equal(activated.currentWeek, 17);
  assert.equal(activated.currentWeekSetup.phase, 'postseason');
  assert.equal(activated.currentWeekSetup.label, 'BOWL 1');
  assert.equal(activated.currentWeekSetup.opponent, 'LSU');
  assert.equal(activated.currentWeekSetup.venue, 'Neutral site');
});

test('postseason context elevates coverage without inventing a fake week number', () => {
  const activated = advancePostseasonCareer(baseCareer());
  const context = postseasonContextForWeek(activated, { season: 4, week: 17 });

  assert.equal(context.active, true);
  assert.equal(context.displayLabel, 'BOWL 1');
  assert.equal(context.stage, 'bowl');
  assert.equal(context.playoffGame, true);
  assert.deepEqual(context.enteringRecord, { wins: 2, losses: 0, games: 2 });

  const decision = elevatePostseasonCoverageDecision({
    tier: 'standard',
    articleCount: 2,
    podcastEligible: false,
    newsroomWordRange: { min: 300, max: 500 },
    podcastWordRange: { min: 400, max: 600 },
    audienceReach: { level: 'local', nationalEligible: false, regionalEligible: true },
  }, context);

  assert.equal(decision.tier, 'major');
  assert.ok(decision.articleCount >= 3);
  assert.equal(decision.podcastEligible, true);
  assert.equal(decision.audienceReach.nationalEligible, true);
  assert.ok(decision.newsroomWordRange.min >= 440);
});

test('publishing Bowl 1 carries postseason identity into game, ledger, Newsroom, Podcast and Chronicle', () => {
  const activated = advancePostseasonCareer(baseCareer());
  const published = createPublishedWeek({
    state: activated,
    game: {
      opponent: 'LSU',
      result: 'W',
      homeScore: 34,
      awayScore: 27,
      passYds: 302,
      passTD: 3,
      rushYds: 58,
      rushTD: 1,
      int: 1,
      didPlay: true,
      teamTotalYards: 451,
      opponentTotalYards: 399,
    },
    rtg: { rank: 'QB1', coachTrust: 13040 },
    facts: [
      { id: 'opp', key: 'game.opponent', label: 'Opponent', value: 'LSU', confidence: 0.99, sourceId: 'box' },
      { id: 'result', key: 'game.result', label: 'Result', value: 'W', confidence: 0.99, sourceId: 'box' },
      { id: 'score-us', key: 'game.homeScore', label: 'Oregon score', value: 34, confidence: 0.99, sourceId: 'box' },
      { id: 'score-them', key: 'game.awayScore', label: 'LSU score', value: 27, confidence: 0.99, sourceId: 'box' },
      { id: 'pass', key: 'game.passYds', label: 'Passing yards', value: 302, confidence: 0.99, sourceId: 'box' },
      { id: 'pass-td', key: 'game.passTD', label: 'Passing TD', value: 3, confidence: 0.99, sourceId: 'box' },
      { id: 'rush', key: 'game.rushYds', label: 'Rushing yards', value: 58, confidence: 0.99, sourceId: 'box' },
      { id: 'rush-td', key: 'game.rushTD', label: 'Rushing TD', value: 1, confidence: 0.99, sourceId: 'box' },
      { id: 'int', key: 'game.int', label: 'Interceptions', value: 1, confidence: 0.99, sourceId: 'box' },
    ],
    sources: [{ id: 'box' }],
    season: 4,
    week: 17,
  });

  const game = published.gameLogs.at(-1);
  const update = published.weeklyUpdates.at(-1);
  const issue = published.newsroomIssues.at(-1);

  assert.equal(game.weekPhase, 'postseason');
  assert.equal(game.weekLabel, 'BOWL 1');
  assert.equal(game.postseason.active, true);
  assert.equal(update.weekPhase, 'postseason');
  assert.equal(update.weekLabel, 'BOWL 1');
  assert.equal(issue.weekPhase, 'postseason');
  assert.equal(issue.label, 'BOWL 1');
  assert.equal(published.factLedger.some((fact) => fact.key === 'postseason.stage' && fact.value === 'BOWL 1'), true);

  const newsroom = buildNewsroomGenerationPayload(published, 'season-4-week-17');
  assert.equal(newsroom.postseason.active, true);
  assert.equal(newsroom.postseason.displayLabel, 'BOWL 1');
  assert.equal(newsroom.coverageDecision.tier, 'major');
  assert.equal(newsroom.coverageDecision.audienceReach.nationalEligible, true);
  assert.ok(newsroom.articleBriefs.length >= 3);

  const podcast = buildPodcastGenerationPayload(published, 'season-4-week-17');
  assert.equal(podcast.postseason.active, true);
  assert.equal(podcast.coverageDecision.podcastEligible, true);
  assert.match(podcast.brief.title, /BOWL 1/i);
  assert.match(podcast.brief.title, /PLAYOFF EDITION/i);

  const chronicle = buildCareerChronicle2(published);
  const bowlEntry = chronicle.entries.find((entry) => Number(entry.week) === 17);
  assert.equal(bowlEntry.signature, true);
  assert.equal(bowlEntry.signatureLabel, 'SURVIVE AND ADVANCE');
  assert.ok(bowlEntry.signatureReasons.some((reason) => /BOWL 1 postseason game/i.test(reason)));
  assert.equal(chronicle.seasons.find((season) => season.season === 4)?.postseason.appearances, 1);
});
