import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveCareerTeamMediaProfile,
  resolveIssueTeamMediaProfile,
  resolveTeamMediaProfile,
  sameProgram,
} from './teamMediaProfile.js';

test('Cincinnati resolves to the Nippert Notebook and Bearcats team-media identity', () => {
  const profile = resolveTeamMediaProfile({
    school: 'Cincinnati',
    outletProfile: {
      school: 'Cincinnati',
      localOutletName: 'Bearcats Insider',
      regionalOutletName: 'Cincinnati Enquirer',
      nationalOutletName: 'College Football Central',
    },
  });

  assert.equal(profile.nickname, 'Bearcats');
  assert.equal(profile.localOutletName, 'Bearcats Insider');
  assert.equal(profile.regionalOutletName, 'Cincinnati Enquirer');
  assert.equal(profile.podcastName, 'Nippert Notebook');
  assert.equal(profile.podcastSubtitle, 'Cincinnati Football Podcast');
  assert.equal(profile.primary, '#e00122');
});

test('issue profile preserves the school and outlets captured when that edition was published', () => {
  const profile = resolveIssueTeamMediaProfile({
    season: 4,
    week: 2,
    outletProfile: {
      school: 'Michigan',
      localOutletName: 'Ann Arbor Saturday',
      regionalOutletName: 'Great Lakes Football',
      nationalOutletName: 'College Football Central',
    },
  });

  assert.equal(profile.school, 'Michigan');
  assert.equal(profile.nickname, 'Wolverines');
  assert.equal(profile.localOutletName, 'Ann Arbor Saturday');
  assert.equal(profile.regionalOutletName, 'Great Lakes Football');
  assert.notEqual(profile.primary, '#e00122');
});

test('current career profile follows the active school instead of the oldest career stop', () => {
  const state = {
    player: { college: 'Toledo', school: 'Old High School' },
    newsroomIssues: [
      { outletProfile: { school: 'Cincinnati', localOutletName: 'Bearcats Insider' } },
      { outletProfile: { school: 'Toledo', localOutletName: 'Rocket City Football' } },
    ],
  };
  const profile = resolveCareerTeamMediaProfile(state);
  assert.equal(profile.school, 'Toledo');
  assert.equal(profile.nickname, 'Rockets');
  assert.equal(profile.localOutletName, 'Rocket City Football');
});

test('future public careers receive a usable generic local identity even without a special profile', () => {
  const profile = resolveTeamMediaProfile({ school: 'Test University' });
  assert.equal(profile.school, 'Test University');
  assert.match(profile.localOutletName, /Test/);
  assert.match(profile.podcastName, /Test/);
  assert.ok(profile.primary);
});

test('program matching normalizes punctuation and case', () => {
  assert.equal(sameProgram('CINCINNATI', 'Cincinnati'), true);
  assert.equal(sameProgram('Texas A&M', 'Texas A and M'), true);
  assert.equal(sameProgram('Cincinnati', 'Michigan'), false);
});
