import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('high-school, recruiting and guided screenshot scans use Gemini first with Luna fallback', () => {
  const client = read('../services/screenshotClient.js');
  const endpoint = read('../../api/analyze-screenshot.js');

  assert.match(client, /\/api\/analyze-screenshot/);
  assert.doesNotMatch(client, /analyze-screenshot-free-first/);
  assert.match(client, /recordAiScanUsage\(useFreeCollegeScanner \? 'game-data' : 'general-data'/);
  assert.match(endpoint, /analyzeVisionFreeFirst/);
  assert.match(endpoint, /GEMINI_API_KEY/);
  assert.match(endpoint, /OPENAI_API_KEY/);
  assert.doesNotMatch(endpoint, /new OpenAI\(/);
});
