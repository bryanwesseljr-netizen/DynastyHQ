import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPodcastGenerationPayload,
  markPodcastAudioReady,
  normalizeGeneratedPodcast,
  podcastTranscriptText,
  upsertPodcastEpisode,
} from './podcastEngine.js';

const state = {
  factLedger: [
    { publicationId: 'season-1-week-2', key: 'profile.player.name', label: 'Player', value: 'Test Player', verified: true },
    { publicationId: 'season-1-week-2', key: 'game.passYds', label: 'Passing yards', value: 245, verified: true },
    { publicationId: 'season-1-week-1', key: 'game.passYds', label: 'Passing yards', value: 999, verified: true },
  ],
  newsroomIssues: [{
    id: 'season-1-week-2', publicationId: 'season-1-week-2', season: 1, week: 2, careerPhase: 'Player',
    podcastBrief: {
      title: 'Week 2 briefing',
      summary: 'A verified recap.',
      citedFactKeys: ['profile.player.name', 'game.passYds'],
    },
  }],
  podcastEpisodes: [],
};

const longText = Array.from({ length: 80 }, (_, index) => `word${index}`).join(' ');

test('builds podcast input from only the selected publication verified facts', () => {
  const payload = buildPodcastGenerationPayload(state, 'season-1-week-2');
  assert.deepEqual(payload.facts.map((fact) => fact.value), ['Test Player', 245]);
});

test('normalizes a grounded five-to-six-minute two-host script', () => {
  const payload = buildPodcastGenerationPayload(state, 'season-1-week-2');
  const generated = {
    title: 'The Week 2 Grind',
    summary: 'Mark and Sarah review the verified week.',
    chapters: [
      { id: 'open', title: 'Opening Drive', summary: 'The result.', segmentStart: 0 },
      { id: 'tape', title: 'Tape Room', summary: 'The numbers.', segmentStart: 4 },
    ],
    segments: Array.from({ length: 10 }, (_, index) => ({
      id: `turn-${index + 1}`,
      hostId: index % 2 ? 'tyler-brooks' : 'marcus-grant',
      chapterId: index < 4 ? 'open' : 'tape',
      text: longText,
      citedFactKeys: index === 0 ? ['game.passYds', 'invented.fact'] : ['profile.player.name'],
    })),
  };
  const episode = normalizeGeneratedPodcast({ generated, payload, model: 'test-model' });
  assert.equal(episode.segments.length, 10);
  assert.equal(episode.segments[0].citedFactKeys.includes('invented.fact'), false);
  assert.ok(episode.estimatedMinutes >= 5 && episode.estimatedMinutes <= 6);
  assert.equal(episode.audioStatus, 'not-generated');
});

test('upserts an episode and marks its audio ready without duplicating the archive', () => {
  const scripted = { id: 'podcast-season-1-week-2', publicationId: 'season-1-week-2', segments: [{ text: 'Hello' }] };
  const withEpisode = upsertPodcastEpisode(state, scripted);
  const replaced = upsertPodcastEpisode(withEpisode, { ...scripted, title: 'Updated' });
  const ready = markPodcastAudioReady(replaced, scripted.publicationId, { model: 'tts-model', segmentCount: 1 });
  assert.equal(ready.podcastEpisodes.length, 1);
  assert.equal(ready.podcastEpisodes[0].audioStatus, 'ready');
  assert.equal(ready.podcastEpisodes[0].audioSegmentCount, 1);
});

test('creates a labeled two-host transcript', () => {
  const transcript = podcastTranscriptText({ season: 1, week: 2, title: 'Test', segments: [
    { hostId: 'marcus-grant', text: 'Opening thought.' },
    { hostId: 'tyler-brooks', text: 'Counterpoint.' },
  ] });
  assert.match(transcript, /AI-generated voices/);
  assert.match(transcript, /Mark Thompson: Opening thought/);
  assert.match(transcript, /Sarah Chen: Counterpoint/);
});
