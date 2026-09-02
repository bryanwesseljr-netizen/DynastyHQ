import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  analyzeVisionFreeFirst,
  toGeminiResponseSchema,
  visionAnalysisNeedsFallback,
} from '../server/visionRouter.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

const SIMPLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['screenType', 'facts'],
  properties: {
    screenType: { type: 'string', enum: ['known', 'unknown'] },
    facts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['confidence'],
        properties: { confidence: { type: 'number' } },
      },
    },
  },
};

test('confidence gate keeps clear Gemini scans and escalates uncertain ones', () => {
  assert.equal(visionAnalysisNeedsFallback({ screenType: 'known', facts: [{ confidence: 0.94 }, { confidence: 0.91 }] }), false);
  assert.equal(visionAnalysisNeedsFallback({ screenType: 'known', facts: [{ confidence: 0.61 }, { confidence: 0.67 }] }), true);
  assert.equal(visionAnalysisNeedsFallback({ screenType: 'unknown', facts: [] }), false);
  assert.equal(visionAnalysisNeedsFallback({ screenType: 'known', facts: [] }), true);
});

test('Gemini schema adapter removes additionalProperties recursively', () => {
  const adapted = toGeminiResponseSchema(SIMPLE_SCHEMA);
  const serialized = JSON.stringify(adapted);
  assert.doesNotMatch(serialized, /additionalProperties/);
  assert.deepEqual(adapted.required, ['screenType', 'facts']);
  assert.deepEqual(adapted.properties.facts.items.required, ['confidence']);
});

test('actual Gemini request body uses current responseFormat JSON structure', async () => {
  const originalFetch = globalThis.fetch;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  delete process.env.OPENAI_API_KEY;
  let requestBody = null;

  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ screenType: 'known', facts: [{ confidence: 0.96 }] }) }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 6, totalTokenCount: 16 },
      }),
    };
  };

  try {
    const result = await analyzeVisionFreeFirst({
      schema: SIMPLE_SCHEMA,
      schemaName: 'test_schema',
      instructions: 'Extract only visible facts.',
      userText: 'Analyze the test screenshot.',
      imageDataUrl: 'data:image/png;base64,AA==',
      maxOutputTokens: 100,
    });

    assert.equal(result.usage.provider, 'google');
    assert.equal(requestBody.generationConfig.responseFormat.text.mimeType, 'application/json');
    assert.doesNotMatch(JSON.stringify(requestBody.generationConfig.responseFormat.text.schema), /additionalProperties/);
    assert.equal(requestBody.generationConfig.responseMimeType, undefined);
    assert.equal(requestBody.generationConfig.responseSchema, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
  }
});

test('a reviewable Gemini result survives when OpenAI fallback is unavailable', async () => {
  const originalFetch = globalThis.fetch;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  delete process.env.OPENAI_API_KEY;

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ screenType: 'known', facts: [{ confidence: 0.63 }] }) }] } }],
      usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 8, totalTokenCount: 20 },
    }),
  });

  try {
    const result = await analyzeVisionFreeFirst({
      schema: SIMPLE_SCHEMA,
      schemaName: 'test_schema',
      instructions: 'Extract only visible facts.',
      userText: 'Analyze the test screenshot.',
      imageDataUrl: 'data:image/png;base64,AA==',
      maxOutputTokens: 100,
    });

    assert.equal(result.usage.provider, 'google');
    assert.equal(result.usage.reviewRecommended, true);
    assert.equal(result.usage.fallbackUnavailable, true);
    assert.equal(result.analysis.facts[0].confidence, 0.63);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
  }
});

test('free-first scanner wiring preserves specialized boundaries and total-offense semantics', () => {
  const router = read('../server/visionRouter.js');
  const sharedApi = read('../../api/analyze-coverage-reference.js');
  const screenshotClient = read('./screenshotClient.js');
  const rtgClient = read('./rtgStatusScannerClient.js');
  const coverageClient = read('./coverageReferenceClient.js');

  assert.match(router, /gemini-3\.1-flash-lite/);
  assert.match(router, /gpt-5\.6-luna/);
  assert.match(router, /responseFormat:/);
  assert.match(router, /mimeType:\s*'application\/json'/);
  assert.match(router, /schema:\s*toGeminiResponseSchema\(schema\)/);

  assert.match(screenshotClient, /player\?\.college/);
  assert.match(screenshotClient, /!uploadContext/);
  assert.match(screenshotClient, /analyze-coverage-reference/);
  assert.match(screenshotClient, /scanKind:\s*'game'/);
  assert.match(screenshotClient, /analyze-screenshot/);
  assert.match(rtgClient, /scanKind:\s*'rtg'/);
  assert.match(coverageClient, /scanKind:\s*'coverage'/);

  assert.match(sharedApi, /Total Offensive Yards/);
  assert.match(sharedApi, /return yards are excluded/i);
  assert.match(sharedApi, /analyzeVisionFreeFirst/);
});
