import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCareerMilestone,
  createMilestoneKey,
  DuplicateMilestoneError,
  MILESTONE_TYPES,
  validateMilestoneDraft,
} from './milestoneEngine.js';

const state = {
  schemaVersion: 4,
  careerPhase: 'Player',
  currentSeason: 1,
  currentWeek: 4,
  player: { name: 'Test Player', school: 'Test High School', college: '', isCommitted: false },
  coach: {},
  careerMilestones: [],
  careerChronicle: [],
  factLedger: [],
  trophies: [],
  recruiting: [{ id: 1, name: 'Test University', interest: 80 }],
};

const confirmed = (type, overrides = {}) => ({
  type,
  season: 1,
  week: 4,
  institution: 'Test University',
  previousInstitution: '',
  achievement: '',
  notes: '',
  confirmed: true,
  ...overrides,
});

test('requires explicit user confirmation and type-specific facts', () => {
  const errors = validateMilestoneDraft({ type: MILESTONE_TYPES.COMMITMENT, season: 1, week: 4 });
  assert.ok(errors.institution);
  assert.ok(errors.confirmed);
  assert.ok(validateMilestoneDraft(confirmed(MILESTONE_TYPES.CHAMPIONSHIP)).achievement);
});

test('records a commitment in the fact ledger and Chronicle', () => {
  const next = createCareerMilestone({
    state,
    draft: confirmed(MILESTONE_TYPES.COMMITMENT),
    occurredAt: '2026-08-20T12:00:00.000Z',
  });
  assert.equal(next.player.isCommitted, true);
  assert.equal(next.player.college, 'Test University');
  assert.equal(next.careerChronicle[0].type, 'commitment');
  assert.match(next.careerChronicle[0].title, /commits to Test University/);
  assert.ok(next.factLedger.every((fact) => fact.verified && fact.verificationMethod === 'user-confirmed'));
});

test('moves the career through graduation, OC, head coach, and retirement stages', () => {
  const graduated = createCareerMilestone({ state, draft: confirmed(MILESTONE_TYPES.GRADUATION) });
  const oc = createCareerMilestone({
    state: graduated,
    draft: confirmed(MILESTONE_TYPES.OC_HIRE, { week: 5 }),
  });
  const hc = createCareerMilestone({
    state: oc,
    draft: confirmed(MILESTONE_TYPES.HC_HIRE, { season: 4, week: 1, institution: 'Test State University' }),
  });
  const retired = createCareerMilestone({
    state: hc,
    draft: confirmed(MILESTONE_TYPES.RETIREMENT, { season: 30, week: 18, institution: 'Test State University' }),
  });
  assert.equal(graduated.player.graduated, true);
  assert.equal(oc.careerPhase, 'OC');
  assert.deepEqual(oc.recruiting, []);
  assert.equal(hc.careerPhase, 'HC');
  assert.equal(hc.player.school, 'Test State University');
  assert.equal(retired.careerPhase, 'Retired');
  assert.equal(retired.coach.retired, true);
});

test('adds championships and awards to the Trophy Case', () => {
  const next = createCareerMilestone({
    state,
    draft: confirmed(MILESTONE_TYPES.CHAMPIONSHIP, { achievement: 'MAC Championship' }),
  });
  assert.equal(next.trophies[0].name, 'MAC Championship');
  assert.equal(next.trophies[0].type, 'Championship');
});

test('blocks a duplicate milestone with a stable key', () => {
  const draft = confirmed(MILESTONE_TYPES.COMMITMENT);
  const once = createCareerMilestone({ state, draft });
  assert.equal(createMilestoneKey(draft), once.careerMilestones[0].milestoneKey);
  assert.throws(() => createCareerMilestone({ state: once, draft }), DuplicateMilestoneError);
});
