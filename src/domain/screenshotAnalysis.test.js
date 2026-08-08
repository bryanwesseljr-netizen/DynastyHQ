import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createFailedScreenshotResult,
  HIGH_SCHOOL_UPLOAD_SLOTS,
  normalizeScreenshotAnalysis,
  scopeAnalysisToHighSchoolUpload,
} from './screenshotAnalysis.js';

const recruiting = [
  { id: 1, name: 'Test College A', interest: 0, level: 'None', offered: false },
  { id: 2, name: 'Test University', interest: 0, level: 'None', offered: false },
];

test('defines four numbered moment slots and one postgame summary slot', () => {
  assert.deepEqual(HIGH_SCHOOL_UPLOAD_SLOTS.map((slot) => slot.id), [
    'moment-1', 'moment-2', 'moment-3', 'moment-4', 'postgame-summary',
  ]);
  assert.equal(HIGH_SCHOOL_UPLOAD_SLOTS.filter((slot) => slot.kind === 'high_school_moment').length, 4);
  assert.equal(HIGH_SCHOOL_UPLOAD_SLOTS.at(-1).multiple, true);
});

test('normalizes supported AI facts into the weekly draft contract', () => {
  const result = normalizeScreenshotAnalysis({
    sourceId: 'screen-1',
    fileName: 'week-1.png',
    previewUrl: 'blob:preview',
    recruiting,
    analysis: {
      screenTypes: ['box_score', 'rtg_recruiting'],
      screenTitle: 'Game Summary',
      summary: 'A completed game and recruiting update.',
      facts: [
        { key: 'game.opponent', label: 'Opponent', value: 'Test Opponent A', confidence: 0.97, evidence: 'FORDSON' },
        { key: 'game.passYds', label: 'Passing yards', value: '287', confidence: 0.94, evidence: 'PASS YDS 287' },
        { key: 'recruiting.interest', label: 'Interest', value: '91%', confidence: 0.9, evidence: '91%', schoolName: 'Test University' },
        { key: 'recruiting.offer', label: 'Scholarship offer', value: 'true', confidence: 0.93, evidence: 'OFFER', schoolName: 'Test University' },
      ],
    },
  });

  assert.equal(result.gamePatch.opponent, 'Test Opponent A');
  assert.equal(result.gamePatch.passYds, 287);
  assert.deepEqual(result.recruitingPatches, [{
    id: 2,
    name: 'Test University',
    interest: 91,
    level: 'High',
    offered: true,
  }]);
  assert.deepEqual(result.source.detectedTypes, ['Box Score', 'RTG Recruiting']);
  assert.equal(result.source.previewUrl, 'blob:preview');
});

test('captures the verified CFB 27 high-school recruiting profile and school overview without percentages', () => {
  const result = normalizeScreenshotAnalysis({
    sourceId: 'rtg-recruiting-v12',
    fileName: 'top-schools.png',
    recruiting: [{ id: 7, name: 'Toledo' }],
    analysis: {
      screenTypes: ['rtg_recruiting'],
      screenTitle: 'Recruiting Overview',
      summary: 'Initial ranking and one school overview.',
      facts: [
        { key: 'recruiting.recruitStars', label: 'Recruit rating', value: '3', confidence: 0.98, evidence: '3 stars', schoolName: '' },
        { key: 'recruiting.tapeScore', label: 'Tape Score', value: '730', confidence: 0.98, evidence: 'Tape Score 730', schoolName: '' },
        { key: 'recruiting.nationalRank', label: 'National rank', value: '431', confidence: 0.97, evidence: 'National 431', schoolName: '' },
        { key: 'recruiting.preferenceRank', label: 'Preference', value: '1', confidence: 0.96, evidence: '1 Toledo', schoolName: 'Toledo' },
        { key: 'recruiting.schemeFit', label: 'Scheme Fit', value: 'yes', confidence: 0.98, evidence: 'YES SCHEME FIT', schoolName: 'Toledo' },
        { key: 'recruiting.tapeScoreRequired', label: 'Required Tape Score', value: '1900', confidence: 0.96, evidence: '0 / 1,900', schoolName: 'Toledo' },
        { key: 'recruiting.projectedRole', label: 'Projected role', value: 'QB3', confidence: 0.97, evidence: 'Projected QB3', schoolName: 'Toledo' },
      ],
    },
  });

  assert.deepEqual(result.playerRecruitingPatch, {
    recruitStars: 3,
    tapeScore: 730,
    rankings: { national: 431 },
  });
  assert.deepEqual(result.recruitingPatches, [{
    id: 7,
    name: 'Toledo',
    preferenceRank: 1,
    schemeFit: true,
    tapeScoreRequired: 1900,
    projectedRole: 'QB3',
  }]);
  assert.equal(result.facts.some((entry) => entry.key === 'recruiting.7.schemeFit'), true);
  assert.equal(result.facts.some((entry) => entry.key === 'recruiting.profile.tapeScore'), true);
});

