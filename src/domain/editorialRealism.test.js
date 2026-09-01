import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GAME_LOCATION_CONTEXTS,
  UNIFORM_CONTEXTS,
  collapseInitialSurname,
  createEditorialNameState,
  humanizePlayerReferences,
  isAllZeroPlayerFactLine,
  normalizeNewsroomIssueLanguage,
  uniformContextAdjustment,
  uniformContextIsHardMismatch,
} from './editorialRealism.js';

const career = {
  player: {
    name: 'Sam Jones',
    pos: 'QB',
    archetype: 'Scrambler',
    height: `6'4"`,
  },
  rtg: { rank: 'QB2' },
};

test('initial-plus-surname source identifiers become natural surname references', () => {
  assert.equal(collapseInitialSurname('S. Jones completed the drive before T. Brown scored.'), 'Jones completed the drive before Brown scored.');
});

test('tracked player references keep the first full name then rotate verified descriptors', () => {
  const state = createEditorialNameState(career);
  const text = humanizePlayerReferences('Sam Jones entered the week as QB2. Sam Jones remained ready, and Sam Jones handled the role.', career, state);
  assert.match(text, /^Sam Jones entered/);
  assert.match(text, /Jones remained ready/);
  assert.match(text, /the backup quarterback handled the role/);
});

test('newsroom normalization applies the naming style across article prose', () => {
  const issue = {
    articles: [{
      headline: 'Sam Jones waits for his opportunity',
      dek: 'S. Jones remains part of the quarterback room.',
      paragraphs: [
        'Sam Jones stayed ready throughout the week.',
        'Sam Jones remains the backup option.',
      ],
      sidebars: [{ title: 'Player note', items: ['S. Jones is listed at QB2.'] }],
    }],
  };
  const normalized = normalizeNewsroomIssueLanguage(issue, career);
  const serialized = JSON.stringify(normalized);
  assert.doesNotMatch(serialized, /S\. Jones/);
  assert.match(serialized, /the backup quarterback/);
});

test('all five verified zero player stats are recognized as a DNP signal', () => {
  const facts = [
    ['game.passYds', 0], ['game.passTD', 0], ['game.rushYds', 0], ['game.rushTD', 0], ['game.int', 0],
  ].map(([key, value]) => ({ key, value, verified: true }));
  assert.equal(isAllZeroPlayerFactLine(facts), true);
  assert.equal(isAllZeroPlayerFactLine(facts.slice(0, 4)), false);
  assert.equal(isAllZeroPlayerFactLine(facts.map((entry, index) => index === 0 ? { ...entry, value: 4 } : entry)), false);
});

test('home and away uniform context strongly rewards a match and rejects the opposite', () => {
  const homeMatch = uniformContextAdjustment({ gameLocation: GAME_LOCATION_CONTEXTS.HOME, uniformContext: UNIFORM_CONTEXTS.HOME });
  const awayMismatch = uniformContextAdjustment({ gameLocation: GAME_LOCATION_CONTEXTS.HOME, uniformContext: UNIFORM_CONTEXTS.AWAY });
  assert.ok(homeMatch > 0);
  assert.ok(awayMismatch < -300);
  assert.equal(uniformContextIsHardMismatch({ gameLocation: GAME_LOCATION_CONTEXTS.HOME, uniformContext: UNIFORM_CONTEXTS.AWAY }), true);
  assert.equal(uniformContextIsHardMismatch({ gameLocation: GAME_LOCATION_CONTEXTS.HOME, uniformContext: UNIFORM_CONTEXTS.ANY }), false);
});
