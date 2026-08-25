import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectNewsroomImageFacts,
  directNewsroomImage,
  getNewsroomPositionModule,
  MASTER_EDITORIAL_PHOTO_STYLE,
  NEWSROOM_IMAGE_PRESETS,
} from './newsroomImageDirector.js';

const publicationId = 'season-2-week-1';
const baseIssue = {
  id: publicationId,
  publicationId,
  season: 2,
  week: 1,
  careerPhase: 'Player',
  editionType: 'weekly',
  weekType: 'game',
};

const baseArticle = {
  id: 'college-local',
  outletId: 'college-local',
  outletName: 'Bearcats Insider',
  desk: 'College Football',
  headline: 'Verified weekly story',
  dek: 'A grounded article from the weekly fact ledger.',
  groundingStatus: 'verified',
  storyImportance: 'notable',
  storyFormat: 'news',
  subjectPriority: 'player-and-game',
  playerMentionPolicy: 'primary',
  citedFactKeys: [],
};

const makeState = ({ position = 'QB', archetype = 'Dual-Threat', throwingHand = '', facts = [], weeklyUpdates = [] } = {}) => ({
  careerPhase: 'Player',
  player: {
    name: 'Test Player',
    pos: position,
    archetype,
    visualProfile: { throwingHand },
  },
  factLedger: facts.map((fact) => ({
    publicationId,
    verified: true,
    ...fact,
  })),
  weeklyUpdates,
});

const facts = (entries) => entries.map(([key, value]) => ({ key, value }));

test('directs a strong verified passing story to QB Pocket Action without requiring a rigid 300-yard threshold', () => {
  const plan = directNewsroomImage({
    state: makeState({
      throwingHand: 'left',
      facts: facts([
        ['game.passYds', 287],
        ['game.passTD', 3],
        ['game.result', 'W'],
        ['game.opponent', 'Kansas State'],
        ['player.didPlay', true],
      ]),
    }),
    issue: baseIssue,
    article: {
      ...baseArticle,
      citedFactKeys: ['game.passYds', 'game.passTD', 'game.result', 'game.opponent'],
    },
  });

  assert.equal(plan.preset, NEWSROOM_IMAGE_PRESETS.QB_POCKET_ACTION);
  assert.equal(plan.positionModule, 'QB');
  assert.equal(plan.throwingHand, 'left');
  assert.ok(plan.priorityFacts.includes('game.passYds'));
  assert.ok(plan.priorityFacts.includes('game.passTD'));
  assert.equal(plan.throwingHandConstraints.length, 3);
  assert.ok(plan.throwingHandConstraints.every((constraint) => /left/i.test(constraint)));
  assert.ok(plan.reason.includes('287'));
  assert.ok(plan.reason.includes('3 passing touchdowns'));
});

test('major verified quarterback rushing production can outweigh passing production for a dual-threat scramble scene', () => {
  const plan = directNewsroomImage({
    state: makeState({
      facts: facts([
        ['game.passYds', 225],
        ['game.passTD', 1],
        ['game.rushYds', 96],
        ['game.rushTD', 2],
        ['game.result', 'W'],
        ['player.didPlay', true],
      ]),
    }),
    issue: baseIssue,
    article: { ...baseArticle, citedFactKeys: ['game.rushYds', 'game.rushTD', 'game.passYds'] },
  });

  assert.equal(plan.preset, NEWSROOM_IMAGE_PRESETS.DUAL_THREAT_SCRAMBLE);
  assert.ok(plan.reason.includes('96 yards'));
  assert.ok(plan.priorityFacts.includes('game.rushTD'));
});

test('a verified no-appearance backup story selects Sideline / Waiting rather than inventing game action', () => {
  const plan = directNewsroomImage({
    state: makeState({
      facts: facts([
        ['player.didPlay', false],
        ['rtg.rank', 'QB3'],
        ['game.result', 'L'],
        ['game.opponent', 'Kansas State'],
      ]),
    }),
    issue: baseIssue,
    article: {
      ...baseArticle,
      playerMentionPolicy: 'developing',
      citedFactKeys: ['player.didPlay', 'rtg.rank', 'game.result'],
    },
  });

  assert.equal(plan.preset, NEWSROOM_IMAGE_PRESETS.SIDELINE_WAITING);
  assert.equal(plan.subject, 'player');
  assert.ok(plan.reason.includes('no statistical appearance'));
  assert.ok(plan.reason.includes('QB3'));
});

