import test from 'node:test';
import assert from 'node:assert/strict';

import { createEmptyScanDraft } from './weeklyEngine.js';
import { createWeeklyDraftRecoveryRecord, inspectWeeklyDraftRecovery } from './weeklyDraftRecovery.js';

const state = {
  currentSeason: 1,
  currentWeek: 3,
  careerPhase: 'Player',
  weeklyUpdates: [],
  gameLogs: [],
};

test('creates a compact user-scoped recovery record without screenshot data URLs', () => {
  const draft = {
    ...createEmptyScanDraft({ season: 1, week: 3 }),
    sources: [{ id: 'box', fileName: 'box.png', previewUrl: 'data:image/jpeg;base64,very-large' }],
  };
  const record = createWeeklyDraftRecoveryRecord({ ownerId: 'user-1', scanDraft: draft, savedAt: '2026-07-31T12:00:00.000Z' });

  assert.equal(record.ownerId, 'user-1');
  assert.equal(record.scanDraft.sources[0].previewUrl, undefined);
  assert.equal(record.scanDraft.sources[0].previewWasRemoved, true);
});

test('restores only the current career phase and week for the same owner', () => {
  const draft = createEmptyScanDraft({ season: 1, week: 3, careerPhase: 'Player' });
  const record = createWeeklyDraftRecoveryRecord({ ownerId: 'user-1', scanDraft: draft });

  assert.equal(inspectWeeklyDraftRecovery({ record, ownerId: 'user-1', state }).status, 'recoverable');
  assert.equal(inspectWeeklyDraftRecovery({ record, ownerId: 'user-2', state }).status, 'wrong-owner');
  assert.equal(inspectWeeklyDraftRecovery({ record, ownerId: 'user-1', state: { ...state, currentWeek: 4 } }).status, 'stale');
  assert.equal(inspectWeeklyDraftRecovery({ record, ownerId: 'user-1', state: { ...state, careerPhase: 'OC' } }).status, 'stale');
});

test('refuses to recover a week that was already published', () => {
  const draft = createEmptyScanDraft({ season: 1, week: 3, careerPhase: 'Player' });
  const record = createWeeklyDraftRecoveryRecord({ ownerId: 'user-1', appliedScanDraft: draft });
  const publishedState = {
    ...state,
    currentWeek: 4,
    weeklyUpdates: [{ id: 'season-1-week-3', weekKey: 'season-1-week-3', season: 1, week: 3 }],
  };

  assert.equal(inspectWeeklyDraftRecovery({ record, ownerId: 'user-1', state: publishedState }).status, 'already-published');
});
