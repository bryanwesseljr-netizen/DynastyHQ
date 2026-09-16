import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const experienceUrl = new URL('../components/NewsroomArticleExperiencePortal.jsx', import.meta.url);
const rewriteUrl = new URL('../components/NewsroomArticleRewritePortal.jsx', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const dashboardUrl = new URL('../components/BroadcastDashboard.jsx', import.meta.url);

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

test('homepage matchup copy falls back to the latest published college opponent', async () => {
  const source = await readFile(dashboardUrl, 'utf8');

  assert.match(source, /const latestPublishedOpponent/);
  assert.match(source, /game\.stage !== 'high-school'/);
  assert.match(source, /!game\.evaluation/);
  assert.match(source, /setup\.opponent \|\| draftGame\.opponent \|\| latestPublishedOpponent\(state\)/);
});
