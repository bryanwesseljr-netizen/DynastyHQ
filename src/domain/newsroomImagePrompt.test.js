import test from 'node:test';
import assert from 'node:assert/strict';

import { buildGroundedNewsroomImagePrompt } from './newsroomImagePrompt.js';

test('final prompt carries Director scene, left-handed mechanics, visual profile, and typed reference jobs', () => {
  const prompt = buildGroundedNewsroomImagePrompt({
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
        presetLabel: 'QB Pocket Action',
        scene: 'live game action from a believable passing pocket',
        emotionalTone: 'focused, composed, decisive',
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
      playerContext: { position: 'QB', jerseyNumber: '6', team: 'Cincinnati' },
    },
    references: [
      {
        role: 'identity',
        roleLabel: 'Face / identity',
        instruction: 'Use this reference to preserve facial identity only; do not copy its pose, camera angle, or background.',
      },
      {
        role: 'uniform',
        roleLabel: 'Uniform',
        instruction: 'Use this reference to preserve uniform colors and visible uniform details; do not copy the original pose or background.',
      },
    ],
  });

  assert.match(prompt, /QB Pocket Action/);
  assert.match(prompt, /LEFT-HANDED/);
  assert.match(prompt, /Throwing hand: left/);
  assert.match(prompt, /Right hand: white glove/);
  assert.match(prompt, /Face \/ identity/);
  assert.match(prompt, /Uniform/);
  assert.match(prompt, /do not copy/i);
  assert.match(prompt, /Do not render headlines, captions, scoreboards, statistics/);
  assert.match(prompt, /specific injury or medical condition/);
});

test('team-first prompt explicitly blocks forced tracked-player identity', () => {
  const prompt = buildGroundedNewsroomImagePrompt({
    issue: { season: 2, week: 1 },
    article: { outletName: 'Cincinnati Enquirer', desk: 'Sports', headline: 'Program responds', dek: 'A team-first story.' },
    generationContext: {
      director: { subject: 'team', scene: 'authentic sideline coverage', mechanics: [], styleDirectives: [], forbiddenDetails: [] },
      visualProfileDirectives: [],
    },
    references: [{
      role: 'team-style',
      roleLabel: 'Team style',
      instruction: 'Preserve the team visual language without copying the original player pose or background.',
    }],
  });

  assert.match(prompt, /team\/program-first image/i);
  assert.match(prompt, /do not use a face\/identity reference/i);
  assert.doesNotMatch(prompt, /Permanent Visual Player Profile/);
});
