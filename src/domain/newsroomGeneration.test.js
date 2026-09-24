import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  applyGeneratedNewsroomEdition,
  buildNewsroomGenerationPayload,
  normalizeGeneratedNewsroomEdition,
} from './newsroomGeneration.js';

const publicationId = 'season-1-preseason-recruiting-1';
const state = {
  player: { name: 'Bryan Wessel', school: 'Edsel Ford Thunderbirds', pos: 'QB', number: '2', archetype: 'Dual-Threat' },
  weeklyUpdates: [{ id: publicationId, publicationId }],
  factLedger: [
    { publicationId, verified: true, key: 'profile.player.name', label: 'Player', value: 'Bryan Wessel' },
    { publicationId, verified: true, key: 'recruiting.eastern.preferenceRank', label: 'Eastern Michigan preference rank', value: 1 },
    { publicationId, verified: true, key: 'recruiting.western.preferenceRank', label: 'Western Michigan preference rank', value: 2 },
  ],
  newsroomIssues: [{
    id: publicationId,
    publicationId,
    season: 1,
    week: 0,
    label: 'Preseason recruiting',
    editionType: 'recruiting',
    careerPhase: 'Player',
    articles: [{
      id: 'recruiting', outletId: 'recruiting', outletName: 'The Recruiting Wire',
      desk: 'Recruiting Desk', theme: 'on3', headline: 'Old template', dek: 'Old summary',
      paragraphs: ['Old body'], mediaAssetId: 'photo-1',
      citedFactKeys: ['profile.player.name', 'recruiting.eastern.preferenceRank', 'recruiting.western.preferenceRank'],
    }],
  }],
};

const paragraph = 'The early list puts a clear regional shape around the recruitment, creating real choices without pretending a personal preference is the same thing as an offer. The next evaluation now carries more weight because every new result can change the conversation around fit, opportunity, and momentum.';

test('builds a recruiting-writer brief from current published facts', () => {
  const payload = buildNewsroomGenerationPayload(state, publicationId);
  assert.equal(payload.articleBriefs.length, 1);
  assert.equal(payload.articleBriefs[0].outletId, 'recruiting');
  assert.match(payload.articleBriefs[0].byline, /Marcus Grant/);
  assert.match(payload.articleBriefs[0].purpose, /recruiting story/i);
  assert.equal(payload.articleBriefs[0].focusFactIds.length, 3);
  assert.ok(payload.facts.every((fact) => !fact.id.startsWith('undefined')));
});

test('merges generated editorial copy while preserving article identity and media', () => {
  const payload = buildNewsroomGenerationPayload(state, publicationId);
  const generated = {
    articles: [{
      outletId: 'recruiting',
      kicker: 'Recruiting Notebook',
      headline: 'Michigan trio sets the pace in Wessel’s opening Top 10',
      dek: 'The first list establishes a regional race before the five-game evaluation begins.',
      dateline: '',
      paragraphs: [paragraph, paragraph, paragraph, paragraph, paragraph],
      sectionHeadings: ['A regional opening', 'The evaluation ahead'],
      pullQuote: 'The opening list creates a regional race with five evaluation games still able to reshape it.',
      sidebars: [
        { title: 'Recruiting snapshot', items: ['Eastern Michigan is first in the personal preference order.', 'Western Michigan is second.'] },
        { title: 'What comes next', items: ['Five evaluation games remain.', 'Future results can change the conversation.'] },
      ],
      citedFactIds: payload.articleBriefs[0].focusFactIds,
    }],
  };
  const edition = normalizeGeneratedNewsroomEdition({ generated, payload, model: 'test-model', generatedAt: '2026-08-09T12:00:00.000Z' });
  const next = applyGeneratedNewsroomEdition(state, publicationId, edition);
  const story = next.newsroomIssues[0].articles[0];
  assert.equal(next.newsroomIssues[0].editorialStatus, 'generated');
  assert.equal(story.mediaAssetId, 'photo-1');
  assert.match(story.headline, /Michigan trio/);
  assert.match(story.byline, /Marcus Grant/);
  assert.equal(story.sectionHeadings.length, 2);
  assert.equal(story.sidebars[0].title, 'Recruiting snapshot');
  assert.match(story.pullQuote, /regional race/);
  assert.equal(story.citedFactKeys.includes('recruiting.eastern.preferenceRank'), true);
  assert.equal(story.editorialStatus, 'generated');
});

