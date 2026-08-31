import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildCoverageLedgerFacts, replaceCoverageReferences } from './coverageReferences.js';
import { missingCollegeGameCoverageUpdates } from './collegeGameCoverageRepair.js';
import { resolveWeeklyWorkContext } from './weeklyWorkContext.js';

const weeklyAgendaUrl = new URL('../components/WeeklyAgendaV2Portal.jsx', import.meta.url);
const ownerEnhancementsUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const coveragePortalUrl = new URL('../components/CoverageDataIntakePortal.jsx', import.meta.url);
const coverageApiUrl = new URL('../../api/analyze-coverage-reference.js', import.meta.url);

test('weekly work context keeps a published week active until finalization, then advances setup', () => {
  const base = {
    currentSeason: 2,
    currentWeek: 2,
    currentWeekSetup: { week: 1, type: 'game', label: 'Week 1' },
    weeklyUpdates: [{ id: 'season-2-week-1', publicationId: 'season-2-week-1', season: 2, week: 1, status: 'published' }],
    weekFinalizations: {},
  };

  const wrapping = resolveWeeklyWorkContext(base);
  assert.equal(wrapping.week, 1);
  assert.equal(wrapping.setupReady, true);
  assert.equal(wrapping.publicationId, 'season-2-week-1');

  const advanced = resolveWeeklyWorkContext({
    ...base,
    weekFinalizations: { 'season-2-week-1': { publicationId: 'season-2-week-1', season: 2, week: 1 } },
  });
  assert.equal(advanced.week, 2);
  assert.equal(advanced.setupReady, false);
  assert.equal(advanced.publicationId, 'season-2-week-2');
});

test('coverage references stay editorial-only and never overwrite structured career facts', () => {
  const ledger = buildCoverageLedgerFacts({
    publicationId: 'season-2-week-1',
    facts: [{ category: 'passing', team: 'CIN', subject: 'S. Jones', label: 'Passing', value: '17/34, 218 YDS, 1 TD, 1 INT', confidence: 0.98 }],
  });
  assert.equal(ledger.length, 1);
  assert.match(ledger[0].key, /^program\.coverage\.passing\./);
  assert.equal(ledger[0].editorialOnly, true);
  assert.equal(ledger[0].verified, true);

  const originalRtg = { key: 'rtg.coachTrust', value: 588, publicationId: 'season-2-week-1', verified: true };
  const next = replaceCoverageReferences({
    rtg: { coachTrust: 588 },
    factLedger: [originalRtg],
    newsroomIssues: [{ publicationId: 'season-2-week-1', editorialStatus: 'generated' }],
    podcastEpisodes: [{ publicationId: 'season-2-week-1', status: 'scripted', audioStatus: 'ready' }],
  }, {
    publicationId: 'season-2-week-1',
    season: 2,
    week: 1,
    sourceCount: 1,
    facts: [{ category: 'passing', team: 'CIN', subject: 'S. Jones', label: 'Passing', value: '17/34, 218 YDS, 1 TD, 1 INT', confidence: 0.98 }],
  });

  assert.equal(next.rtg.coachTrust, 588);
  assert.ok(next.factLedger.some((fact) => fact.key === 'rtg.coachTrust'));
  assert.ok(next.factLedger.some((fact) => fact.key.startsWith('program.coverage.passing.')));
  assert.equal(next.newsroomIssues[0].editorialStatus, 'needs-regeneration');
  assert.equal(next.podcastEpisodes[0].status, 'needs-regeneration');
  assert.equal(next.podcastEpisodes[0].audioStatus, 'stale');
});

test('published college games without a player appearance are eligible for newsroom repair', () => {
  const missing = missingCollegeGameCoverageUpdates({
    careerPhase: 'Player',
    player: { isCommitted: true, college: 'Cincinnati' },
    weeklyUpdates: [{
      publicationId: 'season-2-week-1',
      status: 'published',
      season: 2,
      week: 1,
      weekType: 'no-appearance',
      game: { opponent: 'Kansas State', result: 'L', homeScore: 14, awayScore: 29, didPlay: false },
    }],
    newsroomIssues: [],
  });
  assert.equal(missing.length, 1);
  assert.equal(missing[0].publicationId, 'season-2-week-1');
});

test('weekly agenda guided actions cannot reclassify themselves as legacy action containers', async () => {
  const source = await readFile(weeklyAgendaUrl, 'utf8');
  assert.match(source, /!button\.closest\('\[data-guided-weekly-action\]'\)/);
  assert.match(source, /const findOriginalActions =/);
  assert.match(source, /originalActions\?\.parentElement === agenda/);
  assert.match(source, /observer\.observe\(appRoot, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(source, /observer\.observe\(document\.body/);
});

test('owner workflow mounts coverage repair and editorial-only intake tools', async () => {
  const [owner, portal, api] = await Promise.all([
    readFile(ownerEnhancementsUrl, 'utf8'),
    readFile(coveragePortalUrl, 'utf8'),
    readFile(coverageApiUrl, 'utf8'),
  ]);
  assert.match(owner, /CollegeGameCoverageRepairPortal/);
  assert.match(owner, /CoverageDataIntakePortal/);
  assert.match(owner, /WeeklyDataIntakePortal/);
  assert.match(portal, /Newsroom and Podcast can use them; your RTG stats and career totals cannot/);
  assert.match(portal, /editorial-only and never write into your player stat line/);
  assert.match(api, /Newsroom articles and podcast talking points ONLY/);
});
