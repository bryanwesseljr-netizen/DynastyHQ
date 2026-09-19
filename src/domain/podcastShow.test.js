import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  isManagedPodcastCoverUrl,
  PODCAST_PUBLIC_HOSTS,
  PODCAST_SHOW,
  resolvePodcastShow,
} from './podcastShow.js';

test('The Huddle Podcast keeps one career-wide identity while using current-team context', () => {
  const show = resolvePodcastShow({ player: { college: 'Cincinnati' }, newsroomIssues: [] });
  assert.equal(show.name, 'The Huddle Podcast');
  assert.equal(show.shortName, 'The Huddle');
  assert.equal(show.subtitle, 'Cincinnati Football · Weekly Preview & Review');
  assert.equal(show.nickname, 'Bearcats');
  assert.deepEqual(PODCAST_PUBLIC_HOSTS.map((host) => host.name), ['Mark Thompson', 'Sarah Chen']);
});

test('podcast identity follows a future current team without renaming the show', () => {
  const show = resolvePodcastShow({
    player: { college: 'Michigan' },
    newsroomIssues: [{ outletProfile: { school: 'Michigan', localOutletName: 'Ann Arbor Saturday' } }],
  });
  assert.equal(show.school, 'Michigan');
  assert.equal(show.name, PODCAST_SHOW.name);
  assert.equal(show.name, 'The Huddle Podcast');
  assert.match(show.subtitle, /Michigan Football/);
  assert.notEqual(show.primary, '#e00122');
});

test('Oregon podcast context follows the Ducks chapter without Cincinnati branding', () => {
  const show = resolvePodcastShow({
    player: { college: 'Oregon', school: 'Oregon' },
    newsroomIssues: [{ outletProfile: { school: 'Cincinnati', localOutletName: 'Bearcats Insider' } }],
  });
  assert.equal(show.school, 'Oregon');
  assert.equal(show.nickname, 'Ducks');
  assert.equal(show.name, 'The Huddle Podcast');
  assert.equal(show.subtitle, 'Oregon Football · Weekly Preview & Review');
  assert.equal(show.primary.toLowerCase(), '#154733');
  assert.equal(show.secondary.toLowerCase(), '#fee123');
});

test('fresh uncommitted careers do not assume Cincinnati or another college', () => {
  const show = resolvePodcastShow({ player: { college: '', school: '' }, newsroomIssues: [] });
  assert.equal(show.name, 'The Huddle Podcast');
  assert.equal(show.school, 'Road to Glory');
  assert.equal(show.subtitle, 'Road to Glory · Weekly Preview & Review');
});

test('program-specific artwork is accepted by the legacy Current Week player', () => {
  assert.equal(isManagedPodcastCoverUrl('https://assets.public.blob.vercel-storage.com/podcast-cincinnati-primary-12345.webp'), true);
  assert.equal(isManagedPodcastCoverUrl('https://assets.public.blob.vercel-storage.com/podcast-cincinnati-hosts-12345.webp'), true);
  assert.equal(isManagedPodcastCoverUrl('https://example.com/podcast-cincinnati-primary-12345.webp'), false);
});

test('current podcast surfaces do not inherit the old global cover across schools', async () => {
  const [localShow, hydration] = await Promise.all([
    readFile(new URL('../components/PodcastLocalShowPortal.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/PodcastArtworkHydrationPortal.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(localShow, /const primaryArtwork = artwork\.primary \|\| ''/);
  assert.match(hydration, /const primaryArtwork = artwork\.primary \|\| ''/);
  assert.doesNotMatch(localShow, /artwork\.primary \|\| career\?\.outletImages\?\.podcast/);
  assert.doesNotMatch(hydration, /artwork\.primary \|\| career\?\.outletImages\?\.podcast/);
  assert.match(localShow, /image\.style\.setProperty\('display', 'none'\)/);
});


test('Podcast defaults to a listener-first title and audio-player experience', async () => {
  const [studio, localStyles, tools] = await Promise.all([
    readFile(new URL('../components/PodcastStudio.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../podcast-local-show.css', import.meta.url), 'utf8'),
    readFile(new URL('../components/PodcastHumanizedAudioPortal.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(studio, /dhq-podcast-listener-card/);
  assert.match(studio, /dhq-podcast-listener-title/);
  assert.match(studio, /dhq-podcast-listener-player/);
  assert.match(localStyles, /Listener-first Podcast page/);
  assert.match(localStyles, /dhq-podcast-listener-summary[\s\S]*display: none !important/);
  assert.match(localStyles, /dhq-podcast-listener-secondary[\s\S]*display: none !important/);
  assert.match(localStyles, /dhq-podcast-listener-transcript[\s\S]*display: none !important/);
  assert.match(tools, /podcastProductionToolsRequested/);
  assert.match(tools, /podcastStudioIsVisible\(\) && podcastProductionToolsRequested\(\)/);
  assert.match(studio, /dhq-podcast-listener-feed/);
  assert.match(studio, /previousEpisodeItems/);
  assert.match(studio, /autoPlayPublicationId/);
  assert.match(localStyles, /grid-template-columns: 148px minmax\(0, 1fr\)/);
  assert.match(localStyles, /dhq-podcast-listener-feed__episode/);
  const localShow = await readFile(new URL('../components/PodcastLocalShowPortal.jsx', import.meta.url), 'utf8');
  assert.match(localShow, /dhq-local-podcast__tools-toggle/);
  assert.match(localShow, /> More <ChevronDown/);
  assert.match(localShow, /toolsOpen &&/);
  assert.match(localStyles, /Compact Podcast tools dropdown/);
  assert.match(localStyles, /dhq-local-podcast__tools-shell > \.dhq-local-podcast__utility/);
  assert.match(localShow, /secondarySection\.style\.setProperty\('display', \(rundownOpen \|\| notesOpen\) \? 'grid' : 'none', 'important'\)/);
  assert.match(localShow, /archiveSection\.style\.setProperty\('display', archiveOpen \? 'block' : 'none', 'important'\)/);
  assert.match(localShow, /transcriptSection\.style\.setProperty\('display', 'none', 'important'\)/);
  assert.match(localStyles, /Listener-visible Podcast masthead: artwork only/);
  assert.match(localStyles, /\.dhq-local-podcast__identity,[\s\S]*display: none !important/);
});
