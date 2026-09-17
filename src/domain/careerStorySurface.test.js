import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCareerStorySurface } from './careerStorySurface.js';

const state = {
  currentSeason: 2,
  currentWeek: 3,
  player: { name: 'Sam Jones', college: 'Oregon', pos: 'QB' },
  rtg: { rank: 'QB1', coachTrust: 1148 },
  seasonSchedules: [{
    season: 2,
    school: 'Oregon',
    entries: [
      { week: 1, opponent: 'North Dakota State', status: 'completed', result: 'W', teamScore: 42, opponentScore: 24 },
      { week: 2, opponent: 'Baylor', status: 'completed', result: 'L', teamScore: 21, opponentScore: 45 },
      { week: 3, opponent: 'Oregon State', status: 'completed', result: 'W', teamScore: 33, opponentScore: 15 },
      { week: 4, opponent: 'BYE', isBye: true, status: 'bye' },
      { week: 5, opponent: 'Michigan State', status: 'upcoming', homeAway: 'home' },
    ],
  }],
  gameLogs: [
    { season: 2, week: 2, opponent: 'Baylor', result: 'L', homeScore: 21, awayScore: 45, passYds: 203, passTD: 1, rushYds: -6, rushTD: 0, int: 0 },
  ],
  newsroomIssues: [{
    season: 2,
    week: 2,
    publicationId: 'season-2-week-2',
    articles: [{ headline: 'Oregon Falls to Baylor in Season Opener', dek: 'A difficult road night.' }],
  }],
  podcastEpisodes: [{ season: 2, week: 2, publicationId: 'season-2-week-2', title: 'Oregon Week 2: The Reality Check', status: 'published', audioStatus: 'ready' }],
};

test('turns saved career facts into specific Home story copy', () => {
  const surface = buildCareerStorySurface(state);
  assert.match(surface.headline, /Oregon is 2-1/i);
  assert.match(surface.headline, /Michigan State/i);
  assert.match(surface.summary, /Oregon State/i);
  assert.match(surface.summary, /203 pass yds/i);
  assert.equal(surface.role.title, 'QB1');
  assert.match(surface.role.detail, /1,148 coach trust/i);
  assert.equal(surface.coverage.title, 'Oregon Falls to Baylor in Season Opener');
  assert.match(surface.coverage.detail, /Newsroom \+ The Huddle/i);
  assert.doesNotMatch(`${surface.headline} ${surface.summary} ${surface.story.detail}`, /verified career timeline|verified checkpoint|data accumulates/i);
});
