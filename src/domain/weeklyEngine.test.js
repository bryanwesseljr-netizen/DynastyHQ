import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createEmptyScanDraft,
  createPublishedWeek,
  createWeekKey,
  DuplicateWeekPublicationError,
  findPublishedWeekConflict,
  getWeeklyCompleteness,
  mergeScanResult,
  migrateCareerState,
  parseScreenshotText,
  removeScanDraftFact,
  updateScanDraftFact,
  updateScanDraftWeekType,
  validateScanFact,
  verifyScanDraftFact,
  WEEK_TYPES,
} from './weeklyEngine.js';

const recruiting = [
  { id: 1, name: 'Test College A', interest: 0, level: 'None' },
  { id: 2, name: 'Test University', interest: 0, level: 'None' },
];

test('parses box score, player mechanics, and known recruiting schools', () => {
  const result = parseScreenshotText({
    sourceId: 'screen-1',
    fileName: 'week-1.png',
    recruiting,
    text: `
      PASSING YARDS 287
      PASSING TDS 3
      RUSHING YARDS 74
      RUSHING TDS 1
      INTERCEPTIONS 1
      GPA 3.4
      ENERGY 82
      COACH TRUST 1,240
      Test College A Interest 68%
      Test University Interest 91%
    `,
  });

  assert.equal(result.gamePatch.passYds, 287);
  assert.equal(result.gamePatch.passTD, 3);
  assert.equal(result.gamePatch.rushYds, 74);
  assert.equal(result.rtgPatch.gpa, 3.4);
  assert.equal(result.rtgPatch.coachTrust, 1240);
  assert.deepEqual(result.recruitingPatches.map(({ name, interest, level }) => ({ name, interest, level })), [
    { name: 'Test College A', interest: 68, level: 'Medium' },
    { name: 'Test University', interest: 91, level: 'High' },
  ]);
});

test('merges several screenshots into one review draft without changing career state', () => {
  const base = createEmptyScanDraft({ season: 1, week: 2 });
  const boxScore = parseScreenshotText({ sourceId: 'box', text: 'Passing Yards 301\nPassing TDs 4', recruiting });
  const mechanics = parseScreenshotText({ sourceId: 'hub', text: 'GPA 3.2\nEnergy 76\nCoach Trust 900', recruiting });
  const merged = mergeScanResult(mergeScanResult(base, boxScore), mechanics);

  assert.equal(merged.sources.length, 2);
  assert.equal(merged.gamePatch.passYds, 301);
  assert.equal(merged.rtgPatch.energy, 76);
  assert.equal(merged.status, 'review');
});

test('corrects extracted values and rebuilds game and recruiting patches before apply', () => {
  const base = createEmptyScanDraft({ season: 1, week: 2 });
  const parsed = parseScreenshotText({
    sourceId: 'screen',
    text: 'Passing Yards 301\nTest University Interest 81%',
    recruiting,
  });
  const draft = mergeScanResult(base, parsed);
  const passCorrected = updateScanDraftFact(draft, 'game.passYds', '318');
  const interestCorrected = updateScanDraftFact(passCorrected, 'recruiting.2.interest', '94');

  assert.equal(interestCorrected.gamePatch.passYds, 318);
  const testUniversityPatch = interestCorrected.recruitingPatches.find((entry) => entry.id === 2);
  assert.equal(testUniversityPatch.interest, 94);
  assert.equal(testUniversityPatch.level, 'High');
  assert.equal(interestCorrected.facts.find((entry) => entry.key === 'game.passYds').corrected, true);
  assert.equal(interestCorrected.facts.find((entry) => entry.key === 'recruiting.2.interest').userVerified, true);
});

test('supports confirming or ignoring uncertain facts without mutating unrelated patches', () => {
  const base = createEmptyScanDraft({ season: 1, week: 2 });
  const parsed = parseScreenshotText({
    sourceId: 'screen',
    text: 'Passing Yards 301\nPassing TDs 3',
    recruiting,
  });
  parsed.facts[0].confidence = 0.7;
  const draft = mergeScanResult(base, parsed);
  const confirmed = verifyScanDraftFact(draft, 'game.passYds');
  const removed = removeScanDraftFact(confirmed, 'game.passTD');

  assert.equal(confirmed.facts.find((entry) => entry.key === 'game.passYds').userVerified, true);
  assert.equal(removed.gamePatch.passYds, 301);
  assert.equal('passTD' in removed.gamePatch, false);
  assert.equal(removed.facts.length, 1);
});

