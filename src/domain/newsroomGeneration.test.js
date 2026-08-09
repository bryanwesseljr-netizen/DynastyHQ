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
