import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  analyzeVisionFreeFirst,
  visionAnalysisNeedsFallback,
} from '../../api/_visionRouter.js';

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
  const router = read('../../api/_visionRouter.js');
  const gameApi = read('../../api/analyze-college-game-free.js');
  const rtgApi = read('../../api/analyze-rtg-status-free.js');
  const coverageApi = read('../../api/analyze-coverage-reference-free.js');
  const screenshotClient = read('./screenshotClient.js');
  const rtgClient = read('./rtgStatusScannerClient.js');
  const coverageClient = read('./coverageReferenceClient.js');

  assert.match(router, /gemini-3\.1-flash-lite/);
  assert.match(router, /gpt-5\.6-luna/);
  assert.match(router, /responseMimeType:\s*'application\/json'/);
  assert.match(router, /responseSchema:\s*schema/);

  assert.match(screenshotClient, /player\?\.college/);
  assert.match(screenshotClient, /!uploadContext/);
  assert.match(screenshotClient, /analyze-college-game-free/);
  assert.match(screenshotClient, /analyze-screenshot/);
  assert.match(rtgClient, /analyze-rtg-status-free/);
  assert.match(coverageClient, /analyze-coverage-reference-free/);

  assert.match(gameApi, /Total Offensive Yards/);
  assert.match(gameApi, /return\/kickoff\/punt yards are excluded/i);
  assert.match(rtgApi, /analyzeVisionFreeFirst/);
  assert.match(coverageApi, /analyzeVisionFreeFirst/);
});
