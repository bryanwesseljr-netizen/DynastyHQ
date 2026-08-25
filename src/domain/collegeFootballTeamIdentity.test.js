import test from 'node:test';
import assert from 'node:assert/strict';

import { getCollegeFootballTeamIdentity } from './collegeFootballTeamIdentity.js';

const expectConference = (team, conference) => {
  const identity = getCollegeFootballTeamIdentity(team);
  assert.ok(identity, `${team} should resolve to a 2026 FBS identity`);
  assert.equal(identity.primaryConference, conference);
  assert.equal(identity.conference, conference);
  if (conference === 'Independent') {
    assert.equal(identity.conferencePatchLabel, '');
    assert.equal(identity.conferencePatchVisual, '');
  } else {
    assert.ok(identity.conferencePatchLabel, `${team} should have a conference patch label`);
    assert.ok(identity.conferencePatchVisual, `${team} should have an exact patch visual description`);
  }
  return identity;
};

test('2026 realignment-sensitive teams resolve to their current football conferences', () => {
  expectConference('Cincinnati', 'Big 12');
  expectConference('Texas', 'SEC');
  expectConference('Oklahoma', 'SEC');
  expectConference('Boise State', 'Pac-12');
  expectConference('Colorado State', 'Pac-12');
  expectConference('Fresno State', 'Pac-12');
  expectConference('San Diego State', 'Pac-12');
  expectConference('Texas State', 'Pac-12');
  expectConference('Utah State', 'Pac-12');
  expectConference('NIU', 'Mountain West');
  expectConference('Northern Illinois', 'Mountain West');
  expectConference('North Dakota State', 'Mountain West');
  expectConference('UTEP', 'Mountain West');
  expectConference('Sacramento State', 'MAC');
  expectConference('UMass', 'MAC');
});

test('major-conference and independent identities resolve with common aliases', () => {
  expectConference('Cal', 'ACC');
  expectConference('Miami (FL)', 'ACC');
  expectConference('Miami (OH)', 'MAC');
  expectConference('UCF', 'Big 12');
  expectConference('USC', 'Big Ten');
  expectConference('Ole Miss', 'SEC');
  expectConference('Army', 'American Conference');
  expectConference('FIU', 'Conference USA');
  expectConference('App State', 'Sun Belt');
  expectConference('Notre Dame', 'Independent');
  expectConference('UConn', 'Independent');
});

test('conference patch metadata gives image models a concrete visual target', () => {
  const cincinnati = expectConference('Cincinnati', 'Big 12');
  assert.equal(cincinnati.conferencePatchLabel, 'Big 12 Conference patch');
  assert.match(cincinnati.conferencePatchVisual, /stylized "XII"/i);

  const michigan = expectConference('Michigan', 'Big Ten');
  assert.match(michigan.conferencePatchVisual, /B1G/i);

  const georgia = expectConference('Georgia', 'SEC');
  assert.match(georgia.conferencePatchVisual, /circular "SEC"/i);

  const boise = expectConference('Boise State', 'Pac-12');
  assert.match(boise.conferencePatchVisual, /shield/i);
});

test('Cincinnati explicitly forbids legacy American conference marks', () => {
  const identity = getCollegeFootballTeamIdentity('Cincinnati');
  assert.deepEqual(identity.forbiddenLegacyPatches, [
    'American Athletic Conference patch',
    'AAC patch',
    'American/AAC star-A conference logo',
  ]);
  assert.deepEqual(identity.legacyConferenceMarks, identity.forbiddenLegacyPatches);
});
