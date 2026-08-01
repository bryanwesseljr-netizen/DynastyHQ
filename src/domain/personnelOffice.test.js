import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPersonnelOffice, canManageTarget } from './personnelOffice.js';

const verifiedFact = (key, value) => ({ key, value, verified: true, publishedAt: '2026-07-31T20:00:00.000Z' });

const coachState = (careerPhase = 'OC') => ({
  careerPhase,
  currentSeason: 6,
  currentWeek: 3,
  player: { name: 'Test Player', school: 'Test University' },
  coach: { currentSchool: 'Test University', budget: 1500 },
  rtg: { wear: {} },
  recruiting: [
    { id: 1, name: 'Test Prospect A', position: 'QB', interest: 82, offered: true, level: 'High' },
    { id: 2, name: 'Test Prospect B', position: 'CB', interest: 91, offered: true, level: 'High' },
    { id: 3, name: 'Test Prospect C', position: 'WR', interest: 65, offered: false, level: 'Medium' },
  ],
  factLedger: [
    verifiedFact('recruiting.1.interest', 82),
    verifiedFact('recruiting.1.offer', true),
    verifiedFact('recruiting.1.position', 'QB'),
    verifiedFact('recruiting.2.interest', 91),
    verifiedFact('recruiting.2.position', 'CB'),
    verifiedFact('recruiting.3.interest', 65),
    verifiedFact('recruiting.3.position', 'WR'),
  ],
});

test('locks the office until the verified coaching career begins', () => {
  const state = coachState('Player');
  const model = buildPersonnelOffice(state);
  assert.equal(model.hasOffice, false);
  assert.equal(model.alerts[0].title, 'Office locked');
});

test('OC office filters the board to offensive or assigned targets', () => {
  const state = coachState('OC');
  const model = buildPersonnelOffice(state);
  assert.equal(model.readOnly, true);
  assert.deepEqual(model.targets.map((target) => target.name), ['Test Prospect A', 'Test Prospect C']);
  assert.equal(canManageTarget(state, state.recruiting[0]), true);
  assert.equal(canManageTarget(state, state.recruiting[1]), false);
});

test('head coach sees every target and holds final authority', () => {
  const state = coachState('HC');
  const model = buildPersonnelOffice(state);
  assert.equal(model.readOnly, false);
  assert.equal(model.targets.length, 3);
  assert.equal(model.authorityLabel, 'Final program authority');
  assert.equal(canManageTarget(state, state.recruiting[1]), true);
});

test('legacy budget values remain unverified instead of becoming trusted allocations', () => {
  const model = buildPersonnelOffice(coachState('HC'));
  assert.equal(model.budget.total.value, null);
  assert.equal(model.budget.total.fallback, null);
  assert.equal(model.budget.verifiedCount, 0);
  assert.equal(model.alerts.some((alert) => alert.title === 'Budget screen needed'), true);
});

test('verified Dynasty Points allocations reconcile and detect overspending', () => {
  const state = coachState('HC');
  state.factLedger.push(
    verifiedFact('coach.dynastyPoints', 1000),
    verifiedFact('coach.recruitingNIL', 300),
    verifiedFact('coach.rosterNIL', 300),
    verifiedFact('coach.staffBudget', 250),
    verifiedFact('coach.facilitiesBudget', 250),
    verifiedFact('coach.rosterSize', 83),
  );
  const model = buildPersonnelOffice(state);
  assert.equal(model.budget.verifiedCount, 5);
  assert.equal(model.budget.remaining, -100);
  assert.equal(model.budget.overBudget, true);
  assert.equal(model.alerts.some((alert) => alert.title === 'Allocation exceeds resources'), true);
  assert.equal(model.roster.size.value, 83);
});
