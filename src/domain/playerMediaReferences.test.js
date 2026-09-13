import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildVerifiedPlayerMediaReference,
  createPlayerReferenceNormalizer,
  naturalHeightDescription,
  naturalRoleDescription,
  surnameFromFullName,
} from './playerMediaReferences.js';

test('builds natural verified quarterback descriptions', () => {
  const state = {
    currentSeason: 1,
    currentWeek: 4,
    player: {
      name: 'Sam Jones',
      pos: 'QB',
      archetype: 'Dual Threat',
      height: `6'4"`,
    },
    rtg: { rank: 'QB1' },
    weeklyUpdates: [{
      publicationId: 'season-1-week-4',
      season: 1,
      week: 4,
      rtgSnapshot: { rank: 'QB2' },
    }],
    factLedger: [],
  };

  const reference = buildVerifiedPlayerMediaReference(state, {
    publicationId: 'season-1-week-4', season: 1, week: 4,
  });

  assert.equal(reference.fullName, 'Sam Jones');
  assert.equal(reference.surname, 'Jones');
  assert.equal(reference.role, 'QB2');
  assert.equal(reference.roleSource, 'weekly-snapshot');
  assert.equal(reference.roleDescription, 'second-string quarterback');
  assert.ok(reference.descriptors.includes('the backup quarterback'));
  assert.ok(reference.descriptors.includes('the dual-threat quarterback'));
  assert.ok(reference.descriptors.includes('the 6-foot-4 quarterback'));
});

test('historical edition keeps that week role instead of current role', () => {
  const state = {
    currentSeason: 1,
    currentWeek: 8,
    player: { name: 'Sam Jones', pos: 'QB', archetype: 'Dual Threat', height: `6'4"` },
    rtg: { rank: 'QB1' },
    weeklyUpdates: [
      { publicationId: 'season-1-week-2', season: 1, week: 2, rtgSnapshot: { rank: 'QB3' } },
      { publicationId: 'season-1-week-7', season: 1, week: 7, rtgSnapshot: { rank: 'QB2' } },
    ],
    factLedger: [],
  };

  const reference = buildVerifiedPlayerMediaReference(state, {
    publicationId: 'season-1-week-2', season: 1, week: 2,
  });

  assert.equal(reference.role, 'QB3');
  assert.equal(reference.roleDescription, 'third-string quarterback');
  assert.notEqual(reference.role, state.rtg.rank);
  assert.ok(reference.descriptors.includes('the backup quarterback'));
  assert.ok(reference.descriptors.includes('the reserve quarterback'));
});

test('old edition without a saved role does not borrow the current depth-chart role', () => {
  const state = {
    currentSeason: 1,
    currentWeek: 9,
    player: { name: 'Sam Jones', pos: 'QB' },
    rtg: { rank: 'QB1' },
    weeklyUpdates: [{ publicationId: 'season-1-week-3', season: 1, week: 3, rtgSnapshot: {} }],
    factLedger: [],
  };

  const reference = buildVerifiedPlayerMediaReference(state, {
    publicationId: 'season-1-week-3', season: 1, week: 3,
  });

  assert.equal(reference.role, '');
  assert.equal(reference.roleSource, '');
  assert.ok(!reference.descriptors.includes('the starting quarterback'));
});

test('reference normalizer converts initials and keeps only the first full-name usage', () => {
  const normalize = createPlayerReferenceNormalizer({ fullName: 'Sam Jones', surname: 'Jones' });
  assert.equal(normalize('Sam Jones entered the game.'), 'Sam Jones entered the game.');
  assert.equal(normalize('S. Jones moved the offense.'), 'Jones moved the offense.');
  assert.equal(normalize('Sam Jones added a rushing score.'), 'Jones added a rushing score.');
});

test('name, role and height helpers stay conservative', () => {
  assert.equal(surnameFromFullName('Bryan Wessel Jr.'), 'Wessel');
  assert.equal(naturalRoleDescription('QB1', 'QB'), 'starting quarterback');
  assert.equal(naturalRoleDescription('QB3', 'QB'), 'third-string quarterback');
  assert.equal(naturalHeightDescription(`6'4"`, 'QB'), '6-foot-4 quarterback');
  assert.equal(naturalHeightDescription('tall', 'QB'), '');
});
