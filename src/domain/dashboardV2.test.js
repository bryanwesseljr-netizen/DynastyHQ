import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { CAREER_STAGES } from './commandCenter.js';
import { buildDashboardV2, dashboardModulesForStage } from './dashboardV2.js';

const baseState = {
  careerPhase: 'Player',
  currentSeason: 1,
  currentWeek: 1,
  player: { name: 'Player', school: 'High School', pos: 'QB', stars: 3, overall: 70 },
  coach: {},
  rtg: {},
  recruiting: [],
  gameLogs: [],
  weeklyUpdates: [],
  playerRecruiting: { highSchool: {} },
  careerChronicle: [],
  careerMilestones: [],
  trophies: [],
  newsroomIssues: [],
};

test('dashboard v2 keeps stage-specific card sets instead of one fixed homepage', () => {
  assert.deepEqual(dashboardModulesForStage(CAREER_STAGES.HIGH_SCHOOL), [
    'prospect-snapshot', 'recruiting-snapshot', 'top-schools', 'recent-results', 'latest-coverage', 'milestones',
  ]);
  assert.deepEqual(dashboardModulesForStage(CAREER_STAGES.COLLEGE), [
    'player-snapshot', 'current-week', 'season-performance', 'recent-results', 'latest-coverage', 'milestones',
  ]);
  assert.deepEqual(dashboardModulesForStage(CAREER_STAGES.OC), [
    'program-snapshot', 'offensive-performance', 'recent-results', 'recruiting-snapshot', 'latest-coverage', 'career-outlook',
  ]);
  assert.deepEqual(dashboardModulesForStage(CAREER_STAGES.HC), [
    'program-snapshot', 'team-performance', 'recent-results', 'recruiting-snapshot', 'trophy-case', 'latest-coverage',
  ]);
});

test('college player homepage hides coach-only management cards', () => {
  const model = buildDashboardV2({
    ...baseState,
    careerStage: CAREER_STAGES.COLLEGE,
    player: { ...baseState.player, school: 'Cincinnati', college: 'Cincinnati', isCommitted: true },
  });
  assert.equal(model.stage, CAREER_STAGES.COLLEGE);
  assert.equal(model.dashboardVersion, 2);
  assert.ok(model.moduleIds.includes('player-snapshot'));
  assert.ok(model.moduleIds.includes('current-week'));
  assert.equal(model.moduleIds.includes('recruiting-snapshot'), false);
  assert.equal(model.moduleIds.includes('trophy-case'), false);
});

test('coach career stages switch the homepage to program management information', () => {
  const oc = buildDashboardV2({ ...baseState, careerPhase: 'OC', coach: { currentSchool: 'Cincinnati' } });
  const hc = buildDashboardV2({ ...baseState, careerPhase: 'HC', coach: { currentSchool: 'Cincinnati' } });
  assert.equal(oc.stage, CAREER_STAGES.OC);
  assert.ok(oc.moduleIds.includes('offensive-performance'));
  assert.equal(oc.moduleIds.includes('player-snapshot'), false);
  assert.equal(hc.stage, CAREER_STAGES.HC);
  assert.ok(hc.moduleIds.includes('team-performance'));
  assert.ok(hc.moduleIds.includes('trophy-case'));
});

test('new dashboard preserves workflow portal hooks and career-transition controls', async () => {
  const source = await readFile(new URL('../components/CareerDashboardV2.jsx', import.meta.url), 'utf8');
  const wrapper = await readFile(new URL('../components/CareerCommandCenter.jsx', import.meta.url), 'utf8');
  assert.match(source, /id="dynastyhq-command-center"/);
  assert.match(source, /dhq-home-banner/);
  assert.match(source, /data-dashboard-version="2"/);
  assert.match(source, /CareerTransitionPanel/);
  assert.match(source, /onProfileHeadshotUpload/);
  assert.match(source, /onProfileSave/);
  assert.match(wrapper, /CareerDashboardV2/);
});
