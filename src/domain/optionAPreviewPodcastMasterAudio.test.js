import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const previewSourceUrl = new URL('../option-a-preview/PreviewApp.jsx', import.meta.url);

test('redesign preview reuses the production-scoped Podcast master-audio storage path without deploying production code', async () => {
  const source = await readFile(previewSourceUrl, 'utf8');

  assert.match(source, /appId:productionAppId/);
  assert.match(source, /savePodcastAudioCloud\(/);
  assert.match(source, /savePodcastAudioLocal\(/);
  assert.match(source, /readHydratedCareerInTransaction\(/);
  assert.match(source, /writeHydratedCareerInTransaction\(/);
  assert.match(source, /audioEngine:'notebooklm-master-upload'/);
  assert.match(source, /masterAudioFileName:file\.name/);
  assert.match(source, /masterAudioSizeBytes:file\.size/);
  assert.match(source, /masterAudioUploadedAt:savedAt/);
});

test('redesign preview validates the existing master-audio contract and scopes the file picker to supported formats', async () => {
  const source = await readFile(previewSourceUrl, 'utf8');

  assert.match(source, /PREVIEW_MASTER_AUDIO_MAX_BYTES = 30_000_000/);
  assert.match(source, /new Set\(\['mp3','m4a','wav','aac','ogg'\]\)/);
  assert.match(source, /accept="audio\/mpeg,audio\/mp4,audio\/x-m4a,audio\/wav,audio\/x-wav,audio\/aac,audio\/ogg,\.mp3,\.m4a,\.wav,\.aac,\.ogg"/);
  assert.match(source, /Create this week’s transcript before attaching master audio/);
  assert.match(source, /Audio attaches only to Season \{data\.season\}, Week \{game\.week\}/);
});

test('redesign preview player loads the selected episode audio from local or cloud storage', async () => {
  const source = await readFile(previewSourceUrl, 'utf8');

  assert.match(source, /loadPodcastAudioLocal\(episodeId\)/);
  assert.match(source, /loadPodcastAudioCloud\(\{/);
  assert.match(source, /URL\.createObjectURL\(podcastAudioBlob\(segments\)\)/);
  assert.match(source, /<audio/);
  assert.match(source, /onEnded=\{\(\)=>\{setPlaying\(false\);setAudioCurrentTime\(audioDuration\)\}\}/);
});
