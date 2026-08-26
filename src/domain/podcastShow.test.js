import test from 'node:test';
import assert from 'node:assert/strict';

import { PODCAST_PUBLIC_HOSTS, PODCAST_SHOW, resolvePodcastShow } from './podcastShow.js';

test('Cincinnati uses Nippert Notebook with the existing Mark and Sarah host identities', () => {
  const show = resolvePodcastShow({ player: { college: 'Cincinnati' }, newsroomIssues: [] });
  assert.equal(show.name, 'Nippert Notebook');
  assert.equal(show.subtitle, 'Cincinnati Football Podcast');
  assert.equal(show.nickname, 'Bearcats');
  assert.deepEqual(PODCAST_PUBLIC_HOSTS.map((host) => host.name), ['Mark Thompson', 'Sarah Chen']);
});

test('podcast identity follows a future current team instead of staying Cincinnati-branded', () => {
  const show = resolvePodcastShow({
    player: { college: 'Michigan' },
    newsroomIssues: [{ outletProfile: { school: 'Michigan', localOutletName: 'Ann Arbor Saturday' } }],
  });
  assert.equal(show.school, 'Michigan');
  assert.match(show.name, /Michigan/);
  assert.notEqual(show.name, PODCAST_SHOW.name);
  assert.notEqual(show.primary, '#e00122');
});
