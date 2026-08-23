import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { frameDifference, shouldKeepMenuFrame } from '../services/menuVideoFrames.js';

const quickImportSourceUrl = new URL('../components/QuickImportPortal.jsx', import.meta.url);
const mainSourceUrl = new URL('../main.jsx', import.meta.url);
const videoSourceUrl = new URL('../services/menuVideoFrames.js', import.meta.url);

test('menu-video frame selection keeps changed screens and periodically samples similar menus', () => {
  assert.equal(frameDifference([0, 0, 0], [0, 0, 0]), 0);
  assert.equal(frameDifference([0, 0], [255, 255]), 1);
  assert.equal(shouldKeepMenuFrame({ isFirst: true, difference: 0, secondsSinceLastKeep: 0 }), true);
  assert.equal(shouldKeepMenuFrame({ difference: 0.08, secondsSinceLastKeep: 0.5 }), true);
  assert.equal(shouldKeepMenuFrame({ difference: 0.01, secondsSinceLastKeep: 2.5 }), true);
  assert.equal(shouldKeepMenuFrame({ difference: 0.01, secondsSinceLastKeep: 1 }), false);
});

test('dashboard quick import keeps screenshots first-class and adds optional local menu-video extraction', async () => {
  const [source, mainSource, videoSource] = await Promise.all([
    readFile(quickImportSourceUrl, 'utf8'),
    readFile(mainSourceUrl, 'utf8'),
    readFile(videoSourceUrl, 'utf8'),
  ]);

  assert.match(mainSource, /import QuickImportPortal from '\.\/components\/QuickImportPortal\.jsx'/);
  assert.match(mainSource, /<QuickImportPortal \/>/);
  assert.match(source, /One or several · always supported/);
  assert.match(source, /Menu Video/);
  assert.match(source, /accept="image\/\*" multiple/);
  assert.match(source, /accept="video\/mp4,video\/quicktime,video\/x-m4v,video\/webm,video\/\*"/);
  assert.match(source, /extractMenuVideoFrames/);
  assert.match(source, /new DataTransfer\(\)/);
  assert.match(source, /choose weekly screenshots/i);
  assert.match(source, /dispatchEvent\(new Event\('change'/);
  assert.match(source, /Open guided high-school import/);
  assert.match(source, /The full video is not sent to the scanner/);
  assert.match(videoSource, /URL\.createObjectURL\(file\)/);
  assert.match(videoSource, /URL\.revokeObjectURL\(objectUrl\)/);
  assert.match(videoSource, /maxDurationSeconds = 120/);
  assert.match(videoSource, /maxFrames = 14/);
});
