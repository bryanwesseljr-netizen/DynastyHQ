import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyPlayerProfile,
  normalizePlayerProfile,
  validatePlayerProfile,
} from './playerProfile.js';

const validProfile = {
  name: ' Bryan Wessel Jr. ',
  school: ' Edsel Ford Thunderbirds ',
  number: '2',
  pos: ' qb ',
  height: `6'1"`,
  weight: '205 lbs',
  archetype: 'Dual-Threat',
  stars: '3',
  overall: '70',
};

test('player profile normalization trims text and preserves numeric values', () => {
  assert.deepEqual(normalizePlayerProfile(validProfile), {
    name: 'Bryan Wessel Jr.',
    school: 'Edsel Ford Thunderbirds',
    number: '2',
    pos: 'QB',
    height: `6'1"`,
    weight: '205 lbs',
    archetype: 'Dual-Threat',
    stars: 3,
    overall: 70,
  });
});

test('player profile validation protects required fields and rating ranges', () => {
  assert.deepEqual(validatePlayerProfile(validProfile), {});
  const errors = validatePlayerProfile({ ...validProfile, name: '', number: 100, stars: 0, overall: 110 });
  assert.match(errors.name, /required/i);
  assert.match(errors.number, /0 to 99/i);
  assert.match(errors.stars, /1 and 5/i);
  assert.match(errors.overall, /1 and 99/i);
});

test('saving an active high-school profile keeps the recruiting rating in sync', () => {
  const state = {
    careerPhase: 'Player',
    player: { headshot: 'https://example.com/photo.jpg', stars: 2, isCommitted: false },
    playerRecruiting: { highSchool: { recruitStars: 2, tapeScore: 0 }, highSchoolArchive: null },
  };
  const updated = applyPlayerProfile(state, validProfile);
  assert.equal(updated.player.name, 'Bryan Wessel Jr.');
  assert.equal(updated.player.headshot, state.player.headshot);
  assert.equal(updated.player.stars, 3);
  assert.equal(updated.playerRecruiting.highSchool.recruitStars, 3);
  assert.equal(updated.playerRecruiting.highSchool.tapeScore, 0);
});

test('editing a later-career profile does not rewrite the archived recruit rating', () => {
  const state = {
    careerPhase: 'OC',
    player: { stars: 4, isCommitted: true },
    playerRecruiting: { highSchool: { recruitStars: 4 }, highSchoolArchive: { starRating: 4 } },
  };
  const updated = applyPlayerProfile(state, { ...validProfile, stars: 5 });
  assert.equal(updated.player.stars, 5);
  assert.equal(updated.playerRecruiting.highSchool.recruitStars, 4);
  assert.equal(updated.playerRecruiting.highSchoolArchive.starRating, 4);
});
