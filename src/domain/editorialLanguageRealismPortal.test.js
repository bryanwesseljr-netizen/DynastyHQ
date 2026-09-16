import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const portalUrl = new URL('../components/EditorialLanguageRealismPortal.jsx', import.meta.url);

test('editorial normalization upgrades already-saved issues and episodes on first load', async () => {
  const source = await readFile(portalUrl, 'utf8');

  assert.match(source, /EDITORIAL_LANGUAGE_VERSION/);
  assert.match(source, /const idsNeedingInitialNormalization/);
  assert.match(source, /Number\(item\?\.editorialLanguageVersion\) !== EDITORIAL_LANGUAGE_VERSION/);
  assert.match(source, /changedIssueIds = idsNeedingInitialNormalization\(career\.newsroomIssues \|\| \[\]\)/);
  assert.match(source, /changedEpisodeIds = idsNeedingInitialNormalization\(career\.podcastEpisodes \|\| \[\]\)/);
  assert.match(source, /normalizeNewsroomIssueLanguage\(issue, careerAtPublication\(remote, publicationId\)\)/);
  assert.match(source, /normalizePodcastEpisodeLanguage\(episode, careerAtPublication\(remote, publicationId\)\)/);
});

test('editorial first-load migration only writes when normalized reader-facing text changes', async () => {
  const source = await readFile(portalUrl, 'utf8');

  assert.match(source, /const issueChanged =/);
  assert.match(source, /const episodeChanged =/);
  assert.match(source, /if \(!issueChanged && !episodeChanged\) return;/);
  assert.match(source, /'_sync\.revision': revision \+ 1/);
  assert.match(source, /'_sync\.deviceId': 'editorial-language-realism'/);
});
