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

test('coach podcast brief follows the saved issue program instead of the old player college', () => {
  const coachingState = {
    careerPhase: 'HC',
    careerStage: 'HC',
    player: { graduated: true, college: 'Cincinnati', graduationSchool: 'Cincinnati' },
    coach: { school: 'UCF' },
    careerMilestones: [{ type: 'hc-hire', institution: 'UCF', previousInstitution: 'Cincinnati' }],
    factLedger: [
      { publicationId: 'season-8-week-3', key: 'game.result', label: 'Result', value: 'W', verified: true },
    ],
    newsroomIssues: [{
      id: 'season-8-week-3',
      publicationId: 'season-8-week-3',
      season: 8,
      week: 3,
      careerPhase: 'HC',
      outletProfile: { school: 'UCF' },
      podcastBrief: { title: '', summary: '', citedFactKeys: ['game.result'] },
    }],
    podcastEpisodes: [],
  };

  const payload = buildPodcastGenerationPayload(coachingState, 'season-8-week-3');
  assert.equal(payload.coverageStage, 'coach');
  assert.match(payload.brief.title, /^UCF /);
  assert.doesNotMatch(payload.brief.title, /Cincinnati/);
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


test('Season 4 Week 0 QB1 promotion can generate a podcast using prior-season QB2 and verified stay decisions', () => {
  const promotionState = {
    careerPhase: 'Player',
    currentSeason: 4,
    currentWeek: 1,
    player: { name: 'Bryan Wessel', school: 'Oregon', college: 'Oregon', isCommitted: true },
    rtg: { rank: 'QB1' },
    weeklyUpdates: [
      { id: 'season-3-week-15', weekKey: 'season-3-week-15', season: 3, week: 15, rtgSnapshot: { rank: 'QB2' }, game: null },
      { id: 'season-4-week-0', weekKey: 'season-4-week-0', season: 4, week: 0, weekType: 'bye', weekPhase: 'preseason', rtgSnapshot: { rank: 'QB1' }, game: null },
    ],
    gameLogs: [],
    seasonSchedules: [],
    factLedger: [
      { publicationId: 'season-4-week-0', key: 'weekly.note', label: 'Week note', value: 'Named Oregon QB1 after waiting for the opportunity.', verified: true },
      { publicationId: 'season-4-week-0', key: 'rtg.rank', label: 'Depth Chart Rank', value: 'QB1', verified: true },
    ],
    playerRecruiting: {
      transfer: {
        decisions: [
          { season: 1, week: 15, decision: 'stay', from: 'Oregon', destination: '' },
          { season: 2, week: 15, decision: 'stay', from: 'Oregon', destination: '' },
          { season: 3, week: 15, decision: 'stay', from: 'Oregon', destination: '' },
        ],
      },
    },
    newsroomIssues: [{
      id: 'season-4-week-0',
      publicationId: 'season-4-week-0',
      season: 4,
      week: 0,
      weekType: 'bye',
      weekPhase: 'preseason',
      careerPhase: 'Player',
      podcastBrief: { title: 'Preseason briefing', summary: 'Quarterback role change.', citedFactKeys: ['weekly.note', 'rtg.rank'] },
    }],
    podcastEpisodes: [],
  };

  const payload = buildPodcastGenerationPayload(promotionState, 'season-4-week-0');
  assert.equal(payload.coverageDecision.podcastEligible, true);
  assert.equal(payload.coverageDecision.tier, 'major');
  assert.match(payload.facts.find((fact) => fact.key === 'player.programStayHistory')?.value || '', /Seasons 1, 2, 3/);
  assert.equal(payload.facts.find((fact) => fact.key === 'player.roleChange')?.value, 'QB2 → QB1');
});


test('podcast gate treats first verified preseason QB1 status as meaningful movement even without a stored prior rank', () => {
  const state = {
    careerPhase: 'Player',
    currentSeason: 4,
    currentWeek: 1,
    player: { name: 'Bryan Wessel', school: 'Oregon', college: 'Oregon', isCommitted: true },
    rtg: { rank: 'QB1' },
    weeklyUpdates: [{
      id: 'season-4-week-0', weekKey: 'season-4-week-0', season: 4, week: 0,
      weekType: 'bye', weekPhase: 'preseason', rtgSnapshot: { rank: 'QB1' }, game: null,
    }],
    gameLogs: [],
    seasonSchedules: [],
    factLedger: [
      { id: 'rank', publicationId: 'season-4-week-0', key: 'rtg.rank', label: 'Depth Chart Rank', value: 'QB1', verified: true },
      { id: 'note', publicationId: 'season-4-week-0', key: 'weekly.note', label: 'Week note', value: 'Wessel enters the season as Oregon QB1 after waiting for his opportunity.', verified: true },
    ],
    playerRecruiting: { transfer: { decisions: [
      { season: 1, decision: 'stay', from: 'Oregon' },
      { season: 2, decision: 'stay', from: 'Oregon' },
      { season: 3, decision: 'stay', from: 'Oregon' },
    ] } },
    newsroomIssues: [{
      id: 'season-4-week-0', publicationId: 'season-4-week-0', season: 4, week: 0,
      weekType: 'bye', weekPhase: 'preseason', careerPhase: 'Player',
      podcastBrief: { title: 'Preseason briefing', summary: 'QB1 opportunity.', citedFactKeys: ['rtg.rank', 'weekly.note'] },
    }],
    podcastEpisodes: [],
  };

  const payload = buildPodcastGenerationPayload(state, 'season-4-week-0');
  assert.equal(payload.coverageDecision.tier, 'standard');
  assert.equal(payload.coverageDecision.podcastEligible, true);
  assert.equal(payload.coveragePlan.playerRelevance.starterAnnouncement, true);
  assert.equal(payload.facts.find((fact) => fact.key === 'player.programStayDecisionCount')?.value, 3);
});
