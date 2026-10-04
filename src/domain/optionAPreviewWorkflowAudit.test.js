import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../option-a-preview/PreviewApp.jsx', import.meta.url);
const cssUrl = new URL('../option-a-preview/preview.css', import.meta.url);

test('NotebookLM source pack keeps one canonical stat copy, removes RTG material, and preserves the full transcript', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /NOTEBOOK_CANONICAL_GAME_KEYS/);
  assert.match(source, /notebookUniqueFacts/);
  assert.match(source, /notebookIsCanonicalStatDuplicate/);
  assert.match(source, /MY PLAYER STAT LINE/);
  assert.match(source, /TEAM STATS/);
  assert.match(source, /OTHER VERIFIED INDIVIDUAL \/ GAME CONTEXT/);
  assert.match(source, /SCORING SUMMARY/);
  assert.match(source, /FULL PODCAST TRANSCRIPT/);
  assert.match(source, /RTG status and development facts are intentionally excluded/);
  assert.match(source, /Structured game, team, and player statistics appear only once outside the full transcript/);
  assert.doesNotMatch(source, /'CURRENT RTG STATUS'/);
  assert.doesNotMatch(source, /'PLAYER DEVELOPMENT REFERENCES'/);
  assert.match(source, /DOWNLOAD NOTEBOOKLM SOURCE PACK/);
  assert.match(source, /DOWNLOAD SOURCE PACK/);
});

test('Transcript can be downloaded as well as printed', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /downloadTranscript/);
  assert.match(source, /DOWNLOAD TRANSCRIPT/);
  assert.match(source, /PRINT TRANSCRIPT/);
});

test('Game Hub material and development actions open live-data detail views instead of sample-only placeholders', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /setDetailOpen\('box'\)/);
  assert.match(source, /setDetailOpen\('ratings'\)/);
  assert.match(source, /setDetailOpen\('development'\)/);
  assert.match(source, /VIEW VERIFIED SOURCES/);
  assert.match(source, /CURRENT SAVED RTG STATUS/);
  assert.doesNotMatch(source, /Box score detail is sample-only/);
  assert.doesNotMatch(source, /Player ratings detail is sample-only/);
  assert.doesNotMatch(source, /Attribute-change details are sample-only/);
});

test('each Newsroom article can receive its own persistent owner photo without changing sibling stories', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /CHANGE THIS ARTICLE PHOTO/);
  assert.match(source, /Photo changes apply only to this article/);
  assert.match(source, /uploadNewsroomMedia\(/);
  assert.match(source, /assignNewsroomMedia\(\{/);
  assert.match(source, /articleId:target\.id/);
  assert.match(source, /newsroomMediaLibrary:\[\.\.\.\(remote\.newsroomMediaLibrary \|\| \[\]\),asset\]/);
  assert.match(source, /detectDestructiveCareerRegression\(remote,nextState\)/);
  assert.match(source, /writeHydratedCareerInTransaction\(/);
  assert.match(source, /Photo updated for this article only/);
});

test('EA Sports Network coverage has a dedicated optional upload lane and appears separately in Newsroom', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /scanOfficialArticleFiles/);
  assert.match(source, /UPLOAD EA ARTICLE/);
  assert.match(source, /ea_sports_network_article/);
  assert.match(source, /appendOfficialNetworkArticles/);
  assert.match(source, /officialStories=Array\.isArray\(news\.officialArticles\)/);
  assert.match(source, /OFFICIAL IN-GAME COVERAGE/);
  assert.match(source, /EA SPORTS NETWORK/);
  assert.match(source, /without mixing it into generated journalism/);
});

test('Podcast Studio expands into document flow so the page itself remains scrollable', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /pre-live media, source-pack and Studio cleanup/);
  assert.match(css, /\.pod-owner-drawer\{[\s\S]*position:relative;[\s\S]*max-height:none;[\s\S]*overflow:visible;[\s\S]*display:none;/);
  assert.match(css, /\.pod-owner-drawer\.open\{[\s\S]*display:block;/);
  assert.match(css, /\.pod-owner-drawer \.pod-studio-title\{[\s\S]*position:static;/);
});
