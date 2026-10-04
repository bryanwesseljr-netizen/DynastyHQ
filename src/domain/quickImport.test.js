import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { frameDifference, shouldKeepMenuFrame } from '../services/menuVideoFrames.js';

const quickImportSourceUrl = new URL('../components/QuickImportPortal.jsx', import.meta.url);
const mainSourceUrl = new URL('../main.jsx', import.meta.url);
const previewSourceUrl = new URL('../option-a-preview/PreviewApp.jsx', import.meta.url);
const videoSourceUrl = new URL('../services/menuVideoFrames.js', import.meta.url);

test('menu-video frame selection keeps changed screens and periodically samples similar menus', () => {
  assert.equal(frameDifference([0, 0, 0], [0, 0, 0]), 0);
  assert.equal(frameDifference([0, 0], [255, 255]), 1);
  assert.equal(shouldKeepMenuFrame({ isFirst: true, difference: 0, secondsSinceLastKeep: 0 }), true);
  assert.equal(shouldKeepMenuFrame({ difference: 0.08, secondsSinceLastKeep: 0.5 }), true);
  assert.equal(shouldKeepMenuFrame({ difference: 0.01, secondsSinceLastKeep: 2.5 }), true);
  assert.equal(shouldKeepMenuFrame({ difference: 0.01, secondsSinceLastKeep: 1 }), false);
});

test('redesign owner flow keeps screenshots first-class while the preserved legacy importer still supports local menu-video extraction', async () => {
  const [legacySource, mainSource, previewSource, videoSource] = await Promise.all([
    readFile(quickImportSourceUrl, 'utf8'),
    readFile(mainSourceUrl, 'utf8'),
    readFile(previewSourceUrl, 'utf8'),
    readFile(videoSourceUrl, 'utf8'),
  ]);

  assert.match(mainSource, /const PreviewApp = lazy\(\(\) => import\('\.\/option-a-preview\/PreviewApp\.jsx'\)\)/);
  assert.match(mainSource, /<PreviewApp \/>/);
  assert.match(previewSource, /REAL SCANNERS · DRAFT UNTIL CONFIRMED/);
  assert.match(previewSource, /SCAN GAME DATA/);
  assert.match(previewSource, /analyzeScreenshot\(\{/);
  assert.match(previewSource, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(legacySource, /Menu Video/);
  assert.match(legacySource, /extractMenuVideoFrames/);
  assert.match(legacySource, /The full video is not sent to the scanner/);
  assert.match(videoSource, /URL\.createObjectURL\(file\)/);
  assert.match(videoSource, /URL\.revokeObjectURL\(objectUrl\)/);
  assert.match(videoSource, /maxDurationSeconds = 120/);
  assert.match(videoSource, /maxFrames = 14/);
});
