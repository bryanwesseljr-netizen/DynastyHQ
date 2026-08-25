import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CAREER_STATE } from './defaultCareerState.js';
import {
  DEFAULT_PLAYER_VISUAL_PROFILE,
  applyPlayerVisualProfile,
  normalizePlayerVisualProfile,
  normalizeThrowingHand,
  removeVisualProfileReference,
} from './playerVisualProfile.js';

test('visual profile defaults are portable and make no player-specific assumptions', () => {
  assert.deepEqual(DEFAULT_CAREER_STATE.player.visualProfile, DEFAULT_PLAYER_VISUAL_PROFILE);
  assert.equal(DEFAULT_PLAYER_VISUAL_PROFILE.throwingHand, '');
  assert.equal(DEFAULT_PLAYER_VISUAL_PROFILE.skinTone, '');
  assert.equal(DEFAULT_PLAYER_VISUAL_PROFILE.helmetStyle, '');
  assert.deepEqual(DEFAULT_PLAYER_VISUAL_PROFILE.referenceAssetIds, []);
});

test('normalizes quarterback handedness without guessing unknown values', () => {
  assert.equal(normalizeThrowingHand('Left'), 'left');
  assert.equal(normalizeThrowingHand('R'), 'right');
  assert.equal(normalizeThrowingHand('ambidextrous'), '');
  assert.equal(normalizeThrowingHand(''), '');
});

test('normalizes durable visual details and deduplicates reference asset ids', () => {
  const normalized = normalizePlayerVisualProfile({
    throwingHand: 'LEFT HANDED',
    skinTone: '  medium brown  ',
    hairDescription: ' short curls ',
    helmetStyle: ' modern shell ',
    referenceAssetIds: ['face-1', 'face-1', 'uniform-1', '', ' helmet-1 '],
  });

  assert.equal(normalized.throwingHand, 'left');
  assert.equal(normalized.skinTone, 'medium brown');
  assert.equal(normalized.hairDescription, 'short curls');
  assert.equal(normalized.helmetStyle, 'modern shell');
  assert.deepEqual(normalized.referenceAssetIds, ['face-1', 'uniform-1', 'helmet-1']);
});

test('applying a visual profile preserves normal player and career fields', () => {
  const state = {
    careerPhase: 'Player',
    player: { name: 'Test Player', pos: 'QB', number: '6', college: 'Test University' },
    gameLogs: [{ week: 1 }],
  };
  const next = applyPlayerVisualProfile(state, {
    throwingHand: 'right',
    visor: 'clear',
    rightHand: 'white glove',
  });

  assert.equal(next.player.name, 'Test Player');
  assert.equal(next.player.number, '6');
  assert.equal(next.player.visualProfile.throwingHand, 'right');
  assert.equal(next.player.visualProfile.visor, 'clear');
  assert.equal(next.player.visualProfile.rightHand, 'white glove');
  assert.deepEqual(next.gameLogs, state.gameLogs);
});

test('removing a deleted reference only unlinks that asset from the visual profile', () => {
  const state = applyPlayerVisualProfile({ player: { name: 'Test Player' }, trophies: ['award'] }, {
    referenceAssetIds: ['identity-1', 'uniform-1', 'helmet-1'],
  });
  const next = removeVisualProfileReference(state, 'uniform-1');

  assert.deepEqual(next.player.visualProfile.referenceAssetIds, ['identity-1', 'helmet-1']);
  assert.equal(next.player.name, 'Test Player');
  assert.deepEqual(next.trophies, ['award']);
});
