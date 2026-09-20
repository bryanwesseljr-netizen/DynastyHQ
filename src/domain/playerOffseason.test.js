import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildPlayerOffseasonMode } from './playerOffseason.js';

const schedule = (complete = true) => ({
  season: 2,
  school: 'Oregon',
  entries: [
    { week: 1, opponent: 'North Dakota State', completed: true, result: 'W', teamScore: 42, opponentScore: 24 },
    { week: 2, opponent: 'Baylor', completed: true, result: 'L', teamScore: 21, opponentScore: 45 },
    { week: 3, opponent: 'Oregon State', completed: complete, result: complete ? 'W' : '', teamScore: complete ? 33 : null, opponentScore: complete ? 15 : null },
  ],
});

const base = () => ({
  careerPhase: 'Player',
  careerStage: 'College',
  currentSeason: 2,
  currentWeek: 3,
  player: { name: 'Sam Jones', school: 'Oregon', college: 'Oregon', overall: 78 },
  rtg: { rank: 'QB1', coachTrust: 1148, skillPoints: 745, followers: 12000 },
  seasonSchedules: [schedule(true)],
  gameLogs: [
    { season: 2, week: 2, opponent: 'Baylor', result: 'L', didPlay: true, passYds: 203, passTD: 1, rushYds: -6, rushTD: 0, int: 1 },
  ],
  weeklyUpdates: [],
  trophies: [],
  careerMilestones: [],
  newsroomIssues: [],
  podcastEpisodes: [],
  playerRecruiting: { transfer: { status: 'inactive', targets: [], decisions: [] } },
  careerTransitions: {},
});

test('player offseason keeps team schedule record separate from personal appearances', () => {
  const model = buildPlayerOffseasonMode(base());
  assert.equal(model.isCollegePlayer, true);
  assert.equal(model.seasonComplete, true);
  assert.equal(model.teamRecord.wins, 2);
  assert.equal(model.teamRecord.losses, 1);
  assert.equal(model.playerLine.appearances, 1);
  assert.equal(model.playerLine.passYds, 203);
  assert.equal(model.playerLine.totalTD, 1);
  assert.equal(model.peakPassing.opponent, 'Baylor');
  assert.equal(model.currentStatus.role, 'QB1');
  assert.equal(model.nextAction.id, 'career-decision');
});

test('offseason remains a non-destructive preview while scheduled games remain', () => {
  const state = base();
  state.seasonSchedules = [schedule(false)];
  const model = buildPlayerOffseasonMode(state);
  assert.equal(model.seasonComplete, false);
  assert.equal(model.status, 'preview');
  assert.equal(model.schedule.remaining.length, 1);
  assert.equal(model.nextAction.id, 'finish-season');
  assert.match(model.headline, /offseason is waiting/i);
});

test('recorded transfer decision becomes the next chapter without rewriting the old season', () => {
  const state = base();
  state.playerRecruiting = {
    transfer: {
      status: 'inactive',
      targets: [],
      decisions: [{ season: 2, week: 16, decision: 'transfer', from: 'Oregon', destination: 'Kentucky', targets: [] }],
    },
  };
  const model = buildPlayerOffseasonMode(state);
  assert.equal(model.decision.complete, true);
  assert.equal(model.decision.destination, 'Kentucky');
  assert.equal(model.nextSeasonReady, true);
  assert.equal(model.school, 'Oregon');
  assert.equal(model.teamRecord.wins, 2);
  assert.equal(model.nextAction.id, 'development');
});

test('return decision keeps the current program as the next chapter', () => {
  const state = base();
  state.playerRecruiting = {
    transfer: {
      status: 'inactive',
      targets: [],
      decisions: [{ season: 2, week: 16, decision: 'stay', from: 'Oregon', destination: '', targets: [] }],
    },
  };
  const model = buildPlayerOffseasonMode(state);
  assert.equal(model.decision.headline, 'Returning to Oregon');
  assert.equal(model.decision.destination, 'Oregon');
  assert.equal(model.nextSeasonReady, true);
});


test('college recruiting decision desk offers a direct return path without opening the transfer portal', async () => {
  const source = await readFile(new URL('../components/PlayerRecruitingWorkspace.jsx', import.meta.url), 'utf8');
  assert.match(source, /const canRecordReturn = collegeCareerStarted && offseason\.seasonComplete && !offseason\.decision\.complete/);
  assert.match(source, /Return to \{state\.player\.college\}/);
  assert.match(source, /onClick=\{onStay\}/);
  assert.match(source, /open the portal only if CFB 27 actually presents transfer options/i);
});
