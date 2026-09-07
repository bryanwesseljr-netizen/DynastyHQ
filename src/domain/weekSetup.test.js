import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createByeWeekPublication,
  normalizeWeekSetup,
  WEEK_PHASES,
  WEEK_SETUP_TYPES,
} from './weekSetup.js';

test('game week setup preserves optional verified matchup details', () => {
  const setup = normalizeWeekSetup({
    week: 4,
    type: WEEK_SETUP_TYPES.GAME,
    phase: WEEK_PHASES.REGULAR,
    opponent: '  Southland  ',
    opponentRecord: ' 5-3 (3-2) ',
    kickoff: ' Saturday, 7:30 PM ',
    venue: ' Riverfront Stadium ',
  });

  assert.deepEqual({
    opponent: setup.opponent,
    opponentRecord: setup.opponentRecord,
    kickoff: setup.kickoff,
    venue: setup.venue,
  }, {
    opponent: 'Southland',
    opponentRecord: '5-3 (3-2)',
    kickoff: 'Saturday, 7:30 PM',
    venue: 'Riverfront Stadium',
  });
});

test('bye setup clears matchup fields and advances to a blank game week', () => {
  const state = {
    currentSeason: 1,
    currentWeek: 0,
    careerPhase: 'Player',
    player: { name: 'Bryan Wessel', college: 'Cincinnati' },
    currentWeekSetup: {},
    rtg: {},
    weeklyUpdates: [],
    factLedger: [],
    careerChronicle: [],
    newsroomIssues: [],
  };
  const setup = {
    week: 0,
    type: WEEK_SETUP_TYPES.BYE,
    phase: WEEK_PHASES.PRESEASON,
    opponent: 'Must not survive',
    opponentRecord: '9-0',
    kickoff: 'Noon',
    venue: 'Nowhere',
  };

  assert.equal(normalizeWeekSetup(setup).opponent, '');
  const next = createByeWeekPublication({ state, setup, rtg: {} });
  assert.equal(next.currentWeekSetup.type, WEEK_SETUP_TYPES.GAME);
  assert.equal(next.currentWeekSetup.opponent, '');
  assert.equal(next.currentWeekSetup.opponentRecord, '');
  assert.equal(next.currentWeekSetup.kickoff, '');
  assert.equal(next.currentWeekSetup.venue, '');
  assert.equal(next.gameLogs?.length || 0, 0);
});
