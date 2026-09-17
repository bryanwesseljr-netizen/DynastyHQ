import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCareerChronicle2 } from './careerChronicle2.js';

test('Career Chronicle 2.0 builds a schedule-backed season chapter and preserves attached media', () => {
  const state = {
    currentSeason: 1,
    currentWeek: 3,
    careerPhase: 'Player',
    player: { name: 'Test QB', college: 'Oregon', school: 'Oregon' },
    rtg: { rank: 'QB1' },
    seasonSchedules: [{
      season: 1,
      school: 'Oregon',
      entries: [
        { week: 1, opponent: 'Team A', status: 'completed', result: 'W', teamScore: 31, opponentScore: 20 },
        { week: 2, opponent: 'Baylor', status: 'completed', result: 'L', teamScore: 21, opponentScore: 45 },
        { week: 3, opponent: 'Michigan State', status: 'upcoming' },
      ],
    }],
    weeklyUpdates: [{
      id: 'season-1-week-2',
      publicationId: 'season-1-week-2',
      season: 1,
      week: 2,
      careerPhase: 'Player',
      publishedAt: '2026-09-12T00:00:00.000Z',
      game: {
        season: 1,
        week: 2,
        opponent: 'Baylor',
        result: 'L',
        homeScore: 21,
        awayScore: 45,
        didPlay: true,
        passYds: 203,
        passTD: 1,
        rushYds: 18,
        rushTD: 0,
        int: 1,
      },
      rtgSnapshot: { rank: 'QB1' },
      rtgChanges: [{ key: 'rtg.rank', previous: 'QB2', current: 'QB1', label: 'Depth chart role' }],
    }],
    gameLogs: [{
      season: 1,
      week: 2,
      opponent: 'Baylor',
      result: 'L',
      homeScore: 21,
      awayScore: 45,
      didPlay: true,
      passYds: 203,
      passTD: 1,
      rushYds: 18,
      rushTD: 0,
      int: 1,
    }],
    careerChronicle: [],
    careerMilestones: [],
    factLedger: [],
    newsroomIssues: [{
      id: 'season-1-week-2',
      publicationId: 'season-1-week-2',
      season: 1,
      week: 2,
      outletProfile: { school: 'Oregon' },
      articles: [{ headline: 'Baylor hands Oregon a road loss', dek: 'The Ducks leave Waco with questions to answer.' }],
    }],
    podcastEpisodes: [{
      id: 'podcast-season-1-week-2',
      publicationId: 'season-1-week-2',
      season: 1,
      week: 2,
      title: 'Oregon regroups after Baylor',
      audioStatus: 'ready',
    }],
    eaSportsNetworkArticles: [{
      id: 'season-1-week-2',
      publicationId: 'season-1-week-2',
      season: 1,
      week: 2,
      outlet: 'EA SPORTS Network',
      headline: 'Baylor powers past Oregon',
      summary: 'Official in-game coverage preserved from College Football 27.',
    }],
    newsroomMediaLibrary: [],
    postgameFrontPages: [],
  };

  const chronicle = buildCareerChronicle2(state);
  assert.equal(chronicle.seasons.length, 1);
  assert.equal(chronicle.seasons[0].record.wins, 1);
  assert.equal(chronicle.seasons[0].record.losses, 1);
  assert.equal(chronicle.seasons[0].appearances, 1);
  assert.equal(chronicle.seasons[0].passYds, 203);
  assert.equal(chronicle.signatureGames.length, 1);
  assert.equal(chronicle.signatureGames[0].signatureLabel, 'THE FIRST START');
  assert.ok(chronicle.signatureGames[0].signatureReasons.includes('First recorded college appearance'));
  assert.ok(chronicle.signatureGames[0].signatureReasons.includes('Starting-role chapter began'));
  assert.equal(chronicle.signatureGames[0].media.official.headline, 'Baylor powers past Oregon');
  assert.equal(chronicle.signatureGames[0].media.newsroom.headline, 'Baylor hands Oregon a road loss');
  assert.equal(chronicle.signatureGames[0].media.podcast.finished, true);
});