test('normalizes standard and scholarship high-school moments with the correct objective counts', () => {
  const result = normalizeScreenshotAnalysis({
    sourceId: 'moments', fileName: 'moments.png', recruiting: [],
    analysis: {
      screenTypes: ['high_school_moments'], screenTitle: 'Build Your Tape', summary: 'Four moments.',
      facts: [
        { key: 'highSchool.moment1.type', label: 'Moment 1 type', value: 'Standard', confidence: 0.97, evidence: 'Highlight Moment' },
        { key: 'highSchool.moment1.objective1', label: 'Objective 1', value: 'Complete a pass on the run', confidence: 0.95, evidence: 'Complete a pass on the run' },
        { key: 'highSchool.moment1.objective1Result', label: 'Objective 1 result', value: 'Passed', confidence: 0.97, evidence: 'Complete' },
        { key: 'highSchool.moment1.objective2', label: 'Objective 2', value: 'Gain 15 yards', confidence: 0.95, evidence: 'Gain 15 yards' },
        { key: 'highSchool.moment1.objective2Result', label: 'Objective 2 result', value: 'Failed', confidence: 0.97, evidence: 'Failed' },
        { key: 'highSchool.moment1.result', label: 'Moment 1', value: 'Partial', confidence: 0.97, evidence: '1 of 2' },
        { key: 'highSchool.moment2.result', label: 'Moment 2', value: 'Partial', confidence: 0.93, evidence: '1 of 2' },
        { key: 'highSchool.moment3.result', label: 'Moment 3', value: 'Failed', confidence: 0.96, evidence: 'Failed' },
        { key: 'highSchool.moment4.type', label: 'Moment 4 type', value: 'Scholarship Challenge', confidence: 0.98, evidence: 'Scholarship Opportunity' },
        { key: 'highSchool.moment4.scholarshipSchool', label: 'Evaluating school', value: 'Toledo', confidence: 0.98, evidence: 'Toledo' },
        { key: 'highSchool.moment4.objective1', label: 'Major objective', value: 'Lead a touchdown drive', confidence: 0.96, evidence: 'Lead a touchdown drive' },
        { key: 'highSchool.moment4.objective1Result', label: 'Major objective result', value: 'Passed', confidence: 0.96, evidence: 'Passed' },
        { key: 'highSchool.moment4.result', label: 'Moment 4', value: 'Successful', confidence: 0.96, evidence: 'Successful' },
      ],
    },
  });
  assert.deepEqual(result.source.detectedTypes, ['High-School Moments']);
  assert.equal(result.highSchoolEvaluationPatch.moments[0].result, 'partial');
  assert.equal(result.highSchoolEvaluationPatch.moments[0].objectives[0].result, 'passed');
  assert.equal(result.highSchoolEvaluationPatch.moments[0].objectives[1].result, 'failed');
  assert.equal(result.highSchoolEvaluationPatch.moments[1].result, 'partial');
  assert.equal(result.highSchoolEvaluationPatch.moments[2].result, 'failed');
  assert.equal(result.highSchoolEvaluationPatch.moments[3].type, 'scholarship');
  assert.equal(result.highSchoolEvaluationPatch.moments[3].scholarshipSchool, 'Toledo');
  assert.equal(result.facts[0].key, 'highSchool.moment.1.type');
});

