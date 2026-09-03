import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  generateEditorialJsonFreeFirst,
  sanitizeToSchema,
  satisfiesSchemaShape,
} from '../server/editorialTextRouter.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

const SIMPLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['articles'],
  properties: {
    articles: {
      type: 'array',
      minItems: 1,
      maxItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['outletId', 'headline', 'paragraphs'],
        properties: {
          outletId: { type: 'string', enum: ['local'] },
          headline: { type: 'string', maxLength: 75 },
          paragraphs: { type: 'array', minItems: 2, maxItems: 3, items: { type: 'string' } },
        },
      },
    },
  },
};

const validEditorialPayload = () => ({
  candidates: [{
    content: {
      parts: [{
        text: JSON.stringify({
          articles: [{
            outletId: 'local',
            headline: 'Bearcats Turn One Possession Into a Statement',
            paragraphs: ['The game turned on one possession.', 'Cincinnati carried that edge through the finish.'],
            invented: 'blocked',
          }],
        }),
      }],
    },
  }],
  usageMetadata: { promptTokenCount: 40, candidatesTokenCount: 30, totalTokenCount: 70 },
});

const restoreEnv = ({ originalFetch, originalGeminiKey, originalOpenAiKey }) => {
  globalThis.fetch = originalFetch;
  if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalGeminiKey;
  if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAiKey;
};

test('editorial schema sanitizer strips invented keys and preserves required structure', () => {
  const sanitized = sanitizeToSchema({
    articles: [{
      outletId: 'local',
      headline: 'Cincinnati Finds Its Edge in the Fourth Quarter',
      paragraphs: ['First paragraph.', 'Second paragraph.'],
      invented: 'blocked',
    }],
    extra: true,
  }, SIMPLE_SCHEMA);

  assert.equal(sanitized.extra, undefined);
  assert.equal(sanitized.articles[0].invented, undefined);
  assert.equal(satisfiesSchemaShape(sanitized, SIMPLE_SCHEMA), true);
});

