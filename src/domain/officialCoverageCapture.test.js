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

test('preserves structured official article text without rewriting it', () => {
  const candidate = officialCoverageCandidateFromAnalysis({
    fileName: 'ea-page-1.jpg',
    analysis: {
      screenTitle: 'Ducks regroup after road setback',
      summary: 'Oregon returns home after a difficult night in Waco.',
      screenTypes: ['ea_sports_network_article'],
      officialArticle: {
        outlet: 'EA SPORTS Network',
        headline: 'Ducks regroup after road setback',
        dek: 'Oregon returns home after a difficult night in Waco.',
        byline: 'EA SPORTS Network Staff',
        body: 'The Ducks left Waco with questions to answer.\n\nTheir next test comes at home.',
        pageLabel: 'College Football',
      },
    },
  });

  assert.equal(candidate?.headline, 'Ducks regroup after road setback');
  assert.equal(candidate?.dek, 'Oregon returns home after a difficult night in Waco.');
  assert.equal(candidate?.byline, 'EA SPORTS Network Staff');
  assert.match(candidate?.body || '', /questions to answer/);
  assert.equal(candidate?.pageLabel, 'College Football');
});

test('does not classify ordinary game-stat scans as official coverage', () => {
  const candidate = officialCoverageCandidateFromAnalysis({
    analysis: {
      screenTitle: 'Player Stats',
      summary: 'Passing and rushing totals for Oregon and Baylor.',
      screenTypes: ['box_score'],
      officialArticle: {
        outlet: '', headline: '', dek: '', byline: '', body: '', pageLabel: '',
      },
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
