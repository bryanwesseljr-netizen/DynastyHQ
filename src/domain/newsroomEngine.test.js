import test from 'node:test';
import assert from 'node:assert/strict';

import { createNewsroomIssue } from './newsroomEngine.js';

const baseFacts = [
  'profile.player.name', 'profile.player.school', 'game.opponent', 'game.result',
  'game.homeScore', 'game.awayScore', 'game.passYds', 'game.passTD',
  'game.rushYds', 'game.rushTD', 'game.int', 'weekly.quote',
  'recruiting.2.interest',
];

test('creates five outlet voices from only available facts', () => {
  const issue = createNewsroomIssue({
    publicationId: 'week-1',
    season: 1,
    week: 1,
    careerPhase: 'Player',
    player: { name: 'Test Player', school: 'Test High School' },
    game: { opponent: 'Test Opponent A', result: 'W', homeScore: 28, awayScore: 14, passYds: 250, passTD: 2, rushYds: 55, rushTD: 1, int: 0 },
    recruiting: [
      { id: 1, name: 'Test College A', interest: 95 },
      { id: 2, name: 'Test University', interest: 80 },
    ],
    quote: 'We earned it.',
    availableFactKeys: baseFacts,
    publishedAt: '2026-07-31T12:00:00.000Z',
  });

  assert.equal(issue.articles.length, 5);
  assert.ok(issue.articles.every((entry) => entry.paragraphs.length === 4));
  assert.ok(issue.articles.every((entry) => entry.paragraphs.every((paragraph) => paragraph.trim().length > 40)));
  assert.ok(issue.articles.every((entry) => entry.groundingStatus === 'verified'));
  assert.match(issue.articles[0].dek, /305 total yards/);
  assert.match(issue.articles[2].headline, /Test University/);
  assert.doesNotMatch(issue.articles[2].headline, /^Test College A leads/);
});

test('adds verified week-over-week and season context without flattening outlet voices', () => {
  const issue = createNewsroomIssue({
    publicationId: 'week-2-trends',
    season: 1,
    week: 2,
    careerPhase: 'Player',
    player: { name: 'Test Player', school: 'Test High School' },
    game: { opponent: 'Test Opponent B', result: 'W', homeScore: 31, awayScore: 20, passYds: 260, passTD: 3, rushYds: 40, rushTD: 1, int: 0 },
    previousGames: [
      { season: 1, week: 1, opponent: 'Test Opponent A', result: 'W', passYds: 200, passTD: 2, rushYds: 50, rushTD: 0, int: 1 },
    ],
    previousRecruiting: [{ id: 2, name: 'Test University', interest: 50 }],
    recruiting: [{ id: 2, name: 'Test University', interest: 80 }],
    availableFactKeys: baseFacts,
    currentFactKeys: baseFacts,
    publishedAt: '2026-08-07T12:00:00.000Z',
  });

  const localStory = issue.articles.find((entry) => entry.outletId === 'local');
  const recruitingStory = issue.articles.find((entry) => entry.outletId === 'recruiting');
  const nationalStory = issue.articles.find((entry) => entry.outletId === 'national');
  assert.match(localStory.paragraphs.join(' '), /increased by 50/);
  assert.match(recruitingStory.paragraphs.join(' '), /rising from 50% to 80%/);
  assert.match(nationalStory.paragraphs.join(' '), /team is 2-0/);
  assert.equal(new Set(issue.articles.map((entry) => entry.paragraphs.join(' '))).size, 5);
});