test('validates editable stat ranges and offer values', () => {
  assert.equal(validateScanFact({ key: 'rtg.gpa', value: 4.2 }), 'GPA must be between 0 and 4.');
  assert.equal(validateScanFact({ key: 'recruiting.2.interest', value: 101 }), 'Value must be between 0 and 100.');
  assert.equal(validateScanFact({ key: 'recruiting.2.offer', value: true }), '');
  assert.equal(validateScanFact({ key: 'game.passYds', value: 287 }), '');
});

test('lets a reviewed scholarship offer be corrected before publication', () => {
  const draft = mergeScanResult(createEmptyScanDraft({ season: 1, week: 2 }), {
    source: { id: 'offers', fileName: 'offers.png', detectedTypes: ['RTG Recruiting'] },
    facts: [{
      id: 'offers:recruiting.2.offer',
      key: 'recruiting.2.offer',
      label: 'Test University scholarship offer',
      value: true,
      confidence: 0.78,
      sourceId: 'offers',
      verified: false,
    }],
    gamePatch: {},
    rtgPatch: {},
    recruitingPatches: [{ id: 2, name: 'Test University', offered: true }],
  });
  const corrected = updateScanDraftFact(draft, 'recruiting.2.offer', false);

  assert.equal(corrected.recruitingPatches[0].offered, false);
  assert.equal(corrected.facts[0].value, false);
  assert.equal(corrected.facts[0].corrected, true);
  assert.equal(corrected.facts[0].userVerified, true);
});

test('reports missing essential game facts separately from recommended player screenshots', () => {
  const draft = mergeScanResult(createEmptyScanDraft({ season: 1, week: 2, careerPhase: 'Player' }), {
    source: { id: 'box', fileName: 'box.png', detectedTypes: ['Box Score'] },
    facts: [{ id: 'box:pass', key: 'game.passYds', label: 'Passing yards', value: 287, confidence: 0.96, sourceId: 'box' }],
    gamePatch: { passYds: 287 },
    rtgPatch: {},
    recruitingPatches: [],
  });
  const report = getWeeklyCompleteness(draft);

  assert.equal(report.checks.find((check) => check.id === 'final-score').status, 'missing');
  assert.equal(report.checks.find((check) => check.id === 'player-stats').status, 'missing');
  assert.equal(report.checks.find((check) => check.id === 'wear').importance, 'recommended');
  assert.equal(report.missingRequired, 2);
});

test('accepts a verified non-game fact as a legitimate bye-week update', () => {
  const base = createEmptyScanDraft({ season: 1, week: 4, careerPhase: 'Player', isCommitted: true });
  const byeDraft = updateScanDraftWeekType(mergeScanResult(base, {
    source: { id: 'hub', fileName: 'hub.png', detectedTypes: ['Player Mechanics'] },
    facts: [{ id: 'hub:energy', key: 'rtg.energy', label: 'Energy', value: 88, confidence: 0.95, sourceId: 'hub' }],
    gamePatch: {},
    rtgPatch: { energy: 88 },
    recruitingPatches: [],
  }), WEEK_TYPES.BYE);
  const report = getWeeklyCompleteness(byeDraft);

  assert.equal(report.checks.some((check) => check.id === 'final-score'), false);
  assert.equal(report.checks.find((check) => check.id === 'bye-update').status, 'complete');
  assert.equal(report.missingRequired, 0);
});

test('does not require quarterback stats during a coach game week', () => {
  const keys = ['game.opponent', 'game.result', 'game.homeScore', 'game.awayScore'];
  const draft = mergeScanResult(createEmptyScanDraft({ season: 2, week: 3, careerPhase: 'OC' }), {
    source: { id: 'score', fileName: 'score.png', detectedTypes: ['Box Score'] },
    facts: keys.map((key, index) => ({
      id: `score:${key}`,
      key,
      label: key,
      value: index === 0 ? 'Akron' : (index === 1 ? 'W' : 24 - index),
      confidence: 0.96,
      sourceId: 'score',
    })),
    gamePatch: {},
    rtgPatch: {},
    recruitingPatches: [],
  });
  const report = getWeeklyCompleteness(draft);

  assert.equal(report.checks.some((check) => check.id === 'player-stats'), false);
  assert.equal(report.missingRequired, 0);
});

