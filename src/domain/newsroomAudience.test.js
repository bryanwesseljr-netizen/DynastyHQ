import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { buildProgramCoverageContext } from './programCoverage.js';
import { buildNewsroomGenerationPayload } from './newsroomGeneration.js';
import { resolveNewsroomPresentation } from './newsroomPresentation.js';

const issueFor = (week, extra = {}) => ({
  id: `season-1-week-${week}`,
  publicationId: `season-1-week-${week}`,
  season: 1,
  week,
  weekType: 'game',
  weekPhase: 'regular-season',
  careerPhase: 'Player',
  label: `Week ${week}`,
  articles: [
    { id: 'local', outletId: 'college-local', outletName: 'Bearcats Insider', theme: 'local', desk: 'Cincinnati Beat' },
    { id: 'regional', outletId: 'college-regional', outletName: 'Ohio Valley Football Report', theme: 'regional', desk: 'Regional College Football' },
    { id: 'filmroom', outletId: 'filmroom', outletName: 'The Film Room', theme: 'filmroom', desk: 'Analysis' },
    { id: 'national', outletId: 'national', outletName: 'College Football Central', theme: 'network', desk: 'National College Football' },
  ],
  ...extra,
});

const updateFor = (week, { rank = 'QB3', game = null } = {}) => ({
  id: `season-1-week-${week}`,
  publicationId: `season-1-week-${week}`,
  weekKey: `season-1-week-${week}`,
  season: 1,
  week,
  careerPhase: 'Player',
  weekType: game ? 'game' : 'bye',
  game,
  rtgSnapshot: { rank },
});

const gameFor = (week, extra = {}) => ({
  opponent: `Opponent ${week}`,
  result: 'W',
  homeScore: 31,
  awayScore: 20,
  passYds: '',
  passTD: '',
  rushYds: '',
  rushTD: '',
  int: '',
  didPlay: false,
  season: 1,
  week,
  ...extra,
});

const fact = (week, key, label, value) => ({
  id: `fact-${week}-${key}`,
  publicationId: `season-1-week-${week}`,
  verified: true,
  key,
  label,
  value,
  editorialUse: 'primary',
});

const stateFor = ({ issue, updates, gameLogs = [], facts = [] }) => ({
  player: { name: 'Bryan Wessel', school: 'Cincinnati', college: 'Cincinnati', isCommitted: true, pos: 'QB', number: '2' },
  rtg: { rank: updates.at(-1)?.rtgSnapshot?.rank || 'QB3' },
  newsroomIssues: [issue],
  podcastEpisodes: [],
  weeklyUpdates: updates,
  gameLogs,
  factLedger: facts,
});

test('ordinary Cincinnati win earns regional coverage but not national coverage', () => {
  const issue = issueFor(1);
  const game = gameFor(1);
  const state = stateFor({
    issue,
    updates: [updateFor(0), updateFor(1, { game })],
    gameLogs: [game],
    facts: [
      fact(1, 'game.opponent', 'Opponent', game.opponent),
      fact(1, 'game.result', 'Result', 'W'),
      fact(1, 'game.homeScore', 'Cincinnati score', 31),
      fact(1, 'game.awayScore', 'Opponent score', 20),
    ],
  });

  const context = buildProgramCoverageContext(state, issue);
  assert.equal(context.coverageDecision.audienceReach.level, 'regional');
  assert.equal(context.coverageDecision.audienceReach.nationalEligible, false);
  assert.deepEqual(context.storyPlans.map((plan) => plan.outletId), ['college-local', 'college-regional']);
});

test('QB3 to QB2 promotion can be important locally without becoming national news', () => {
  const issue = issueFor(2, { weekType: 'bye' });
  const state = stateFor({
    issue,
    updates: [updateFor(1, { rank: 'QB3' }), updateFor(2, { rank: 'QB2' })],
    facts: [fact(2, 'rtg.rank', 'Depth chart', 'QB2')],
  });

  const context = buildProgramCoverageContext(state, issue);
  assert.equal(context.relevance.promoted, true);
  assert.equal(context.coverageDecision.audienceReach.nationalEligible, false);
  assert.equal(context.storyPlans.some((plan) => plan.outletId === 'national'), false);
  assert.equal(context.storyPlans.some((plan) => plan.storyType === 'qb-room-analysis'), true);
});

