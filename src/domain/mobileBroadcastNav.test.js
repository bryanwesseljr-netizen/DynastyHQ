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
const activeThemeV3Url = new URL('../active-program-theme-v3.css', import.meta.url);
const activeThemeV4Url = new URL('../active-program-theme-v4.css', import.meta.url);
const globalAccentUrl = new URL('../global-team-accent.css', import.meta.url);
const appSourceUrl = new URL('../App.jsx', import.meta.url);
const desktopFinalizerUrl = new URL('../components/DesktopPrimaryNavFinalizer.jsx', import.meta.url);
const navigationStatePortalUrl = new URL('../components/NavigationStatePortal.jsx', import.meta.url);
const zoomPanPortalUrl = new URL('../components/ZoomPanPortal.jsx', import.meta.url);

test('mobile uses the same primary broadcast destinations as desktop', async () => {
  const [portal, owner] = await Promise.all([
    readFile(portalUrl, 'utf8'),
    readFile(ownerUrl, 'utf8'),
  ]);

  assert.match(owner, /import MobileBroadcastNavPortal from '\.\/MobileBroadcastNavPortal\.jsx';/);
  assert.match(owner, /<MobileBroadcastNavPortal \/>/);
  ['Home', 'Game Hub', 'Newsroom', 'Podcast', 'Offseason', 'Career', 'Chronicle'].forEach((label) => {
    assert.match(portal, new RegExp(`label: '${label.replace(' ', '\\s*')}'`));
  });
  assert.match(
    portal,
    /const primaryItems = \[[\s\S]*Home[\s\S]*Game Hub[\s\S]*Newsroom[\s\S]*Podcast[\s\S]*Offseason[\s\S]*Career[\s\S]*Chronicle[\s\S]*\];/,
  );
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
  assert.match(localRestore, /Mobile masthead: preserve the newspaper identity/);
  assert.match(localRestore, /grid-template-columns: 42px minmax\(0, 1fr\)/);
  assert.match(localRestore, /font-size: clamp\(1\.38rem, 6\.8vw, 1\.85rem\)/);
});