test('carries verified RTG mechanics and NIL movement into the weekly coverage', () => {
  const rtgKeys = ['rtg.gpa', 'rtg.energy', 'rtg.coachTrust', 'rtg.rank', 'rtg.followers', 'rtg.valuation'];
  const issue = createNewsroomIssue({
    publicationId: 'week-rtg-2',
    season: 1,
    week: 2,
    careerPhase: 'Player',
    player: { name: 'Test Player', school: 'Test University' },
    game: { opponent: 'Test Opponent B', result: 'W', passYds: 240, passTD: 2, rushYds: 60, rushTD: 1, int: 0 },
    rtg: { gpa: 3.5, energy: 72, coachTrust: 1200, rank: 'QB2', followers: 4500, valuation: 12000 },
    previousRtg: { gpa: 3.4, energy: 80, coachTrust: 900, rank: 'QB3', followers: 3000, valuation: 9000 },
    availableFactKeys: [...baseFacts, ...rtgKeys],
    currentFactKeys: [...baseFacts, ...rtgKeys],
    publishedAt: '2026-08-07T12:00:00.000Z',
  });

  const localStory = issue.articles.find((entry) => entry.outletId === 'local');
  assert.match(localStory.paragraphs.join(' '), /1,200 Coach Trust \(\+300 this week\)/);
  assert.match(localStory.paragraphs.join(' '), /4,500 followers \(\+1,500 this week\)/);
  assert.match(localStory.paragraphs.join(' '), /\$12,000 NIL valuation \(\$\+3,000 this week\)/);
  assert.equal(localStory.groundingStatus, 'verified');
  assert.match(issue.podcastBrief.summary, /RTG and NIL snapshot is preserved/);
});

test('does not publish unverified recruiting interest as reporting', () => {
  const issue = createNewsroomIssue({
    publicationId: 'week-2',
    season: 1,
    week: 2,
    careerPhase: 'Player',
    player: { name: 'Test Player', school: 'Test High School' },
    game: { opponent: 'Test Opponent C', result: 'L', passYds: 180, passTD: 1, rushYds: 20, rushTD: 0, int: 2 },
    recruiting: [{ id: 1, name: 'Test College A', interest: 95 }],
    availableFactKeys: baseFacts.filter((key) => !key.startsWith('recruiting.')),
    publishedAt: '2026-08-07T12:00:00.000Z',
  });

  const recruitingStory = issue.articles.find((entry) => entry.outletId === 'recruiting');
  assert.equal(recruitingStory.paragraphs.length, 4);
  assert.match(recruitingStory.headline, /awaits its first verified movement/);
  assert.doesNotMatch(JSON.stringify(recruitingStory), /95/);
});

test('film room explicitly avoids claims unsupported by charting data', () => {
  const issue = createNewsroomIssue({
    publicationId: 'week-3',
    season: 1,
    week: 3,
    careerPhase: 'Player',
    player: { name: 'Test Player', school: 'Test High School' },
    game: { opponent: 'Test Opponent D', result: 'W', passYds: 310, passTD: 4, rushYds: 42, rushTD: 0, int: 1 },
    availableFactKeys: baseFacts,
    publishedAt: '2026-08-14T12:00:00.000Z',
  });

  const filmRoom = issue.articles.find((entry) => entry.outletId === 'filmroom');
  assert.match(filmRoom.paragraphs.join(' '), /No formation, coverage, pressure, or blocking claim/);
  assert.doesNotMatch(filmRoom.paragraphs.join(' '), /Counter Trey|3-deep|0 Sacks/);
});

test('blank statistics remain unreported instead of becoming invented zeroes', () => {
  const issue = createNewsroomIssue({
    publicationId: 'week-4',
    season: 1,
    week: 4,
    careerPhase: 'Player',
    player: { name: 'Test Player', school: 'Test High School' },
    game: { opponent: 'Test Opponent E', result: 'W', passYds: '', passTD: '', rushYds: '', rushTD: '', int: '' },
    availableFactKeys: ['profile.player.name', 'profile.player.school', 'game.opponent', 'game.result'],
    publishedAt: '2026-08-21T12:00:00.000Z',
  });

  const combinedCopy = issue.articles.flatMap((entry) => [entry.headline, entry.dek, ...entry.paragraphs]).join(' ');
  assert.match(combinedCopy, /No individual statistics were recorded/);
  assert.doesNotMatch(combinedCopy, /0 passing yards|0 total yards/);
  assert.ok(issue.articles.every((entry) => entry.groundingStatus === 'verified'));
});
