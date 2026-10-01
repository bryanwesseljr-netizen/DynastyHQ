import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../option-a-preview/PreviewApp.jsx', import.meta.url);

test('NotebookLM source pack is downloadable and includes the saved transcript plus verified week context', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /notebookSourcePackText/);
  assert.match(source, /VERIFIED SOURCE FACTS/);
  assert.match(source, /FULL PODCAST TRANSCRIPT/);
  assert.match(source, /DOWNLOAD NOTEBOOKLM SOURCE PACK/);
  assert.match(source, /DOWNLOAD SOURCE PACK/);
});

test('Transcript can be downloaded as well as printed', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /downloadTranscript/);
  assert.match(source, /DOWNLOAD TRANSCRIPT/);
  assert.match(source, /PRINT TRANSCRIPT/);
});

test('Game Hub material and development actions open live-data detail views instead of sample-only placeholders', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /setDetailOpen\('box'\)/);
  assert.match(source, /setDetailOpen\('ratings'\)/);
  assert.match(source, /setDetailOpen\('development'\)/);
  assert.match(source, /VIEW VERIFIED SOURCES/);
  assert.match(source, /CURRENT SAVED RTG STATUS/);
  assert.doesNotMatch(source, /Box score detail is sample-only/);
  assert.doesNotMatch(source, /Player ratings detail is sample-only/);
  assert.doesNotMatch(source, /Attribute-change details are sample-only/);
});
