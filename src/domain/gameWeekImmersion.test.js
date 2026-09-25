import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGameWeekImmersion } from './gameWeekImmersion.js';

const baseState = {
  currentSeason: 2,
  currentWeek: 3,
  player: { college: 'Oregon' },
  gameLogs: [
    { season: 2, week: 2, stage: 'college', opponent: 'Baylor', homeScore: 21, awayScore: 45, result: 'L' },
  ],
};

const dashboard = { institution: 'Oregon', week: 3 };

test('pregame mode uses configured active opponent and carries last result into the story', () => {
  const state = {
    ...baseState,
    currentWeekSetup: {
      type: 'game', week: 3, opponent: 'UCLA', opponentRecord: '2-0', kickoff: '7:30 PM', venue: 'Autzen Stadium',
    },
  };
  const flow = { mode: 'active-week', activeWeek: { configured: true, week: 3, type: 'game' } };
  const model = buildGameWeekImmersion(state, dashboard, flow);

  assert.equal(model.mode, 'pregame');
  assert.equal(model.opponent, 'UCLA');
  assert.equal(model.center, 'VS');
  assert.equal(model.kicker, 'UP NEXT · WEEK 3');
  assert.equal(model.headline, 'OREGON VS UCLA');
  assert.equal(model.centerLine, 'WEEK 3');
  assert.equal(model.centerDetail, '7:30 PM');
  assert.equal(model.keysTitle, 'UPCOMING GAME');
  assert.equal(model.primaryLabel, 'OPEN GAME HUB');
  assert.equal(model.primaryTarget, 'gameHub');
  assert.equal(model.secondaryLabel, 'IMPORT AFTER GAME');
  assert.equal(model.secondaryTarget, 'importSession');
  assert.match(model.previous.copy, /loss against Baylor, 21-45/);
  assert.equal(model.scout.team, 'UCLA');
  assert.deepEqual(model.scout.facts.map((fact) => fact.value), ['2-0', '7:30 PM', 'Autzen Stadium']);
});

test('postgame mode turns the hero into a final and points to wrap-up work', () => {
  const flow = {
    mode: 'wrap-up',
    activeWeek: { configured: false, week: 3, type: 'game' },
    wrapUp: { season: 2, week: 2, entry: { season: 2, week: 2, game: { result: 'L', opponent: 'Baylor' } } },
    nextAction: { label: 'Open Podcast', target: 'podcast' },
    steps: [
      { label: 'Newsroom', state: 'complete' },
      { label: 'Podcast', state: 'pending' },
    ],
  };
  const model = buildGameWeekImmersion(baseState, dashboard, flow);

  assert.equal(model.mode, 'postgame');
  assert.equal(model.center, 'FINAL');
  assert.equal(model.centerLine, '21-45');
  assert.equal(model.primaryLabel, 'CONTINUE WRAP-UP');
  assert.equal(model.primaryTarget, 'podcast');
  assert.equal(model.secondaryLabel, 'VIEW WEEK HUB');
  assert.equal(model.secondaryTarget, 'gameHub');
  assert.equal(model.keysTitle, 'WEEK WRAP-UP');
  assert.match(model.keys[1].detail, /Podcast/);
});

test('postgame hero never mixes the active next opponent into the previous final', () => {
  const state = {
    ...baseState,
    currentWeekSetup: {
      type: 'game',
      week: 3,
      opponent: 'Oregon State',
      opponentRecord: '0-2',
      kickoff: 'Saturday, 3:30 PM',
      venue: 'Reser Stadium, Corvallis, OR',
    },
    seasonSchedules: [{
      season: 2,
      school: 'Oregon',
      entries: [
        { week: 1, opponent: 'North Dakota State', result: 'W', teamScore: 42, opponentScore: 24, completed: true },
        { week: 2, opponent: 'Baylor', result: 'L', teamScore: 21, opponentScore: 45, completed: true },
        { week: 3, opponent: 'Oregon State', result: 'W', teamScore: 33, opponentScore: 15, completed: true },
      ],
    }],
  };
  const flow = {
    mode: 'wrap-up',
    activeWeek: { configured: true, week: 3, type: 'game' },
    wrapUp: { season: 2, week: 2, entry: { season: 2, week: 2, game: { result: 'L', opponent: 'Baylor' } } },
    nextAction: { target: 'gameHub' },
    steps: [],
  };
  const model = buildGameWeekImmersion(state, dashboard, flow);

  assert.equal(model.mode, 'postgame');
  assert.equal(model.opponent, 'Baylor');
  assert.equal(model.centerLine, '21-45');
  assert.equal(model.latestGameRecord.wins, 1);
  assert.equal(model.latestGameRecord.losses, 1);
});

