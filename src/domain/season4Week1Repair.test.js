import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasCorruptedOhioStateWeek1,
  repairSeason4Week1Vanderbilt,
} from './season4Week1Repair.js';

const corrupted = {
  currentSeason: 4,
  currentWeek: 2,
  seasonSchedules: [{
    season: 4,
    school: 'Oregon',
    entries: [
      { week: 0, opponent: 'BYE', isBye: true, status: 'bye' },
      { week: 1, opponent: 'Ohio State', completed: true, status: 'completed', result: 'L', teamScore: 28, opponentScore: 42, date: 'Sep 1', homeAway: 'home' },
      { week: 2, opponent: 'Florida', completed: false, status: 'upcoming', homeAway: 'home' },
      { week: 8, opponent: 'Ohio State', completed: false, status: 'upcoming', homeAway: 'home' },
    ],
  }],
  weeklyUpdates: [
    { publicationId: 'season-4-week-0', season: 4, week: 0, status: 'published' },
    { publicationId: 'season-4-week-1', season: 4, week: 1, game: { opponent: 'Ohio State' } },
    { publicationId: 'season-2-week-1', season: 2, week: 1, game: { opponent: 'Baylor' } },
  ],
  gameLogs: [
    { season: 4, week: 1, opponent: 'Ohio State', result: 'L' },
    { season: 2, week: 1, opponent: 'Baylor', result: 'L' },
  ],
  newsroomIssues: [
    { publicationId: 'season-4-week-1', season: 4, week: 1, headline: "Oregon Falls to Ohio State in Wessel's Debut" },
    { publicationId: 'season-4-week-0', season: 4, week: 0, headline: 'Named starter' },
  ],
  podcastEpisodes: [
    { publicationId: 'season-4-week-1', season: 4, week: 1, title: 'Ohio State briefing' },
    { publicationId: 'season-4-week-0', season: 4, week: 0, title: 'Named starter' },
  ],
  careerChronicle: [{ publicationId: 'season-4-week-1', season: 4, week: 1 }, { publicationId: 'season-3-week-4', season: 3, week: 4 }],
  careerMilestones: [{ publicationId: 'season-4-week-1', season: 4, week: 1 }, { season: 4, week: 0, id: 'starter' }],
  factLedger: [{ publicationId: 'season-4-week-1', key: 'game.opponent', value: 'Ohio State' }, { publicationId: 'season-4-week-0', key: 'rtg.rank', value: 'QB1' }],
  postgameFrontPages: [{ publicationId: 'season-4-week-1', season: 4, week: 1 }],
  coverageReferences: [{ publicationId: 'season-4-week-1', season: 4, week: 1 }],
  eaSportsNetworkArticles: [{ publicationId: 'season-4-week-1', season: 4, week: 1 }],
  officialCoverage: [{ publicationId: 'season-4-week-1', season: 4, week: 1 }],
  weekFinalizations: {
    'season-4-week-1': { publicationId: 'season-4-week-1', season: 4, week: 1 },
    'season-4-week-0': { publicationId: 'season-4-week-0', season: 4, week: 0 },
  },
  rtg: { coachTrust: 7252, lastStatusScan: { season: 4, week: 1, publicationId: 'season-4-week-1' } },
  newsroomMediaLibrary: [{ id: 'w1-photo', publicationId: 'season-4-week-1' }, { id: 'preseason-photo', publicationId: 'season-4-week-0' }],
};

test('detects the corrupted Ohio State Week 1 save', () => {
  assert.equal(hasCorruptedOhioStateWeek1(corrupted), true);
});

test('repairs only Season 4 Week 1 and preserves preseason, older seasons, and later Ohio State schedule slot', () => {
  const { state, removedCounts } = repairSeason4Week1Vanderbilt(corrupted);

  assert.equal(state.currentSeason, 4);
  assert.equal(state.currentWeek, 1);
  assert.equal(state.currentWeekSetup.opponent, 'Vanderbilt');

  const s4 = state.seasonSchedules.find((schedule) => schedule.season === 4);
  const week1 = s4.entries.find((entry) => entry.week === 1);
  const week8 = s4.entries.find((entry) => entry.week === 8);
  assert.equal(week1.opponent, 'Vanderbilt');
  assert.equal(week1.completed, false);
  assert.equal(week1.status, 'upcoming');
  assert.equal(week1.result, '');
  assert.equal(week1.teamScore, null);
  assert.equal(week1.opponentScore, null);
  assert.equal(week1.date, '');
  assert.equal(week1.homeAway, 'unknown');
  assert.equal(week8.opponent, 'Ohio State');

  assert.equal(state.weeklyUpdates.some((entry) => entry.publicationId === 'season-4-week-1'), false);
  assert.equal(state.gameLogs.some((entry) => entry.season === 4 && entry.week === 1), false);
  assert.equal(state.newsroomIssues.some((entry) => entry.publicationId === 'season-4-week-1'), false);
  assert.equal(state.podcastEpisodes.some((entry) => entry.publicationId === 'season-4-week-1'), false);
  assert.equal(state.factLedger.some((entry) => entry.publicationId === 'season-4-week-1'), false);
  assert.equal(state.postgameFrontPages.length, 0);
  assert.equal(state.coverageReferences.length, 0);
  assert.equal(state.eaSportsNetworkArticles.length, 0);
  assert.equal(state.officialCoverage.length, 0);
  assert.equal(state.newsroomMediaLibrary.some((entry) => entry.id === 'w1-photo'), false);
  assert.equal(state.weekFinalizations['season-4-week-1'], undefined);
  assert.equal(state.rtg.lastStatusScan, undefined);

  assert.equal(state.weeklyUpdates.some((entry) => entry.publicationId === 'season-4-week-0'), true);
  assert.equal(state.weeklyUpdates.some((entry) => entry.publicationId === 'season-2-week-1'), true);
  assert.equal(state.newsroomIssues.some((entry) => entry.publicationId === 'season-4-week-0'), true);
  assert.equal(state.podcastEpisodes.some((entry) => entry.publicationId === 'season-4-week-0'), true);
  assert.equal(state.factLedger.some((entry) => entry.publicationId === 'season-4-week-0'), true);
  assert.equal(state.newsroomMediaLibrary.some((entry) => entry.id === 'preseason-photo'), true);
  assert.ok(removedCounts.weeklyUpdates >= 1);
});


test('repair is Firestore-safe when weekFinalizations is missing', () => {
  const source = { ...corrupted };
  delete source.weekFinalizations;
  const { state } = repairSeason4Week1Vanderbilt(source);
  assert.deepEqual(state.weekFinalizations, {});
  assert.equal(Object.values(state).some((value) => value === undefined), false);
});
