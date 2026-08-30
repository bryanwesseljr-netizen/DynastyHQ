import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const immersiveUrl = new URL('../../public/newsroom-immersive.js', import.meta.url);
const exactRoutingUrl = new URL('../components/NewsroomExactStoryRoutingPortal.jsx', import.meta.url);

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
