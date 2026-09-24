import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const newsroomUrl = new URL('../../api/generate-newsroom.js', import.meta.url);
const podcastUrl = new URL('../../api/generate-podcast.js', import.meta.url);
const routerUrl = new URL('../server/textRouter.js', import.meta.url);

test('Newsroom and Podcast use the shared Gemini-first text router', async () => {
  const [newsroom, podcast, router] = await Promise.all([
    readFile(newsroomUrl, 'utf8'),
    readFile(podcastUrl, 'utf8'),
    readFile(routerUrl, 'utf8'),
  ]);

  assert.match(newsroom, /import \{ generateTextFreeFirst \} from '\.\.\/src\/server\/textRouter\.js';/);
  assert.match(podcast, /import \{ generateTextFreeFirst \} from '\.\.\/src\/server\/textRouter\.js';/);
  assert.match(newsroom, /await generateTextFreeFirst\(/);
  assert.match(podcast, /generateTextFreeFirst\(/);
  assert.doesNotMatch(newsroom, /new OpenAI\(/);
  assert.doesNotMatch(podcast, /new OpenAI\(/);
  assert.match(router, /return await callGeminiText/);
  assert.match(router, /ALLOW_PAID_TEXT_FALLBACK === 'true'/);
});

test('media endpoints keep quota and provider failures out of reader-facing errors', async () => {
  const [newsroom, podcast] = await Promise.all([
    readFile(newsroomUrl, 'utf8'),
    readFile(podcastUrl, 'utf8'),
  ]);

  const publicNewsroomFailure = newsroom.match(/error: 'The newsroom edition could not be completed[^']*'/)?.[0] || '';
  const publicPodcastFailure = podcast.match(/error: 'The episode could not be generated[^']*'/)?.[0] || '';
  assert.ok(publicNewsroomFailure);
  assert.ok(publicPodcastFailure);
  assert.doesNotMatch(publicNewsroomFailure, /429|quota|credit|OpenAI|Gemini/i);
  assert.doesNotMatch(publicPodcastFailure, /429|quota|credit|OpenAI|Gemini/i);
});


test('newsroom API salvages valid QB1 assignments instead of rejecting the whole packet', async () => {
  const source = await readFile(new URL('../../api/generate-newsroom.js', import.meta.url), 'utf8');
  assert.match(source, /const usableFactIds = facts/);
  assert.match(source, /requestedFactIds\.length \? requestedFactIds : usableFactIds/);
  assert.match(source, /articleBriefs = \[\.\.\.byOutlet\.values\(\)\]/);
  assert.match(source, /articleBriefs = articleBriefs\.filter/);
  assert.match(source, /articleBriefs = articleBriefs\.slice\(0, coverageDecision\.articleCount\)/);
  assert.match(source, /The newsroom edition packet could not be validated/);
});
