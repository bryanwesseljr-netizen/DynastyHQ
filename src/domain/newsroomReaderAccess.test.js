import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const experienceUrl = new URL('../components/NewsroomArticleExperiencePortal.jsx', import.meta.url);
const rewriteUrl = new URL('../components/NewsroomArticleRewritePortal.jsx', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const dashboardUrl = new URL('../components/BroadcastDashboard.jsx', import.meta.url);
const immersionUrl = new URL('./gameWeekImmersion.js', import.meta.url);
const readerStylesUrl = new URL('../newsroom-reader-shell-v2.css', import.meta.url);

test('opening a Newsroom article resets both nested and window scroll positions', async () => {
  const source = await readFile(experienceUrl, 'utf8');

  assert.match(source, /scrollNodeTop\(main\)/);
  assert.match(source, /scrollNodeTop\(document\.scrollingElement\)/);
  assert.match(source, /document\.documentElement\.scrollTop = 0/);
  assert.match(source, /document\.body\.scrollTop = 0/);
  assert.match(source, /window\.scrollTo\?\.\(\{ top: 0, left: 0, behavior: 'auto' \}\)/);
  assert.match(source, /window\.setTimeout\(scrollNewsroomTop, 80\)/);
});

test('article reader exposes a direct Rewrite edition control that reuses the native generator', async () => {
  const [rewrite, owner] = await Promise.all([
    readFile(rewriteUrl, 'utf8'),
    readFile(ownerUrl, 'utf8'),
  ]);

  assert.match(owner, /<NewsroomArticleRewritePortal \/>/);
  assert.match(rewrite, /nav\[aria-label="Weekly newsroom articles"\]/);
  assert.match(rewrite, /Rewrite edition/);
  assert.match(rewrite, /nativeButton\.click\(\)/);
  assert.match(rewrite, /Regenerate every article in this weekly edition/);
});

test('article reader shows complete photos and gives publication tabs their own responsive row', async () => {
  const styles = await readFile(readerStylesUrl, 'utf8');

  assert.match(styles, /object-fit: contain !important/);
  assert.match(styles, /\.dhq-enquirer-hero img/);
  assert.match(styles, /\.dhq-espn-hero img/);
  assert.match(styles, /@media \(max-width: 1180px\)/);
  assert.match(styles, /\.dhq-newsroom-reader-mode > \.dhq-newsroom-reader-tabs \{[\s\S]*?grid-column: 1 \/ -1;[\s\S]*?grid-row: 2;/);
  assert.match(styles, /flex-wrap: wrap !important/);
});

test('homepage matchup immersion keeps active pregame and completed postgame opponents isolated', async () => {
  const [dashboard, immersion] = await Promise.all([
    readFile(dashboardUrl, 'utf8'),
    readFile(immersionUrl, 'utf8'),
  ]);

  assert.match(dashboard, /buildGameWeekImmersion\(state, model, flow\)/);
  assert.match(immersion, /const latestGameFor/);
  assert.match(immersion, /game\.stage !== 'high-school'/);
  assert.match(immersion, /!game\.evaluation/);
  assert.match(immersion, /const activeOpponentFor/);
  assert.match(immersion, /state\.currentWeekSetup/);
  assert.match(immersion, /state\.weeklyAgendaDraft\?\.newGame/);
  assert.match(immersion, /const opponent = mode === 'pregame'/);
  assert.match(immersion, /activeOpponent \|\| clean\(latestGame\?\.opponent\) \|\| 'NEXT OPPONENT'/);
  assert.match(immersion, /clean\(latestGame\?\.opponent\) \|\| activeOpponent \|\| 'NEXT OPPONENT'/);
});
