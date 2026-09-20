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


test('recovery normalizes an already-advanced but untouched season back to Week 1', () => {
  const alreadyAdvanced = {
    ...career(),
    currentSeason: 3,
    currentWeek: 3,
    playerRecruiting: {
      transfer: {
        status: 'inactive',
        targets: [],
        decisions: [{ season: 2, week: 15, decision: 'stay', from: 'Oregon', destination: '', targets: [] }],
      },
    },
  };
  const recovered = recoverProductionCareerForSeason(alreadyAdvanced, 3);
  assert.equal(recovered.currentSeason, 3);
  assert.equal(recovered.currentWeek, 1);
  assert.equal(recovered.gameLogs.length, 1);
  assert.equal(recovered.player.college, 'Oregon');
});

test('recovery never rewinds a target season that already has published activity', () => {
  const progressed = {
    ...career(),
    currentSeason: 3,
    currentWeek: 3,
    gameLogs: [
      ...career().gameLogs,
      { season: 3, week: 1, opponent: 'Boise State', result: 'W' },
    ],
  };
  const recovered = recoverProductionCareerForSeason(progressed, 3);
  assert.equal(recovered.currentWeek, 3);
  assert.equal(recovered.gameLogs.filter((game) => game.season === 3).length, 1);
});
