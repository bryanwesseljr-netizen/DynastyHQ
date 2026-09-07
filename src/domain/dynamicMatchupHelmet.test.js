import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  catalogTeamBrand,
  normalizeTeamName,
  TEAM_BRAND_CACHE_KEY,
  TEAM_BRAND_SOURCE_URL,
} from './teamBrandResolver.js';

const componentUrl = new URL('../components/DynamicMatchupHelmets.jsx', import.meta.url);
const portalUrl = new URL('../components/DynamicMatchupHelmetPortal.jsx', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const stylesUrl = new URL('../components/dynamic-matchup-helmets.css', import.meta.url);

test('dynamic helmet resolver reuses the 2026 FBS identity catalog immediately', () => {
  const michigan = catalogTeamBrand('Michigan');
  const ohioState = catalogTeamBrand('Ohio State');

  assert.equal(michigan.primaryColor, '#00274C');
  assert.equal(michigan.secondaryColor, '#FFCB05');
  assert.equal(michigan.source, 'fbs-2026');
  assert.equal(ohioState.primaryColor, '#BB0000');
  assert.equal(ohioState.secondaryColor, '#666666');
});

test('college brand hydration uses a free cached team directory rather than AI', () => {
  assert.match(TEAM_BRAND_SOURCE_URL, /site\.api\.espn\.com/);
  assert.match(TEAM_BRAND_SOURCE_URL, /college-football\/teams/);
  assert.equal(TEAM_BRAND_CACHE_KEY, 'dynastyhq-college-team-brands-v1');
  assert.equal(normalizeTeamName('The Ohio State University'), 'ohio state');
});

test('matchup helmet component applies team colors and an unmirrored logo decal', async () => {
  const component = await readFile(componentUrl, 'utf8');

  assert.match(component, /fill=\{brand\.primaryColor\}/);
  assert.match(component, /stroke=\{brand\.secondaryColor\}/);
  assert.match(component, /href=\{brand\.logo\}/);
  assert.match(component, /decalX = side === 'right' \? 117 : 96/);
  assert.match(component, /<g transform=\{mirror\}>[\s\S]*<\/g>[\s\S]*\{brand\.logo \?/);
});

test('dynamic helmet portal replaces Home and Game Hub static art only for verified FBS matchups', async () => {
  const [portal, owner, styles] = await Promise.all([
    readFile(portalUrl, 'utf8'),
    readFile(ownerUrl, 'utf8'),
    readFile(stylesUrl, 'utf8'),
  ]);

  assert.match(owner, /<DynamicMatchupHelmetPortal \/>/);
  assert.match(portal, /\.dhq-broadcast-hero > img\.dhq-broadcast-helmets/);
  assert.match(portal, /\.dhq-game-hub \.dhq-gh-hero > img/);
  assert.match(portal, /currentWeekSetup/);
  assert.match(portal, /publicationIdFor\(game\.season, game\.week\) === selectedValue/);
  assert.match(portal, /catalogTeamBrand\(name\)\.source === 'fbs-2026'/);
  assert.match(portal, /dynamic: !highSchool && isFbsTeam\(school\) && isFbsTeam\(opponent\)/);
  assert.match(portal, /classList\.toggle\('dhq-dynamic-helmet-source-hidden', homeModel\.dynamic\)/);
  assert.match(portal, /classList\.toggle\('dhq-dynamic-helmet-source-hidden', gameHubModel\.dynamic\)/);
  assert.match(styles, /\.dhq-dynamic-helmet-source-hidden/);
  assert.match(styles, /\.dhq-gh-matchup-helmets/);
});

test('high-school and unresolved matchups preserve the original polished helmet art', async () => {
  const portal = await readFile(portalUrl, 'utf8');

  assert.match(portal, /stage === CAREER_STAGES\.HIGH_SCHOOL/);
  assert.match(portal, /dynamic: !highSchool/);
  assert.match(portal, /homeHost && homeModel\.dynamic \? createPortal/);
  assert.match(portal, /gameHubHost && gameHubModel\.dynamic \? createPortal/);
  assert.match(portal, /homeHost\.hidden = !homeModel\.dynamic/);
  assert.match(portal, /gameHubHost\.hidden = !gameHubModel\.dynamic/);
});
