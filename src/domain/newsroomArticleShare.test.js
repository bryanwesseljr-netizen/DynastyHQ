import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNewsroomArticleShareId,
  buildNewsroomArticleShareUrl,
  buildSharedNewsroomArticlePayload,
  readSharedNewsroomArticleId,
} from './newsroomArticleShare.js';

test('article share id is deterministic and URL safe', () => {
  const id = buildNewsroomArticleShareId({
    ownerId: 'user/123',
    publicationId: 'season 1/week 4',
    articleId: 'story:national',
  });
  assert.equal(id, 'user%2F123--season%201%2Fweek%204--story%3Anational');
});

test('article share URL keeps only the standalone share target', () => {
  const url = buildNewsroomArticleShareUrl({
    baseUrl: 'https://cfbdynastyhq.vercel.app/?view=abc&frontPage=old',
    shareId: 'owner--week-4--story-2',
  });
  assert.equal(url, 'https://cfbdynastyhq.vercel.app/?sharedArticle=owner--week-4--story-2');
  assert.equal(readSharedNewsroomArticleId(new URL(url).search), 'owner--week-4--story-2');
});

test('shared article payload limits edition metadata and keeps the story', () => {
  const payload = buildSharedNewsroomArticlePayload({
    ownerId: 'owner-1',
    sharedAt: '2026-08-25T20:00:00.000Z',
    issue: {
      id: 'issue-1',
      publicationId: 'pub-1',
      season: 2,
      week: 7,
      label: 'Week 7',
      editionType: 'game',
      publishedAt: '2026-08-25T19:00:00.000Z',
      editorialGeneratedAt: '2026-08-25T19:01:00.000Z',
      articles: [{ id: 'other-story' }],
      workingNote: 'not part of public edition metadata',
    },
    story: {
      id: 'story-1',
      headline: 'Big Saturday',
      dek: 'A verified result becomes a story.',
      paragraphs: ['One.', 'Two.'],
    },
    featureImage: 'https://example.com/photo.jpg',
    currentMedia: {
      source: 'upload',
      disclosure: 'Career Photo Library',
      asset: { id: 'source-asset' },
    },
  });

  assert.equal(payload.story.id, 'story-1');
  assert.equal(payload.issue.articles, undefined);
  assert.equal(payload.issue.workingNote, undefined);
  assert.deepEqual(payload.currentMedia, {
    source: 'upload',
    disclosure: 'Career Photo Library',
  });
});