test('Gemini 3.7 Flash is the primary newsroom writer in JSON mode with low thinking and natural player-reference guidance', async () => {
  const originalFetch = globalThis.fetch;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  delete process.env.OPENAI_API_KEY;
  let requestUrl = '';
  let requestBody = null;

  globalThis.fetch = async (url, init) => {
    requestUrl = String(url);
    requestBody = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      json: async () => validEditorialPayload(),
    };
  };

  try {
    const result = await generateEditorialJsonFreeFirst({
      schema: SIMPLE_SCHEMA,
      schemaName: 'test_newsroom',
      instructions: 'Write like a veteran college football beat writer.',
      userText: 'Write one grounded article from the supplied facts.',
      maxOutputTokens: 1000,
    });

    const systemText = requestBody.systemInstruction.parts[0].text;
    assert.match(requestUrl, /gemini-3\.7-flash:generateContent/);
    assert.equal(requestBody.generationConfig.responseMimeType, 'application/json');
    assert.equal(requestBody.generationConfig.thinkingConfig.thinkingLevel, 'low');
    assert.equal(requestBody.generationConfig.temperature, undefined);
    assert.match(systemText, /veteran college football beat writer/);
    assert.match(systemText, /PLAYER REFERENCE VARIETY/);
    assert.match(systemText, /Cincinnati's signal-caller, Jones/);
    assert.match(systemText, /Hawaii's running back/);
    assert.match(systemText, /Cincy's quarterback/);
    assert.match(systemText, /Class-year phrases/);
    assert.match(systemText, /Do not infer position from a stat category alone/);
    assert.equal(result.usage.provider, 'google');
    assert.equal(result.usage.model, 'gemini-3.7-flash');
    assert.equal(result.usage.fallbackUsed, false);
    assert.equal(result.usage.freeFallbackUsed, false);
    assert.equal(result.data.articles[0].invented, undefined);
  } finally {
    restoreEnv({ originalFetch, originalGeminiKey, originalOpenAiKey });
  }
});

test('a fast 3.7 capacity failure immediately starts Gemini 3.6 without waiting for a paid fallback', async () => {
  const originalFetch = globalThis.fetch;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  delete process.env.OPENAI_API_KEY;
  const urls = [];

  globalThis.fetch = async (url) => {
    urls.push(String(url));
    if (urls.length === 1) {
      return {
        ok: false,
        status: 503,
        json: async () => ({ error: { status: 'UNAVAILABLE', message: 'This model is currently experiencing high demand.' } }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => validEditorialPayload(),
    };
  };

  try {
    const result = await generateEditorialJsonFreeFirst({
      schema: SIMPLE_SCHEMA,
      schemaName: 'test_newsroom',
      instructions: 'Write the article.',
      userText: 'Test.',
      maxOutputTokens: 1000,
    });

    assert.equal(urls.length, 2);
    assert.match(urls[0], /gemini-3\.7-flash:generateContent/);
    assert.match(urls[1], /gemini-3\.6-flash:generateContent/);
    assert.equal(result.usage.provider, 'google');
    assert.equal(result.usage.model, 'gemini-3.6-flash');
    assert.equal(result.usage.fallbackUsed, false);
    assert.equal(result.usage.freeFallbackUsed, true);
    assert.equal(result.usage.freeFallbackReason, 'UNAVAILABLE');
  } finally {
    restoreEnv({ originalFetch, originalGeminiKey, originalOpenAiKey });
  }
});

test('free editorial routing reaches low-latency Gemini 3.5 Flash-Lite reserve before OpenAI', async () => {
  const originalFetch = globalThis.fetch;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  delete process.env.OPENAI_API_KEY;
  const urls = [];
  const bodies = [];

  globalThis.fetch = async (url, init) => {
    urls.push(String(url));
    bodies.push(JSON.parse(init.body));
    if (urls.length <= 2) {
      return {
        ok: false,
        status: 503,
        json: async () => ({ error: { status: 'UNAVAILABLE', message: 'This model is currently experiencing high demand.' } }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => validEditorialPayload(),
    };
  };

  try {
    const result = await generateEditorialJsonFreeFirst({
      schema: SIMPLE_SCHEMA,
      schemaName: 'test_newsroom',
      instructions: 'Write the article.',
      userText: 'Test reserve routing.',
      maxOutputTokens: 1000,
    });

    assert.equal(urls.length, 3);
    assert.match(urls[0], /gemini-3\.7-flash:generateContent/);
    assert.match(urls[1], /gemini-3\.6-flash:generateContent/);
    assert.match(urls[2], /gemini-3\.5-flash-lite:generateContent/);
    assert.equal(bodies[2].generationConfig.thinkingConfig.thinkingLevel, 'minimal');
    assert.equal(result.usage.provider, 'google');
    assert.equal(result.usage.model, 'gemini-3.5-flash-lite');
    assert.equal(result.usage.fallbackUsed, false);
    assert.equal(result.usage.freeFallbackUsed, true);
  } finally {
    restoreEnv({ originalFetch, originalGeminiKey, originalOpenAiKey });
  }
});

test('invalid Gemini editorial structure is rejected when no paid fallback is configured', async () => {
  const originalFetch = globalThis.fetch;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  delete process.env.OPENAI_API_KEY;

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ articles: [] }) }] } }],
      usageMetadata: {},
    }),
  });

  try {
    await assert.rejects(
      generateEditorialJsonFreeFirst({
        schema: SIMPLE_SCHEMA,
        schemaName: 'test_newsroom',
        instructions: 'Write the article.',
        userText: 'Test.',
      }),
      (error) => error?.code === 'GEMINI_SCHEMA_MISMATCH',
    );
  } finally {
    restoreEnv({ originalFetch, originalGeminiKey, originalOpenAiKey });
  }
});

