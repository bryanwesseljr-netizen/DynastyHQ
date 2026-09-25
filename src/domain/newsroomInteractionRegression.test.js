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


test('Article Media toggle stays a direct reader-grid sibling and does not remount on every open/close', async () => {
  const source = await readFile(new URL('../components/NewsroomArticleToolsPortal.jsx', import.meta.url), 'utf8');
  assert.match(source, /director\?\.closest\('\[data-editorial-photo-director-mount\]'\)/);
  assert.match(source, /const anchor = directorMount \|\| mediaTools/);
  assert.match(source, /host\.insertBefore\(ownedMount, anchor\)/);
  assert.match(source, /const openRef = useRef\(false\)/);
  assert.match(source, /const articleKeyRef = useRef\(''\)/);
  assert.doesNotMatch(source, /\}, \[articleKey, open\]\);/);
});

test('Article Media backstage panels are width-contained for Android desktop-site and narrow layouts', async () => {
  const css = await readFile(new URL('../newsroom-reader-shell-v2.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(max-width: 1199px\)/);
  assert.match(css, /\[data-editorial-photo-director\]\[data-open="true"\]/);
  assert.match(css, /\.dhq-newsroom-native-media-backstage\[data-open="true"\]/);
  assert.match(css, /overflow-x: clip !important/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) !important/);
});

test('Article Media stays visually attached to the full-width Newsroom media card', async () => {
  const [css, portal] = await Promise.all([
    readFile(new URL('../newsroom-reader-shell-v2.css', import.meta.url), 'utf8'),
    readFile(new URL('../components/NewsroomArticleToolsPortal.jsx', import.meta.url), 'utf8'),
  ]);
  assert.match(css, /\[data-media-network-newsroom="true"\][\s\S]*?grid-row:\s*3/);
  assert.match(css, /\[data-newsroom-article-tools-mount\][\s\S]*?grid-row:\s*4/);
  assert.match(css, /@media \(max-width: 1180px\)[\s\S]*?\[data-media-network-newsroom="true"\][\s\S]*?grid-row:\s*4/);
  assert.match(css, /@media \(max-width: 1180px\)[\s\S]*?\[data-newsroom-article-tools-mount\][\s\S]*?grid-row:\s*5/);
  assert.match(css, /\[data-editorial-photo-director-mount\]\[data-open="false"\][\s\S]*?display:\s*none !important/);
  assert.match(portal, /directorMount\.dataset\.open = open \? 'true' : 'false'/);
  assert.match(portal, /directorMount\.dataset\.open = isOpen \? 'true' : 'false'/);
});
