import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

test('hierarchy-first experience is mounted and replaces the Home information wall', async () => {
  const [owner, portal, styles] = await Promise.all([
    readSource('../components/OwnerEnhancements.jsx'),
    readSource('../components/ImmersiveExperienceV3Portal.jsx'),
    readSource('../components/immersive-experience-v3.css'),
  ]);

  assert.ok(owner.includes("import ImmersiveExperienceV3Portal from './ImmersiveExperienceV3Portal.jsx'"));
  assert.ok(owner.includes('<ImmersiveExperienceV3Portal />'));
  assert.ok(portal.includes('WHAT MATTERS NOW'));
  assert.ok(portal.includes('YOUR ROLE'));
  assert.ok(portal.includes('COVERAGE'));
  assert.ok(styles.includes('#dynastyhq-command-center[data-dhq-experience="v3"] .dhq-broadcast-cards'));
  assert.ok(styles.includes('#dynastyhq-command-center[data-dhq-experience="v3"] .dhq-gameweek-immersion'));
});

test('completed Game Hub is split into purposeful interactive sections', async () => {
  const [portal, styles, polish] = await Promise.all([
    readSource('../components/ImmersiveExperienceV3Portal.jsx'),
    readSource('../components/immersive-experience-v3.css'),
    readSource('../components/immersive-experience-v3-polish.css'),
  ]);

  for (const label of ['OVERVIEW', 'STORY', 'MEDIA', 'STATS', 'PHOTOS', 'SEASON']) {
    assert.ok(portal.includes(`'${label}'`), `missing Game Hub ${label} destination`);
  }
  assert.ok(portal.includes('WHAT HAPPENED'));
  assert.ok(portal.includes('hub.dataset.dhqSection = section'));
  assert.ok(styles.includes('[data-dhq-section="media"]'));
  assert.ok(styles.includes('[data-dhq-section="stats"]'));
  assert.ok(styles.includes('[data-dhq-section="photos"]'));
  assert.ok(styles.includes('[data-dhq-section="season"]'));
  assert.ok(polish.includes("content: 'THE STORY'"));
  assert.ok(polish.includes("content: 'THE HUDDLE PODCAST'"));
});
