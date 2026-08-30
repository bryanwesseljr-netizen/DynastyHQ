import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const immersiveUrl = new URL('../../public/newsroom-immersive.js', import.meta.url);
const exactRoutingUrl = new URL('../components/NewsroomExactStoryRoutingPortal.jsx', import.meta.url);
const libraryScrollGuardUrl = new URL('../components/NewsroomLibraryScrollGuardPortal.jsx', import.meta.url);
const mediaManagerUrl = new URL('../components/NewsroomMediaManager.jsx', import.meta.url);

test('Team Hub story clicks keep exact Regional and National article identity', async () => {
  const [immersive, exactRouting] = await Promise.all([
    readFile(immersiveUrl, 'utf8'),
    readFile(exactRoutingUrl, 'utf8'),
  ]);

  assert.match(immersive, /main\.querySelector\('\[data-team-newsroom-hub="true"\]'\)/);
  assert.match(exactRouting, /dataset\.newsroomOutletId/);
  assert.match(exactRouting, /getAttribute\('aria-label'\).*includes\(headline\)/s);
  assert.doesNotMatch(exactRouting, /outletFallback/);
  assert.doesNotMatch(exactRouting, /\[0,\s*16,/);
});

test('Newsroom utility re-anchoring does not tear down the active Media Library margin during edits', async () => {
  const immersive = await readFile(immersiveUrl, 'utf8');

  assert.match(immersive, /if \(panel === activePanel\) return;/);
  assert.match(immersive, /const currentMargin = Number\.parseFloat/);
  assert.match(immersive, /const naturalTop = currentTop - currentMargin;/);
  assert.match(immersive, /Math\.abs\(adjustment - currentMargin\) > 0\.5/);
});

test('photo metadata edits protect the cold save jump and release normal scrolling immediately', async () => {
  const guard = await readFile(libraryScrollGuardUrl, 'utf8');

  assert.match(guard, /dhq-newsroom-owner-library/);
  assert.match(guard, /input\[type="checkbox"\]/);
  assert.match(guard, /tag current team/i);
  assert.match(guard, /severeBackwardJump/);
  assert.match(guard, /if \(!severeBackwardJump\) return/);
  assert.match(guard, /release\(\);\s*\n\s*};/);
  assert.match(guard, /addEventListener\('wheel', onUserScrollIntent/);
  assert.match(guard, /addEventListener\('touchmove', onUserScrollIntent/);
  assert.match(guard, /\[0, 80, 180, 360, 700, 1200, 2000, 3500, 5500\]/);
  assert.match(guard, /if \(isTeamTagButton\(event\.target\)\) remember/);
});

test('photo library reserves save-status space before the first metadata edit', async () => {
  const manager = await readFile(mediaManagerUrl, 'utf8');

  assert.match(manager, /min-h-\[16px\]/);
  assert.match(manager, /aria-live="polite"/);
  assert.match(manager, /Defeat \/ Disappointment/);
  assert.match(manager, /Generate New Photo Recommended/);
});