test('a verified ranked upset takes editorial priority over a generic quarterback action scene', () => {
  const plan = directNewsroomImage({
    state: makeState({
      facts: facts([
        ['game.result', 'W'],
        ['game.opponent', 'Kansas State'],
        ['game.opponentRank', 8],
        ['game.passYds', 318],
        ['game.passTD', 3],
        ['player.didPlay', true],
      ]),
    }),
    issue: baseIssue,
    article: {
      ...baseArticle,
      storyImportance: 'major',
      citedFactKeys: ['game.result', 'game.opponent', 'game.opponentRank', 'game.passYds', 'game.passTD'],
    },
  });

  assert.equal(plan.preset, NEWSROOM_IMAGE_PRESETS.POSTGAME_SIGNATURE_WIN);
  assert.equal(plan.verifiedDetails.opponentRank, 8);
  assert.ok(plan.priorityFacts.includes('game.opponentRank'));
  assert.ok(plan.reason.includes('No. 8'));
});

test('a verified loss with turnover problems selects a reflective tough-loss scene', () => {
  const plan = directNewsroomImage({
    state: makeState({
      facts: facts([
        ['game.result', 'L'],
        ['game.teamTurnovers', 3],
        ['game.int', 2],
        ['player.didPlay', true],
      ]),
    }),
    issue: baseIssue,
    article: { ...baseArticle, citedFactKeys: ['game.result', 'game.teamTurnovers', 'game.int'] },
  });

  assert.equal(plan.preset, NEWSROOM_IMAGE_PRESETS.TOUGH_LOSS_REFLECTIVE);
  assert.ok(plan.priorityFacts.includes('game.teamTurnovers'));
  assert.ok(plan.reason.includes('3 team turnovers'));
});

test('verified depth-chart context can select Fall Camp / Practice for a role-development story', () => {
  const plan = directNewsroomImage({
    state: makeState({ facts: facts([['rtg.rank', 'QB2'], ['player.roleChange', 'QB3 to QB2']]) }),
    issue: { ...baseIssue, weekPhase: 'Fall Camp', weekType: 'practice' },
    article: {
      ...baseArticle,
      headline: 'Quarterback moves up the depth chart during fall camp',
      citedFactKeys: ['rtg.rank', 'player.roleChange'],
    },
  });

  assert.equal(plan.preset, NEWSROOM_IMAGE_PRESETS.FALL_CAMP_PRACTICE);
  assert.ok(plan.priorityFacts.includes('player.roleChange'));
});

test('recruiting coverage selects a recruiting/profile scene rather than fabricated game action', () => {
  const plan = directNewsroomImage({
    state: makeState({ facts: facts([['recruiting.test.offer', true]]) }),
    issue: { ...baseIssue, editionType: 'recruiting' },
    article: {
      ...baseArticle,
      desk: 'Recruiting Desk',
      storyFormat: 'recruiting-intel',
      citedFactKeys: ['recruiting.test.offer'],
    },
  });

  assert.equal(plan.preset, NEWSROOM_IMAGE_PRESETS.RECRUITING_PROFILE);
  assert.ok(plan.priorityFacts.includes('recruiting.test.offer'));
});

test('article language alone cannot manufacture rivalry status', () => {
  const plan = directNewsroomImage({
    state: makeState({ facts: facts([['game.result', 'W'], ['game.opponent', 'State University'], ['player.didPlay', true]]) }),
    issue: baseIssue,
    article: {
      ...baseArticle,
      headline: 'Rivalry week delivers another heated chapter',
      citedFactKeys: ['game.result', 'game.opponent'],
    },
  });

  assert.notEqual(plan.preset, NEWSROOM_IMAGE_PRESETS.RIVALRY_GAME);
  assert.equal(plan.verifiedDetails.rivalry, undefined);
});

test('a verified rivalry fact enables the Rivalry Game preset', () => {
  const plan = directNewsroomImage({
    state: makeState({ facts: facts([['game.rivalry', true], ['game.opponent', 'State University'], ['game.result', 'W']]) }),
    issue: baseIssue,
    article: { ...baseArticle, citedFactKeys: ['game.rivalry', 'game.opponent', 'game.result'] },
  });

  assert.equal(plan.preset, NEWSROOM_IMAGE_PRESETS.RIVALRY_GAME);
  assert.equal(plan.verifiedDetails.rivalry, true);
});

