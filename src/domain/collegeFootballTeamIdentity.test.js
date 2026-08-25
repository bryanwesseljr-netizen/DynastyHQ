import test from 'node:test';
import assert from 'node:assert/strict';

import { getCollegeFootballTeamIdentity } from './collegeFootballTeamIdentity.js';

const expectConference = (team, conference, patch = conference) => {
  const identity = getCollegeFootballTeamIdentity(team);
  assert.ok(identity, `${team} should resolve to a 2026 FBS identity`);
  assert.equal(identity.conference, conference);
  assert.equal(identity.conferencePatch, patch === 'Independent' ? '' : patch);
};

test('2026 realignment-sensitive teams resolve to their current football conferences', () => {
  expectConference('Cincinnati', 'Big 12', 'Big 12');
  expectConference('Texas', 'SEC', 'SEC');
  expectConference('Oklahoma', 'SEC', 'SEC');
  expectConference('Boise State', 'Pac-12', 'Pac-12');
  expectConference('Colorado State', 'Pac-12', 'Pac-12');
  expectConference('Fresno State', 'Pac-12', 'Pac-12');
  expectConference('San Diego State', 'Pac-12', 'Pac-12');
  expectConference('Texas State', 'Pac-12', 'Pac-12');
  expectConference('Utah State', 'Pac-12', 'Pac-12');
  expectConference('NIU', 'Mountain West', 'Mountain West');
  expectConference('Northern Illinois', 'Mountain West', 'Mountain West');
  expectConference('North Dakota State', 'Mountain West', 'Mountain West');
  expectConference('UTEP', 'Mountain West', 'Mountain West');
  expectConference('Sacramento State', 'MAC', 'MAC');
  expectConference('UMass', 'MAC', 'MAC');
});

test('major-conference and independent identities resolve with common aliases', () => {
  expectConference('Cal', 'ACC', 'ACC');
  expectConference('Miami (FL)', 'ACC', 'ACC');
  expectConference('Miami (OH)', 'MAC', 'MAC');
  expectConference('UCF', 'Big 12', 'Big 12');
  expectConference('USC', 'Big Ten', 'Big Ten');
  expectConference('Ole Miss', 'SEC', 'SEC');
  expectConference('Army', 'American Conference', 'American Conference');
  expectConference('FIU', 'Conference USA', 'Conference USA / CUSA');
  expectConference('App State', 'Sun Belt', 'Sun Belt');
  expectConference('Notre Dame', 'Independent', 'Independent');
  expectConference('UConn', 'Independent', 'Independent');
});

test('Cincinnati explicitly forbids legacy American conference marks', () => {
  const identity = getCollegeFootballTeamIdentity('Cincinnati');
  assert.deepEqual(identity.legacyConferenceMarks, ['American Athletic Conference', 'AAC', 'American']);
});
