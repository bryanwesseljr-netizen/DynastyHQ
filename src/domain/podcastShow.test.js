import test from 'node:test';
import assert from 'node:assert/strict';

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
