import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildMediaNetworkLayer, latestMeaningfulMediaContext } from './mediaNetworkLayer.js';

test('media network keeps official in-game coverage separate from DynastyHQ editorial media', () => {
  const state = {
    currentSeason: 2,
    currentWeek: 3,
    gameLogs: [{ season: 2, week: 2, opponent: 'Baylor', result: 'L', homeScore: 21, awayScore: 45 }],
    officialCoverage: [{ season: 2, week: 2, publicationId: 'season-2-week-2', headline: 'Baylor powers past Oregon', summary: 'Official in-game recap.' }],
    newsroomIssues: [{
      season: 2,
      week: 2,
      publicationId: 'season-2-week-2',
      articles: [{ outletId: 'local', headline: 'Oregon Week 2: The Reality Check', dek: 'DynastyHQ analysis.' }],
    }],
    podcastEpisodes: [{ season: 2, week: 2, publicationId: 'season-2-week-2', title: 'Oregon Week 2: The Reality Check', status: 'published', audioStatus: 'ready', audioSource: 'notebooklm' }],
  };

  const model = buildMediaNetworkLayer(state, { season: 2, week: 2 });
  assert.equal(model.official.status, 'captured');
  assert.equal(model.official.headline, 'Baylor powers past Oregon');
  assert.equal(model.dynasty.headline, 'Oregon Week 2: The Reality Check');
  assert.equal(model.dynasty.podcastReady, true);
  assert.equal(model.dynasty.finishedPodcast, true);
  assert.ok(model.ticker.some((item) => item.source === 'EA SPORTS NETWORK'));
  assert.ok(model.ticker.some((item) => item.source === 'DYNASTYHQ'));
});

test('legacy official evidence stays available as archive metadata but never becomes a ticker headline', () => {
  const state = {
    currentSeason: 2,
    currentWeek: 2,
    weeklyUpdates: [{ season: 2, week: 2, publicationId: 'season-2-week-2', sourceCount: 9, game: { opponent: 'Baylor', result: 'L', homeScore: 21, awayScore: 45 } }],
    coverageReferences: [{ publicationId: 'season-2-week-2', season: 2, week: 2, factCount: 23 }],
  };

  const model = buildMediaNetworkLayer(state, { season: 2, week: 2 });
  assert.equal(model.official.status, 'legacy-evidence');
  assert.equal(model.official.factCount, 23);
  assert.equal(model.official.headline, '');
  assert.equal(model.ticker.some((item) => item.source === 'EA SPORTS NETWORK'), false);
  assert.equal(model.ticker.some((item) => /verified official-coverage facts preserved/i.test(item.text)), false);
});

test('home and pregame surfaces keep the latest real media story even when the team schedule has advanced', () => {
  const state = {
    currentSeason: 2,
    currentWeek: 5,
    player: { college: 'Oregon' },
    seasonSchedules: [{
      season: 2,
      school: 'Oregon',
      entries: [
        { week: 2, opponent: 'Baylor', status: 'completed', result: 'L', teamScore: 21, opponentScore: 45 },
        { week: 3, opponent: 'Oregon State', status: 'completed', result: 'W', teamScore: 33, opponentScore: 15 },
        { week: 5, opponent: 'Michigan State', status: 'upcoming', homeAway: 'home' },
      ],
    }],
    newsroomIssues: [{
      season: 2,
      week: 2,
      publicationId: 'season-2-week-2',
      articles: [{ headline: 'Oregon Falls to Baylor in Season Opener', dek: 'The first start became a difficult road test.' }],
    }],
    podcastEpisodes: [{ season: 2, week: 2, publicationId: 'season-2-week-2', title: 'Oregon Week 2: The Reality Check', status: 'published', audioStatus: 'ready' }],
  };

  const context = latestMeaningfulMediaContext(state);
  assert.equal(context.season, 2);
  assert.equal(context.week, 2);
  assert.equal(context.opponent, 'Baylor');
  const media = buildMediaNetworkLayer(state, context);
  assert.equal(media.dynasty.newsroomReady, true);
  assert.equal(media.dynasty.podcastReady, true);
});

test('Latest Network Wire is no longer rendered because Season Wire owns the site-wide ticker', async () => {
  const source = await readFile(new URL('../components/MediaNetworkLayerPortal.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /<NetworkWire items=\{model\.ticker\}/);
  assert.match(source, /Latest Network Wire retired: Season Wire is the single site-wide ticker/);
});

test('official coverage reader accepts open requests from Around the Program', async () => {
  const source = await readFile(new URL('../components/OfficialCoverageReaderPortal.jsx', import.meta.url), 'utf8');
  assert.match(source, /dynastyhq:open-official-coverage/);
  assert.match(source, /findArticleForRequest/);
});


test('official reader resolves saved EA Sports stories from all supported coverage pools', async () => {
  const source = await readFile(new URL('../components/OfficialCoverageReaderPortal.jsx', import.meta.url), 'utf8');
  assert.match(source, /career\.eaSportsNetworkArticles/);
  assert.match(source, /career\.eaSportsNetwork/);
  assert.match(source, /career\.officialCoverage/);
  assert.match(source, /officialCoverageForWeek\(career, season, week\)/);
});


test('Newsroom exposes a dedicated EA Sports Network Official Feed with an inline reader', async () => {
  const source = await readFile(new URL('../components/NewsroomTeamHubPortal.jsx', import.meta.url), 'utf8');
  assert.match(source, /Official Feed/);
  assert.match(source, /officialArticlePool/);
  assert.match(source, /OfficialFeedCard/);
  assert.match(source, /OfficialFeedReader/);
  assert.match(source, /OFFICIAL WIRE BRIEF/);
  assert.match(source, /RELATED DYNASTYHQ COVERAGE/);
  assert.match(source, /dynastyhq:newsroom-official-focus/);
});

test('legacy official article routes now send readers to the Newsroom instead of the detached modal', async () => {
  const source = await readFile(new URL('../components/OfficialCoverageReaderPortal.jsx', import.meta.url), 'utf8');
  assert.match(source, /openOfficialInNewsroom/);
  assert.match(source, /dynastyhq:newsroom-official-focus/);
  assert.match(source, /Only the original headline and story brief were preserved from this edition/);
});
