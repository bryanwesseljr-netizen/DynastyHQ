import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveWeeklyWorkContext } from './weeklyWorkContext.js';

test('explicit current-week setup overrides an unfinished prior-week wrap-up', () => {
  const context = resolveWeeklyWorkContext({
    currentSeason: 2,
    currentWeek: 3,
    currentWeekSetup: {
      week: 3,
      type: 'game',
      phase: 'regular',
      label: 'Week 3',
      opponent: 'Oregon State',
    },
    weeklyUpdates: [
      {
        season: 2,
        week: 2,
        publicationId: 'season-2-week-2',
        status: 'published',
      },
    ],
    weekFinalizations: {},
  });

  assert.equal(context.season, 2);
  assert.equal(context.week, 3);
  assert.equal(context.publicationId, 'season-2-week-3');
  assert.equal(context.setupReady, true);
  assert.equal(context.setup.opponent, 'Oregon State');
  assert.equal(context.wrapUp, null);
});

test('prior published week can still remain the wrap-up when no new setup exists', () => {
  const context = resolveWeeklyWorkContext({
    currentSeason: 2,
    currentWeek: 3,
    weeklyUpdates: [
      {
        season: 2,
        week: 2,
        publicationId: 'season-2-week-2',
        status: 'published',
      },
    ],
    weekFinalizations: {},
  });

  assert.equal(context.week, 2);
  assert.equal(context.publicationId, 'season-2-week-2');
  assert.ok(context.wrapUp);
  assert.equal(context.setupReady, false);
});
