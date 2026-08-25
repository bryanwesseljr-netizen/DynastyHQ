import test from 'node:test';
import assert from 'node:assert/strict';

import { buildGeneralChatGptNewsroomPhotoPrompt } from './newsroomChatGptPhotoPrompt.js';

test('ChatGPT editorial prompt keeps story context but strips created-player personalization', () => {
  const prompt = buildGeneralChatGptNewsroomPhotoPrompt({
    issue: { season: 2, week: 4 },
    article: {
      outletName: 'Bearcats Insider',
      desk: 'Game Desk',
      headline: 'Quarterback delivers a strong afternoon',
      dek: 'Verified production supports a player-focused feature.',
    },
    generationContext: {
      director: {
        subject: 'player',
        position: 'QB',
        presetLabel: 'QB Pocket Action',
        scene: 'live game action from a believable passing pocket',
        emotionalTone: 'focused, composed, decisive',
        reason: 'The verified passing production supports a quarterback action image.',
        verifiedDetails: { passYds: 268, passTD: 2, didPlay: true },
        mechanics: ['Use a believable football grip with anatomically correct fingers and wrist alignment.'],
        throwingHandConstraints: ['The quarterback is LEFT-HANDED and must throw with the left arm.'],
        styleDirectives: ['photorealistic editorial college-football photography'],
        forbiddenDetails: ['specific injury or medical condition'],
      },
      visualProfileDirectives: [
        'Throwing hand: left',
        'Helmet: black helmet with black facemask',
        'Right hand: white glove',
      ],
      playerContext: {
        position: 'QB',
        jerseyNumber: '6',
        team: 'Cincinnati',
      },
      references: [
        {
          role: 'identity',
          roleLabel: 'Face / identity',
          instruction: 'Preserve facial identity exactly.',
        },
      ],
    },
  });

  assert.match(prompt, /Create 4 distinct photorealistic editorial college-football photographs/);
  assert.match(prompt, /Cincinnati/);
  assert.match(prompt, /anonymous QB/);
  assert.match(prompt, /Passing yards: 268/);
  assert.match(prompt, /QB Pocket Action/);
  assert.match(prompt, /believable football grip/);
  assert.match(prompt, /do not attempt to recreate or reference a pre-existing created-player appearance/i);
  assert.match(prompt, /not a portrait of a specific created player/i);

  assert.doesNotMatch(prompt, /jersey number 6/i);
  assert.doesNotMatch(prompt, /LEFT-HANDED/);
  assert.doesNotMatch(prompt, /Throwing hand: left/);
  assert.doesNotMatch(prompt, /white glove/i);
  assert.doesNotMatch(prompt, /black facemask/i);
  assert.doesNotMatch(prompt, /Face \/ identity/);
  assert.doesNotMatch(prompt, /Preserve facial identity exactly/);
  assert.doesNotMatch(prompt, /Permanent Visual Player Profile/);
});

test('ChatGPT editorial prompt keeps team-first scenes generic', () => {
  const prompt = buildGeneralChatGptNewsroomPhotoPrompt({
    issue: { season: 1, week: 7 },
    article: {
      outletName: 'College Football Daily',
      desk: 'National',
      headline: 'Bearcats rebound with a complete team win',
      dek: 'The verified result supports a broader program-focused image.',
    },
    generationContext: {
      director: {
        subject: 'team',
        presetLabel: 'Signature Win',
        scene: 'authentic postgame team energy after a verified win',
        emotionalTone: 'confident but natural',
        verifiedDetails: { result: 'W 31-20', opponent: 'Houston' },
        mechanics: [],
        styleDirectives: [],
        forbiddenDetails: [],
      },
      playerContext: { team: 'Cincinnati', jerseyNumber: '6' },
      visualProfileDirectives: ['Right hand: white glove'],
    },
  });

  assert.match(prompt, /team\/program or football scene rather than a personalized created player/i);
  assert.match(prompt, /Result: W 31-20/);
  assert.match(prompt, /Opponent: Houston/);
  assert.doesNotMatch(prompt, /white glove/i);
  assert.doesNotMatch(prompt, /jersey number/i);
});