test('unverified ledger values are ignored even when the headline repeats them', () => {
  const state = makeState();
  state.factLedger = [{ publicationId, verified: false, key: 'game.passYds', value: 450 }];
  const plan = directNewsroomImage({
    state,
    issue: baseIssue,
    article: { ...baseArticle, headline: 'Quarterback erupts for 450 yards', citedFactKeys: ['game.passYds'] },
  });

  assert.notEqual(plan.preset, NEWSROOM_IMAGE_PRESETS.QB_POCKET_ACTION);
  assert.equal(plan.verifiedDetails.passYds, undefined);
});

test('manual scene changes cannot override verified-fact safeguards', () => {
  const plan = directNewsroomImage({
    state: makeState({ facts: facts([['game.result', 'L'], ['game.teamTurnovers', 2], ['player.didPlay', true]]) }),
    issue: baseIssue,
    article: { ...baseArticle, citedFactKeys: ['game.result', 'game.teamTurnovers'] },
    sceneOverride: 'celebration',
  });

  assert.equal(plan.overrideApplied, false);
  assert.match(plan.overrideRejectedReason, /verified win/i);
  assert.equal(plan.preset, NEWSROOM_IMAGE_PRESETS.TOUGH_LOSS_REFLECTIVE);
});

test('published weekly game data is a safe fallback, while unpublished weekly data is not', () => {
  const publishedState = makeState({
    weeklyUpdates: [{
      id: publicationId,
      publicationId,
      status: 'published',
      game: { opponent: 'Kansas State', result: 'W', passYds: 301, passTD: 2, didPlay: true },
    }],
  });
  const collected = collectNewsroomImageFacts({ state: publishedState, issue: baseIssue });
  assert.equal(collected.find((fact) => fact.key === 'game.passYds')?.value, 301);

  const draftState = makeState({
    weeklyUpdates: [{
      id: publicationId,
      publicationId,
      status: 'draft',
      game: { passYds: 999 },
    }],
  });
  const draftCollected = collectNewsroomImageFacts({ state: draftState, issue: baseIssue });
  assert.equal(draftCollected.some((fact) => fact.key === 'game.passYds'), false);
});

test('position modules cover the requested football roles with reusable mechanics', () => {
  const expected = new Map([
    ['QB', 'QB'],
    ['HB', 'RB'],
    ['TE', 'WR_TE'],
    ['LT', 'OL'],
    ['EDGE', 'DL_EDGE'],
    ['MLB', 'LB'],
    ['CB', 'DB'],
    ['P', 'K_P'],
  ]);
  expected.forEach((moduleKey, position) => {
    const module = getNewsroomPositionModule(position, 'player');
    assert.equal(module.key, moduleKey);
    assert.ok(module.mechanics.length >= 3);
  });
  assert.equal(getNewsroomPositionModule('QB', 'coach').key, 'COACH');
  assert.equal(getNewsroomPositionModule('QB', 'team').key, 'TEAM');
});

test('program-first coverage uses team-wide mechanics and never requires the tracked player to be the photo subject', () => {
  const plan = directNewsroomImage({
    state: makeState({ facts: facts([['game.result', 'L'], ['game.teamTurnovers', 2], ['player.didPlay', true]]) }),
    issue: baseIssue,
    article: {
      ...baseArticle,
      subjectPriority: 'program-first',
      playerMentionPolicy: 'secondary',
      citedFactKeys: ['game.result', 'game.teamTurnovers'],
    },
  });

  assert.equal(plan.subject, 'team');
  assert.equal(plan.positionModule, 'TEAM');
  assert.equal(plan.preset, NEWSROOM_IMAGE_PRESETS.TOUGH_LOSS_REFLECTIVE);
});

test('the director returns professional editorial style and explicit anti-fabrication boundaries', () => {
  const plan = directNewsroomImage({ state: makeState(), issue: baseIssue, article: baseArticle });
  assert.ok(MASTER_EDITORIAL_PHOTO_STYLE.length >= 8);
  assert.ok(plan.styleDirectives.some((entry) => /photojournalism/i.test(entry)));
  assert.ok(plan.forbiddenDetails.some((entry) => /specific final score/i.test(entry)));
  assert.ok(plan.forbiddenDetails.some((entry) => /specific stadium or venue/i.test(entry)));
  assert.ok(plan.forbiddenDetails.some((entry) => /specific weather/i.test(entry)));
  assert.ok(plan.forbiddenDetails.some((entry) => /touchdown sequence/i.test(entry)));
});
