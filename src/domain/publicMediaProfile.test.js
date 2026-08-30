import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPublicMediaProfileSnapshot,
  playerAppearedInGame,
  readPublicMediaProfileId,
  summarizePublicPlayerStats,
} from './publicMediaProfile.js';

test('public media profile exposes media and player stats without private workflow data', () => {
  const snapshot = buildPublicMediaProfileSnapshot({
    state: {
      careerPhase: 'Player',
      currentSeason: 2,
      currentWeek: 4,
      player: { name: 'Test QB', college: 'Cincinnati', pos: 'QB', number: 6, overall: 72, headshot: 'https://example.com/qb.jpg' },
      rtg: { rank: 'QB3', gpa: 2.8, coachTrust: 588, energy: 70, skillPoints: 3, followers: 5000 },
      recruiting: [{ name: 'Private School' }],
      weeklyAgendaDraft: { private: true },
      rumors: ['private workflow note'],
      coach: { security: 88 },
      gameLogs: [{ season: 2, week: 1, opponent: 'Team A', result: 'W', passYds: 0, passTD: 0, rushYds: 0, rushTD: 0, int: 0 }],
      weeklyUpdates: [{ season: 2, week: 1, game: { opponent: 'Team A', result: 'W' }, rtgSnapshot: { rank: 'QB3', gpa: 2.8 } }],
      newsroomIssues: [{ id: 'issue-1' }],
      podcastEpisodes: [{ id: 'episode-1' }],
      postgameFrontPages: [{ id: 'front-1' }],
      outletImages: { podcast: 'https://example.com/show.jpg', privateReference: 'secret' },
      collegeNewsroom: { activeStopId: 'cin' },
    },
    mediaLibrary: [{ id: 'public-photo' }],
    sharedAt: '2026-08-30T20:00:00.000Z',
  });

  assert.deepEqual(snapshot.sections, ['stats', 'newsroom', 'podcast']);
  assert.equal(snapshot.player.name, 'Test QB');
  assert.deepEqual(snapshot.rtg, { rank: 'QB3' });
  assert.equal(snapshot.newsroomIssues.length, 1);
  assert.equal(snapshot.podcastEpisodes.length, 1);
  assert.equal(snapshot.newsroomMediaLibrary.length, 1);
  assert.equal(snapshot.outletImages.podcast, 'https://example.com/show.jpg');
  assert.equal('recruiting' in snapshot, false);
  assert.equal('weeklyAgendaDraft' in snapshot, false);
  assert.equal('rumors' in snapshot, false);
  assert.equal('coach' in snapshot, false);
  assert.equal('gpa' in snapshot.rtg, false);
  assert.equal('coachTrust' in snapshot.rtg, false);
  assert.equal('energy' in snapshot.rtg, false);
});

test('all-zero line is DNP unless appearance is explicit', () => {
  const zeroLine = { passYds: 0, passTD: 0, rushYds: 0, rushTD: 0, int: 0 };
  assert.equal(playerAppearedInGame(zeroLine), false);
  assert.equal(playerAppearedInGame({ ...zeroLine, didPlay: true }), true);
  assert.equal(playerAppearedInGame({ ...zeroLine, int: 1 }), true);
  assert.equal(playerAppearedInGame({ ...zeroLine, didPlay: false, passYds: 40 }), false);
});

test('public player totals count appearances rather than team games', () => {
  const state = {
    gameLogs: [
      { season: 2, week: 1, passYds: 0, passTD: 0, rushYds: 0, rushTD: 0, int: 0 },
      { season: 2, week: 2, didPlay: true, passYds: 0, passTD: 0, rushYds: 0, rushTD: 0, int: 0 },
      { season: 2, week: 3, passYds: 125, passTD: 1, rushYds: 30, rushTD: 1, int: 0 },
    ],
  };
  assert.deepEqual(summarizePublicPlayerStats(state, 2), {
    games: 2,
    passYds: 125,
    passTD: 1,
    rushYds: 30,
    rushTD: 1,
    interceptions: 0,
  });
});

test('media profile query id is read independently of legacy whole-career view links', () => {
  assert.equal(readPublicMediaProfileId('?media=abc-123&section=podcast'), 'abc-123');
  assert.equal(readPublicMediaProfileId('?view=legacy-owner'), '');
});
