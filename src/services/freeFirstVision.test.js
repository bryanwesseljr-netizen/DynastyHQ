import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  analyzeVisionFreeFirst,
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
        properties: { confidence: { type: 'number', minimum: 0, maximum: 1 } },
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

test('Gemini request uses JSON mode without provider-side schema enforcement', async () => {
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
        candidates: [{ content: { parts: [{ text: JSON.stringify({ screenType: 'known', facts: [{ confidence: 0.96 }], invented: 'blocked' }) }] } }],
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
    assert.equal(requestBody.generationConfig.responseMimeType, 'application/json');
    assert.equal(requestBody.generationConfig.responseJsonSchema, undefined);
    assert.equal(requestBody.generationConfig.responseSchema, undefined);
    assert.match(requestBody.contents[0].parts[0].text, /OUTPUT SHAPE/);
    assert.equal(result.analysis.invented, undefined);
    assert.equal(result.analysis.facts[0].confidence, 0.96);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
  }
});

test('app-side validation drops invalid enum values and out-of-range facts', async () => {
  const originalFetch = globalThis.fetch;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  delete process.env.OPENAI_API_KEY;

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        screenType: 'not-allowed',
        facts: [{ confidence: 1.5 }, { confidence: 0.95, extra: 'blocked' }],
      }) }] } }],
      usageMetadata: {},
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
    assert.equal(result.analysis.screenType, undefined);
    assert.deepEqual(result.analysis.facts, [{}, { confidence: 0.95 }]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
  }
});

test('a reviewable Gemini result survives while paid fallback remains blocked by default', async () => {
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
    assert.equal(result.usage.paidFallbackBlocked, true);
    assert.equal(result.usage.fallbackUnavailable, undefined);
    assert.equal(result.analysis.facts[0].confidence, 0.63);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
  }
});

test('free-first scanner wiring preserves specialized boundaries and exact Total Offense semantics', () => {
  const router = read('../server/visionRouter.js');
  const sharedApi = read('../../api/analyze-coverage-reference.js');
  const screenshotClient = read('./screenshotClient.js');
  const rtgClient = read('./rtgStatusScannerClient.js');
  const coverageClient = read('./coverageReferenceClient.js');

  assert.match(router, /gemini-3\.1-flash-lite/);
  assert.match(router, /gpt-5\.6-luna/);
  assert.match(router, /responseMimeType:\s*'application\/json'/);
  assert.doesNotMatch(router, /responseJsonSchema:/);
  assert.match(router, /sanitizeToSchema/);

  assert.match(screenshotClient, /player\?\.college/);
  assert.match(screenshotClient, /!uploadContext/);
  assert.match(screenshotClient, /analyze-coverage-reference/);
  assert.match(screenshotClient, /scanKind:\s*'game'/);
  assert.match(screenshotClient, /analyze-screenshot/);
  assert.match(rtgClient, /scanKind:\s*'rtg'/);
  assert.match(coverageClient, /scanKind:\s*'coverage'/);

  assert.match(sharedApi, /Total Offense/);
  assert.match(sharedApi, /They are NOT synonyms/);
  assert.match(sharedApi, /NEVER map the separate "Total Yards" row/);
  assert.match(sharedApi, /analyzeVisionFreeFirst/);
});
