import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { extractFirstJsonValue, parseJson } from '../server/textRouter.js';

const routerUrl = new URL('../server/textRouter.js', import.meta.url);

test('text generation is Gemini-first and keeps paid OpenAI fallback opt-in', async () => {
  const source = await readFile(routerUrl, 'utf8');

  assert.match(source, /GEMINI_TEXT_MODEL/);
  assert.match(source, /process\.env\.GEMINI_API_KEY/);
  assert.match(source, /responseMimeType: 'application\/json'/);
  assert.match(source, /return await callGeminiText/);
  assert.match(source, /allowPaidFallback = process\.env\.ALLOW_PAID_TEXT_FALLBACK === 'true'/);
  assert.match(source, /if \(allowPaidFallback\)/);
  assert.match(source, /return await callOpenAiText/);
  assert.match(source, /paidFallbackBlocked = true/);
});

test('text router asks both providers for structured JSON instead of prose scraping', async () => {
  const source = await readFile(routerUrl, 'utf8');

  assert.match(source, /Return ONLY valid JSON/);
  assert.match(source, /type: 'json_schema'/);
  assert.match(source, /strict: true/);
  assert.match(source, /parseJson\(extractGeminiText\(body\), 'Gemini'\)/);
  assert.match(source, /parseJson\(response\.output_text, 'OpenAI'\)/);
});

test('text router recovers the first complete JSON value when Gemini appends an extra fragment', () => {
  const raw = '{"title":"Week 2","segments":[{"text":"Opening"}]}\n{"duplicate":true}';
  assert.equal(extractFirstJsonValue(raw), '{"title":"Week 2","segments":[{"text":"Opening"}]}');
  assert.deepEqual(parseJson(raw, 'Gemini'), {
    title: 'Week 2',
    segments: [{ text: 'Opening' }],
  });
});

test('JSON recovery respects braces inside quoted strings', () => {
  const raw = '{"summary":"Oregon {still} has work to do","ok":true} trailing text';
  assert.deepEqual(parseJson(raw, 'Gemini'), {
    summary: 'Oregon {still} has work to do',
    ok: true,
  });
});
