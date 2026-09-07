import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const portalUrl = new URL('../components/GameHubMobilePolishPortal.jsx', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const stylesUrl = new URL('../components/game-hub-mobile.css', import.meta.url);
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

test('Game Hub uses normal mobile document flow so browser zoom and pan stay native', async () => {
  const [portal, styles] = await Promise.all([
    readFile(portalUrl, 'utf8'),
    readFile(stylesUrl, 'utf8'),
  ]);

  assert.doesNotMatch(portal, /window\.visualViewport/);
  assert.doesNotMatch(portal, /dhq-game-hub-zoom-pan/);
  assert.match(styles, /body\.dhq-game-hub-open \{[\s\S]*overflow: auto !important;/);
  assert.match(styles, /body\.dhq-game-hub-open main\.dhq-page-main \{[\s\S]*display: none !important;/);
  assert.match(styles, /\.dhq-game-hub \{[\s\S]*position: relative !important;[\s\S]*padding-top: 150px;/);
  assert.match(styles, /\.dhq-game-hub__scroll \{[\s\S]*height: auto !important;[\s\S]*overflow: visible !important;/);
  assert.match(styles, /touch-action: pan-x pan-y pinch-zoom !important;/);
});
