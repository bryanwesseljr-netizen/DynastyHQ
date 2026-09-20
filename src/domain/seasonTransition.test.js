import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceCareerSeason,
  hasMeaningfulCareerHistory,
  recoverProductionCareerForSeason,
} from './seasonTransition.js';

const career = () => ({
  currentSeason: 2,
  currentWeek: 15,
  careerPhase: 'Player',
  player: { isCommitted: true, college: 'Oregon', school: 'Oregon', name: 'Bryan Wessel' },
  coach: { contractYear: 1 },
  gameLogs: [{ season: 2, week: 13, opponent: 'Rutgers', result: 'W' }],
  weeklyUpdates: [{ season: 2, week: 13, status: 'published' }],
  careerChronicle: [{ season: 2, week: 13, title: 'Rutgers' }],
  seasonSchedules: [{ season: 2, entries: [{ week: 13, opponent: 'Rutgers', completed: true }] }],
  careerMilestones: [],
  playerRecruiting: { transfer: { status: 'inactive', targets: [], decisions: [] } },
  newsroomIssues: [{ publicationId: 'season-2-week-13' }],
  podcastEpisodes: [{ publicationId: 'season-2-week-13' }],
});

test('season advance preserves the complete career and only opens a new season/week', () => {
  const before = career();
  const after = advanceCareerSeason(before);
  assert.equal(after.currentSeason, 3);
  assert.equal(after.currentWeek, 1);
  assert.equal(after.player.college, 'Oregon');
  assert.equal(after.gameLogs.length, 1);
  assert.equal(after.weeklyUpdates.length, 1);
  assert.equal(after.careerChronicle.length, 1);
  assert.equal(after.newsroomIssues.length, 1);
  assert.equal(after.podcastEpisodes.length, 1);
  assert.equal(after.currentWeekSetup, null);
});

test('blank/default career cannot be advanced over a real save', () => {
  assert.equal(hasMeaningfulCareerHistory({ currentSeason: 1, player: { isCommitted: false }, gameLogs: [] }), false);
  assert.throws(() => advanceCareerSeason({ currentSeason: 1, player: { isCommitted: false }, gameLogs: [] }), /blocked the season advance/i);
});

test('preview recovery can rebuild the intended next season from the live career', () => {
  const recovered = recoverProductionCareerForSeason(career(), 3);
  assert.equal(recovered.currentSeason, 3);
  assert.equal(recovered.currentWeek, 1);
  assert.equal(recovered.player.college, 'Oregon');
  assert.equal(recovered.gameLogs.length, 1);
  const decision = recovered.playerRecruiting.transfer.decisions.at(-1);
  assert.equal(decision.season, 2);
  assert.equal(decision.decision, 'stay');
  assert.equal(decision.from, 'Oregon');
});