test('routes an unnumbered moment screenshot into the user-selected Moment slot', () => {
  const result = normalizeScreenshotAnalysis({
    sourceId: 'moment-two',
    fileName: 'moment.png',
    recruiting: [],
    uploadContext: { kind: 'high_school_moment', momentNumber: 2 },
    analysis: {
      screenTypes: ['high_school_moments'],
      screenTitle: 'Highlight Moment',
      summary: 'The screen does not visibly number the moment.',
      facts: [
        { key: 'highSchool.moment1.type', label: 'Moment type', value: 'Standard', confidence: 0.98, evidence: 'Highlight Moment' },
        { key: 'highSchool.moment1.objective1', label: 'Objective 1', value: 'Complete the pass', confidence: 0.97, evidence: 'Complete the pass' },
        { key: 'highSchool.moment1.objective1Result', label: 'Objective 1 result', value: 'Passed', confidence: 0.98, evidence: 'Passed' },
        { key: 'highSchool.moment1.objective2', label: 'Objective 2', value: 'Gain 15 yards', confidence: 0.97, evidence: 'Gain 15 yards' },
        { key: 'highSchool.moment1.objective2Result', label: 'Objective 2 result', value: 'Failed', confidence: 0.98, evidence: 'Failed' },
      ],
    },
  });

  assert.equal(result.highSchoolEvaluationPatch.moments[0], undefined);
  assert.equal(result.highSchoolEvaluationPatch.moments[1].objectives[0].result, 'passed');
  assert.equal(result.highSchoolEvaluationPatch.moments[1].objectives[1].result, 'failed');
  assert.equal(result.facts.every((entry) => entry.key.startsWith('highSchool.moment.2.')), true);
  assert.equal(result.source.uploadContext.id, 'moment-2');
});

test('keeps the postgame slot limited to recruiting evaluation facts', () => {
  const analysis = scopeAnalysisToHighSchoolUpload({
    screenTypes: ['high_school_moments', 'rtg_recruiting'],
    facts: [
      { key: 'highSchool.moment1.result', value: 'Successful' },
      { key: 'recruiting.tapeScore', value: '1,250' },
      { key: 'recruiting.recruitStars', value: '4' },
    ],
  }, { kind: 'high_school_postgame' });

  assert.deepEqual(analysis.facts.map((entry) => entry.key), [
    'recruiting.tapeScore',
    'recruiting.recruitStars',
  ]);
});

test('preserves numeric and text RTG progression fields from a player screen', () => {
  const result = normalizeScreenshotAnalysis({
    sourceId: 'rtg-screen',
    fileName: 'player-hub.png',
    recruiting,
    analysis: {
      screenTypes: ['player_mechanics'],
      screenTitle: 'Player Hub',
      summary: 'Current player progression.',
      facts: [
        { key: 'rtg.trustToNext', label: 'Trust to next rank', value: '1,500', confidence: 0.95, evidence: 'NEXT 1,500' },
        { key: 'rtg.rank', label: 'Depth chart', value: 'QB2', confidence: 0.96, evidence: 'QB2' },
        { key: 'rtg.sponsorships', label: 'Brand deals', value: 'Local apparel deal', confidence: 0.91, evidence: 'Local apparel deal' },
      ],
    },
  });

  assert.deepEqual(result.rtgPatch, {
    trustToNext: 1500,
    rank: 'QB2',
    sponsorships: 'Local apparel deal',
  });
});

test('rejects unsupported and malformed values instead of inventing updates', () => {
  const result = normalizeScreenshotAnalysis({
    sourceId: 'screen-2',
    fileName: 'bad.png',
    recruiting,
    analysis: {
      screenTypes: ['unknown'],
      facts: [
        { key: 'game.passYds', label: 'Passing yards', value: 'maybe', confidence: 0.2, evidence: '' },
        { key: 'recruiting.interest', label: 'Interest', value: '80', confidence: 0.8, evidence: '', schoolName: 'Unknown University' },
        { key: 'invented.award', label: 'Award', value: 'Heisman', confidence: 1, evidence: '' },
      ],
    },
  });

  assert.deepEqual(result.gamePatch, {});
  assert.deepEqual(result.recruitingPatches, []);
  assert.deepEqual(result.facts, []);
});

test('represents a failed source without mutating any weekly fields', () => {
  const result = createFailedScreenshotResult({
    sourceId: 'screen-3',
    fileName: 'failed.png',
    message: 'Authentication failed',
  });

  assert.equal(result.source.error, 'Authentication failed');
  assert.deepEqual(result.facts, []);
  assert.deepEqual(result.gamePatch, {});
  assert.deepEqual(result.coachPatch, {});
});