test('between weeks mode holds the latest result until the new week is configured', () => {
  const flow = { mode: 'active-week', activeWeek: { configured: false, week: 3, type: 'game' } };
  const model = buildGameWeekImmersion(baseState, dashboard, flow);

  assert.equal(model.mode, 'between');
  assert.equal(model.opponent, 'Baylor');
  assert.equal(model.headline, 'WEEK 2 FINAL');
  assert.equal(model.center, 'FINAL');
  assert.equal(model.primaryLabel, 'SET UP WEEK 3');
  assert.equal(model.primaryTarget, 'agenda');
  assert.equal(model.secondaryLabel, 'VIEW LAST GAME');
  assert.equal(model.secondaryTarget, 'gameHub');
  assert.match(model.previous.copy, /Set up Week 3/);
});

test('college fallback ignores older high-school games and evaluation entries', () => {
  const state = {
    ...baseState,
    gameLogs: [
      { season: 1, week: 12, stage: 'high-school', opponent: 'Westview', homeScore: 35, awayScore: 14, result: 'W' },
      { season: 2, week: 1, stage: 'college', opponent: 'UTSA', homeScore: 31, awayScore: 20, result: 'W', evaluation: true },
      { season: 2, week: 2, stage: 'college', opponent: 'Baylor', homeScore: 21, awayScore: 45, result: 'L' },
    ],
  };
  const flow = { mode: 'active-week', activeWeek: { configured: false, week: 3, type: 'game' } };
  const model = buildGameWeekImmersion(state, dashboard, flow);

  assert.equal(model.latestGame.opponent, 'Baylor');
  assert.equal(model.opponent, 'Baylor');
  assert.equal(model.centerLine, '21-45');
});

test('no-game current-season wrap-up never pulls a prior-season opponent into Home', () => {
  const state = {
    currentSeason: 4,
    currentWeek: 1,
    player: { college: 'Oregon', role: 'QB1' },
    rtg: { rank: 'QB1' },
    gameLogs: [
      { season: 3, week: 13, stage: 'college', opponent: 'Rutgers', homeScore: 35, awayScore: 13, result: 'W' },
    ],
    seasonSchedules: [{
      season: 4,
      school: 'Oregon',
      entries: [
        { week: 1, opponent: 'Vanderbilt', homeAway: 'home', status: 'upcoming' },
        { week: 2, opponent: 'Florida', homeAway: 'home', status: 'upcoming' },
      ],
    }],
  };
  const flow = {
    mode: 'wrap-up',
    activeWeek: { configured: false, season: 4, week: 1, type: 'game', phase: 'regular' },
    wrapUp: {
      season: 4,
      week: 0,
      entry: { season: 4, week: 0, weekPhase: 'preseason', weekType: 'bye' },
    },
    nextAction: { label: 'Finalize Week', target: 'finalize', detail: 'Preseason checkpoint is ready to close.' },
    steps: [],
  };
  const model = buildGameWeekImmersion(state, { institution: 'Oregon', season: 4, week: 1 }, flow);

  assert.equal(model.mode, 'pregame');
  assert.equal(model.kicker, 'UP NEXT · WEEK 1');
  assert.equal(model.headline, 'OREGON VS VANDERBILT');
  assert.equal(model.center, 'VS');
  assert.equal(model.centerLine, 'WEEK 1');
  assert.equal(model.primaryLabel, 'FINALIZE WEEK');
  assert.equal(model.primaryTarget, 'importSession');
  assert.equal(model.secondaryLabel, 'OPEN GAME HUB');
  assert.equal(model.opponent, 'Vanderbilt');
  assert.equal(model.upcomingGame.opponent, 'Vanderbilt');
  assert.equal(model.latestGame, null);
  assert.equal(model.hasCurrentSeasonGame, false);
  assert.equal(model.historicalLatestGame.opponent, 'Rutgers');
  assert.doesNotMatch(`${model.headline} ${model.opponent}`, /13|Rutgers/i);
  assert.match(model.opponent, /Vanderbilt/i);
});

test('Home latest-result presentation only uses a completed game from the current season', () => {
  const state = {
    currentSeason: 4,
    currentWeek: 5,
    player: { college: 'Oregon' },
    gameLogs: [
      { season: 3, week: 13, stage: 'college', opponent: 'Rutgers', homeScore: 35, awayScore: 13, result: 'W' },
      { season: 4, week: 4, stage: 'college', opponent: 'Michigan', homeScore: 28, awayScore: 24, result: 'W' },
    ],
  };
  const flow = {
    mode: 'active-week',
    activeWeek: { configured: false, season: 4, week: 5, type: 'game', phase: 'regular' },
    wrapUp: null,
    nextAction: { label: 'Set Up Week', target: 'agenda' },
    steps: [],
  };
  const model = buildGameWeekImmersion(state, { institution: 'Oregon', season: 4, week: 5 }, flow);

  assert.equal(model.mode, 'between');
  assert.equal(model.hasCurrentSeasonGame, true);
  assert.equal(model.latestGame.opponent, 'Michigan');
  assert.equal(model.opponent, 'Michigan');
  assert.equal(model.center, 'FINAL');
  assert.equal(model.centerLine, '28-24');
  assert.equal(model.primaryLabel, 'SET UP WEEK 5');
  assert.equal(model.primaryTarget, 'agenda');
  assert.doesNotMatch(`${model.headline} ${model.opponent}`, /Rutgers/i);
});

