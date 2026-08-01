import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOffseasonPlanner } from './offseasonPlanner.js';

const fact = (key, value) => ({ key, value, verified: true, publishedAt: '2026-07-31T22:00:00.000Z' });

const state = (careerPhase = 'HC') => ({
  careerPhase,
  player: { school: 'Test University' },
  coach: {},
  recruiting: [
    { id: 'p1', name: 'Test Prospect D', position: 'WR', status: 'Transfer Portal', interest: 80, stars: 4 },
    { id: 'p2', name: 'Test Prospect E', position: 'CB', status: 'Committed', interest: 95, stars: 3 },
  ],
  retentionBoard: [
    { id: 'r1', name: 'Test Prospect F', position: 'QB', overall: 84, risk: 'High', status: 'Decision pending' },
    { id: 'r2', name: 'Test Prospect G', position: 'LB', overall: 81, risk: 'Medium', status: 'Decision pending' },
  ],
  factLedger: [
    fact('roster.qb.count', 3), fact('roster.qb.need', 1),
    fact('roster.cb.count', 5), fact('roster.cb.need', 2),
    fact('coach.recruitingNIL', 300), fact('coach.rosterNIL', 200),
    fact('coach.openScholarships', 8), fact('coach.classCommits', 4),
    fact('recruiting.p1.position', 'WR'), fact('recruiting.p1.status', 'Transfer Portal'),
    fact('recruiting.p2.position', 'CB'), fact('recruiting.p2.status', 'Committed'),
    fact('retention.r1.position', 'QB'), fact('retention.r1.overall', 84), fact('retention.r1.risk', 'High'), fact('retention.r1.status', 'Decision pending'),
    fact('retention.r2.position', 'LB'), fact('retention.r2.overall', 81), fact('retention.r2.risk', 'Medium'), fact('retention.r2.status', 'Decision pending'),
  ],
});

test('head coach receives the full verified offseason plan', () => {
  const model = buildOffseasonPlanner(state('HC'));
  assert.equal(model.hasOffice, true);
  assert.equal(model.readOnly, false);
  assert.equal(model.positionNeeds.length, 2);
  assert.equal(model.portalTargets[0].name, 'Test Prospect D');
  assert.equal(model.commitments[0].name, 'Test Prospect E');
  assert.equal(model.atRiskPlayers.length, 2);
  assert.equal(model.retentionAllocation.reduce((sum, row) => sum + row.suggestedPoints, 0), 200);
  assert.equal(model.recruitingAllocation.reduce((sum, row) => sum + row.suggestedPoints, 0), 300);
});

test('offensive coordinator sees only offensive and assigned decisions', () => {
  const model = buildOffseasonPlanner(state('OC'));
  assert.deepEqual(model.positionNeeds.map((row) => row.label), ['QB']);
  assert.deepEqual(model.retentionPlayers.map((row) => row.name), ['Test Prospect F']);
  assert.deepEqual(model.targets.map((row) => row.name), ['Test Prospect D']);
  assert.equal(model.readOnly, true);
});

test('missing verified values remain unknown and produce no invented allocation', () => {
  const blank = state('HC');
  blank.factLedger = [];
  const model = buildOffseasonPlanner(blank);
  assert.equal(model.positionNeeds.length, 0);
  assert.deepEqual(model.recruitingAllocation, []);
  assert.deepEqual(model.retentionAllocation, []);
  assert.equal(model.classSummary.openScholarships.value, null);
});

test('planner stays locked during the player career', () => {
  const model = buildOffseasonPlanner(state('Player'));
  assert.equal(model.hasOffice, false);
  assert.equal(model.alerts[0].title, 'Planner locked');
});
