import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const portalSourceUrl = new URL('../components/CareerOverviewPortal.jsx', import.meta.url);
const ownerEnhancementsUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const stylesUrl = new URL('../components/career-overview.css', import.meta.url);
const indexUrl = new URL('../../index.html', import.meta.url);

test('Career navigation opens the dedicated broadcast overview before the legacy trophy renderer', async () => {
  const [portalSource, ownerSource] = await Promise.all([
    readFile(portalSourceUrl, 'utf8'),
    readFile(ownerEnhancementsUrl, 'utf8'),
  ]);

  assert.match(ownerSource, /import CareerOverviewPortal from '\.\/CareerOverviewPortal\.jsx';/);
  assert.match(ownerSource, /<CareerOverviewPortal \/>/);
  assert.match(portalSource, /label === 'CAREER' \|\| label === 'LEGACY'/);
  assert.match(portalSource, /event\.preventDefault\(\)/);
  assert.match(portalSource, /event\.stopPropagation\(\)/);
  assert.match(portalSource, /event\.stopImmediatePropagation\?\.\(\)/);
  assert.match(portalSource, /setOpen\(true\)/);
});

test('Career overview derives history defensively and never assumes every log has an opponent', async () => {
  const portalSource = await readFile(portalSourceUrl, 'utf8');

  assert.match(portalSource, /const allGames = arrayOf\(state\.gameLogs\)/);
  assert.match(portalSource, /String\(game\.opponent \|\| ''\)\.trim\(\)/);
  assert.match(portalSource, /game\.stage !== 'high-school'/);
  assert.match(portalSource, /!game\.evaluation/);
  assert.match(portalSource, /const honors = arrayOf\(state\.trophies\)/);
  assert.match(portalSource, /const chronicle = arrayOf\(state\.careerChronicle\)/);
});

test('Career overview matches the homepage broadcast framing and remains mobile responsive', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /width: min\(1340px, 100%\)/);
  assert.match(styles, /--career-red: #ee1637/);
  assert.match(styles, /linear-gradient\(100deg, rgba\(4, 18, 30/);
  assert.match(styles, /font-family: Impact/);
  assert.match(styles, /@media \(max-width: 767px\)/);
});

test('obsolete prototype-based Career compatibility guard is no longer loaded', async () => {
  const indexSource = await readFile(indexUrl, 'utf8');
  assert.doesNotMatch(indexSource, /career-view-guard\.js/);
});