test('desktop navigation keeps Podcast fully visible and uses one clean centered yellow underline', async () => {
  const [indexStyles, navState, offseasonStyles, activeThemeV3, activeThemeV4] = await Promise.all([
    readFile(indexStylesUrl, 'utf8'),
    readFile(navStateUrl, 'utf8'),
    readFile(offseasonNavStylesUrl, 'utf8'),
    readFile(activeThemeV3Url, 'utf8'),
    readFile(activeThemeV4Url, 'utf8'),
  ]);

  assert.match(indexStyles, /width: clamp\(185px, 16vw, 250px\)/);
  assert.match(indexStyles, /gap: clamp\(18px, 2vw, 38px\)/);
  assert.match(indexStyles, /font-size: clamp\(\.84rem, \.88vw, 1rem\)/);
  assert.match(indexStyles, /@media \(min-width: 1200px\) and \(max-width: 1450px\)/);
  assert.match(navState, /FINAL HEADER FIT \+ ACTIVE STATE/);
  assert.match(navState, /flex: 1 1 0 !important/);
  assert.match(navState, /font-size: 9\.5px !important/);
  assert.match(navState, /FINAL ACTIVE TAB INDICATOR/);
  assert.match(navState, /The only desktop active indicator is the short line directly beneath the/);
  assert.match(navState, /border-bottom: 3px solid transparent !important/);
  assert.match(navState, /border-bottom-color: var\(--dhq-program-highlight, #facc15\) !important/);
  assert.doesNotMatch(navState, /width: 38px !important/);
  assert.match(navState, /outline: 0 !important/);
  assert.match(navState, /border-left: 0 !important/);
  assert.match(navState, /border-right: 0 !important/);
  assert.doesNotMatch(navState, /dhq-primary-nav[\s\S]{0,800}box-shadow: inset 0 -3px 0/);
  assert.match(offseasonStyles, /background-image: none !important/);
  assert.match(navState, /overflow-x: clip !important/);
  assert.match(navState, /Higher-specificity hard stop/);
  assert.match(activeThemeV3, /display: none !important;[\s\S]*content: none !important;[\s\S]*background: transparent !important;/);
  assert.match(activeThemeV4, /dhq-career-active::after[\s\S]*display: none !important/);
});


test('primary navigation has equal-width columns, no box-border highlight, and Home resets to the real page top', async () => {
  const [navState, globalAccent, appSource] = await Promise.all([
    readFile(navStateUrl, 'utf8'),
    readFile(globalAccentUrl, 'utf8'),
    readFile(appSourceUrl, 'utf8'),
  ]);

  assert.match(navState, /PRIMARY NAV FINAL GEOMETRY/);
  assert.match(navState, /grid-auto-columns: minmax\(0, 1fr\) !important/);
  assert.match(navState, /column-gap: 0 !important/);
  assert.match(globalAccent, /body\[data-dhq-team-accent="true"\]::before \{[\s\S]*display: none !important/);
  assert.match(globalAccent, /header \.dhq-primary-nav-item\[aria-current="page"\] > span:last-child[\s\S]*background: transparent !important/);
  assert.doesNotMatch(globalAccent, /header \.dhq-primary-nav-item\[aria-current="page"\] > span:last-child \{[\s\S]{0,300}background: var\(--dhq-team-primary\)/);
  assert.match(appSource, /const resetPageScroll = \(\) =>/);
  assert.match(appSource, /main\.dhq-page-main/);
  assert.doesNotMatch(appSource, /item\.id === 'dashboard'[\s\S]{0,300}dynastyhq-command-center.*scrollIntoView/);
});


test('route shell cannot become the horizontal page scroller', async () => {
  const navState = await readFile(navStateUrl, 'utf8');

  assert.match(navState, /ROUTE WIDTH GUARDRAIL/);
  assert.match(navState, /main\.dhq-page-main \{[\s\S]*overflow-x: hidden !important/);
  assert.match(navState, /max-width: 100vw !important/);
  assert.match(navState, /main\.dhq-page-main > :not\(\.pointer-events-none\) \{[\s\S]*max-width: 100% !important/);
  assert.match(navState, /\.dhq-team-newsroom[\s\S]*\.dhq-local-podcast-root[\s\S]*\.dhq-weekly-agenda-workspace/);
});


test('desktop nav runtime finalizer owns the real desktop header after legacy CSS loads', async () => {
  const [finalizer, owner] = await Promise.all([
    readFile(desktopFinalizerUrl, 'utf8'),
    readFile(ownerUrl, 'utf8'),
  ]);

  assert.match(owner, /DesktopPrimaryNavFinalizer/);
  assert.match(owner, /<DesktopPrimaryNavFinalizer \/>/);
  assert.match(finalizer, /header\.dhq-broadcast-header nav\.dhq-primary-nav/);
  assert.match(finalizer, /@media \(min-width: 960px\)/);
  assert.match(finalizer, /matchMedia\('\(min-width: 960px\)'\)/);
  assert.match(finalizer, /grid-template-columns/);
  assert.match(finalizer, /border-bottom.*3px solid/);
  assert.match(finalizer, /MutationObserver/);
  assert.match(finalizer, /max-width.*100vw/);
  assert.match(finalizer, /document\.documentElement\.scrollLeft = 0/);
});


test('desktop active navigation has exactly one short underline and no lingering Podcast state', async () => {
  const [controller, finalizer, navState] = await Promise.all([
    readFile(navigationStatePortalUrl, 'utf8'),
    readFile(desktopFinalizerUrl, 'utf8'),
    readFile(navStateUrl, 'utf8'),
  ]);

  assert.doesNotMatch(controller, /inset 0 -3px 0 var\(--dhq-program-highlight\)/);
  assert.match(controller, /button\.style\.setProperty\('box-shadow', 'none', 'important'\)/);
  assert.match(controller, /border-bottom', active \? '3px solid var\(--dhq-program-highlight\)' : '3px solid transparent'/);
  assert.match(finalizer, /button\.classList\.contains\('dhq-nav-visual-active'\)/);
  assert.doesNotMatch(finalizer, /getAttribute\('aria-current'\) === 'page' \|\| button\.classList\.contains\('is-active'\)/);
  assert.match(navState, /\.dhq-primary-nav-item\.dhq-nav-visual-active > \.dhq-primary-nav-label/);
  assert.doesNotMatch(
    navState,
    /\.dhq-primary-nav-item\[aria-current="page"\] > \.dhq-primary-nav-label,[\s\S]{0,500}border-bottom-color/,
  );
});


test('pinch-zoomed desktop-site view restores two-axis page panning without removing normal nav guardrails', async () => {
  const [portal, owner, navState] = await Promise.all([
    readFile(zoomPanPortalUrl, 'utf8'),
    readFile(ownerUrl, 'utf8'),
    readFile(navStateUrl, 'utf8'),
  ]);

  assert.match(owner, /import ZoomPanPortal from '\.\/ZoomPanPortal\.jsx';/);
  assert.match(owner, /<ZoomPanPortal \/>/);
  assert.match(portal, /window\.visualViewport/);
  assert.match(portal, /scale > 1 \+ ZOOM_EPSILON/);
  assert.match(portal, /dhq-visual-zoomed/);
  assert.match(portal, /addEventListener\('resize', syncZoomState/);
  assert.match(portal, /addEventListener\('scroll', syncZoomState/);
  assert.match(navState, /html\.dhq-visual-zoomed \{/);
  assert.match(navState, /overflow-x: auto !important/);
  assert.match(navState, /body\.dhq-visual-zoomed main\.dhq-page-main \{[\s\S]*overflow-x: visible !important/);
  assert.match(navState, /touch-action: pan-x pan-y pinch-zoom !important/);
  assert.match(navState, /main\.dhq-page-main \{[\s\S]*overflow-x: hidden !important/);
});
