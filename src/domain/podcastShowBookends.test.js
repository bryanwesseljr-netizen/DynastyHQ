import test from 'node:test';
import assert from 'node:assert/strict';

import { applyPodcastShowBookends, isPodcastBookendSegment } from './podcastShowBookends.js';

const baseEpisode = () => ({
  title: 'Weekly recap',
  chapters: [
    { id: 'opening', title: 'Opening Drive', summary: 'Lead', segmentStart: 0 },
    { id: 'next', title: 'Next Saturday', summary: 'Next', segmentStart: 2 },
  ],
  segments: [
    { id: 'body-1', hostId: 'marcus-grant', chapterId: 'opening', text: 'The game turned on the second half.', deliveryStyle: 'analytical', citedFactKeys: ['game.result'] },
    { id: 'body-2', hostId: 'tyler-brooks', chapterId: 'opening', text: 'The result changes the conversation.', deliveryStyle: 'analytical', citedFactKeys: ['game.result'] },
    { id: 'body-3', hostId: 'marcus-grant', chapterId: 'next', text: 'The next question is consistency.', deliveryStyle: 'reflective', citedFactKeys: [] },
  ],
});

const cincinnatiPayload = (week = 4) => ({
  publicationId: `season-2-week-${week}`,
  season: 2,
  week,
  weekType: 'game',
  show: {
    name: 'Nippert Notebook',
    school: 'Cincinnati',
    nickname: 'Bearcats',
  },
  episodeContext: {
    school: 'Cincinnati',
    nickname: 'Bearcats',
    opponent: 'UCF',
    result: 'W',
    didPlay: true,
  },
});

test('adds a deterministic Nippert Notebook intro and signoff around the generated body', () => {
  const first = applyPodcastShowBookends({ episode: baseEpisode(), payload: cincinnatiPayload(4) });
  const second = applyPodcastShowBookends({ episode: baseEpisode(), payload: cincinnatiPayload(4) });

  assert.deepEqual(first.segments, second.segments);
  assert.equal(first.showName, 'Nippert Notebook');
  assert.equal(first.showSchool, 'Cincinnati');
  assert.equal(first.showNickname, 'Bearcats');
  assert.equal(first.opponent, 'UCF');
  assert.match(first.segments[0].text, /Nippert Notebook|Cincinnati/i);
  assert.match(first.segments[1].text, /Bearcats|Cincinnati/i);
  assert.match(first.segments[1].text, /UCF/i);
  assert.ok(first.segments.slice(-2).every(isPodcastBookendSegment));
  assert.equal(first.segments[2].id, 'body-1');
});

test('adjacent weeks rotate the branded opening instead of repeating the exact same copy', () => {
  const week4 = applyPodcastShowBookends({ episode: baseEpisode(), payload: cincinnatiPayload(4) });
  const week5 = applyPodcastShowBookends({ episode: baseEpisode(), payload: cincinnatiPayload(5) });
  const open4 = week4.segments.slice(0, 2).map((segment) => segment.text).join(' ');
  const open5 = week5.segments.slice(0, 2).map((segment) => segment.text).join(' ');
  assert.notEqual(open4, open5);
});

test('a future team uses its own show identity rather than Cincinnati branding', () => {
  const episode = applyPodcastShowBookends({
    episode: baseEpisode(),
    payload: {
      publicationId: 'season-7-week-2',
      season: 7,
      week: 2,
      weekType: 'game',
      show: { name: 'Michigan Football Notebook', school: 'Michigan', nickname: 'Wolverines' },
      episodeContext: { school: 'Michigan', nickname: 'Wolverines', opponent: 'Penn State', result: 'L', didPlay: true },
    },
  });

  const opening = episode.segments.slice(0, 2).map((segment) => segment.text).join(' ');
  assert.match(opening, /Michigan Football Notebook|Michigan/i);
  assert.match(opening, /Wolverines/i);
  assert.match(opening, /Penn State/i);
  assert.doesNotMatch(opening, /Nippert|Bearcats|Cincinnati/i);
});

test('bye-week opener does not invent an opponent or game result', () => {
  const episode = applyPodcastShowBookends({
    episode: baseEpisode(),
    payload: {
      publicationId: 'season-2-week-8',
      season: 2,
      week: 8,
      weekType: 'bye',
      show: { name: 'Nippert Notebook', school: 'Cincinnati', nickname: 'Bearcats' },
      episodeContext: { school: 'Cincinnati', nickname: 'Bearcats', opponent: '', result: '', didPlay: false },
    },
  });

  const opening = episode.segments.slice(0, 2).map((segment) => segment.text).join(' ');
  assert.match(opening, /bye|didn't take the field|no game|week off/i);
  assert.doesNotMatch(opening, /against\s+[A-Z]/);
});

test('bookend application is idempotent', () => {
  const once = applyPodcastShowBookends({ episode: baseEpisode(), payload: cincinnatiPayload(4) });
  const twice = applyPodcastShowBookends({ episode: once, payload: cincinnatiPayload(4) });
  assert.deepEqual(twice, once);
});
