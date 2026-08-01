import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCareerArchive,
  filterCareerArchive,
  getCareerArchiveFacets,
  summarizeCareerArchive,
} from './careerArchive.js';

const state = {
  weeklyUpdates: [
    {
      id: 'season-1-week-1', season: 1, week: 1, careerPhase: 'Player', weekType: 'game',
      publishedAt: '2026-08-01T12:00:00.000Z', sourceCount: 3, factCount: 4,
      game: { opponent: 'Test Opponent A', result: 'W', passYds: 210, passTD: 2, rushYds: 61, rushTD: 1, didPlay: true },
      rtgSnapshot: { gpa: 3.4, coachTrust: 900, followers: 1200, valuation: 5000 },
      rtgChanges: [{ key: 'coachTrust', label: 'Coach Trust', previous: 700, current: 900, delta: 200, kind: 'number' }],
    },
    {
      id: 'season-1-week-2', season: 1, week: 2, careerPhase: 'Player', weekType: 'bye',
      publishedAt: '2026-08-08T12:00:00.000Z', sourceCount: 1, factCount: 1, game: null,
    },
  ],
  careerChronicle: [
    { id: 'season-1-week-1', season: 1, week: 1, careerPhase: 'Player', type: 'game', title: 'W vs. Test Opponent A, 28-14', summary: 'Verified opener.', occurredAt: '2026-08-01T12:00:00.000Z' },
    { id: 'season-1-week-2', season: 1, week: 2, careerPhase: 'Player', type: 'bye', title: 'Week 2 bye', summary: 'Recovery week.', occurredAt: '2026-08-08T12:00:00.000Z' },
  ],
  factLedger: [
    { id: 'f1', publicationId: 'season-1-week-1', key: 'game.passYds', label: 'Passing yards', value: 210, verified: true },
    { id: 'f2', publicationId: 'season-1-week-1', key: 'game.passTD', label: 'Passing touchdowns', value: 2, verified: true },
  ],
  newsroomIssues: [{ id: 'season-1-week-1' }],
};

test('joins publications, chronicle events, facts, and newsroom coverage', () => {
  const archive = buildCareerArchive(state);
  assert.equal(archive.length, 2);
  assert.equal(archive[0].id, 'season-1-week-2');
  assert.equal(archive[1].title, 'W vs. Test Opponent A, 28-14');
  assert.equal(archive[1].facts.length, 2);
  assert.equal(archive[1].rtgSnapshot.coachTrust, 900);
  assert.equal(archive[1].rtgChanges[0].delta, 200);
  assert.equal(archive[1].hasNewsroom, true);
});

test('builds a usable fallback when an older publication has no chronicle event', () => {
  const archive = buildCareerArchive({ ...state, careerChronicle: [] });
  const game = archive.find((entry) => entry.game);
  assert.match(game.title, /Test Opponent A/);
  assert.equal(game.careerPhase, 'Player');
});

test('filters by season, phase, type, and searchable verified facts', () => {
  const archive = buildCareerArchive(state);
  assert.equal(filterCareerArchive(archive, { type: 'bye' }).length, 1);
  assert.equal(filterCareerArchive(archive, { season: '1', phase: 'Player', query: 'passing yards' }).length, 1);
  assert.equal(filterCareerArchive(archive, { phase: 'HC' }).length, 0);
});

test('summarizes only actual player appearances for career statistics', () => {
  const archive = buildCareerArchive(state);
  assert.deepEqual(summarizeCareerArchive(archive), {
    updates: 2,
    games: 1,
    wins: 1,
    losses: 0,
    byes: 1,
    appearances: 1,
    passingYards: 210,
    totalTouchdowns: 3,
  });
  assert.deepEqual(getCareerArchiveFacets(archive), { seasons: [1], phases: ['Player'], types: ['bye', 'game'] });
});

test('includes user-confirmed milestones that are not weekly publications', () => {
  const milestoneId = 'milestone-1-3-commitment-test-university';
  const archive = buildCareerArchive({
    ...state,
    careerChronicle: [
      ...state.careerChronicle,
      {
        id: milestoneId,
        type: 'commitment',
        season: 1,
        week: 3,
        careerPhase: 'Player',
        title: 'Test Player commits to Test University',
        summary: 'The commitment was user-confirmed.',
        occurredAt: '2026-08-15T12:00:00.000Z',
        verificationMethod: 'user-confirmed',
        factKeys: [`career.${milestoneId}.institution`],
      },
    ],
    factLedger: [
      ...state.factLedger,
      {
        id: `${milestoneId}:institution`,
        publicationId: milestoneId,
        key: `career.${milestoneId}.institution`,
        label: 'Committed school',
        value: 'Test University',
        verified: true,
        verificationMethod: 'user-confirmed',
      },
    ],
  });
  const milestone = archive.find((entry) => entry.id === milestoneId);
  assert.equal(milestone.weekType, 'commitment');
  assert.equal(milestone.facts.length, 1);
  assert.equal(milestone.sourceCount, 0);
  assert.equal(filterCareerArchive(archive, { type: 'commitment' }).length, 1);
});
