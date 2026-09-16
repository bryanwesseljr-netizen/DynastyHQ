import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

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
