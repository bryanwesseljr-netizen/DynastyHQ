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

test('Gemini 3.7 Flash is the primary newsroom writer in JSON mode', async () => {
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
      json: async () => ({
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
      }),
    };
  };

  try {
    const result = await generateEditorialJsonFreeFirst({
      schema: SIMPLE_SCHEMA,
      schemaName: 'test_newsroom',
      instructions: 'Write like a veteran college football beat writer.',
      userText: 'Write one grounded article from the supplied facts.',
      maxOutputTokens: 1000,
      temperature: 0.7,
    });

    assert.match(requestUrl, /gemini-3\.7-flash:generateContent/);
    assert.equal(requestBody.generationConfig.responseMimeType, 'application/json');
    assert.equal(requestBody.generationConfig.temperature, 0.7);
    assert.match(requestBody.systemInstruction.parts[0].text, /veteran college football beat writer/);
    assert.equal(result.usage.provider, 'google');
    assert.equal(result.usage.model, 'gemini-3.7-flash');
    assert.equal(result.usage.fallbackUsed, false);
    assert.equal(result.data.articles[0].invented, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
  }
});

test('invalid Gemini editorial structure is rejected when no fallback is configured', async () => {
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
    globalThis.fetch = originalFetch;
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
  }
});

test('newsroom endpoint is wired free-first with Terra retained only as fallback', () => {
  const newsroom = read('../../api/generate-newsroom.js');
  const router = read('../server/editorialTextRouter.js');

  assert.match(newsroom, /generateEditorialJsonFreeFirst/);
  assert.match(newsroom, /OPENAI_NEWSROOM_MODEL/);
  assert.match(newsroom, /temperature:\s*0\.7/);
  assert.match(newsroom, /provider:\s*generated\.usage\.provider/);
  assert.match(router, /gemini-3\.7-flash/);
  assert.match(router, /gpt-5\.6-terra/);
  assert.match(router, /responseMimeType:\s*'application\/json'/);
});

test('editorial comparison route is read-only and never applies generated career state', () => {
  const comparisonPage = read('../components/EditorialComparisonPage.jsx');
  const main = read('../main.jsx');

  assert.match(main, /editorialCompare/);
  assert.match(main, /EditorialComparisonPage/);
  assert.match(comparisonPage, /getDoc/);
  assert.match(comparisonPage, /generateNewsroomEdition/);
  assert.match(comparisonPage, /normalizeGeneratedNewsroomEdition/);
  assert.doesNotMatch(comparisonPage, /setDoc|runTransaction|updateDoc|applyGeneratedNewsroomEdition|updateAppState/);
  assert.match(comparisonPage, /No Firebase write, rewrite, publish, podcast invalidation, or career-state change occurs here/);
});
