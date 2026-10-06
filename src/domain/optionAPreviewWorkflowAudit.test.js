import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../option-a-preview/PreviewApp.jsx', import.meta.url);
const cssUrl = new URL('../option-a-preview/preview.css', import.meta.url);

test('NotebookLM Producer Pack 2.0 is producer-first, rich, de-duplicated and latest-game aware', async () => {
  const producerUrl = new URL('./notebookLmProducerPack.js', import.meta.url);
  const [source, producer] = await Promise.all([
    readFile(sourceUrl, 'utf8'),
    readFile(producerUrl, 'utf8'),
  ]);

  assert.match(source, /buildNotebookLmProducerPack/);
  assert.match(source, /latestNotebookGameSelection/);
  assert.match(source, /notebookUsesLatestFallback/);
  assert.match(source, /DOWNLOAD PRODUCER PACK/);
  assert.match(source, /DOWNLOAD WEEK \{notebookProducerPack\.meta\.week\} PRODUCER PACK/);
  assert.match(source, /COPY OPTIONAL DEEP DIVE FOCUS/);
  assert.match(source, /DOWNLOAD LATEST GAME/);

  assert.match(producer, /NOTEBOOKLM PRODUCER PACK 2\.0/);
  assert.match(producer, /PRODUCER BRIEF — READ THIS FIRST/);
  assert.match(producer, /KEY STORYLINES/);
  assert.match(producer, /TEAM COMPARISON/);
  assert.match(producer, /SCORING TIMELINE \/ DRIVE DETAILS/);
  assert.match(producer, /COMPLETE VERIFIED SCREENSHOT STAT TABLES/);
  assert.match(producer, /AUDIO PRIORITY MAP/);
  assert.match(producer, /GAME AT A GLANCE/);
  assert.match(producer, /SEASON CONTEXT/);
  assert.match(producer, /PREVIOUS GAME/);
  assert.match(producer, /RECENT COMPLETED GAMES/);
  assert.match(producer, /STYLE REFERENCE — DYNASTYHQ GENERATED TRANSCRIPT/);
  assert.match(producer, /SOURCE RULES — READ BEFORE GENERATING/);
  assert.doesNotMatch(producer, /RECOMMENDED NOTEBOOKLM CUSTOMIZE PROMPT/);
  assert.match(producer, /OPENING REQUIREMENT:/);
  assert.match(producer, /Deep Dive/);
  assert.match(producer, /Short length setting/);
  assert.match(producer, /Completion %/);
  assert.match(producer, /Road to Glory game mechanics/);
  assert.match(producer, /Every published screenshot statistic is available in the organized stat tables/);
  assert.match(producer, /prefer the game’s displayed completion percentage/);
  assert.match(producer, /Use passer rating only when it was actually uploaded/);
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
  assert.match(source, /ORIGINAL IN-GAME PUBLICATION/);
  assert.match(source, /EA SPORTS NETWORK/);
  assert.match(source, /auto-cropped and stitched/);
});

test('Podcast Studio expands into document flow, keeps the page scrollable, and returns to its anchor when closed', async () => {
  const [source, css] = await Promise.all([
    readFile(sourceUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
  ]);

  assert.match(css, /pre-live media, source-pack and Studio cleanup/);
  assert.match(css, /\.pod-owner-drawer\{[\s\S]*position:relative;[\s\S]*max-height:none;[\s\S]*overflow:visible;[\s\S]*display:none;/);
  assert.match(css, /\.pod-owner-drawer\.open\{[\s\S]*display:block;/);
  assert.match(css, /\.pod-owner-drawer \.pod-studio-title\{[\s\S]*position:sticky;/);
  assert.match(source, /const studioAnchorRef=useRef\(null\)/);
  assert.match(source, /const closeStudio=\(\)=>/);
  assert.match(source, /scrollIntoView\(\{behavior:'smooth',block:'start'\}\)/);
});


test('official in-game coverage preserves its screenshot and is surfaced across DynastyHQ', async () => {
  const [source, hook, producer, chronicle, api] = await Promise.all([
    readFile(new URL('../option-a-preview/PreviewApp.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../option-a-preview/useReadOnlyLiveCareer.js', import.meta.url), 'utf8'),
    readFile(new URL('./notebookLmProducerPack.js', import.meta.url), 'utf8'),
    readFile(new URL('./careerChronicle2.js', import.meta.url), 'utf8'),
    readFile(new URL('../../api/newsroom-media.js', import.meta.url), 'utf8'),
  ]);
  assert.match(source, /screenshotUrl/);
  assert.match(source, /ORIGINAL IN-GAME PUBLICATION/);
  assert.match(source, /stitchedScreenshotUrl/);
  assert.match(source, /EA SPORTS NETWORK/);
  assert.match(hook, /sourcePages/);
  assert.match(producer, /OFFICIAL IN-GAME MEDIA — EA SPORTS NETWORK/);
  assert.match(chronicle, /screenshotUrl/);
  assert.match(api, /const mediaNamespace = \(\) => 'dynasty-hq'/);
});


test('EA SPORTS official coverage supports multi-page auto-crop and seamless original article rendering', async () => {
  const [source,css,domain,scanner] = await Promise.all([
    readFile(new URL('../option-a-preview/PreviewApp.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../option-a-preview/preview.css', import.meta.url), 'utf8'),
    readFile(new URL('./officialCoverageCapture.js', import.meta.url), 'utf8'),
    readFile(new URL('../../api/analyze-coverage-reference.js', import.meta.url), 'utf8'),
  ]);
  assert.match(source,/mergeOfficialCoveragePages/);
  assert.match(source,/sourcePages/);
  assert.match(source,/pages auto-cropped and stitched/);
  assert.match(source,/stitchedScreenshotUrl/);
  assert.match(source,/stitchOfficialArticlePages/);
  assert.match(css,/Automatic EA article stitch/);
  assert.match(domain,/mergeTextWithOverlap/);
  assert.match(domain,/s4-w12-wisconsin-ea-network/);
  assert.match(scanner,/DynastyHQ stitches multiple uploaded pages after extraction/);
});