test('preseason Home state never borrows an opponent from a future regular-season game', () => {
  const state = {
    currentSeason: 4,
    currentWeek: 0,
    player: { college: 'Oregon', role: 'QB1' },
    rtg: { rank: 'QB1' },
    seasonSchedules: [{
      season: 4,
      school: 'Oregon',
      entries: [{ week: 1, opponent: 'Vanderbilt', homeAway: 'home', status: 'upcoming' }],
    }],
  };
  const flow = {
    mode: 'active-week',
    activeWeek: { configured: false, season: 4, week: 0, type: 'game', phase: 'preseason' },
    nextAction: { label: 'Set Up Week', target: 'agenda' },
    steps: [],
  };
  const model = buildGameWeekImmersion(state, { institution: 'Oregon', season: 4, week: 0 }, flow);

  assert.equal(model.mode, 'preseason');
  assert.equal(model.headline, 'OREGON PRESEASON');
  assert.equal(model.heroOpponent, '');
  assert.equal(model.rightTeamName, 'PRESEASON');
  assert.equal(model.center, 'PRE');
  assert.doesNotMatch(`${model.headline} ${model.rightTeamName}`, /Vanderbilt/i);
});

test('bye week gets a dedicated Home state and keeps Finalize Week routed to verification', () => {
  const state = {
    currentSeason: 4,
    currentWeek: 4,
    player: { college: 'Oregon', role: 'QB1' },
    rtg: { rank: 'QB1' },
    currentWeekSetup: { season: 4, week: 4, type: 'bye', phase: 'regular', label: 'Bye Week' },
  };
  const flow = {
    mode: 'wrap-up',
    activeWeek: { configured: true, season: 4, week: 4, type: 'bye', phase: 'regular' },
    wrapUp: { season: 4, week: 4, entry: { season: 4, week: 4, weekType: 'bye', weekPhase: 'regular' } },
    nextAction: { label: 'Finalize Week', target: 'finalize' },
    steps: [],
  };
  const model = buildGameWeekImmersion(state, { institution: 'Oregon', season: 4, week: 4 }, flow);

  assert.equal(model.mode, 'bye');
  assert.equal(model.headline, 'OREGON · DEVELOPMENT WEEK');
  assert.equal(model.center, 'BYE');
  assert.equal(model.heroOpponent, '');
  assert.equal(model.primaryLabel, 'FINALIZE WEEK');
  assert.equal(model.primaryTarget, 'importSession');
  assert.equal(model.secondaryTarget, 'gameHub');
});

test('completed college season switches Home into offseason mode after wrap-up is finished', () => {
  const state = {
    currentSeason: 4,
    currentWeek: 15,
    player: { college: 'Oregon', school: 'Oregon', careerStage: 'College', role: 'QB1' },
    rtg: { rank: 'QB1' },
    gameLogs: [
      { season: 4, week: 1, stage: 'college', opponent: 'Vanderbilt', homeScore: 35, awayScore: 17, result: 'W' },
    ],
    seasonSchedules: [{
      season: 4,
      school: 'Oregon',
      entries: [{ week: 1, opponent: 'Vanderbilt', homeAway: 'home', completed: true, result: 'W', teamScore: 35, opponentScore: 17 }],
    }],
    careerTransitions: {
      graduationChecklist: { finalSeasonComplete: true },
    },
  };
  const flow = {
    mode: 'active-week',
    activeWeek: { configured: false, season: 4, week: 15, type: 'game', phase: 'regular' },
    wrapUp: null,
    nextAction: { label: 'Set Up Week', target: 'agenda' },
    steps: [],
  };
  const model = buildGameWeekImmersion(state, { institution: 'Oregon', season: 4, week: 15 }, flow);

  assert.equal(model.mode, 'offseason');
  assert.equal(model.headline, 'OREGON OFFSEASON');
  assert.equal(model.center, 'OFF');
  assert.equal(model.centerLine, 'SEASON COMPLETE');
  assert.equal(model.heroOpponent, '');
  assert.equal(model.primaryLabel, 'OPEN OFFSEASON');
  assert.equal(model.primaryTarget, 'offseason');
});
