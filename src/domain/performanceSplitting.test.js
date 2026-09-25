import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mainUrl = new URL('../main.jsx', import.meta.url);
const appUrl = new URL('../App.jsx', import.meta.url);
const publicProfileUrl = new URL('../components/PublicMediaProfilePage.jsx', import.meta.url);

test('entry point defers public-only pages and enhancement portals', async () => {
  const source = await readFile(mainUrl, 'utf8');

  assert.match(source, /const OwnerEnhancements = lazy\(\(\) => import\('\.\/components\/OwnerEnhancements\.jsx'\)\)/);
  assert.match(source, /const PublicNewsroomArticlePage = lazy\(\(\) => import\('\.\/components\/PublicNewsroomArticlePage\.jsx'\)\)/);
  assert.match(source, /const PublicMediaProfilePage = lazy\(\(\) => import\('\.\/components\/PublicMediaProfilePage\.jsx'\)\)/);
  assert.doesNotMatch(source, /import OwnerEnhancements from/);
  assert.doesNotMatch(source, /import PublicMediaProfilePage from/);
});

test('public media profile no longer pulls Newsroom and Podcast into the default bundle', async () => {
  const source = await readFile(publicProfileUrl, 'utf8');

  assert.match(source, /const GroundedNewsroom = lazy\(\(\) => import\('\.\/GroundedNewsroom'\)\)/);
  assert.match(source, /const PodcastStudio = lazy\(\(\) => import\('\.\/PodcastStudio'\)\)/);
  assert.doesNotMatch(source, /import GroundedNewsroom from/);
  assert.doesNotMatch(source, /import PodcastStudio from/);
  assert.match(source, /<Suspense fallback=/);
});

test('secondary career and recruiting screens load only when their routes need them', async () => {
  const source = await readFile(appUrl, 'utf8');

  ['CareerArchive', 'PlayerRecruitingWorkspace', 'HighSchoolEvaluationEditor', 'HighSchoolScreenshotUploader'].forEach((name) => {
    assert.match(source, new RegExp(`const ${name} = lazy\\(\\(\\) => import\\('\.\\/components\\/${name}'\\)\\);`));
    assert.doesNotMatch(source, new RegExp(`import ${name} from`));
  });
});
