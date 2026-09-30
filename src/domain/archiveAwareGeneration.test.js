import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Newsroom generation hydrates archived weeks before attaching generated articles', async () => {
  const app = await source('../App.jsx');
  const start = app.indexOf('const handleGenerateNewsroomEdition');
  const end = app.indexOf('const handleAssignNewsroomMedia', start);
  const handler = app.slice(start, end);

  assert.ok(handler.includes('readHydratedCareerInTransaction'));
  assert.ok(handler.includes('writeHydratedCareerInTransaction'));
  assert.ok(handler.includes('applyGeneratedNewsroomEdition(remoteState, publicationId, edition)'));
  assert.doesNotMatch(handler, /migrateCareerState\(remoteSnapshot\.data\(\)/);
  assert.doesNotMatch(handler, /transaction\.set\(docRef, committedState\)/);
});

test('Podcast v3 reads and writes the hydrated archive-aware career', async () => {
  const podcast = await source('../components/PodcastHumanizedAudioPortal.jsx');

  assert.ok(podcast.includes('const { user, career } = useOwnerCareer();'));
  assert.ok(podcast.includes('loadHydratedCareer({ db, appId, userId: user.uid })'));
  assert.ok(podcast.includes('readHydratedCareerInTransaction'));
  assert.ok(podcast.includes('writeHydratedCareerInTransaction'));
  assert.doesNotMatch(podcast, /onSnapshot\(ref, \(snapshot\) => setCareer/);
  assert.doesNotMatch(podcast, /const latestState = snapshot\.data\(\)/);
});

test('Podcast NotebookLM master-audio attachment updates the archived episode', async () => {
  const podcast = await source('../components/PodcastMasterAudioPortalV2.jsx');

  assert.ok(podcast.includes('readHydratedCareerInTransaction'));
  assert.ok(podcast.includes('writeHydratedCareerInTransaction'));
  assert.doesNotMatch(podcast, /podcastEpisodes: episodesNow\.map[\s\S]{0,500}transaction\.set\(ref/);
});
