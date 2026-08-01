import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCommandCenter, CAREER_STAGES, deriveCareerStage } from './commandCenter.js';

const baseState = () => ({
  careerPhase: 'Player',
  currentSeason: 1,
  currentWeek: 4,
  player: { name: 'Test Player', school: 'Test High School', college: '', isCommitted: false, stars: 3, overall: 70, nationalQbRank: 87 },
  coach: { security: 85, prestige: 'C+', budget: 1500, contractYear: 1, contractRemaining: 3 },
  rtg: { gpa: 0, energy: 0, coachTrust: 0, trustToNext: 0, wear: { head: 'Green', chest: 'Green', arm: 'Green', legs: 'Green' } },
  recruiting: [{ id: 1, name: 'Test University', interest: 62, offered: true }],
  gameLogs: [{ season: 1, week: 3, opponent: 'Test Opponent A', result: 'W', homeScore: 28, awayScore: 14, passYds: 210, passTD: 2, rushYds: 65, rushTD: 1, int: 0 }],
  weeklyUpdates: [],
  careerChronicle: [],
  careerMilestones: [],
  newsroomIssues: [],
  trophies: [],
});

test('derives high school and college player stages without treating a commitment as enrollment', () => {
  const highSchool = baseState();
  highSchool.player.isCommitted = true;
  highSchool.player.college = 'Test University';
  assert.equal(deriveCareerStage(highSchool), CAREER_STAGES.HIGH_SCHOOL);

  const college = { ...highSchool, currentSeason: 2 };
  assert.equal(deriveCareerStage(college), CAREER_STAGES.COLLEGE);
  assert.equal(deriveCareerStage({ ...highSchool, player: { ...highSchool.player, school: 'Test University' } }), CAREER_STAGES.COLLEGE);
});

test('career phase takes priority for OC, HC, and retired dashboards', () => {
  const state = baseState();
  assert.equal(deriveCareerStage({ ...state, careerPhase: 'OC' }), CAREER_STAGES.OC);
  assert.equal(deriveCareerStage({ ...state, careerPhase: 'HC' }), CAREER_STAGES.HC);
  assert.equal(deriveCareerStage({ ...state, careerPhase: 'Retired' }), CAREER_STAGES.RETIRED);
});

test('high school model emphasizes verified recruiting and tape facts', () => {
  const model = buildCommandCenter(baseState());
  assert.equal(model.stage, CAREER_STAGES.HIGH_SCHOOL);
  assert.equal(model.metrics.find((metric) => metric.label === 'Verified offers').value, '1');
  assert.equal(model.panels.find((panel) => panel.id === 'recruiting').rows[2].value, 'Test University · 62%');
  assert.match(model.description, /three-star grind/i);
});

test('blank player mechanics never become false crisis warnings', () => {
  const state = baseState();
  state.currentSeason = 2;
  state.player.isCommitted = true;
  state.player.college = 'Test University';
  const model = buildCommandCenter(state);
  assert.equal(model.stage, CAREER_STAGES.COLLEGE);
  assert.equal(model.advice.some((item) => item.title === 'Academic risk'), false);
  assert.equal(model.advice.some((item) => item.title === 'Academics pending'), true);
});

test('college model exposes weekly RTG and NIL progression with actionable trends', () => {
  const state = baseState();
  state.currentSeason = 2;
  state.player.isCommitted = true;
  state.player.college = 'Test University';
  state.rtg = { ...state.rtg, gpa: 3.4, energy: 72, coachTrust: 1200, trustToNext: 1500, rank: 'QB2', followers: 4500, valuation: 12000, skillPoints: 2 };
  state.weeklyUpdates = [
    { id: 's2w1', season: 2, week: 1, careerPhase: 'Player', rtgSnapshot: { gpa: 3.4, energy: 80, coachTrust: 900, rank: 'QB3', followers: 3000, valuation: 9000 } },
    { id: 's2w2', season: 2, week: 2, careerPhase: 'Player', rtgSnapshot: { gpa: 3.4, energy: 72, coachTrust: 1200, rank: 'QB2', followers: 4500, valuation: 12000 }, rtgChanges: [{ key: 'rank', label: 'Depth Chart', previous: 'QB3', current: 'QB2', delta: null, kind: 'text' }] },
  ];
  const model = buildCommandCenter(state);
  assert.equal(model.rtgProgress.snapshots.length, 2);
  assert.equal(model.rtgProgress.latest.valuation, 12000);
  assert.equal(model.advice.some((item) => item.title === 'Depth-chart movement'), true);
});

test('OC model uses verified OC weekly updates before legacy game logs', () => {
  const state = baseState();
  state.careerPhase = 'OC';
  state.weeklyUpdates = [{
    season: 1,
    week: 2,
    careerPhase: 'OC',
    game: { season: 1, week: 2, opponent: 'Test Opponent B', result: 'L', homeScore: 17, awayScore: 24, passYds: 180, passTD: 1, rushYds: 110, rushTD: 1, int: 2 },
  }];
  const model = buildCommandCenter(state);
  assert.equal(model.stage, CAREER_STAGES.OC);
  assert.equal(model.metrics.find((metric) => metric.label === 'Offense record').value, '0-1');
  assert.equal(model.recentGames[0].opponent, 'Test Opponent B');
});

test('head coach and retirement models expose program and legacy workspaces', () => {
  const state = baseState();
  const hc = buildCommandCenter({ ...state, careerPhase: 'HC' });
  assert.equal(hc.panels.some((panel) => panel.id === 'budget'), true);
  assert.equal(hc.primaryAction.label, 'Log program week');

  const retired = buildCommandCenter({
    ...state,
    careerPhase: 'Retired',
    trophies: [{ type: 'Championship' }, { type: 'Award' }],
    careerChronicle: [{ id: 'one', season: 1, week: 1, title: 'First start' }],
  });
  assert.equal(retired.metrics.find((metric) => metric.label === 'Championships').value, '1');
  assert.equal(retired.primaryAction.tab, 'chronicle');
});
