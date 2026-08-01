import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRtgProgress,
  createRtgSnapshot,
  diffRtgSnapshots,
  formatRtgDelta,
} from './rtgProgress.js';

test('normalizes a durable RTG mechanics and NIL snapshot', () => {
  assert.deepEqual(createRtgSnapshot({
    gpa: '3.4', energy: '72', coachTrust: 1200, rank: 'QB2', followers: '4500',
    valuation: '', wear: { head: 'Green', chest: '', legs: 'Yellow' },
  }), {
    gpa: 3.4,
    energy: 72,
    coachTrust: 1200,
    rank: 'QB2',
    followers: 4500,
    wear: { head: 'Green', legs: 'Yellow' },
  });
});

test('calculates week-to-week numeric and status changes', () => {
  const changes = diffRtgSnapshots(
    { gpa: 3.5, coachTrust: 1350, rank: 'QB1', valuation: 12000 },
    { gpa: 3.4, coachTrust: 1200, rank: 'QB2', valuation: 9000 },
  );
  assert.equal(changes.find((entry) => entry.key === 'coachTrust').delta, 150);
  assert.equal(changes.find((entry) => entry.key === 'rank').delta, null);
  assert.equal(formatRtgDelta(changes.find((entry) => entry.key === 'valuation')), '+3,000');
});

test('builds a full career progression from weekly snapshots', () => {
  const progress = buildRtgProgress({
    rtg: { coachTrust: 1400, followers: 2000 },
    weeklyUpdates: [
      { id: 's1w2', season: 1, week: 2, rtgSnapshot: { coachTrust: 1200, followers: 2000 } },
      { id: 's1w1', season: 1, week: 1, rtgSnapshot: { coachTrust: 900, followers: 1000 } },
      { id: 'legacy', season: 1, week: 0 },
    ],
  });
  assert.deepEqual(progress.snapshots.map((entry) => entry.id), ['s1w1', 's1w2']);
  assert.equal(progress.latest.coachTrust, 1400);
  assert.equal(progress.careerChanges.find((entry) => entry.key === 'coachTrust').delta, 500);
  assert.equal(progress.careerChanges.find((entry) => entry.key === 'followers').delta, 1000);
});
