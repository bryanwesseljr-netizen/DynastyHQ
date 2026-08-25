import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildChatGptNewsroomPhotoPrompt,
  normalizeNewsroomEditorialScene,
  NEWSROOM_EDITORIAL_SCENE_OPTIONS,
} from './newsroomEditorialPhoto.js';
import { buildNewsroomImageGenerationContext } from './newsroomImageGenerationContext.js';
import { NEWSROOM_IMAGE_PRESETS } from './newsroomImageDirector.js';

const publicationId = 'season-1-week-3';
const issue = {
  id: publicationId,
  publicationId,
  season: 1,
  week: 3,
  careerPhase: 'Player',
  coverageStage: 'college',
};
const baseArticle = {
  id: 'local',
  outletName: 'Bearcats Insider',
  desk: 'Game Desk',
  headline: 'Cincinnati absorbs a difficult loss',
  dek: 'The verified result drives a reflective weekly story.',
  groundingStatus: 'verified',
  citedFactKeys: ['game.result', 'game.opponent'],
};
const state = {
  careerPhase: 'Player',
  player: { pos: 'QB', visualProfile: {} },
  factLedger: [
    { publicationId, key: 'game.result', value: 'L', verified: true },
    { publicationId, key: 'game.opponent', value: 'Kansas State', verified: true },
    { publicationId, key: 'player.didPlay', value: false, verified: true },
  ],
  weeklyUpdates: [],
  newsroomMediaLibrary: [],
};

test('Stage 4 exposes the requested compact scene list and safely normalizes unknown values', () => {
  assert.deepEqual(NEWSROOM_EDITORIAL_SCENE_OPTIONS.map((entry) => entry.label), [
    'Auto', 'Pocket Action', 'Scramble', 'Celebration', 'Sideline', 'Portrait', 'Tunnel', 'Practice', 'Tough Loss',
  ]);
  assert.equal(normalizeNewsroomEditorialScene('tough-loss'), 'tough-loss');
  assert.equal(normalizeNewsroomEditorialScene('not-a-scene'), 'auto');
});

test('saved article scene overrides feed the existing Photo Director generation context', () => {
  const context = buildNewsroomImageGenerationContext({
    state,
    issue,
    article: { ...baseArticle, imageSceneOverride: 'tough-loss' },
  });
  assert.equal(context.director.preset, NEWSROOM_IMAGE_PRESETS.TOUGH_LOSS_REFLECTIVE);
  assert.equal(context.director.sceneOverride, 'tough-loss');
  assert.equal(context.director.overrideApplied, true);
});

test('grounding safeguards still reject an unsupported celebration override after it is saved', () => {
  const context = buildNewsroomImageGenerationContext({
    state,
    issue,
    article: { ...baseArticle, imageSceneOverride: 'celebration' },
  });
  assert.notEqual(context.director.preset, NEWSROOM_IMAGE_PRESETS.POSTGAME_SIGNATURE_WIN);
  assert.match(context.director.overrideRejectedReason, /verified win/i);
});

test('ChatGPT handoff asks for four variations without weakening the grounded brief', () => {
  const prompt = buildChatGptNewsroomPhotoPrompt({
    groundedPrompt: 'Create a grounded team-first football photograph. Do not invent an exact play or rendered statistics.',
    director: {
      presetLabel: 'Tough Loss / Reflective Sideline',
      subject: 'team',
      reason: 'Verified result is a loss.',
    },
    references: [{ roleLabel: 'Team style' }, { roleLabel: 'Uniform' }],
  });
  assert.match(prompt, /Generate 4 distinct/i);
  assert.match(prompt, /Team style, Uniform/);
  assert.match(prompt, /Do not invent an exact play/);
  assert.match(prompt, /four visually distinct professional sports-photo options/i);
});