test('tracks a team game with no player appearance without demanding or publishing QB stats', () => {
  const keys = ['game.opponent', 'game.result', 'game.homeScore', 'game.awayScore'];
  const draft = mergeScanResult(createEmptyScanDraft({
    season: 1,
    week: 2,
    careerPhase: 'Player',
    weekType: WEEK_TYPES.NO_APPEARANCE,
  }), {
    source: { id: 'score', fileName: 'score.png', detectedTypes: ['Box Score'] },
    facts: keys.map((key, index) => ({
      id: `score:${key}`,
      key,
      label: key,
      value: index === 0 ? 'Test Opponent A' : (index === 1 ? 'L' : 21 - index),
      confidence: 0.96,
      sourceId: 'score',
    })),
    gamePatch: { opponent: 'Test Opponent A', result: 'L', homeScore: 19, awayScore: 18 },
    rtgPatch: {},
    recruitingPatches: [],
  });
  const report = getWeeklyCompleteness(draft);

  assert.equal(report.checks.some((check) => check.id === 'player-stats'), false);
  assert.equal(report.missingRequired, 0);
});

test('publishes a week atomically to logs, fact ledger, recruiting, and chronicle', () => {
  const state = {
    schemaVersion: 3,
    currentSeason: 1,
    currentWeek: 3,
    careerPhase: 'Player',
    latestQuote: '',
    gameLogs: [],
    recruiting,
    rtg: {},
    weeklyUpdates: [],
    factLedger: [],
    careerChronicle: [],
    newsroomIssues: [],
  };

  const next = createPublishedWeek({
    state,
    game: { opponent: 'Test Opponent A', result: 'W', homeScore: 28, awayScore: 14, passYds: 250, passTD: 2, rushYds: 55, rushTD: 1, int: 0 },
    rtg: { gpa: 3.3 },
    recruitingPatches: [{ id: 2, name: 'Test University', interest: 80, level: 'High' }],
    quote: 'We earned it.',
    facts: [{ id: 'x', key: 'game.passYds', label: 'Passing yards', value: 250, confidence: 0.92, sourceId: 'box', verified: false }],
    sources: [{ id: 'box' }],
  });

  assert.equal(next.currentWeek, 4);
  assert.equal(next.gameLogs.length, 1);
  assert.equal(next.weeklyUpdates.length, 1);
  assert.equal(next.weeklyUpdates[0].weekKey, 'season-1-week-3');
  assert.equal(next.weeklyUpdates[0].id, 'season-1-week-3');
  assert.equal(next.careerChronicle[0].title, 'W vs. Test Opponent A, 28-14');
  assert.equal(next.recruiting[1].interest, 80);
  assert.ok(next.factLedger.every((entry) => entry.verified));
  assert.equal(next.newsroomIssues.length, 1);
  assert.equal(next.newsroomIssues[0].articles.length, 5);
});

test('blocks publishing the same season and week more than once', () => {
  const alreadyPublished = {
    schemaVersion: 4,
    currentSeason: 1,
    currentWeek: 3,
    careerPhase: 'Player',
    gameLogs: [{ season: 1, week: 3, opponent: 'Test Opponent A' }],
    weeklyUpdates: [{ id: 'older-id', season: 1, week: 3 }],
    factLedger: [],
    careerChronicle: [],
    newsroomIssues: [],
    recruiting,
    rtg: {},
  };

  assert.equal(createWeekKey(1, 3), 'season-1-week-3');
  assert.equal(findPublishedWeekConflict(alreadyPublished, { season: 1, week: 3 }).type, 'weekly-update');
  assert.throws(() => createPublishedWeek({
    state: alreadyPublished,
    game: { opponent: 'Test Opponent A', result: 'W' },
    rtg: {},
  }), DuplicateWeekPublicationError);
});