test('reader keeps internal source keys out of the public article layout', async () => {
  const [source, reader, styles] = await Promise.all([
    readFile(new URL('../components/GroundedNewsroom.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/NewsroomArticleReader.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../index.css', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(source, /Source ledger/i);
  assert.doesNotMatch(source, /citedFactKeys\.map/);
  assert.match(source, /DynastyHQ Press Room/);
  assert.match(source, /Rewrite edition/);
  assert.match(source, /Manage this article/);
  assert.match(reader, /data-editorial-layout/);
  assert.match(reader, /data-headline-size/);
  assert.match(reader, /Why it matters/);
  assert.match(reader, /Article context/);
  assert.match(styles, /data-editorial-layout="insider"/);
  assert.match(styles, /data-editorial-layout="analysis"/);
  assert.match(styles, /data-editorial-layout="network"/);
  assert.match(styles, /data-headline-size="long"/);
  assert.doesNotMatch(styles, /dhq-news-intro h1[\s\S]{0,400}text-transform: uppercase/);
});

test('newsroom writer requires concise digital headlines', async () => {
  const source = await readFile(new URL('../../api/generate-newsroom.js', import.meta.url), 'utf8');
  assert.match(source, /headline of 5 to 10 words/i);
  assert.match(source, /no more than 75 characters/i);
  assert.match(source, /headline: \{ type: 'string', maxLength: 90 \}/);
});


test('accepts a concise QA-passed dynamic edition instead of falling back to deterministic scaffold copy', () => {
  const payload = buildNewsroomGenerationPayload(state, publicationId);
  const conciseParagraph = 'The opening preference list gives the recruitment a clear shape, with regional options established before the evaluation games begin and enough room for performance to change the order as the process develops.';
  const generated = {
    articles: [{
      outletId: 'recruiting',
      storyImportance: 'routine',
      storyFormat: 'recruiting-intel',
      kicker: 'Recruiting Notebook',
      headline: 'Regional options frame Wessel’s opening board',
      dek: 'The first list creates a real race before the evaluation begins.',
      dateline: '',
      paragraphs: [conciseParagraph, conciseParagraph, conciseParagraph, conciseParagraph],
      sectionHeadings: ['The early shape'],
      pullQuote: 'The board is established, but the evaluation still has room to move it.',
      sidebars: [{ title: 'Recruiting snapshot', items: ['Eastern Michigan is first in the personal preference order.'] }],
      citedFactIds: payload.articleBriefs[0].focusFactIds,
    }],
  };
  const edition = normalizeGeneratedNewsroomEdition({ generated, payload, model: 'gemini-test' });
  assert.equal(edition.articles.length, 1);
  assert.match(edition.articles[0].headline, /Regional options/);
});

test('newsroom API repairs tracker-like prose before returning a final edition', async () => {
  const source = await readFile(new URL('../../api/generate-newsroom.js', import.meta.url), 'utf8');
  assert.match(source, /numbers saved after the game/i);
  assert.match(source, /failed editorial QA/i);
  assert.match(source, /Rewrite the ENTIRE edition/i);
  assert.match(source, /reader-facing meta voice/i);
});

test('deterministic weekly newsroom copy is explicitly marked as scaffold', async () => {
  const source = await readFile(new URL('./newsroomEngine.js', import.meta.url), 'utf8');
  assert.match(source, /editorialStatus: 'scaffold'/);
});


test('accepts a server-QA-passed concise edition instead of silently keeping the scaffold', () => {
  const payload = buildNewsroomGenerationPayload(state, publicationId);
  const shortParagraph = 'The verified development changes the immediate football picture.';
  const generated = {
    articles: [{
      outletId: 'recruiting',
      storyImportance: 'notable',
      storyFormat: 'news',
      kicker: 'Recruiting Notebook',
      headline: 'Verified development reshapes the week',
      dek: 'A concise update built from the published facts.',
      dateline: '',
      paragraphs: [shortParagraph, shortParagraph, shortParagraph, shortParagraph],
      sectionHeadings: [],
      pullQuote: '',
      sidebars: [],
      citedFactIds: [],
    }],
  };
  const edition = normalizeGeneratedNewsroomEdition({ generated, payload, model: 'gemini-test' });
  assert.equal(edition.articles.length, 1);
  assert.equal(edition.articles[0].sectionHeadings[0], 'Why it matters');
  assert.equal(edition.articles[0].sidebars[0].title, 'At a glance');
  assert.ok(edition.articles[0].citedFactKeys.length > 0);
});


test('Newsroom generation commits the generated edition atomically against the latest cloud save', async () => {
  const source = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');
  const handlerStart = source.indexOf('const handleGenerateNewsroomEdition = useCallback');
  const handlerEnd = source.indexOf('const handleAssignNewsroomMedia', handlerStart);
  const handler = source.slice(handlerStart, handlerEnd);
  assert.match(handler, /await runTransaction\(db/);
  assert.match(handler, /const remoteState = migrateCareerState\(remoteSnapshot\.data\(\), defaultState\)/);
  assert.match(handler, /applyGeneratedNewsroomEdition\(remoteState, publicationId, edition\)/);
  assert.match(handler, /savedIssue\?\.editorialStatus !== 'generated'/);
  assert.match(handler, /transaction\.set\(docRef, committedState\)/);
  assert.match(handler, /setAppState\(committedState\)/);
  assert.match(handler, /Newsroom edition saved:/);
  assert.doesNotMatch(handler, /updateAppState\(/);
});


test('normalized generated newsroom articles never introduce undefined Firestore fields', () => {
  const payload = buildNewsroomGenerationPayload(state, publicationId);
  payload.articleBriefs[0] = {
    ...payload.articleBriefs[0],
    outletName: '',
    desk: undefined,
    theme: undefined,
    storyType: undefined,
    audience: undefined,
    audienceReach: undefined,
    subjectPriority: undefined,
    playerMentionPolicy: undefined,
    coverageTier: undefined,
  };
  const generated = {
    articles: [{
      outletId: 'recruiting',
      storyImportance: 'notable',
      storyFormat: 'news',
      kicker: '',
      headline: 'A verified development changes the week',
      dek: 'The published facts support a fresh story.',
      dateline: '',
      paragraphs: [paragraph, paragraph, paragraph, paragraph],
      sectionHeadings: ['Why it matters'],
      pullQuote: '',
      sidebars: [{ title: 'At a glance', items: ['Verified context'] }],
      citedFactIds: payload.articleBriefs[0].focusFactIds,
    }],
  };
  const edition = normalizeGeneratedNewsroomEdition({ generated, payload, model: 'gemini-test' });
  const findUndefined = (value) => {
    if (Array.isArray(value)) return value.some(findUndefined);
    if (value && typeof value === 'object') {
      return Object.values(value).some((entry) => entry === undefined || findUndefined(entry));
    }
    return false;
  };
  assert.equal(findUndefined(edition.articles[0]), false);
  assert.equal(edition.articles[0].outletName, 'DynastyHQ Sports');
});

test('atomic newsroom save strips undefined values before Transaction.set', async () => {
  const source = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');
  assert.match(source, /const stripUndefinedDeep = \(value\) =>/);
  const handlerStart = source.indexOf('const handleGenerateNewsroomEdition = useCallback');
  const handlerEnd = source.indexOf('const handleAssignNewsroomMedia', handlerStart);
  const handler = source.slice(handlerStart, handlerEnd);
  assert.match(handler, /committedState = stripUndefinedDeep\(/);
  assert.match(handler, /transaction\.set\(docRef, committedState\)/);
});


test('rewriting a newsroom edition never clears an existing podcast transcript or audio state', () => {
  const payload = buildNewsroomGenerationPayload(state, publicationId);
  const generated = {
    articles: [{
      outletId: 'recruiting',
      storyImportance: 'notable',
      storyFormat: 'recruiting-intel',
      kicker: 'Recruiting Notebook',
      headline: 'Fresh newsroom copy',
      dek: 'The article is rewritten without touching the podcast.',
      dateline: '',
      paragraphs: [paragraph, paragraph, paragraph, paragraph],
      sectionHeadings: ['Why it matters'],
      pullQuote: '',
      sidebars: [{ title: 'At a glance', items: ['Verified context'] }],
      citedFactIds: payload.articleBriefs[0].focusFactIds,
    }],
  };
  const edition = normalizeGeneratedNewsroomEdition({ generated, payload, model: 'test-model' });
  const podcastEpisode = {
    id: `podcast-${publicationId}`,
    publicationId,
    status: 'published',
    audioStatus: 'ready',
    segments: Array.from({ length: 8 }, (_, index) => ({ hostId: index % 2 ? 'sarah' : 'mark', text: `Segment ${index}` })),
    chapters: [{ title: 'Opening', startSegment: 0 }],
    citedFactKeys: ['profile.player.name'],
  };
  const withPodcast = { ...state, podcastEpisodes: [podcastEpisode] };
  const next = applyGeneratedNewsroomEdition(withPodcast, publicationId, edition);
  assert.deepEqual(next.podcastEpisodes, [podcastEpisode]);
});

test('free text router removes retired Gemini fallback and retries invalid structured JSON', async () => {
  const source = await readFile(new URL('../server/textRouter.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /gemini-2\.5-flash-lite/);
  assert.match(source, /const maxAttempts = 2/);
  assert.match(source, /invalid JSON/i);
  assert.match(source, /attempt: attemptNumber/);
});


test('Newsroom generation is serialized with normal cloud saves so stale queued state cannot restore scaffold copy', async () => {
  const source = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');
  const handlerStart = source.indexOf('const handleGenerateNewsroomEdition = useCallback');
  const handlerEnd = source.indexOf('const handleAssignNewsroomMedia', handlerStart);
  const handler = source.slice(handlerStart, handlerEnd);
  assert.match(handler, /const persistGeneratedEdition = async \(\) => runTransaction/);
  assert.match(handler, /cloudWriteQueueRef\.current = cloudWriteQueueRef\.current\.then/);
  assert.match(handler, /await cloudWriteQueueRef\.current/);
  assert.match(handler, /savedIssue\?\.editorialGeneratedAt !== edition\.generatedAt/);
  assert.match(handler, /savedHeadline !== generatedHeadline/);
  assert.match(handler, /setNewsroomFocusId\(publicationId\)/);
});

test('Newsroom API logs the generated headlines so background generation can be distinguished from display/save problems', async () => {
  const source = await readFile(new URL('../../api/generate-newsroom.js', import.meta.url), 'utf8');
  assert.match(source, /Newsroom edition generated/);
  assert.match(source, /headlines:/);
  assert.match(source, /publicationId: payload\.publicationId/);
});
