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
        label: 'Total Offense',
        value: '355',
        confidence: 0.92,
        evidence: 'Total Offense 355',
      },
    ],
  });

  assert.equal(result.facts[0].label, 'Team total offensive yards');
  assert.equal(result.facts[1].label, 'Opponent total offensive yards');
  assert.equal(result.facts[0].userVerified, true);
  assert.equal(result.facts[1].userVerified, true);
  assert.match(result.facts[0].evidence, /return yards excluded/i);
});

test('free-first nested analysis receives the same Total Yards normalization', () => {
  const result = normalizeScreenshotAnalysis({
    provider: 'google',
    analysis: {
      facts: [{
        key: 'game.teamTotalYards',
        label: 'Total Yards',
        value: '398',
        confidence: 0.91,
        evidence: 'Total Yards 398',
      }],
    },
  });

  assert.equal(result.provider, 'google');
  assert.equal(result.analysis.facts[0].label, 'Team total offensive yards');
  assert.equal(result.analysis.facts[0].userVerified, true);
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

test('passing attempts or completions cannot compete with passing yards', () => {
  const result = normalizeScreenshotAnalysis({
    analysis: {
      facts: [
        {
          key: 'game.passYds',
          label: 'Passing attempts',
          value: '24',
          confidence: 0.95,
          evidence: 'ATT 24',
        },
        {
          key: 'game.passYds',
          label: 'Passing yards',
          value: '287',
          confidence: 0.93,
          evidence: 'CMP 18 ATT 24 YDS 287 TD 2 INT 1',
        },
      ],
    },
  });

  assert.equal(result.analysis.facts.length, 1);
  assert.equal(result.analysis.facts[0].value, '287');
  assert.equal(result.analysis.facts[0].label, 'Passing yards');
});
