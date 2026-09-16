import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const masterUrl = new URL('../components/PodcastMasterAudioPortalV2.jsx', import.meta.url);
const integrationUrl = new URL('../components/PodcastFinishedAudioIntegrationPortal.jsx', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);

test('finished podcast workflow accepts NotebookLM M4A and archives it as continuous ready audio', async () => {
  const master = await readFile(masterUrl, 'utf8');

  assert.match(master, /\.m4a/);
  assert.match(master, /savePodcastAudioLocal\(episodeId, \[piece\]\)/);
  assert.match(master, /savePodcastAudioCloud\(/);
  assert.match(master, /audioStatus: 'ready'/);
  assert.match(master, /audioEngine: 'notebooklm-master-upload'/);
  assert.match(master, /audioSource: 'notebooklm'/);
  assert.match(master, /audioContinuous: true/);
  assert.match(master, /masterAudioFileName:/);
});

test('ready finished episodes surface as playable media on Home and Game Hub', async () => {
  const integration = await readFile(integrationUrl, 'utf8');

  assert.match(integration, /dhq-broadcast-podcast-card/);
  assert.match(integration, /dhq-gh-podcast-panel/);
  assert.match(integration, /FINISHED EPISODE/);
  assert.match(integration, /PLAY EPISODE/);
  assert.match(integration, /visibleNavButton\('Podcast'\)/);
  assert.match(integration, /audioStatus === 'ready'/);
});

test('owner experience mounts finished podcast integration beside existing master-audio tools', async () => {
  const owner = await readFile(ownerUrl, 'utf8');

  assert.match(owner, /PodcastMasterAudioPortalV2/);
  assert.match(owner, /PodcastFinishedAudioIntegrationPortal/);
  assert.match(owner, /<PodcastFinishedAudioIntegrationPortal \/>/);
});
