import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const masterUrl = new URL('../components/PodcastMasterAudioPortalV2.jsx', import.meta.url);
const studioUrl = new URL('../components/PodcastStudio.jsx', import.meta.url);
const integrationUrl = new URL('../components/PodcastFinishedAudioIntegrationPortal.jsx', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const humanizedUrl = new URL('../components/PodcastHumanizedAudioPortal.jsx', import.meta.url);
const podcastApiUrl = new URL('../../api/generate-podcast.js', import.meta.url);

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


test('master-audio episode dropdown changes the main podcast transcript and audio selection', async () => {
  const [master, studio] = await Promise.all([
    readFile(masterUrl, 'utf8'),
    readFile(studioUrl, 'utf8'),
  ]);

  assert.match(master, /dynastyhq:podcast-publication-selected/);
  assert.match(master, /onChange=\{\(event\) => selectPublication\(event\.target\.value\)\}/);
  assert.match(studio, /window\.addEventListener\('dynastyhq:podcast-publication-selected'/);
  assert.match(studio, /setAudioSegments\(null\)/);
  assert.match(studio, /setSelectedPublicationId\(publicationId\)/);
});

test('NotebookLM source pack is current-week issue-first and includes full research sections', async () => {
  const master = await readFile(masterUrl, 'utf8');

  assert.match(master, /buildPodcastResearchPacket/);
  assert.match(master, /Source-pack selection follows every verified weekly update/);
  assert.match(master, /listPodcastProductionIssues\(career \|\| \{\}\)/);
  assert.match(master, /\.sort\(issueChronology\)/);
  assert.match(master, /issues\[issues\.length - 1\]/);
  assert.match(master, /## Current game — full verified summary/);
  assert.match(master, /## Tracked player — full game stat line/);
  assert.match(master, /## Team statistical comparison/);
  assert.match(master, /## Scoring summary \/ drive details/);
  assert.match(master, /## Player progression \/ regression/);
  assert.match(master, /## Complete verified current-week fact ledger/);
  assert.match(master, /Use the preseason QB1 story only as background context/);
  assert.doesNotMatch(master, /disabled=\{busy \|\| !selectedIssue \|\| !selectedHasTranscript\}/);
  assert.match(master, /disabled=\{busy \|\| !selectedEpisode \|\| !selectedHasTranscript\}/);
});

test('podcast transcript controls do not require a current Newsroom podcastBrief', async () => {
  const humanized = await readFile(humanizedUrl, 'utf8');

  assert.match(humanized, /listPodcastProductionIssues\(career \|\| \{\}\)/);
  assert.doesNotMatch(humanized, /issue\?\.podcastBrief\)/);
  assert.match(humanized, /full weekly packet/);
});

test('podcast production tools automatically follow a newly published latest week without breaking archive selection', async () => {
  const [master, studio, humanized] = await Promise.all([
    readFile(masterUrl, 'utf8'),
    readFile(studioUrl, 'utf8'),
    readFile(humanizedUrl, 'utf8'),
  ]);

  [master, studio, humanized].forEach((source) => {
    assert.match(source, /previousLatestPublicationIdRef/);
    assert.match(source, /wasFollowingLatest/);
  });
  assert.match(master, /latest !== previousLatest/);
  assert.match(humanized, /latest !== previousLatest/);
  assert.match(studio, /latest !== previousLatest/);
});

test('podcast API preserves detailed current-week research instead of reducing the transcript to the brief', async () => {
  const source = await readFile(podcastApiUrl, 'utf8');

  assert.match(source, /const sanitizeResearchPacket =/);
  assert.match(source, /researchPacket: sanitizeResearchPacket\(body\)/);
  assert.match(source, /playerGameFacts: sanitizeResearchFacts/);
  assert.match(source, /teamGameFacts: sanitizeResearchFacts/);
  assert.match(source, /scoringFacts: sanitizeResearchFacts/);
  assert.match(source, /progressionFacts: sanitizeResearchFacts/);
  assert.match(source, /developmentChanges:/);
  assert.match(source, /researchPacket\.game contains a completed game/);
  assert.match(source, /first start with a completed game/i);
});
