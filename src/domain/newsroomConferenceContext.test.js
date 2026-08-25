import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearNewsroomConferenceOverride,
  getNewsroomConferenceOverride,
  resolveNewsroomTeamIdentity,
  setNewsroomConferenceOverride,
} from './newsroomConferenceContext.js';

test('save conference override takes priority beginning with its effective Dynasty season', () => {
  const settings = setNewsroomConferenceOverride({
    settings: { autoAssignLibrary: true, conferenceOverrides: {} },
    teamName: 'Cincinnati',
    conference: 'SEC',
    effectiveSeason: 3,
    updatedAt: '2026-08-25T00:00:00.000Z',
  });
  const state = { newsroomMediaSettings: settings };

  const seasonTwo = resolveNewsroomTeamIdentity({ state, teamName: 'Cincinnati', dynastySeason: 2 });
  assert.equal(seasonTwo.primaryConference, 'Big 12');
  assert.equal(seasonTwo.identitySource, 'real-world-2026');

  const seasonThree = resolveNewsroomTeamIdentity({ state, teamName: 'Cincinnati', dynastySeason: 3 });
  assert.equal(seasonThree.primaryConference, 'SEC');
  assert.equal(seasonThree.identitySource, 'save-override');
  assert.equal(seasonThree.realWorldConference, 'Big 12');
  assert.match(seasonThree.conferencePatchVisual, /SEC circular/i);
  assert.ok(seasonThree.forbiddenLegacyPatches.some((entry) => /Big 12/i.test(entry)));
});

test('conference override supports aliases and unknown custom teams when the save supplies a conference', () => {
  const settings = setNewsroomConferenceOverride({
    settings: {},
    teamName: 'My Custom University',
    conference: 'b1g',
    effectiveSeason: 1,
  });
  const override = getNewsroomConferenceOverride({ settings, teamName: 'My Custom University', dynastySeason: 1 });
  assert.equal(override.conference, 'Big Ten');

  const identity = resolveNewsroomTeamIdentity({
    state: { newsroomMediaSettings: settings },
    teamName: 'My Custom University',
    dynastySeason: 1,
  });
  assert.equal(identity.team, 'My Custom University');
  assert.equal(identity.primaryConference, 'Big Ten');
  assert.equal(identity.identitySource, 'save-override');
  assert.match(identity.conferencePatchVisual, /B1G/);
});

test('clearing an override returns the team to the real-world fallback', () => {
  const withOverride = setNewsroomConferenceOverride({
    settings: { conferenceOverrides: {} },
    teamName: 'Texas',
    conference: 'Big 12',
    effectiveSeason: 1,
  });
  const cleared = clearNewsroomConferenceOverride({ settings: withOverride, teamName: 'Texas' });
  const identity = resolveNewsroomTeamIdentity({
    state: { newsroomMediaSettings: cleared },
    teamName: 'Texas',
    dynastySeason: 2,
  });
  assert.equal(identity.primaryConference, 'SEC');
  assert.equal(identity.identitySource, 'real-world-2026');
});
