import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmptyScanDraft,
  getWeeklyCompleteness,
  parseScreenshotText,
  updateScanDraftFact,
  validateScanFact,
} from './weeklyEngine.js';

const scanFact = (key, value) => ({
  id: `test:${key}`,
  key,
  label: key,
  value,
  confidence: 1,
  sourceId: 'test-source',
  verified: false,
});

test('passing and rushing yards may legitimately be negative', () => {
  assert.equal(validateScanFact(scanFact('game.passYds', -4)), '');
  assert.equal(validateScanFact(scanFact('game.rushYds', -6)), '');
  assert.match(validateScanFact(scanFact('game.homeScore', -1)), /cannot be negative/i);
  assert.match(validateScanFact(scanFact('game.rushTD', -1)), /cannot be negative/i);
  assert.match(validateScanFact(scanFact('game.int', -1)), /cannot be negative/i);
});

test('editing a verified rushing-yard value to a negative number preserves it in the game patch', () => {
  const draft = {
    ...createEmptyScanDraft({ season: 2, week: 2, careerPhase: 'Player', isCommitted: true }),
    facts: [scanFact('game.rushYds', 3)],
    gamePatch: { rushYds: 3 },
  };
  const updated = updateScanDraftFact(draft, 'game.rushYds', '-6');
  assert.equal(updated.facts[0].value, -6);
  assert.equal(updated.gamePatch.rushYds, -6);
});

test('negative yardage still satisfies the quarterback stat-line completeness check', () => {
  const draft = {
    ...createEmptyScanDraft({ season: 2, week: 2, careerPhase: 'Player', isCommitted: true }),
    sources: [{ id: 'test-source', fileName: 'box.jpg', detectedTypes: ['Box Score'] }],
    facts: [
      scanFact('game.opponent', 'Northern Illinois'),
      scanFact('game.result', 'L'),
      scanFact('game.homeScore', 21),
      scanFact('game.awayScore', 45),
      scanFact('game.passYds', 203),
      scanFact('game.passTD', 1),
      scanFact('game.rushYds', -6),
      scanFact('game.rushTD', 1),
      scanFact('game.int', 1),
    ],
  };
  const completeness = getWeeklyCompleteness(draft);
  const playerStats = completeness.checks.find((check) => check.id === 'player-stats');
  assert.equal(playerStats?.status, 'complete');
});

test('legacy OCR fallback preserves an explicit negative rushing-yard number', () => {
  const parsed = parseScreenshotText({
    text: 'Passing Yards: 203\nRushing Yards: -6\nInterceptions: 1',
    sourceId: 'ocr-source',
    fileName: 'stats.jpg',
  });
  assert.equal(parsed.gamePatch.rushYds, -6);
  assert.equal(parsed.facts.find((entry) => entry.key === 'game.rushYds')?.value, -6);
});
