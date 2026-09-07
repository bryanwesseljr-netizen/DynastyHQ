import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const portalUrl = new URL('../components/MobileBroadcastNavPortal.jsx', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const stylesUrl = new URL('../components/mobile-broadcast.css', import.meta.url);

test('mobile uses the same primary broadcast destinations as desktop', async () => {
  const [portal, owner] = await Promise.all([
    readFile(portalUrl, 'utf8'),
    readFile(ownerUrl, 'utf8'),
  ]);

  assert.match(owner, /import MobileBroadcastNavPortal from '\.\/MobileBroadcastNavPortal\.jsx';/);
  assert.match(owner, /<MobileBroadcastNavPortal \/>/);
  ['Home', 'Career', 'Game Hub', 'Newsroom', 'Chronicle', 'Podcast'].forEach((label) => {
    assert.match(portal, new RegExp(`label: '${label.replace(' ', '\\s*')}'`));
  });
  assert.match(portal, /dhq-mobile-broadcast-nav/);
});

test('mobile broadcast nav waits for the header and remounts if React replaces it', async () => {
  const portal = await readFile(portalUrl, 'utf8');

  assert.match(portal, /const ensureHost = \(\) =>/);
  assert.match(portal, /document\.querySelector\('\.dhq-broadcast-header'\)/);
  assert.match(portal, /header\?\.querySelector\('\.dhq-score-ticker'\)/);
  assert.match(portal, /new MutationObserver\(ensureHost\)/);
  assert.match(portal, /observer\.observe\(root, \{ childList: true, subtree: true \}\)/);
  assert.match(portal, /header\.insertBefore\(navHost, ticker\)/);
});

test('mobile avatar no longer opens the visible legacy tile navigation', async () => {
  const [portal, styles] = await Promise.all([
    readFile(portalUrl, 'utf8'),
    readFile(stylesUrl, 'utf8'),
  ]);

  assert.match(portal, /button\.dhq-broadcast-header__profile/);
  assert.match(portal, /event\.stopImmediatePropagation\?\.\(\)/);
  assert.match(styles, /\.dhq-broadcast-mobile-menu,[\s\S]*#mobile-primary-navigation[\s\S]*display: none !important;/);
  assert.match(styles, /\.dhq-mobile-more-sheet/);
});

test('More sheet mounts the hidden legacy menu so secondary tools remain navigable', async () => {
  const portal = await readFile(portalUrl, 'utf8');

  assert.match(portal, /bypassProfileCaptureRef/);
  assert.match(portal, /legacyMenuOpenedByPortalRef/);
  assert.match(portal, /document\.getElementById\('mobile-primary-navigation'\)/);
  assert.match(portal, /bypassProfileCaptureRef\.current = true;[\s\S]*profileButton\.click\(\)/);
  assert.match(portal, /setNavigationRevision\(\(revision\) => revision \+ 1\)/);
  assert.match(portal, /secondaryItems\.filter\(\(item\) => findNavigationButton\(item\.matcher\)\)/);
  ['Recruiting', 'Settings', 'Career Handbook'].forEach((label) => {
    assert.match(portal, new RegExp(`label: '${label}'`));
  });
});

test('mobile broadcast framing reserves room for header nav and ticker without crushing the homepage', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /\.dhq-broadcast-header \{[\s\S]*height: 150px !important;/);
  assert.match(styles, /main\.dhq-page-main \{[\s\S]*padding-top: 150px !important;/);
  assert.match(styles, /\.dhq-broadcast-hero \{[\s\S]*height: 352px !important;/);
  assert.match(styles, /\.dhq-broadcast-cards \{[\s\S]*scroll-snap-type: x mandatory;/);
  assert.match(styles, /\.dhq-broadcast-card \{[\s\S]*flex: 0 0 min\(86vw, 340px\);/);
});
