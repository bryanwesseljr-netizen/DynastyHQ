import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../option-a-preview/PreviewApp.jsx', import.meta.url);
const cssUrl = new URL('../option-a-preview/preview.css', import.meta.url);

test('Podcast owner tools live in a top Studio drawer with real master-audio upload wiring', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /pod-network-actions/);
  assert.match(source, /OWNER STUDIO/);
  assert.match(source, /masterInputRef/);
  assert.match(source, /savePodcastAudioCloud\(/);
  assert.match(source, /writeHydratedCareerInTransaction\(/);
  assert.match(source, /REPLACE MASTER AUDIO/);
});

test('Podcast player exposes a seekable timeline tied to the loaded audio element', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /className="pod-audio-scrubber"/);
  assert.match(source, /type="range"/);
  assert.match(source, /audio\.currentTime=next/);
  assert.match(source, /onTimeUpdate=\{\(event\)=>setAudioCurrentTime/);
  assert.match(source, /formatPreviewClock\(audioCurrentTime\)/);
});

test('Career follower sharing publishes a compact read-only snapshot without replacing the master share document', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /buildFollowerSnapshot/);
  assert.match(source, /redesignFollower:buildFollowerSnapshot/);
  assert.match(source, /\{merge:true\}/);
  assert.match(source, /\?follow=/);
  assert.match(source, /READ-ONLY CAREER FOLLOW/);
  assert.match(source, /No owner controls or private editing data are exposed/);
});

test('Honors empty state is centered inside the full card instead of inheriting honor-row columns', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /\.career-honors>\.career-empty-copy/);
  assert.match(css, /grid-template-columns:1fr!important/);
  assert.match(css, /place-items:center!important/);
});
