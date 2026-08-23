import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { buildGameweekFlow, createWeekFinalization } from './gameweekFlow.js';

const quietWeekZero = () => ({
  currentSeason: 1,
  currentWeek: 1,
  currentWeekSetup: { week: 0, type: 'bye', phase: 'preseason', label: 'Week 0' },
  player: { name: 'Bryan Wessel', college: 'Cincinnati', school: 'Cincinnati', isCommitted: true, pos: 'QB' },
  rtg: { rank: 'QB3' },
  weeklyUpdates: [{
    id: 'season-1-week-0',
    publicationId: 'season-1-week-0',
    weekKey: 'season-1-week-0',
    season: 1,
    week: 0,
    label: 'Week 0',
    weekType: 'bye',
    weekPhase: 'preseason',
    rtgSnapshot: { rank: 'QB3' },
  }],
  newsroomIssues: [{
    id: 'season-1-week-0',
    publicationId: 'season-1-week-0',
    season: 1,
    week: 0,
    label: 'Week 0',
    weekType: 'bye',
    weekPhase: 'preseason',
    careerPhase: 'Player',
    articles: [{ outletId: 'college-local', theme: 'local' }],
    podcastBrief: { title: 'Week 0', summary: 'Preseason' },
  }],
  careerChronicle: [{ id: 'season-1-week-0', publicationId: 'season-1-week-0', season: 1, week: 0 }],
  factLedger: [],
  gameLogs: [],
  podcastEpisodes: [],
  weekFinalizations: {},
  _sync: { revision: 10 },
});

test('quiet preseason week becomes a one-click finalization instead of fake content work', () => {
  const state = quietWeekZero();
  const flow = buildGameweekFlow(state);
  assert.equal(flow.mode, 'wrap-up');
  assert.equal(flow.wrapUp.week, 0);
  assert.equal(flow.wrapUp.publicationId, 'season-1-week-0');
  assert.equal(flow.newsroomRequired, false);
  assert.equal(flow.podcastRequired, false);
  assert.equal(flow.steps.find((step) => step.id === 'newsroom').optional, true);
  assert.equal(flow.steps.find((step) => step.id === 'podcast').optional, true);
  assert.equal(flow.steps.find((step) => step.id === 'logged').label, 'Week Logged');
  assert.equal(flow.canFinalize, true);
  assert.equal(flow.nextAction.label, 'Finalize Week');
});

test('finalization stores a completion checkpoint and then advances the smart action to the active week', () => {
  const state = quietWeekZero();
  const flow = buildGameweekFlow(state);
  const checkpoint = createWeekFinalization(state, flow);
  assert.equal(checkpoint.publicationId, 'season-1-week-0');
  assert.equal(checkpoint.week, 0);
  assert.equal(checkpoint.sourceRevision, 10);

  const finalizedState = {
    ...state,
    weekFinalizations: { [checkpoint.publicationId]: checkpoint },
  };
  const nextFlow = buildGameweekFlow(finalizedState);
  assert.equal(nextFlow.mode, 'active-week');
  assert.equal(nextFlow.activeWeek.week, 1);
  assert.equal(nextFlow.nextAction.label, 'Set Up Week');
});

test('active Week 0 keeps its real preseason identity', () => {
  const flow = buildGameweekFlow({ currentSeason: 1, currentWeek: 0, currentWeekSetup: {}, weeklyUpdates: [] });
  assert.equal(flow.activeWeek.week, 0);
  assert.equal(flow.activeWeek.publicationId, 'season-1-week-0');
  assert.equal(flow.nextAction.label, 'Set Up Week');
});

test('portal wires smart action, progress, finalization persistence, and explicit unlock', async () => {
  const source = await readFile(new URL('../components/GameweekFlowPortal.jsx', import.meta.url), 'utf8');
  assert.match(source, /Smart Next Action/);
  assert.match(source, /Gameweek Flow/);
  assert.match(source, /ProgressDots/);
  assert.match(source, /onFinalize/);
  assert.match(source, /onUnlock/);
  assert.match(source, /weekFinalizations/);
  assert.match(source, /Unlock/);
});