test('publishes a bye week without creating a game or retaining accidental game facts', () => {
  const state = {
    schemaVersion: 3,
    currentSeason: 1,
    currentWeek: 5,
    careerPhase: 'Player',
    latestQuote: '',
    gameLogs: [],
    recruiting,
    rtg: {},
    weeklyUpdates: [],
    factLedger: [],
    careerChronicle: [],
    newsroomIssues: [],
  };
  const next = createPublishedWeek({
    state,
    game: { opponent: 'Accidental Opponent', result: 'W' },
    rtg: { energy: 88 },
    weekType: WEEK_TYPES.BYE,
    facts: [
      { id: 'energy', key: 'rtg.energy', label: 'Energy', value: 88, confidence: 0.95, sourceId: 'hub' },
      { id: 'pass', key: 'game.passYds', label: 'Passing yards', value: 300, confidence: 0.95, sourceId: 'box' },
    ],
  });

  assert.equal(next.currentWeek, 6);
  assert.equal(next.gameLogs.length, 0);
  assert.equal(next.weeklyUpdates[0].weekType, WEEK_TYPES.BYE);
  assert.equal(next.careerChronicle[0].type, 'bye');
  assert.equal(next.factLedger.some((entry) => entry.key === 'game.passYds'), false);
});

test('publishes a no-appearance team result without performance coverage', () => {
  const state = {
    schemaVersion: 3,
    currentSeason: 1,
    currentWeek: 2,
    careerPhase: 'Player',
    player: { name: 'Test Player', school: 'Test High School' },
    latestQuote: '',
    gameLogs: [],
    recruiting,
    rtg: {},
    weeklyUpdates: [],
    factLedger: [],
    careerChronicle: [],
    newsroomIssues: [],
  };
  const next = createPublishedWeek({
    state,
    game: { opponent: 'Test Opponent A', result: 'L', homeScore: 14, awayScore: 21, passYds: 300 },
    rtg: {},
    weekType: WEEK_TYPES.NO_APPEARANCE,
    facts: [{ id: 'pass', key: 'game.passYds', label: 'Passing yards', value: 300, confidence: 0.95, sourceId: 'box' }],
  });

  assert.equal(next.currentWeek, 3);
  assert.equal(next.gameLogs[0].didPlay, false);
  assert.equal(next.gameLogs[0].passYds, '');
  assert.equal(next.newsroomIssues.length, 0);
  assert.equal(next.factLedger.some((entry) => entry.key === 'game.passYds'), false);
});

test('migrates an old save without losing player data', () => {
  const defaults = {
    player: { name: 'Default', stars: 3 },
    coach: { prestige: 'C+' },
    rtg: { gpa: 0, wear: { head: 'Green', chest: 'Green' } },
    recruiting,
  };
  const migrated = migrateCareerState({ player: { name: 'Test Player' }, rtg: { gpa: 3.5 } }, defaults);

  assert.equal(migrated.player.name, 'Test Player');
  assert.equal(migrated.player.stars, 3);
  assert.equal(migrated.rtg.wear.head, 'Green');
  assert.deepEqual(migrated.factLedger, []);
  assert.deepEqual(migrated.careerMilestones, []);
  assert.deepEqual(migrated.newsroomIssues, []);
  assert.deepEqual(migrated.retentionBoard, []);
  assert.deepEqual(migrated.podcastEpisodes, []);
});

test('publishes verified retention players and offseason facts with the week', () => {
  const state = {
    schemaVersion: 6,
    careerPhase: 'HC',
    currentSeason: 1,
    currentWeek: 4,
    player: { name: 'Test Player', school: 'Test University' },
    coach: {},
    rtg: {},
    recruiting: [],
    retentionBoard: [],
    gameLogs: [],
    weeklyUpdates: [],
    factLedger: [],
    careerChronicle: [],
    newsroomIssues: [],
  };
  const next = createPublishedWeek({
    state,
    game: {},
    rtg: state.rtg,
    coach: { ...state.coach, openScholarships: 7 },
    recruitingPatches: [],
    retentionPatches: [{ id: 'player-test-prospect-f', name: 'Test Prospect F', position: 'QB', risk: 'High' }],
    facts: [
      { key: 'roster.qb.need', label: 'QB need', value: 1, confidence: 0.96, sourceId: 'offseason' },
      { key: 'retention.player-test-prospect-f.risk', label: 'Transfer risk', value: 'High', confidence: 0.95, sourceId: 'offseason' },
    ],
    sources: [{ id: 'offseason', fileName: 'retention.png' }],
    weekType: WEEK_TYPES.BYE,
    season: 1,
    week: 4,
  });

  assert.equal(next.retentionBoard[0].name, 'Test Prospect F');
  assert.equal(next.factLedger.some((entry) => entry.key === 'roster.qb.need' && entry.verified), true);
  assert.equal(next.factLedger.some((entry) => entry.key === 'retention.player-test-prospect-f.risk' && entry.verified), true);
});
