import assert from 'node:assert/strict';
import test from 'node:test';
import {
  officialCoverageCandidateFromAnalysis,
  officialCoverageForWeek,
} from './officialCoverageCapture.js';

test('recognizes EA SPORTS Network source metadata from a scanned screenshot', () => {
  const candidate = officialCoverageCandidateFromAnalysis({
    fileName: 'IMG_2048.jpg',
    analysis: {
      screenTitle: 'Oregon looks to respond after Baylor loss',
      summary: 'EA SPORTS Network article recapping Oregon vs Baylor.',
      screenTypes: ['unknown'],
    },
  });

  assert.equal(candidate?.outlet, 'EA SPORTS Network');
  assert.equal(candidate?.headline, 'Oregon looks to respond after Baylor loss');
  assert.match(candidate?.summary || '', /EA SPORTS Network/);
});

test('does not classify ordinary game-stat scans as official coverage', () => {
  const candidate = officialCoverageCandidateFromAnalysis({
    analysis: {
      screenTitle: 'Player Stats',
      summary: 'Passing and rushing totals for Oregon and Baylor.',
      screenTypes: ['box_score'],
    },
  });
  assert.equal(candidate, null);
});

test('prefers durable official coverage when Game Hub resolves a published week', () => {
  const state = {
    officialCoverage: [{
      publicationId: 'season-2-week-2',
      season: 2,
      week: 2,
      headline: 'Official Week 2 recap',
    }],
    weeklyUpdates: [{ weekKey: 'season-2-week-2', season: 2, week: 2, sourceCount: 8 }],
  };
  const resolved = officialCoverageForWeek(state, 2, 2);
  assert.equal(resolved.kind, 'official');
  assert.equal(resolved.entry.headline, 'Official Week 2 recap');
});

test('legacy imported weeks no longer claim the official article was never captured', () => {
  const state = {
    weeklyUpdates: [{ weekKey: 'season-2-week-2', season: 2, week: 2, sourceCount: 9 }],
    coverageReferences: [{ publicationId: 'season-2-week-2', factCount: 97 }],
  };
  const resolved = officialCoverageForWeek(state, 2, 2);
  assert.equal(resolved.kind, 'legacy-import');
  assert.equal(resolved.sourceCount, 9);
  assert.equal(resolved.coverageFactCount, 97);
});
