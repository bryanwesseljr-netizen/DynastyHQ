import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCareerEventPublication } from './careerEventPublication.js';

const baseState = (overrides = {}) => ({
  currentSeason: 2,
  currentWeek: 5,
  careerPhase: 'Player',
  player: {
    name: 'Bryan Wessel',
    school: 'Oregon',
    college: 'Oregon',
    isCommitted: true,
    classYear: 'Sophomore',
    pos: 'QB',
  },
  rtg: { rank: 'QB2' },
  careerTracking: {
    mode: 'active',
    activationReason: 'starter',
    activatedAt: '2026-09-10T01:00:00.000Z',
    statusHistory: [{
      id: 'status-1',
      before: { depthChart: 'QB3' },
      after: { depthChart: 'QB2' },
    }],
  },
  collegeNewsroom: {
    activeStopId: 'oregon-stop',
    stops: [{
      id: 'oregon-stop',
      school: 'Oregon',
      city: 'Eugene',
      state: 'Oregon',
      localOutletName: 'Eugene Gazette',
      regionalOutletName: 'Oregon College Sports Report',
      nationalOutletName: 'College Football Central',
      startedSeason: 1,
      startedWeek: 1,
    }],
  },
  currentWeekSetup: { phase: 'regular' },
  factLedger: [],
  newsroomIssues: [],
  weeklyUpdates: [],
  gameLogs: [],
  careerChronicle: [],
  ...overrides,
});

test('QB1 activation creates an editorial career-event edition without consuming the real game week', () => {
  const state = baseState();
  const next = buildCareerEventPublication(state);

  assert.notEqual(next, state);
  assert.equal(next.rtg.rank, 'QB1');
  assert.equal(next.weeklyUpdates.length, 0);
  assert.equal(next.gameLogs.length, 0);
  assert.equal(next.newsroomIssues.length, 1);

  const issue = next.newsroomIssues[0];
  assert.equal(issue.editionType, 'career-event');
  assert.equal(issue.careerEvent.activationReason, 'starter');
  assert.equal(issue.careerEvent.previousRole, 'QB2');
  assert.equal(issue.careerEvent.currentRole, 'QB1');
  assert.equal(issue.coverageDecision.tier, 'standard');
  assert.equal(issue.coverageDecision.podcastEligible, true);
  assert.equal(issue.articles.length, issue.coverageDecision.articleCount);
  assert.deepEqual(issue.articles.map((article) => article.outletId), ['college-local', 'college-regional']);
  assert.equal(issue.editorialStatus, 'pending');

  const keys = new Set(next.factLedger.map((fact) => fact.key));
  assert.equal(keys.has('milestone.startingQuarterbackOpportunity'), true);
  assert.equal(keys.has('rtg.rank'), true);
  assert.equal(keys.has('rtg.previousRank'), true);
  assert.equal(keys.has('weekly.note'), true);
  assert.equal(next.careerTracking.editorialPublicationId, issue.publicationId);
});

test('career-event publication is idempotent and does not fabricate EA SPORTS Network coverage', () => {
  const first = buildCareerEventPublication(baseState());
  const second = buildCareerEventPublication(first);

  assert.equal(second, first);
  assert.equal(second.newsroomIssues.length, 1);
  assert.equal(second.factLedger.length, first.factLedger.length);
  assert.equal(Object.hasOwn(second, 'eaSportsNetworkArticles'), false);
  assert.equal(Object.hasOwn(second, 'eaSportsNetwork'), false);
  assert.equal(Object.hasOwn(second, 'officialCoverage'), false);
});

test('first appearance can queue coverage without manufacturing a game log', () => {
  const state = baseState({
    rtg: { rank: 'QB2' },
    careerTracking: {
      mode: 'active',
      activationReason: 'appearance',
      activatedAt: '2026-09-10T02:00:00.000Z',
      statusHistory: [],
    },
  });
  const next = buildCareerEventPublication(state);
  const issue = next.newsroomIssues[0];

  assert.equal(issue.careerEvent.type, 'first-college-appearance');
  assert.equal(issue.coverageDecision.podcastEligible, true);
  assert.equal(next.gameLogs.length, 0);
  assert.equal(next.weeklyUpdates.length, 0);
  assert.equal(next.factLedger.some((fact) => fact.key === 'milestone.firstCollegeAppearance'), true);
});

test('generic events without specific verified context stay out of automatic editorial coverage', () => {
  const state = baseState({
    careerTracking: {
      mode: 'active',
      activationReason: 'event',
      activatedAt: '2026-09-10T03:00:00.000Z',
    },
  });
  assert.equal(buildCareerEventPublication(state), state);
});