test('decisive win over a visible top-10 opponent earns a national lead assignment', () => {
  const issue = issueFor(4);
  const game = gameFor(4, { opponent: 'Ranked Opponent', homeScore: 42, awayScore: 17 });
  const state = stateFor({
    issue,
    updates: [updateFor(3), updateFor(4, { game })],
    gameLogs: [game],
    facts: [
      fact(4, 'game.opponent', 'Opponent', game.opponent),
      fact(4, 'game.result', 'Result', 'W'),
      fact(4, 'game.homeScore', 'Cincinnati score', 42),
      fact(4, 'game.awayScore', 'Opponent score', 17),
      fact(4, 'game.opponentRank', 'Opponent ranking', 8),
    ],
  });

  const context = buildProgramCoverageContext(state, issue);
  assert.equal(context.coverageDecision.audienceReach.nationalEligible, true);
  assert.equal(context.coverageDecision.audienceReach.nationalLead, true);
  assert.ok(context.coverageDecision.articleCount >= 3);
  assert.deepEqual(context.storyPlans.slice(0, 3).map((plan) => plan.outletId), ['college-local', 'college-regional', 'national']);

  const payload = buildNewsroomGenerationPayload(state, issue.publicationId);
  const national = payload.articleBriefs.find((brief) => brief.outletId === 'national');
  assert.equal(national?.audience, 'national-lead');
  assert.match(national?.angle || '', /earned national attention/i);
  assert.ok(national?.focusFactIds.length > 0);
});

test('routine portal decision stays below national attention without national-scale evidence', () => {
  const issue = issueFor(6, { weekType: 'bye' });
  const state = stateFor({
    issue,
    updates: [updateFor(6)],
    facts: [fact(6, 'transfer.decision', 'Transfer decision', 'Entered transfer portal')],
  });

  const context = buildProgramCoverageContext(state, issue);
  assert.equal(context.coverageDecision.tier, 'major');
  assert.equal(context.coverageDecision.audienceReach.regionalEligible, true);
  assert.equal(context.coverageDecision.audienceReach.nationalEligible, false);
  assert.equal(context.storyPlans.some((plan) => plan.outletId === 'national'), false);
});

test('nationally significant roster movement can earn national coverage from explicit evidence', () => {
  const issue = issueFor(7, { weekType: 'bye' });
  const state = stateFor({
    issue,
    updates: [updateFor(7)],
    facts: [fact(7, 'portal.addition', 'Transfer portal addition', 'All-American starting quarterback transfers to Cincinnati')],
  });

  const context = buildProgramCoverageContext(state, issue);
  assert.equal(context.coverageDecision.audienceReach.nationalEligible, true);
  assert.equal(context.storyPlans.some((plan) => plan.outletId === 'national'), true);
});

test('publication presentation changes by audience instead of recoloring one generic article', () => {
  assert.equal(resolveNewsroomPresentation({ audience: 'local' }).layout, 'local-beat');
  assert.equal(resolveNewsroomPresentation({ audience: 'regional' }).layout, 'regional-report');
  assert.equal(resolveNewsroomPresentation({ audience: 'national' }).layout, 'national-desk');
  assert.equal(resolveNewsroomPresentation({ audience: 'national-lead' }).layout, 'national-desk');
});

test('newsroom v3 reader and CSS include publication-style local regional and national layouts', async () => {
  const [reader, styles, scanner, writer] = await Promise.all([
    readFile(new URL('../components/NewsroomArticleReader.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../newsroom-v3.css', import.meta.url), 'utf8'),
    readFile(new URL('../../api/analyze-screenshot.js', import.meta.url), 'utf8'),
    readFile(new URL('../../api/generate-newsroom.js', import.meta.url), 'utf8'),
  ]);

  assert.match(reader, /data-audience=\{extras\.audience\}/);
  assert.match(reader, /dhq-news-masthead__strapline/);
  assert.match(styles, /data-audience="local"/);
  assert.match(styles, /column-count: 2/);
  assert.match(styles, /data-audience="regional"/);
  assert.match(styles, /data-audience="national"/);
  assert.match(styles, /data-audience="national-lead"/);
  assert.match(scanner, /'game\.teamRank'/);
  assert.match(scanner, /'game\.opponentRank'/);
  assert.match(scanner, /Never infer a ranking from a logo/);
  assert.match(writer, /Story importance and audience reach are separate/);
  assert.match(writer, /national assignment may appear only because/i);
});
