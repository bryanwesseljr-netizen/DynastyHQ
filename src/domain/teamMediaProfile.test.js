import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveCareerTeamMediaProfile,
  resolveCurrentProgramSchool,
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

test('verified transfer destination outranks a stale player college value', () => {
  const state = {
    careerPhase: 'Player',
    careerStage: 'College',
    player: { college: 'Cincinnati', school: 'Cincinnati' },
    careerMilestones: [
      { type: 'transfer', institution: 'Michigan', previousInstitution: 'Cincinnati', season: 3, week: 16 },
    ],
    newsroomIssues: [
      { outletProfile: { school: 'Cincinnati', localOutletName: 'Bearcats Insider' } },
      { outletProfile: { school: 'Michigan', localOutletName: 'Ann Arbor Saturday' } },
    ],
  };

  assert.equal(resolveCurrentProgramSchool(state), 'Michigan');
  assert.equal(resolveCareerTeamMediaProfile(state).school, 'Michigan');
  assert.equal(resolveCareerTeamMediaProfile(state).nickname, 'Wolverines');
});

test('coaching mode follows the latest verified coaching institution instead of the old player college', () => {
  const state = {
    careerPhase: 'OC',
    player: { graduated: true, graduationSchool: 'Cincinnati', college: 'Cincinnati', school: 'Cincinnati' },
    coach: {},
    careerTransitions: { coachingUniverseCreated: true },
    careerMilestones: [
      { type: 'oc-hire', institution: 'Cincinnati', season: 5, week: 1 },
      { type: 'hc-hire', institution: 'Toledo', previousInstitution: 'Cincinnati', season: 7, week: 1 },
    ],
    newsroomIssues: [
      { outletProfile: { school: 'Cincinnati', localOutletName: 'Bearcats Insider' } },
      { outletProfile: { school: 'Toledo', localOutletName: 'Rocket City Football' } },
    ],
  };

  const profile = resolveCareerTeamMediaProfile(state);
  assert.equal(resolveCurrentProgramSchool(state), 'Toledo');
  assert.equal(profile.school, 'Toledo');
  assert.equal(profile.nickname, 'Rockets');
  assert.equal(profile.localOutletName, 'Rocket City Football');
});

test('explicit coach school wins when the coaching profile supplies the current job', () => {
  const state = {
    careerStage: 'HC',
    player: { graduated: true, college: 'Cincinnati' },
    coach: { school: 'Michigan State' },
    careerTransitions: { coachingUniverseCreated: true },
    careerMilestones: [
      { type: 'hc-hire', institution: 'Toledo', season: 7, week: 1 },
    ],
  };

  const profile = resolveCareerTeamMediaProfile(state);
  assert.equal(profile.school, 'Michigan State');
  assert.equal(profile.nickname, 'Spartans');
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
