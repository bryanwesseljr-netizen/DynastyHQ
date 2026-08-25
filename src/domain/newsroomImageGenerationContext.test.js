import test from 'node:test';
import assert from 'node:assert/strict';

import { NEWSROOM_IMAGE_PRESETS } from './newsroomImageDirector.js';
import {
  buildNewsroomImageGenerationContext,
  selectNewsroomImageReferences,
} from './newsroomImageGenerationContext.js';
import { NEWSROOM_MEDIA_FOLDERS } from './newsroomMediaFolders.js';
import { NEWSROOM_REFERENCE_ROLES } from './newsroomReferenceRoles.js';

const publicationId = 'season-2-week-4';
const issue = {
  id: publicationId,
  publicationId,
  season: 2,
  week: 4,
  careerPhase: 'Player',
  coverageStage: 'college',
};
const article = {
  id: 'local',
  outletName: 'Bearcats Insider',
  desk: 'Game Desk',
  headline: 'Quarterback pushes the offense forward',
  dek: 'Verified passing production anchors the weekly story.',
  groundingStatus: 'verified',
  citedFactKeys: ['game.passYds', 'game.passTD', 'player.didPlay'],
};

const reference = (id, role, folder = NEWSROOM_MEDIA_FOLDERS.COLLEGE) => ({
  id,
  isReference: true,
  referenceRole: role,
  careerFolder: folder,
  downloadUrl: `https://firebasestorage.googleapis.com/${id}.jpg`,
  fileName: `${id}.jpg`,
  referenceLabel: `${role} reference`,
});

const state = {
  careerPhase: 'Player',
  player: {
    pos: 'QB',
    number: '6',
    college: 'Cincinnati',
    visualProfile: {
      throwingHand: 'left',
      skinTone: 'medium brown',
      helmetStyle: 'black helmet with black facemask',
      rightHand: 'white glove',
      referenceAssetIds: ['identity', 'uniform', 'helmet', 'equipment', 'team-style'],
    },
  },
  factLedger: [
    { publicationId, key: 'game.passYds', value: 268, verified: true },
    { publicationId, key: 'game.passTD', value: 2, verified: true },
    { publicationId, key: 'player.didPlay', value: true, verified: true },
  ],
  weeklyUpdates: [],
  newsroomMediaLibrary: [
    reference('identity', NEWSROOM_REFERENCE_ROLES.IDENTITY),
    reference('uniform', NEWSROOM_REFERENCE_ROLES.UNIFORM),
    reference('helmet', NEWSROOM_REFERENCE_ROLES.HELMET),
    reference('equipment', NEWSROOM_REFERENCE_ROLES.EQUIPMENT),
    reference('team-style', NEWSROOM_REFERENCE_ROLES.TEAM_STYLE),
    reference('old-hs-face', NEWSROOM_REFERENCE_ROLES.IDENTITY, NEWSROOM_MEDIA_FOLDERS.HIGH_SCHOOL),
    { ...reference('not-approved', NEWSROOM_REFERENCE_ROLES.IDENTITY), isReference: false },
  ],
};

test('builds a player generation context from verified facts, permanent profile, and typed references', () => {
  const context = buildNewsroomImageGenerationContext({ state, issue, article });

  assert.equal(context.director.preset, NEWSROOM_IMAGE_PRESETS.QB_POCKET_ACTION);
  assert.equal(context.director.subject, 'player');
  assert.equal(context.director.throwingHand, 'left');
  assert.ok(context.director.throwingHandConstraints.some((entry) => /LEFT-HANDED/.test(entry)));
  assert.ok(context.visualProfileDirectives.includes('Throwing hand: left'));
  assert.ok(context.visualProfileDirectives.includes('Right hand: white glove'));
  assert.deepEqual(context.references.map((entry) => entry.role), [
    NEWSROOM_REFERENCE_ROLES.IDENTITY,
    NEWSROOM_REFERENCE_ROLES.UNIFORM,
    NEWSROOM_REFERENCE_ROLES.HELMET,
    NEWSROOM_REFERENCE_ROLES.EQUIPMENT,
  ]);
  assert.ok(context.references.every((entry) => !entry.assetId.includes('old-hs')));
  assert.equal(context.playerContext.jerseyNumber, '6');
  assert.equal(context.playerContext.team, 'Cincinnati');
});

test('team-first coverage excludes player personalization but preserves team identity for uniforms and conference patches', () => {
  const teamArticle = {
    ...article,
    id: 'regional',
    subjectPriority: 'program-first',
    playerMentionPolicy: 'omit',
  };
  const context = buildNewsroomImageGenerationContext({ state, issue, article: teamArticle });

  assert.equal(context.director.subject, 'team');
  assert.deepEqual(context.visualProfileDirectives, []);
  assert.equal(context.references.some((entry) => entry.role === NEWSROOM_REFERENCE_ROLES.IDENTITY), false);
  assert.equal(context.references.some((entry) => entry.role === NEWSROOM_REFERENCE_ROLES.FULL_BODY), false);
  assert.ok(context.references.some((entry) => entry.role === NEWSROOM_REFERENCE_ROLES.TEAM_STYLE));
  assert.equal(context.playerContext.team, 'Cincinnati');
  assert.equal(context.playerContext.position, '');
  assert.equal(context.playerContext.jerseyNumber, '');
});

test('reference selection remains useful before the Visual Profile has been re-saved', () => {
  const unlinkedState = {
    ...state,
    player: { ...state.player, visualProfile: { ...state.player.visualProfile, referenceAssetIds: [] } },
  };
  const references = selectNewsroomImageReferences({ state: unlinkedState, issue, subject: 'player' });
  assert.equal(references.length, 4);
  assert.equal(references[0].role, NEWSROOM_REFERENCE_ROLES.IDENTITY);
});
