import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  catalogTeamBrand,
  normalizeTeamName,
  TEAM_BRAND_CACHE_KEY,
  TEAM_BRAND_DIRECTORY_URL,
  TEAM_BRAND_SOURCE_URL,
} from './teamBrandResolver.js';

const componentUrl = new URL('../components/DynamicMatchupHelmets.jsx', import.meta.url);
const portalUrl = new URL('../components/DynamicMatchupHelmetPortal.jsx', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const stylesUrl = new URL('../components/dynamic-matchup-helmets.css', import.meta.url);
const resolverUrl = new URL('./teamBrandResolver.js', import.meta.url);
const rtgApiUrl = new URL('../../api/analyze-rtg-status.js', import.meta.url);

test('dynamic matchup resolver reuses the 2026 FBS identity catalog immediately', () => {
  const michigan = catalogTeamBrand('Michigan');
  const ohioState = catalogTeamBrand('Ohio State');

  assert.equal(michigan.primaryColor, '#00274C');
  assert.equal(michigan.secondaryColor, '#FFCB05');
  assert.equal(michigan.source, 'fbs-2026');
  assert.equal(ohioState.primaryColor, '#BB0000');
  assert.equal(ohioState.secondaryColor, '#666666');
});

test('college brand hydration uses a same-origin cached directory backed by ESPN', () => {
  assert.match(TEAM_BRAND_SOURCE_URL, /site\.api\.espn\.com/);
  assert.match(TEAM_BRAND_SOURCE_URL, /college-football\/teams/);
  assert.equal(TEAM_BRAND_DIRECTORY_URL, '/api/analyze-rtg-status?resource=team-directory');
  assert.equal(TEAM_BRAND_CACHE_KEY, 'dynastyhq-college-team-brands-v2');
  assert.equal(normalizeTeamName('The Ohio State University'), 'ohio state');
});

test('team logos use existing same-origin RTG function instead of extra serverless endpoints', async () => {
  const [resolver, rtgApi] = await Promise.all([
    readFile(resolverUrl, 'utf8'),
    readFile(rtgApiUrl, 'utf8'),
  ]);

  assert.match(resolver, /\/api\/analyze-rtg-status\?resource=team-logo&id=/);
  assert.match(rtgApi, /resource === 'team-directory'/);
  assert.match(rtgApi, /resource === 'team-logo'/);
  assert.match(rtgApi, /site\.web\.api\.espn\.com/);
  assert.match(rtgApi, /a\.espncdn\.com\/i\/teamlogos\/ncaa\/500/);
});

test('matchup presentation uses large team logos instead of helmet artwork', async () => {
  const [component, styles] = await Promise.all([
    readFile(componentUrl, 'utf8'),
    readFile(stylesUrl, 'utf8'),
  ]);

  assert.doesNotMatch(component, /matchup-helmets\.webp/);
  assert.doesNotMatch(component, /TeamTint/);
  assert.doesNotMatch(component, /generic-matchup-helmets__base/);
  assert.match(component, /<TeamLogo brand=\{home\} teamName=\{homeTeam\} side="left" \/>/);
  assert.match(component, /<TeamLogo brand=\{away\} teamName=\{awayTeam\} side="right" \/>/);
  assert.match(component, /<img src=\{brand\.logo\}/);
  assert.match(component, /aria-label=\{`\$\{homeTeam \|\| 'Home team'\} versus \$\{awayTeam \|\| 'Away team'\} logos`\}/);
  assert.match(styles, /\.dhq-team-logo-matchup/);
  assert.match(styles, /\.dhq-matchup-team-logo--left \{[\s\S]*left: 22\.5%/);
  assert.match(styles, /\.dhq-matchup-team-logo--right \{[\s\S]*left: 77\.5%/);
  assert.match(styles, /\.dhq-matchup-team-logo img[\s\S]*object-fit: contain/);
  assert.match(styles, /drop-shadow\(0 0 2px var\(--dhq-team-secondary\)\)/);
});

test('logo matchup stays balanced and fills the former helmet footprint on mobile', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /\.dhq-matchup-team-logo \{[\s\S]*top: 49%/);
  assert.match(styles, /\.dhq-matchup-team-logo \{[\s\S]*width: 29%/);
  assert.match(styles, /\.dhq-matchup-team-logo \{[\s\S]*height: 82%/);
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*width: 28%/);
  assert.match(styles, /background: radial-gradient/);
});

test('dynamic matchup portal replaces Home and Game Hub static art only for verified FBS matchups', async () => {
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
  assert.match(portal, /dynamic: !highSchool && isFbsTeam\(matchup\.school\) && isFbsTeam\(opponent\)/);
  assert.match(portal, /classList\.toggle\('dhq-dynamic-helmet-source-hidden', homeModel\.dynamic\)/);
  assert.match(portal, /classList\.toggle\('dhq-dynamic-helmet-source-hidden', gameHubModel\.dynamic\)/);
  assert.match(styles, /\.dhq-dynamic-helmet-source-hidden/);
  assert.match(styles, /\.dhq-gh-matchup-helmets/);
});

test('published college matchup becomes the dynamic art fallback after the active week clears', async () => {
  const portal = await readFile(portalUrl, 'utf8');

  assert.match(portal, /const latestPublishedCollegeGameFor/);
  assert.match(portal, /game\.stage !== 'high-school'/);
  assert.match(portal, /!game\.evaluation/);
  assert.match(portal, /const latestGame = latestPublishedCollegeGameFor\(state\)/);
  assert.match(portal, /source: 'latest-published-game'/);
  assert.match(portal, /const matchup = currentMatchupFor\(state\)/);
});

test('high-school and unresolved matchups preserve the original polished static art', async () => {
  const portal = await readFile(portalUrl, 'utf8');

  assert.match(portal, /stage === CAREER_STAGES\.HIGH_SCHOOL/);
  assert.match(portal, /dynamic: !highSchool/);
  assert.match(portal, /homeHost && homeModel\.dynamic \? createPortal/);
  assert.match(portal, /gameHubHost && gameHubModel\.dynamic \? createPortal/);
  assert.match(portal, /homeHost\.hidden = !homeModel\.dynamic/);
  assert.match(portal, /gameHubHost\.hidden = !gameHubModel\.dynamic/);
});
