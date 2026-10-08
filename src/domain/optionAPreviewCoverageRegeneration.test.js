import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { upsertPodcastEpisode } from './podcastEngine.js';

test('published weeks have a dedicated editorial regeneration action without going through game re-publication', async () => {
  const app = await readFile(new URL('../option-a-preview/PreviewApp.jsx', import.meta.url), 'utf8');
  assert.match(app, /function WeekProcessingCenter\(\{open,data,user,onClose,notify,intent='normal'\}\)/);
  assert.match(app, /setPhase\(intent==='regenerate' && data.selection\?\.hasGame \? 'regenerate' : 'game'\)/);
  assert.match(app, /onRegenerateCoverage=\{openSavedCoverageRegenerator\}/);
  assert.match(app, /REGENERATE NEWS \+ PODCAST/);
  assert.match(app, /REGENERATE COVERAGE/);
  assert.match(app, /YES · REGENERATE BOTH/);
  assert.match(app, /phase==='regenerate' && <section/);
  assert.match(app, /refreshPublishedCoverage\(\{targetPublicationId:publicationId,targetSeason:/);
});

test('editorial regenerate uses rollback checkpoint, current cloud revision, and protected archive transaction', async () => {
  const app = await readFile(new URL('../option-a-preview/PreviewApp.jsx', import.meta.url), 'utf8');
  const start = app.indexOf('const refreshPublishedCoverage=async');
  const end = app.indexOf('const publishVerifiedPacket=async', start);
  assert.ok(start > 0 && end > start);
  const implementation = app.slice(start, end);
  assert.match(implementation, /before-coverage-regeneration-\$\{targetPublicationId\}/);
  assert.match(implementation, /detectDestructiveCareerRegression\(remote,nextState\)/);
  assert.match(implementation, /Number\(remote\._sync\?\.revision \|\| 0\)!==Number\(baseState\._sync\?\.revision \|\| 0\)/);
  assert.match(implementation, /careerArchiveRef\(\{/);
  assert.match(implementation, /checkpointArchive/);
  assert.match(implementation, /writeHydratedCareerInTransaction\(\{/);
  assert.doesNotMatch(implementation, /createPublishedWeek\(/);
  assert.doesNotMatch(implementation, /correctPublishedWeek\(/);
  assert.doesNotMatch(implementation, /removePublishedGame\(/);
});

test('rewriting a podcast transcript preserves the previously uploaded master audio record and marks it stale', () => {
  const before = {
    podcastEpisodes: [{
      id: 'podcast-season-4-week-17',
      publicationId: 'season-4-week-17',
      title: 'Old Bowl 1 Podcast',
      audioStatus: 'ready',
      audioModel: 'notebooklm-audio-overview',
      audioEngine: 'notebooklm-master-upload',
      audioGeneratedAt: '2026-09-01T17:00:00Z',
      masterAudioFileName: 'lsu-audio.mp3',
      masterAudioUploadedAt: '2026-09-01T17:00:00Z',
      masterAudioSizeBytes: 450123,
      masterAudioDurationSeconds: 541,
      segments: [{text:'Old story'}],
    }],
    gameLogs: [{season:4,week:17,opponent:'LSU',result:'W',homeScore:24,awayScore:17}],
  };
  const after = upsertPodcastEpisode(before, {
    id: 'podcast-season-4-week-17',
    publicationId: 'season-4-week-17',
    title: 'Oregon CFP First Round: Playoff Edition',
    audioStatus: 'stale',
    audioModel: 'notebooklm-audio-overview',
    audioGeneratedAt: '2026-09-01T17:00:00Z',
    segments: [{text:'New CFP first round story'}],
  });
  assert.equal(after.podcastEpisodes.length, 1);
  assert.equal(after.podcastEpisodes[0].audioStatus, 'stale');
  assert.equal(after.podcastEpisodes[0].masterAudioFileName, 'lsu-audio.mp3');
  assert.equal(after.podcastEpisodes[0].masterAudioSizeBytes, 450123);
  assert.equal(after.podcastEpisodes[0].masterAudioDurationSeconds, 541);
  assert.equal(after.podcastEpisodes[0].audioEngine, 'notebooklm-master-upload');
  assert.equal(after.podcastEpisodes[0].segments[0].text, 'New CFP first round story');
  assert.deepEqual(after.gameLogs, before.gameLogs);
});

test('partial Newsroom failure offers targeted retry without regenerating successful Podcast output', async () => {
  const source = await readFile(new URL('../option-a-preview/PreviewApp.jsx', import.meta.url), 'utf8');
  const start = source.indexOf('const refreshPublishedCoverage=async');
  const end = source.indexOf('const publishVerifiedPacket=async', start);
  const operation = source.slice(start, end);
  assert.match(operation, /parts='both'/);
  assert.match(operation, /const writeNewsroom=parts!=='podcast'/);
  assert.match(operation, /const writePodcast=parts!=='newsroom'/);
  assert.match(operation, /if\(writeNewsroom\) try/);
  assert.match(operation, /if\(writePodcast\) try/);
  assert.match(operation, /newsroom:writeNewsroom\?'pending':'unchanged'/);
  assert.match(operation, /podcast:writePodcast\?'pending':'unchanged'/);
  const view = source.slice(source.indexOf("{phase==='regenerate' && <section"), source.indexOf("{phase==='game' &&",source.indexOf("{phase==='regenerate' && <section")));
  assert.match(view, /NEWSROOM ONLY/);
  assert.match(view, /RETRY NEWSROOM ONLY/);
  assert.match(view, /RETRY PODCAST ONLY/);
  assert.match(view, /parts:regenerateTarget/);
  assert.match(view, /podcast transcript, NotebookLM audio, game data and photos will not be changed/);
  assert.match(view, /coverageRefreshResult\.podcast==='unchanged'\?'left unchanged'/);
});
