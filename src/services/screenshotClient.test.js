import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeScreenshotAnalysis } from './screenshotClient.js';

test('Total Offense is the accepted offensive-total source', () => {
  const result = normalizeScreenshotAnalysis({
    facts: [
      {
        key: 'game.teamTotalYards',
        label: 'Total Offense',
        value: '412',
        confidence: 0.86,
        evidence: 'Total Offense 412',
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

  assert.equal(result.facts[0].label, 'Team total offense');
  assert.equal(result.facts[1].label, 'Opponent total offense');
  assert.equal(result.facts[0].userVerified, true);
  assert.equal(result.facts[1].userVerified, true);
  assert.match(result.facts[0].evidence, /separate Total Yards row is ignored/i);
});

test('generic Total Yards cannot compete with exact Total Offense', () => {
  const result = normalizeScreenshotAnalysis({
    analysis: {
      facts: [
        {
          key: 'game.teamTotalYards',
          label: 'Total Yards',
          value: '475',
          confidence: 0.97,
          evidence: 'Total Yards 475',
        },
        {
          key: 'game.teamTotalYards',
          label: 'Total Offense',
          value: '398',
          confidence: 0.91,
          evidence: 'Total Offense 398',
        },
      ],
    },
  });

  assert.equal(result.analysis.facts.length, 1);
  assert.equal(result.analysis.facts[0].value, '398');
  assert.equal(result.analysis.facts[0].label, 'Team total offense');
  assert.equal(result.analysis.facts[0].userVerified, true);
});

test('a generic Total Yards row is ignored even when returned alone', () => {
  const result = normalizeScreenshotAnalysis({
    analysis: {
      facts: [{
        key: 'game.teamTotalYards',
        label: 'Total Yards',
        value: '475',
        confidence: 0.98,
        evidence: 'Total Yards 475',
      }],
    },
  });

  assert.equal(result.analysis.facts.length, 0);
});

test('low-confidence Total Offense still requires human verification of the number', () => {
  const result = normalizeScreenshotAnalysis({
    facts: [{
      key: 'game.teamTotalYards',
      label: 'Total Offense',
      value: '412',
      confidence: 0.54,
      evidence: 'Partially obscured Total Offense 412',
    }],
  });

  assert.equal(result.facts[0].label, 'Team total offense');
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