test('newsroom endpoint is wired free-first with Terra retained only as fallback', () => {
  const newsroom = read('../../api/generate-newsroom.js');
  const router = read('../server/editorialTextRouter.js');

  assert.match(newsroom, /generateEditorialJsonFreeFirst/);
  assert.match(newsroom, /OPENAI_NEWSROOM_MODEL/);
  assert.match(newsroom, /temperature:\s*0\.7/);
  assert.match(newsroom, /provider:\s*generated\.usage\.provider/);
  assert.match(newsroom, /NATURAL TRACKED-PLAYER REFERENCES/);
  assert.match(newsroom, /historical for this publication/);
  assert.match(newsroom, /Texas native/);
  assert.match(router, /gemini-3\.7-flash/);
  assert.match(router, /gemini-3\.6-flash/);
  assert.match(router, /gemini-3\.5-flash-lite/);
  assert.match(router, /gpt-5\.6-terra/);
  assert.match(router, /PLAYER REFERENCE VARIETY/);
  assert.match(router, /Cincinnati's signal-caller/);
  assert.match(router, /Hawaii's running back/);
  assert.match(router, /Cincy's quarterback/);
  assert.match(router, /AbortController/);
  assert.match(router, /FALLBACK_HEDGE_DELAY_MS/);
  assert.match(router, /RESERVE_HEDGE_DELAY_MS/);
  assert.match(router, /runHedgedGeminiEditorial/);
  assert.match(router, /thinkingLevel:\s*'low'/);
  assert.match(router, /thinkingLevel:\s*'minimal'/);
  assert.match(router, /responseMimeType:\s*'application\/json'/);
});

test('podcast endpoint is Gemini-first, keeps quality gates, and pays only after free repair', () => {
  const podcast = read('../../api/generate-podcast.js');
  const router = read('../server/editorialTextRouter.js');

  assert.doesNotMatch(podcast, /import OpenAI from 'openai'/);
  assert.match(podcast, /generateEditorialJsonFreeFirst/);
  assert.match(podcast, /generateEditorialJsonPaidFallback/);
  assert.match(podcast, /PODCAST_QUALITY_GATE/);
  assert.match(podcast, /freeRepair/);
  assert.match(podcast, /NATURAL TRACKED-PLAYER REFERENCES/);
  assert.match(podcast, /role saved for this episode's historical week/);
  assert.match(podcast, /Texas native/);
  assert.match(podcast, /applyPodcastShowBookends/);
  assert.match(podcast, /provider:\s*generated\.usage\.provider/);
  assert.match(router, /every named player/i);
  assert.match(router, /playmaker at wide receiver/);
  assert.match(router, /senior running back/);
  assert.match(router, /full name on the first natural identification/);
  assert.match(router, /initial-plus-surname once/);
  assert.match(router, /export const generateEditorialJsonPaidFallback/);
});

test('editorial comparison route is read-only for newsroom and podcast', () => {
  const comparisonPage = read('../components/EditorialComparisonPage.jsx');
  const main = read('../main.jsx');

  assert.match(main, /editorialCompare/);
  assert.match(main, /EditorialComparisonPage/);
  assert.match(comparisonPage, /getDoc/);
  assert.match(comparisonPage, /generateNewsroomEdition/);
  assert.match(comparisonPage, /normalizeGeneratedNewsroomEdition/);
  assert.match(comparisonPage, /generatePodcastScript/);
  assert.match(comparisonPage, /prepareAudio:\s*false/);
  assert.match(comparisonPage, /normalizeGeneratedPodcast/);
  assert.doesNotMatch(comparisonPage, /setDoc|runTransaction|updateDoc|applyGeneratedNewsroomEdition|updateAppState|upsertPodcastEpisode/);
  assert.match(comparisonPage, /No Firebase write, rewrite, publish, podcast invalidation, audio generation, or career-state change occurs here/);
});
