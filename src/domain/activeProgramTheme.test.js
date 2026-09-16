import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveCareerTeamMediaProfile } from './teamMediaProfile.js';

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

test('current player and coaching schools drive the shared program palette', () => {
  const oregon = resolveCareerTeamMediaProfile({
    careerPhase: 'Player',
    player: { school: 'Cincinnati', college: 'Oregon' },
  });
  assert.equal(oregon.school, 'Oregon');
  assert.equal(oregon.primary.toUpperCase(), '#154733');
  assert.equal(oregon.secondary.toUpperCase(), '#FEE123');

  const michigan = resolveCareerTeamMediaProfile({
    careerPhase: 'HC',
    coach: { school: 'Michigan' },
    player: { college: 'Oregon' },
  });
  assert.equal(michigan.school, 'Michigan');
  assert.equal(michigan.primary.toUpperCase(), '#00274C');
  assert.equal(michigan.secondary.toUpperCase(), '#FFCB05');
});

test('active program theme is the final style layer and covers the major app surfaces', async () => {
  const [main, theme, portal] = await Promise.all([
    readSource('../main.jsx'),
    readSource('../active-program-theme.css'),
    readSource('../components/TeamAccentPortal.jsx'),
  ]);

  assert.ok(main.includes("import './active-program-theme.css'"));
  assert.ok(main.indexOf("import './active-program-theme.css'") > main.indexOf("import './newsroom-current-program-overrides.css'"));

  for (const selector of [
    '.dhq-mobile-broadcast-nav button.is-active::after',
    '.dhq-broadcast-primary',
    '.dhq-career-overview',
    '.dhq-gh-hero',
    '[data-active-tab="chronicle"]',
    '[data-active-tab="podcast"]',
  ]) {
    assert.ok(theme.includes(selector), `missing active-program coverage for ${selector}`);
  }

  assert.ok(theme.includes('var(--dhq-program-primary)'));
  assert.ok(theme.includes('var(--dhq-program-highlight)'));
  assert.ok(portal.includes("'--dhq-team-highlight': highlight"));
  assert.ok(portal.includes("'--dhq-team-on-primary': adaptive.onPrimary"));
  assert.ok(portal.includes('buildAdaptiveTeamTheme({ primary, secondary, highlight })'));
  assert.ok(portal.includes('resolveProgramHighlight(primary, secondary)'));
});

test('semantic loss and danger colors are not globally rewritten by the program theme', async () => {
  const theme = await readSource('../active-program-theme.css');
  assert.ok(theme.includes('Win/loss, warning and danger colors remain semantic'));
  assert.equal(theme.includes('[class*="text-red-"]'), false);
  assert.equal(theme.includes('[class*="bg-red-"]'), false);
});
