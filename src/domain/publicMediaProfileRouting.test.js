import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mainUrl = new URL('../main.jsx', import.meta.url);
const ownerEnhancementsUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const sharePortalUrl = new URL('../components/PublicMediaProfileSharePortal.jsx', import.meta.url);
const publicPageUrl = new URL('../components/PublicMediaProfilePage.jsx', import.meta.url);

test('media profile route is handled before the authenticated or legacy whole-career app', async () => {
  const main = await readFile(mainUrl, 'utf8');
  assert.match(main, /readPublicMediaProfileId/);
  assert.match(main, /mediaProfileId\s*\?\s*\(/);
  assert.match(main, /<PublicMediaProfilePage ownerId=\{mediaProfileId\}/);
  assert.match(main, /sharedArticleId[\s\S]*mediaProfileId[\s\S]*<AuthAwareApp/);
});

test('owner enhancements replace legacy whole-career sharing and management controls', async () => {
  const [ownerEnhancements, sharePortal] = await Promise.all([
    readFile(ownerEnhancementsUrl, 'utf8'),
    readFile(sharePortalUrl, 'utf8'),
  ]);
  assert.match(ownerEnhancements, /<PublicMediaProfileSharePortal \/>/);
  assert.match(sharePortal, /shared_media_profiles/);
  assert.match(sharePortal, /shared_dynasties/);
  assert.match(sharePortal, /LEGACY_SHARE_LABEL = 'Get Share Link'/);
  assert.match(sharePortal, /LEGACY_REVOKE_LABEL = 'Revoke Public Link'/);
  assert.match(sharePortal, /Share Media Profile/);
  assert.match(sharePortal, /Manage Media Profile/);
  assert.match(sharePortal, /Revoke Profile/);
  assert.match(sharePortal, /shared_podcast_/);
});

test('preview media links preserve Vercel access and do not wait for podcast audio copying', async () => {
  const sharePortal = await readFile(sharePortalUrl, 'utf8');
  assert.match(sharePortal, /searchParams\.get\('_vercel_share'\)/);
  assert.match(sharePortal, /searchParams\.set\('media', user\.uid\)/);
  assert.match(sharePortal, /if \(previewShareToken\) url\.searchParams\.set\('_vercel_share', previewShareToken\)/);
  assert.match(sharePortal, /setModal\(\{[\s\S]*url: publicUrl,[\s\S]*Podcast audio is finishing its public sync in the background/);
  assert.match(sharePortal, /void Promise\.all\(\[[\s\S]*syncPublicPodcastAudio\(\)[\s\S]*retireLegacyWholeCareerShare\(\)/);
});

test('public media profile exposes exactly stats, newsroom and podcast navigation', async () => {
  const publicPage = await readFile(publicPageUrl, 'utf8');
  assert.match(publicPage, /Player Stats/);
  assert.match(publicPage, /Newsroom/);
  assert.match(publicPage, /Podcast/);
  assert.match(publicPage, /shared_media_profiles/);
  assert.match(publicPage, /<GroundedNewsroom/);
  assert.match(publicPage, /<PodcastStudio/);
  assert.doesNotMatch(publicPage, /Recruiting Board/);
  assert.doesNotMatch(publicPage, /Weekly Agenda/);
  assert.doesNotMatch(publicPage, /Settings/);
});
