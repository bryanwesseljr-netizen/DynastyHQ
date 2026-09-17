import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGameDayLiveV2 } from './gameDayLiveV2.js';

const state = {
  currentSeason: 2,
  currentWeek: 5,
  currentWeekSetup: {
    week: 5,
    type: 'game',
    opponent: 'Michigan State',
    opponentRank: '18',
    opponentRecord: '4-0',
    venue: 'Autzen Stadium',
    kickoff: '7:30 PM',
  },
  player: { name: 'Sam Jones', college: 'Oregon', pos: 'QB', number: '7', overall: 78 },
  rtg: { rank: 'QB1', coachTrust: 1250, skillPoints: 41 },
  seasonSchedules: [{
    season: 2,
    school: 'Oregon',
    entries: [
      { week: 1, opponent: 'North Dakota State', status: 'completed', result: 'W', teamScore: 42, opponentScore: 24 },
      { week: 2, opponent: 'Baylor', status: 'completed', result: 'L', teamScore: 21, opponentScore: 45 },
      { week: 3, opponent: 'Oregon State', status: 'completed', result: 'W', teamScore: 33, opponentScore: 15 },
      { week: 4, opponent: 'BYE', isBye: true, status: 'bye' },
      { week: 5, opponent: 'Michigan State', status: 'upcoming', homeAway: 'home' },
      { week: 6, opponent: 'Washington', status: 'upcoming', homeAway: 'away' },
    ],
  }],
  gameLogs: [
    { season: 2, week: 2, opponent: 'Baylor', result: 'L', homeScore: 21, awayScore: 45, passYds: 203, passTD: 1, rushYds: 26, rushTD: 0, int: 2 },
    { season: 2, week: 3, opponent: 'Oregon State', result: 'W', homeScore: 33, awayScore: 15, passYds: 244, passTD: 2, rushYds: 41, rushTD: 1, int: 0 },
  ],
  newsroomIssues: [{ season: 2, week: 3, publicationId: 'season-2-week-3', articles: [{ headline: 'Ducks steady the season', dek: 'Oregon answered its road loss.' }] }],
  podcastEpisodes: [{ season: 2, week: 3, publicationId: 'season-2-week-3', title: 'Oregon Week 3', status: 'published', audioStatus: 'ready' }],
};

test('builds a grounded pregame broadcast model from saved career context', () => {
  const live = buildGameDayLiveV2(state);
  assert.equal(live.ready, true);
  assert.equal(live.opponent, 'Michigan State');
  assert.equal(live.record, '2-1');
  assert.equal(live.venue, 'Autzen Stadium');
  assert.equal(live.recentForm.at(-1).opponent, 'Oregon State');
  assert.equal(live.roadAhead[0].opponent, 'Washington');
  assert.equal(live.lastPlayerLine.passYds, 244);
  assert.ok(live.stakes.some((item) => /#18/.test(item.title)));
  assert.ok(live.media.items.some((item) => item.id === 'newsroom'));
  assert.ok(live.media.items.some((item) => item.id === 'podcast'));
});

test('falls forward to the next scheduled game when player-week state is behind the team schedule', () => {
  const live = buildGameDayLiveV2({
    ...state,
    currentWeek: 2,
    currentWeekSetup: {},
  });
  assert.equal(live.ready, true);
  assert.equal(live.week, 5);
  assert.equal(live.opponent, 'Michigan State');
  assert.equal(live.activationSource, 'season-schedule');
  assert.equal(live.record, '2-1');
  assert.equal(live.recentForm.at(-1).opponent, 'Oregon State');
});

test('historical backfill pregame uses distinct player, momentum, and matchup angles', () => {
  const live = buildGameDayLiveV2({
    ...state,
    currentWeek: 3,
    currentWeekSetup: {
      week: 3,
      type: 'game',
      opponent: 'Oregon State',
      opponentRecord: '0-2',
      venue: 'Reser Stadium, Corvallis, OR',
      kickoff: 'Saturday, 3:30 PM',
    },
    player: { ...state.player, name: 'Bryan Wessel', number: '6' },
    rtg: { ...state.rtg, rank: 'QB1', coachTrust: 1148 },
    gameLogs: [state.gameLogs[0]],
    seasonSchedules: [{
      ...state.seasonSchedules[0],
      entries: state.seasonSchedules[0].entries.map((entry) => (
        entry.week === 3 ? { ...entry, homeAway: 'away' } : entry
      )),
    }],
  });

  assert.equal(live.record, '1-1');
  assert.equal(live.stakes[0].label, 'YOUR STORY');
  assert.match(live.stakes[0].title, /Bryan Wessel leads Oregon into Week 3 as the starter/);
  assert.doesNotMatch(live.stakes[0].title, /^QB1 moves/);
  assert.match(live.stakes[0].detail, /last verified appearance came against Baylor/);

  assert.equal(live.stakes[1].label, 'TEAM MOMENTUM');
  assert.match(live.stakes[1].title, /response opportunity after Baylor/);
  assert.match(live.stakes[1].detail, /enters Week 3 at 1-1/);

  assert.equal(live.stakes[2].label, 'NEXT TEST');
  assert.equal(live.stakes[2].title, 'The next test comes on the road in Corvallis');
  assert.match(live.stakes[2].detail, /Oregon State enters 0-2/);
  assert.match(live.stakes[2].detail, /Reser Stadium, Corvallis, OR/);
});

test('does not invent opponent scout content when setup only has matchup identity', () => {
  const live = buildGameDayLiveV2({
    currentSeason: 1,
    currentWeek: 1,
    currentWeekSetup: { week: 1, type: 'game', opponent: 'Tulsa' },
    player: { college: 'Cincinnati', name: 'QB' },
  });
  assert.equal(live.ready, true);
  assert.equal(live.opponent, 'Tulsa');
  assert.ok(live.stakes.length >= 1);
  assert.equal(live.matchup.record, '');
  assert.equal(live.matchup.rank, '');
});
