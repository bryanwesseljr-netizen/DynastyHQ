import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const portalUrl = new URL('../components/GameHubMobilePolishPortal.jsx', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const stylesUrl = new URL('../components/game-hub-mobile.css', import.meta.url);
const viewportStylesUrl = new URL('../components/game-hub-viewport.css', import.meta.url);
const podcastShowUrl = new URL('./podcastShow.js', import.meta.url);

test('Game Hub mobile polish uses the canonical podcast show identity', async () => {
  const [portal, owner, podcastShow] = await Promise.all([
    readFile(portalUrl, 'utf8'),
    readFile(ownerUrl, 'utf8'),
    readFile(podcastShowUrl, 'utf8'),
  ]);

  assert.match(portal, /resolvePodcastShow/);
  assert.match(portal, /dataset\.podcastShow/);
  assert.match(owner, /<GameHubMobilePolishPortal \/>/);
  assert.match(podcastShow, /name: 'The Huddle Podcast'/);
});

test('Game Hub mobile hero separates teams, scores, result and action vertically', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /\.dhq-gh-hero \{[\s\S]*min-height: 438px !important;/);
  assert.match(styles, /\.dhq-gh-team \{[\s\S]*top: 198px !important;/);
  assert.match(styles, /\.dhq-gh-versus \{[\s\S]*top: 299px !important;/);
  assert.match(styles, /\.dhq-gh-hero__actions \{[\s\S]*bottom: 14px !important;/);
});

test('Game Hub uses normal document flow at every viewport for native browser zoom and pan', async () => {
  const [portal, viewportStyles] = await Promise.all([
    readFile(portalUrl, 'utf8'),
    readFile(viewportStylesUrl, 'utf8'),
  ]);

  assert.doesNotMatch(portal, /window\.visualViewport/);
  assert.doesNotMatch(portal, /dhq-game-hub-zoom-pan/);
  assert.match(portal, /game-hub-viewport\.css/);
  assert.match(portal, /dhq-game-hub-document-open/);

  assert.match(viewportStyles, /--dhq-game-hub-header-height: 127px;/);
  assert.match(viewportStyles, /body\.dhq-game-hub-open #root \{[\s\S]*height: var\(--dhq-game-hub-header-height\) !important;[\s\S]*min-height: var\(--dhq-game-hub-header-height\) !important;/);
  assert.match(viewportStyles, /body\.dhq-game-hub-open main\.dhq-page-main \{[\s\S]*display: none !important;/);
  assert.match(viewportStyles, /body\.dhq-game-hub-open \.dhq-game-hub \{[\s\S]*position: relative !important;[\s\S]*overflow: visible !important;/);
  assert.match(viewportStyles, /body\.dhq-game-hub-open \.dhq-game-hub__scroll \{[\s\S]*height: auto !important;[\s\S]*overflow: visible !important;/);
  assert.match(viewportStyles, /touch-action: pan-x pan-y pinch-zoom !important;/);
  assert.match(viewportStyles, /@media \(max-width: 767px\) \{[\s\S]*--dhq-game-hub-header-height: 150px;/);
});
