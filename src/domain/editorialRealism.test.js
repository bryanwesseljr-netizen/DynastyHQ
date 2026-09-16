import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EDITORIAL_LANGUAGE_VERSION,
  GAME_LOCATION_CONTEXTS,
  UNIFORM_CONTEXTS,
  collapseInitialSurname,
  createEditorialNameState,
  humanizePlayerReferences,
  isAllZeroPlayerFactLine,
  normalizeNewsroomIssueLanguage,
  normalizePodcastEpisodeLanguage,
  sanitizeEditorialSystemLanguage,
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
  assert.equal(normalized.editorialLanguageVersion, EDITORIAL_LANGUAGE_VERSION);
  assert.doesNotMatch(serialized, /S\. Jones/);
  assert.match(serialized, /the backup quarterback/);
});

test('fallback editorial cleanup hides system documentation language from readers', () => {
  const cleaned = sanitizeEditorialSystemLanguage(
    'The published ledger contains verified data points for Week 2. No postgame quote was separately verified. Coach Trust is 500.',
  );
  assert.doesNotMatch(cleaned, /published ledger|verified data points|separately verified|coach trust/i);
  assert.match(cleaned, /season totals|confirmed developments/i);
});

test('fallback editorial cleanup preserves normal football uses of energy', () => {
  const cleaned = sanitizeEditorialSystemLanguage('Oregon played with more energy after halftime and controlled the fourth quarter.');
  assert.equal(cleaned, 'Oregon played with more energy after halftime and controlled the fourth quarter.');
});

test('podcast normalization stamps the current editorial language version', () => {
  const episode = normalizePodcastEpisodeLanguage({
    title: 'Week 2 Review',
    summary: 'A football conversation.',
    chapters: [],
    segments: [{ id: '1', text: 'The published ledger says Oregon won.' }],
  }, career);
  assert.equal(episode.editorialLanguageVersion, EDITORIAL_LANGUAGE_VERSION);
  assert.doesNotMatch(episode.segments[0].text, /published ledger/i);
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
