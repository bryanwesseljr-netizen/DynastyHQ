import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeScreenshotAnalysis } from './screenshotClient.js';

test('team Total Yards is normalized to total offensive yards without return-yard ambiguity', () => {
  const result = normalizeScreenshotAnalysis({
    facts: [
      {
        key: 'game.teamTotalYards',
        label: 'Total Yards',
        value: '412',
        confidence: 0.86,
        evidence: 'Total Yards 412',
      },
      {
        key: 'game.opponentTotalYards',
        label: 'Total Yards',
        value: '355',
        confidence: 0.92,
        evidence: 'Total Yards 355',
      },
    ],
  });

  assert.equal(result.facts[0].label, 'Team total offensive yards');
  assert.equal(result.facts[1].label, 'Opponent total offensive yards');
  assert.equal(result.facts[0].userVerified, true);
  assert.equal(result.facts[1].userVerified, true);
  assert.match(result.facts[0].evidence, /return yards excluded/i);
});

test('a low-confidence Total Yards read still requires human verification', () => {
  const result = normalizeScreenshotAnalysis({
    facts: [{
      key: 'game.teamTotalYards',
      label: 'Total Yards',
      value: '412',
      confidence: 0.54,
      evidence: 'Partially obscured Total Yards value',
    }],
  });

  assert.equal(result.facts[0].label, 'Team total offensive yards');
  assert.equal(result.facts[0].userVerified, undefined);
});
