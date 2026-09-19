import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const portalUrl = new URL('../components/MobileBroadcastNavPortal.jsx', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const stylesUrl = new URL('../components/mobile-broadcast.css', import.meta.url);
const readerStylesUrl = new URL('../newsroom-reader-shell-v2.css', import.meta.url);
const fixesUrl = new URL('../components/mobile-broadcast-fixes.css', import.meta.url);
const gameHubViewportUrl = new URL('../components/game-hub-viewport.css', import.meta.url);
const careerViewportUrl = new URL('../components/career-overview-viewport.css', import.meta.url);
const sessionImportStylesUrl = new URL('../components/session-import.css', import.meta.url);
const podcastStylesUrl = new URL('../podcast-polish-v4.css', import.meta.url);
const chronicleStylesUrl = new URL('../chronicle-polish-v4.css', import.meta.url);
const articlePolishUrl = new URL('../newsroom-article-polish.css', import.meta.url);
const localRestoreUrl = new URL('../newsroom-local-classic-restore.css', import.meta.url);
const indexStylesUrl = new URL('../index.css', import.meta.url);
const navStateUrl = new URL('../navigation-state-v6.css', import.meta.url);
const offseasonNavStylesUrl = new URL('../components/player-offseason-navigation.css', import.meta.url);

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

test('mobile broadcast nav never renders into the desktop header', async () => {
  const portal = await readFile(portalUrl, 'utf8');

  assert.match(portal, /const isMobileViewport = \(\) => window\.matchMedia\('\(max-width: 767px\)'\)\.matches;/);
  assert.match(portal, /if \(!isMobileViewport\(\)\) \{[\s\S]*dhq-mobile-broadcast-nav-host[\s\S]*setHost\(null\)/);
  assert.match(portal, /window\.addEventListener\('resize', ensureHost\)/);
  assert.match(portal, /window\.removeEventListener\('resize', ensureHost\)/);
  assert.match(portal, /if \(!host \|\| !isMobileViewport\(\)\) return null;/);
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


test('mobile Newsroom reader clears the full 150px broadcast shell before rendering controls and article', async () => {
  const styles = await readFile(readerStylesUrl, 'utf8');

  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*main\[data-active-tab="newsroom"\]\.dhq-newsroom-article-main \{[\s\S]*padding-top: 158px !important;/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*padding-top: 158px !important;/);
  assert.match(styles, /dhq-newsroom-reader-tabs[\s\S]*overflow-x: auto !important;/);
  assert.match(styles, /scroll-snap-type: x proximity/);
});

test('mobile QA guardrails cover the primary DynastyHQ experiences without replacing deliberate horizontal rails', async () => {
  const [fixes, gameHub, career, sessionImport, podcast, chronicle] = await Promise.all([
    readFile(fixesUrl, 'utf8'),
    readFile(gameHubViewportUrl, 'utf8'),
    readFile(careerViewportUrl, 'utf8'),
    readFile(sessionImportStylesUrl, 'utf8'),
    readFile(podcastStylesUrl, 'utf8'),
    readFile(chronicleStylesUrl, 'utf8'),
  ]);

  assert.match(fixes, /Site-wide mobile QA guardrails/);
  assert.match(fixes, /main\.dhq-page-main[\s\S]*max-width: 100% !important/);
  assert.match(gameHub, /--dhq-game-hub-header-height: 150px/);
  assert.match(career, /--dhq-career-overview-header-height: 150px/);
  assert.match(sessionImport, /dhq-session-import__ready-summary \{ grid-template-columns: 1fr; \}/);
  assert.match(podcast, /section\.grid\.xl\\:grid-cols-[\s\S]*flex-direction: column !important/);
  assert.match(chronicle, /scroll-snap-type: x proximity/);
});


test('mobile Newsroom publication controls stay compact and article typography is phone-scaled', async () => {
  const [readerStyles, articleStyles] = await Promise.all([
    readFile(readerStylesUrl, 'utf8'),
    readFile(articlePolishUrl, 'utf8'),
  ]);

  assert.match(readerStyles, /min-width: max-content/);
  assert.doesNotMatch(readerStyles, /min-width: min\(72vw, 230px\)/);
  assert.match(readerStyles, /min-height: 34px/);
  assert.match(articleStyles, /Mobile publication density pass/);
  assert.match(articleStyles, /font-size: clamp\(1\.4rem, 6\.3vw, 1\.85rem\)/);
  assert.match(articleStyles, /height: min\(54vw, 270px\)/);
  assert.match(articleStyles, /font-size: \.9rem !important/);
  const localRestore = await readFile(localRestoreUrl, 'utf8');
  assert.match(localRestore, /Mobile masthead hard-stop/);
  assert.match(localRestore, /grid-template-columns: 34px minmax\(0, 1fr\)/);
  assert.match(localRestore, /font-size: clamp\(1\.08rem, 5\.1vw, 1\.42rem\)/);
});


test('desktop navigation keeps Podcast fully visible and uses a clean centered active underline', async () => {
  const [indexStyles, navState, offseasonStyles] = await Promise.all([
    readFile(indexStylesUrl, 'utf8'),
    readFile(navStateUrl, 'utf8'),
    readFile(offseasonNavStylesUrl, 'utf8'),
  ]);

  assert.match(indexStyles, /width: clamp\(185px, 16vw, 250px\)/);
  assert.match(indexStyles, /gap: clamp\(18px, 2vw, 38px\)/);
  assert.match(indexStyles, /font-size: clamp\(\.84rem, \.88vw, 1rem\)/);
  assert.match(indexStyles, /@media \(min-width: 1200px\) and \(max-width: 1450px\)/);
  assert.match(navState, /background-size: 40px 3px !important/);
  assert.match(navState, /box-shadow: none !important/);
  assert.doesNotMatch(navState, /dhq-primary-nav[\s\S]{0,800}box-shadow: inset 0 -3px 0/);
  assert.match(offseasonStyles, /background-size: 40px 3px !important/);
});