test('normalizes verified coach budget, roster, and prospect fields', () => {
  const prospects = [
    { id: 9, name: 'Test Prospect A', interest: 0, level: 'None', offered: false },
  ];
  const result = normalizeScreenshotAnalysis({
    sourceId: 'screen-office',
    fileName: 'program-office.png',
    recruiting: prospects,
    analysis: {
      screenTypes: ['coach_recruiting', 'nil_budget', 'roster_management'],
      screenTitle: 'Program Management',
      summary: 'Visible recruiting, budget, and roster data.',
      facts: [
        { key: 'coach.dynastyPoints', label: 'Dynasty Points', value: '1,250', confidence: 0.97, evidence: 'Dynasty Points 1,250', schoolName: '' },
        { key: 'coach.recruitingNIL', label: 'Recruiting NIL', value: '300', confidence: 0.95, evidence: 'Recruiting NIL 300', schoolName: '' },
        { key: 'coach.rosterSize', label: 'Roster size', value: '82', confidence: 0.96, evidence: 'Roster 82', schoolName: '' },
        { key: 'recruiting.position', label: 'Position', value: 'QB', confidence: 0.94, evidence: 'QB', schoolName: 'Test Prospect A' },
        { key: 'recruiting.stars', label: 'Stars', value: '4', confidence: 0.93, evidence: '4 star', schoolName: 'Test Prospect A' },
      ],
    },
  });

  assert.deepEqual(result.coachPatch, { dynastyPoints: 1250, recruitingNIL: 300, rosterSize: 82 });
  assert.deepEqual(result.recruitingPatches, [{ id: 9, name: 'Test Prospect A', position: 'QB', stars: 4 }]);
  assert.deepEqual(result.source.detectedTypes, ['Coach Recruiting', 'NIL / Program Budget', 'Roster Management']);
});

test('creates a visible coach prospect from a screenshot without manual board entry', () => {
  const result = normalizeScreenshotAnalysis({
    sourceId: 'screen-new-prospect',
    fileName: 'coach-board.png',
    recruiting: [],
    careerPhase: 'OC',
    analysis: {
      screenTypes: ['coach_recruiting'],
      screenTitle: 'Recruiting Board',
      summary: 'One visible offensive target.',
      facts: [
        { key: 'recruiting.position', label: 'Position', value: 'WR', confidence: 0.96, evidence: 'WR', schoolName: 'Test Prospect C' },
        { key: 'recruiting.interest', label: 'Interest', value: '74', confidence: 0.94, evidence: '74%', schoolName: 'Test Prospect C' },
      ],
    },
  });

  assert.deepEqual(result.recruitingPatches, [{
    id: 'prospect-test-prospect-c',
    name: 'Test Prospect C',
    position: 'WR',
    interest: 74,
    level: 'Medium',
  }]);
  assert.equal(result.facts[0].key, 'recruiting.prospect-test-prospect-c.position');
});

test('normalizes offseason roster needs and named retention decisions', () => {
  const result = normalizeScreenshotAnalysis({
    sourceId: 'screen-offseason',
    fileName: 'retention.png',
    recruiting: [],
    retentionBoard: [],
    careerPhase: 'HC',
    analysis: {
      screenTypes: ['roster_management', 'offseason_retention'],
      screenTitle: 'Manage Roster',
      summary: 'Visible position needs and one player decision.',
      facts: [
        { key: 'roster.qb.count', label: 'Quarterbacks', value: '3', confidence: 0.96, evidence: 'QB 3', schoolName: '', subjectName: '' },
        { key: 'roster.qb.need', label: 'QB need', value: '1', confidence: 0.95, evidence: 'Need 1', schoolName: '', subjectName: '' },
        { key: 'coach.openScholarships', label: 'Open scholarships', value: '8', confidence: 0.97, evidence: 'Open 8', schoolName: '', subjectName: '' },
        { key: 'retention.position', label: 'Position', value: 'QB', confidence: 0.95, evidence: 'QB', schoolName: '', subjectName: 'Test Prospect F' },
        { key: 'retention.overall', label: 'Overall', value: '84', confidence: 0.94, evidence: '84 OVR', schoolName: '', subjectName: 'Test Prospect F' },
        { key: 'retention.risk', label: 'Transfer risk', value: 'High', confidence: 0.93, evidence: 'High risk', schoolName: '', subjectName: 'Test Prospect F' },
      ],
    },
  });

  assert.deepEqual(result.coachPatch, { openScholarships: 8 });
  assert.deepEqual(result.retentionPatches, [{
    id: 'player-test-prospect-f',
    name: 'Test Prospect F',
    position: 'QB',
    overall: 84,
    risk: 'High',
  }]);
  assert.equal(result.facts.some((entry) => entry.key === 'roster.qb.need'), true);
  assert.equal(result.facts.some((entry) => entry.key === 'retention.player-test-prospect-f.risk'), true);
  assert.deepEqual(result.source.detectedTypes, ['Roster Management', 'Roster Retention']);
});
