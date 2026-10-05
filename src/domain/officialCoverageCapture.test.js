import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyOfficialCoverageLegacyBackfill,
  mergeOfficialCoveragePages,
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


test('stitches multiple EA SPORTS Network screenshot pages into one article in upload order', () => {
  const merged=mergeOfficialCoveragePages([
    {
      fileName:'page-1.jpg',
      headline:'STATEMENT WIN',
      body:'First paragraph.\n\nSecond paragraph continues the recap.',
      imageDataUrl:'data:image/jpeg;base64,page1',
    },
    {
      fileName:'page-2.jpg',
      headline:'',
      body:'The win improved Oregon\'s record to 7-3.\n\nLooking ahead, Oregon and Washington will face off.',
      imageDataUrl:'data:image/jpeg;base64,page2',
    },
  ]);
  assert.equal(merged.headline,'STATEMENT WIN');
  assert.equal(merged.pageCount,2);
  assert.equal(merged.sourcePages.length,2);
  assert.match(merged.body,/Second paragraph continues/);
  assert.match(merged.body,/The win improved Oregon's record to 7-3/);
  assert.match(merged.body,/Looking ahead, Oregon and Washington/);
});

test('removes repeated overlap when adjacent article screenshots share visible text', () => {
  const merged=mergeOfficialCoveragePages([
    {headline:'Overlap Test',body:'Oregon controlled the second half and pulled away late in the fourth quarter.'},
    {headline:'',body:'pulled away late in the fourth quarter. The Ducks then turned their attention to next week.'},
  ]);
  const occurrences=(merged.body.match(/pulled away late in the fourth quarter/gi)||[]).length;
  assert.equal(occurrences,1);
  assert.match(merged.body,/turned their attention to next week/);
});

test('backfills the complete Week 12 Wisconsin official recap from the verified two-page source', () => {
  const repaired=applyOfficialCoverageLegacyBackfill({
    season:4,
    week:12,
    headline:'STATEMENT WIN',
    body:'Winning is always nice, but doing so behind a season-high score is even better (just ask Oregon). The Ducks took their contest on Saturday with ease, bagging a 59-17 win over the Wisconsin Badgers.',
  },{season:4,week:12,opponent:'Wisconsin'});
  assert.equal(repaired.pageCount,2);
  assert.match(repaired.body,/Brandon Smith helped Wessel out on the ground/);
  assert.match(repaired.body,/The win improved Oregon's record to 7-3/);
  assert.match(repaired.body,/Oregon and Washington will face off in a Big Ten clash/);
  assert.match(repaired.body,/Nobody's giving us a chance, which is exactly how we like it/);
});

test('week resolver merges separately saved official pages before returning Chronicle media', () => {
  const state={
    eaSportsNetworkArticles:[
      {publicationId:'season-3-week-5',season:3,week:5,headline:'Two Page Story',body:'Page one body.'},
      {publicationId:'season-3-week-5',season:3,week:5,headline:'',body:'Page two body.'},
    ],
  };
  const resolved=officialCoverageForWeek(state,3,5);
  assert.equal(resolved.kind,'official');
  assert.equal(resolved.entry.pageCount,2);
  assert.match(resolved.entry.body,/Page one body/);
  assert.match(resolved.entry.body,/Page two body/);
});


test('preserves the automatically stitched EA article asset when official pages are merged', () => {
  const merged=mergeOfficialCoveragePages([
    {
      fileName:'page-1.jpg',
      headline:'Five Alive!',
      body:'Page one body.',
      screenshotUrl:'https://example.test/page-1.jpg',
      stitchedScreenshotUrl:'https://example.test/stitched.jpg',
      stitchedStoragePath:'users/test/ea/stitched.jpg',
      stitchedMimeType:'image/jpeg',
      stitchedSizeBytes:456789,
      stitchMeta:{width:1800,height:2400,pageCount:2,overlaps:[214]},
    },
    {
      fileName:'page-2.jpg',
      headline:'',
      body:'Page two body.',
      screenshotUrl:'https://example.test/page-2.jpg',
    },
  ]);

  assert.equal(merged.stitchedScreenshotUrl,'https://example.test/stitched.jpg');
  assert.equal(merged.stitchedStoragePath,'users/test/ea/stitched.jpg');
  assert.equal(merged.stitchedMimeType,'image/jpeg');
  assert.equal(merged.stitchedSizeBytes,456789);
  assert.equal(merged.stitchMeta?.pageCount,2);
  assert.deepEqual(merged.stitchMeta?.overlaps,[214]);
});
