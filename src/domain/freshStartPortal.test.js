import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const portalUrl = new URL('../components/FreshStartPortal.jsx', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const defaultsUrl = new URL('./defaultCareerState.js', import.meta.url);

test('fresh start is mounted and replaces the legacy factory-reset click path', async () => {
  const [portal, owner] = await Promise.all([
    readFile(portalUrl, 'utf8'),
    readFile(ownerUrl, 'utf8'),
  ]);

  assert.match(owner, /import FreshStartPortal from '\.\/FreshStartPortal\.jsx';/);
  assert.match(owner, /<FreshStartPortal \/>/);
  assert.match(portal, /factory reset database\|start new rtg career/i);
  assert.match(portal, /event\.stopImmediatePropagation\?\.\(\)/);
  assert.match(portal, /FRESH START/);
});

test('fresh start clears career companion records and reseeds the official default save', async () => {
  const portal = await readFile(portalUrl, 'utf8');

  assert.match(portal, /DEFAULT_CAREER_STATE/);
  assert.match(portal, /podcast_audio/);
  assert.match(portal, /hq_audio/);
  assert.match(portal, /hq_data/);
  assert.match(portal, /entry\.id !== 'main'/);
  assert.match(portal, /setDoc\([\s\S]*'main'[\s\S]*freshState[\s\S]*merge: false/);
  assert.match(portal, /DynastyHQPodcastDB/);
  assert.match(portal, /DynastyHQAudioDB/);
  assert.match(portal, /startsWith\('dynastyhq:'\)/);
});

test('default fresh career begins as an empty season-one player save', async () => {
  const defaults = await readFile(defaultsUrl, 'utf8');

  assert.match(defaults, /careerPhase: 'Player'/);
  assert.match(defaults, /currentSeason: 1/);
  assert.match(defaults, /currentWeek: 1/);
  assert.match(defaults, /isCommitted: false/);
  assert.match(defaults, /college: ''/);
  assert.match(defaults, /gameLogs: \[\]/);
  assert.match(defaults, /careerChronicle: \[\]/);
  assert.match(defaults, /newsroomIssues: \[\]/);
  assert.match(defaults, /podcastEpisodes: \[\]/);
});
