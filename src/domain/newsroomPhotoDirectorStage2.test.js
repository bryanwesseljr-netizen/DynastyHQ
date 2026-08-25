import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readSource = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

test('stage 2 keeps visual identity controls modular inside the existing newsroom locker', () => {
  const manager = readSource('../components/NewsroomMediaManager.jsx');
  assert.match(manager, /VisualPlayerProfileEditor/);
  assert.match(manager, /NewsroomReferenceRoleSelect/);
  assert.match(manager, /Career Photo Library &amp; AI References/);
});

test('visual profile editor persists durable appearance fields without invoking image generation', () => {
  const editor = readSource('../components/VisualPlayerProfileEditor.jsx');
  assert.match(editor, /player\.visualProfile/);
  assert.match(editor, /throwingHand/);
  assert.match(editor, /referenceAssetIds/);
  assert.match(editor, /Save Visual Profile/);
  assert.doesNotMatch(editor, /generateNewsroomImage|generate-newsroom-image/);
});

test('typed reference-role control changes metadata only and never approves a photo implicitly', () => {
  const selector = readSource('../components/NewsroomReferenceRoleSelect.jsx');
  assert.match(selector, /entry\.id !== asset\.id \|\| !entry\.isReference/);
  assert.match(selector, /referenceRole/);
  assert.doesNotMatch(selector, /isReference:\s*true/);
  assert.doesNotMatch(selector, /generateNewsroomImage|generate-newsroom-image/);
});
