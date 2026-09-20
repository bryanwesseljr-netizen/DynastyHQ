import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasCollegeGameCoverageRepairWork,
  missingCollegeGameCoverageUpdates,
  removeNoAppearanceCoverageIssues,
} from './collegeGameCoverageRepair.js';

const noAppearance = {
  id: 'season-1-week-7',
  weekKey: 'season-1-week-7',
  status: 'published',
  season: 1,
  week: 7,
  careerPhase: 'Player',
  weekType: 'no-appearance',
  game: {
    season: 1,
    week: 7,
    opponent: 'Michigan State',
    result: 'W',
    homeScore: 31,
    awayScore: 10,
    didPlay: false,
  },
};

const played = {
  id: 'season-1-week-8',
  weekKey: 'season-1-week-8',
  status: 'published',
  season: 1,
  week: 8,
  careerPhase: 'Player',
  weekType: 'game',
  game: {
    season: 1,
    week: 8,
    opponent: 'Ohio State',
    result: 'L',
    homeScore: 17,
    awayScore: 24,
    didPlay: true,
    passYds: 220,
  },
};

const state = {
  careerPhase: 'Player',
  player: { name: 'Tracked QB', college: 'Oregon', isCommitted: true },
  rtg: {},
  weeklyUpdates: [noAppearance, played],
  factLedger: [],
  gameLogs: [noAppearance.game, played.game],
  newsroomIssues: [
    { id: 'season-1-week-7', publicationId: 'season-1-week-7', season: 1, week: 7, articles: [{ headline: 'Filler story' }] },
  ],
};

test('coverage repair never backfills a no-appearance week', () => {
  const missing = missingCollegeGameCoverageUpdates(state);
  assert.deepEqual(missing.map((entry) => entry.week), [8]);
});

test('cleanup removes only newsroom issues tied to no-appearance weeks', () => {
  const cleaned = removeNoAppearanceCoverageIssues({
    ...state,
    newsroomIssues: [
      ...state.newsroomIssues,
      { id: 'season-1-week-8', publicationId: 'season-1-week-8', season: 1, week: 8, articles: [{ headline: 'Real played-game story' }] },
    ],
  });
  assert.equal(cleaned.newsroomIssues.length, 1);
  assert.equal(cleaned.newsroomIssues[0].publicationId, 'season-1-week-8');
});

test('repair work is detected when a no-appearance filler issue exists', () => {
  assert.equal(hasCollegeGameCoverageRepairWork(state), true);
});
