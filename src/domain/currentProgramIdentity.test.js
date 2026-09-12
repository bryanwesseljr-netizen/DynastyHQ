import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCareerTeamMediaProfile,
  resolveIssueTeamMediaProfile,
  resolveTeamMediaProfile,
} from './teamMediaProfile.js';
import { createCollegeOutletSet, getActiveCollegeNewsroomStop } from './collegeNewsroom.js';
import { buildCareerEventPublication } from './careerEventPublication.js';

const cincinnatiStop = {
  id: 'cincinnati-stop',
  school: 'Cincinnati',
  city: 'Cincinnati',
  state: 'Ohio',
  localOutletName: 'Bearcats Insider',
  regionalOutletName: 'Cincinnati Enquirer',
  nationalOutletName: 'College Football Central',
  startedSeason: 1,
  startedWeek: 1,
};

test('Oregon resolves to a complete Oregon media identity', () => {
  const profile = resolveTeamMediaProfile({ school: 'Oregon' });
  assert.equal(profile.school, 'Oregon');
  assert.equal(profile.nickname, 'Ducks');
  assert.equal(profile.city, 'Eugene');
  assert.equal(profile.primary.toLowerCase(), '#154733');
  assert.equal(profile.secondary.toLowerCase(), '#fee123');
  assert.equal(profile.localOutletName, 'Eugene Sports Chronicle');
  assert.equal(profile.regionalOutletName, 'Oregon Gridiron Ledger');
  assert.equal(profile.podcastSubtitle, 'Oregon Football Podcast');
});

test('an active Cincinnati newsroom stop cannot leak into Oregon', () => {
  const newsroom = {
    activeStopId: cincinnatiStop.id,
    stops: [cincinnatiStop],
  };
  assert.equal(getActiveCollegeNewsroomStop(newsroom, 'Oregon'), null);

  const outlets = createCollegeOutletSet(newsroom, 'Oregon');
  assert.equal(outlets.find((entry) => entry.id === 'college-local')?.name, 'Eugene Sports Chronicle');
  assert.equal(outlets.find((entry) => entry.id === 'college-regional')?.name, 'Oregon Gridiron Ledger');
});

test('current Oregon identity wins over stale Cincinnati names saved on an Oregon issue', () => {
  const staleIssue = {
    outletProfile: {
      school: 'Oregon',
      city: 'Cincinnati',
      state: 'Ohio',
      localOutletName: 'Bearcats Insider',
      regionalOutletName: 'Cincinnati Enquirer',
    },
  };
  const profile = resolveIssueTeamMediaProfile(staleIssue);
  assert.equal(profile.school, 'Oregon');
  assert.equal(profile.city, 'Eugene');
  assert.equal(profile.localOutletName, 'Eugene Sports Chronicle');
  assert.equal(profile.regionalOutletName, 'Oregon Gridiron Ledger');
});

test('historical Cincinnati issues retain Cincinnati branding after the career moves to Oregon', () => {
  const state = {
    player: { school: 'Oregon', college: 'Oregon' },
    newsroomIssues: [{
      id: 'old-cincinnati',
      outletProfile: { school: 'Cincinnati', localOutletName: 'Bearcats Insider', regionalOutletName: 'Cincinnati Enquirer' },
    }],
  };
  const current = resolveCareerTeamMediaProfile(state);
  const historical = resolveIssueTeamMediaProfile(state.newsroomIssues[0], state);
  assert.equal(current.school, 'Oregon');
  assert.equal(current.localOutletName, 'Eugene Sports Chronicle');
  assert.equal(historical.school, 'Cincinnati');
  assert.equal(historical.localOutletName, 'Bearcats Insider');
});

test('career event publication uses Oregon outlets even when Cincinnati remains the active old newsroom stop', () => {
  const state = {
    currentSeason: 2,
    currentWeek: 1,
    careerPhase: 'Player',
    player: {
      name: 'Bryan Wessel',
      school: 'Oregon',
      college: 'Oregon',
      isCommitted: true,
      classYear: 'Freshman',
      pos: 'QB',
    },
    rtg: { rank: 'QB2' },
    careerTracking: {
      mode: 'active',
      activationReason: 'starter',
      activatedAt: '2026-09-12T20:00:00.000Z',
      statusHistory: [],
    },
    collegeNewsroom: {
      activeStopId: cincinnatiStop.id,
      stops: [cincinnatiStop],
    },
    currentWeekSetup: { phase: 'regular' },
    factLedger: [],
    newsroomIssues: [],
    weeklyUpdates: [],
    gameLogs: [],
    careerChronicle: [],
  };

  const next = buildCareerEventPublication(state);
  const issue = next.newsroomIssues[0];
  assert.equal(issue.outletProfile.school, 'Oregon');
  assert.equal(issue.outletProfile.city, '');
  assert.equal(issue.outletProfile.localOutletName, 'Eugene Sports Chronicle');
  assert.equal(issue.outletProfile.regionalOutletName, 'Oregon Gridiron Ledger');
  assert.equal(issue.articles.find((entry) => entry.outletId === 'college-local')?.outletName, 'Eugene Sports Chronicle');
  assert.equal(issue.articles.find((entry) => entry.outletId === 'college-regional')?.outletName, 'Oregon Gridiron Ledger');
});
