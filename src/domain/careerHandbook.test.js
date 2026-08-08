import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CAREER_HANDBOOK_META,
  CAREER_HANDBOOK_SECTIONS,
  CAREER_HANDBOOK_STAGE_GUIDE,
} from './careerHandbook.js';

test('contains the complete 14-section RTG to Head Coach handbook', () => {
  assert.equal(CAREER_HANDBOOK_SECTIONS.length, 14);
  assert.deepEqual(CAREER_HANDBOOK_SECTIONS.map((section) => section.number), Array.from({ length: 14 }, (_, index) => index + 1));
  assert.equal(CAREER_HANDBOOK_SECTIONS[0].title, 'Player Identity');
  assert.equal(CAREER_HANDBOOK_SECTIONS.at(-1).title, 'Quick Reference Checklists');
  assert.match(CAREER_HANDBOOK_META.northStar, /offensive coordinator/i);
});

test('covers every career stage and preserves the handbook career movement rules', () => {
  const stages = new Set(CAREER_HANDBOOK_SECTIONS.map((section) => section.stage));
  CAREER_HANDBOOK_STAGE_GUIDE.forEach(([stage]) => assert.equal(stages.has(stage), true));

  const dynastyRules = CAREER_HANDBOOK_SECTIONS.find((section) => section.id === 'dynasty-movement');
  const serializedRules = JSON.stringify(dynastyRules);
  assert.match(serializedRules, /Remain at the first OC job for at least two seasons/);
  assert.match(serializedRules, /Around Years 5-8/);
});

test('preserves the personalized quarterback identity and full commitment scorecard', () => {
  const identity = JSON.stringify(CAREER_HANDBOOK_SECTIONS.find((section) => section.id === 'player-identity'));
  assert.match(identity, /Dearborn, Michigan/);
  assert.match(identity, /Edsel Ford Thunderbirds/);
  assert.match(identity, /Left/);
  assert.match(identity, /No\. 2/);

  const scorecard = CAREER_HANDBOOK_SECTIONS.find((section) => section.id === 'commitment-scorecard');
  const scorecardTable = scorecard.content.find((block) => block.type === 'table');
  const totalWeight = scorecardTable.rows.reduce((sum, row) => sum + Number.parseInt(row[1], 10), 0);
  assert.equal(totalWeight, 100);
});
