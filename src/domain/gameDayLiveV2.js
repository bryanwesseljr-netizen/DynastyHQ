import { buildGameDayBrief } from './gameDayBriefV2.js';
import { buildMediaNetworkLayer, latestCompletedMediaContext } from './mediaNetworkLayer.js';
import { seasonScheduleFor, syncScheduleWithCareer } from './seasonSchedule.js';

const clean = (value, max = 1200) => String(value ?? '').trim().slice(0, max);
const list = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const numberOf = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const scoreText = (entry = {}) => (
  entry.teamScore !== null && entry.teamScore !== undefined
    && entry.opponentScore !== null && entry.opponentScore !== undefined
    ? `${entry.teamScore}-${entry.opponentScore}`
    : ''
);

const scheduleContext = (state = {}, season = 1, week = 0) => {
  const schedule = seasonScheduleFor(state, season);
  if (!schedule?.entries?.length) return { current: null, recent: [], next: [] };
  const synced = syncScheduleWithCareer(state, schedule);
  return {
    current: synced.entries.find((entry) => Number(entry.week) === Number(week)) || null,
    recent: synced.entries
      .filter((entry) => !entry.isBye && entry.completed && Number(entry.week) < Number(week))
      .sort((left, right) => Number(left.week) - Number(right.week))
      .slice(-3),
    next: synced.entries
      .filter((entry) => !entry.isBye && !entry.completed && Number(entry.week) > Number(week))
      .sort((left, right) => Number(left.week) - Number(right.week))
      .slice(0, 3),
  };
};

const latestGameFor = (state = {}, season = 1, week = 0) => list(state.gameLogs)
  .filter((game) => game?.stage !== 'high-school' && !game?.evaluation && game?.didPlay !== false)
  .filter((game) => Number(game?.season || 1) === Number(season) && Number(game?.week || 0) < Number(week))
  .sort((left, right) => Number(left.week || 0) - Number(right.week || 0))
  .at(-1) || null;

const mediaSpotlights = (state = {}) => {
  const context = latestCompletedMediaContext(state);
  const media = buildMediaNetworkLayer(state, context);
  const items = [];
  if (media.dynasty.newsroomReady && clean(media.dynasty.headline)) items.push({
    id: 'newsroom',
    label: 'NEWSROOM',
    title: clean(media.dynasty.headline, 240),
    detail: clean(media.dynasty.dek, 420) || 'Latest DynastyHQ coverage.',
    target: 'newsroom',
  });
  if (media.dynasty.podcastReady && clean(media.dynasty.podcastTitle)) items.push({
    id: 'podcast',
    label: 'THE HUDDLE',
    title: clean(media.dynasty.podcastTitle, 240),
    detail: media.dynasty.finishedPodcast ? 'Finished episode ready to play.' : 'Latest episode is ready.',
    target: 'podcast',
  });
  if (media.official.status === 'captured' && clean(media.official.headline)) items.push({
    id: 'official',
    label: 'EA SPORTS NETWORK',
    title: clean(media.official.headline, 240),
    detail: clean(media.official.summary, 420) || 'Official in-game coverage from the previous week.',
    target: 'gameHub',
  });
  return { context, items: items.slice(0, 3) };
};

const stakesFor = ({ brief, latestGame, setup = {} }) => {
  const items = [];
  const lead = brief.storyline?.lead;
  if (lead?.title) items.push({ label: 'CAREER THREAD', title: clean(lead.title, 180), detail: clean(lead.detail, 360) });

  const rank = clean(brief.matchup?.rank);
  if (rank) items.push({
    label: 'THE STAGE',
    title: `${brief.opponent} enters at ${rank.startsWith('#') ? rank : `#${rank}`}`,
    detail: clean(brief.matchup?.record) ? `Saved opponent record: ${brief.matchup.record}.` : 'The ranking is verified in the current Week Setup.',
  });

  const lastResult = clean(latestGame?.result).toUpperCase();
  if (lastResult === 'L') items.push({
    label: 'RESPONSE WEEK',
    title: 'The next result gets its own chapter.',
    detail: `${clean(latestGame.opponent) || 'The previous game'} ended in a loss. This week is the next verified checkpoint, not a rewrite of the last one.`,
  });
  if (lastResult === 'W') items.push({
    label: 'MOMENTUM',
    title: 'The season moves forward from a win.',
    detail: `${clean(latestGame.opponent) || 'The previous game'} is in the archive. The focus shifts fully to ${brief.opponent}.`,
  });

  if (clean(setup.note)) items.push({ label: 'WEEK NOTE', title: clean(setup.note, 180), detail: 'Saved with the current Week Setup.' });
  if (!items.length) items.push({
    label: 'SEASON CHECKPOINT',
    title: `${brief.record} entering Week ${brief.week}`,
    detail: `${brief.school} vs ${brief.opponent} is the next verified point in the season.`,
  });
  return items.slice(0, 3);
};

export const buildGameDayLiveV2 = (state = {}) => {
  const brief = buildGameDayBrief(state);
  const setup = state.currentWeekSetup || {};
  const schedule = scheduleContext(state, brief.season, brief.week);
  const latestGame = latestGameFor(state, brief.season, brief.week) || brief.previousGame || null;
  const latestMedia = mediaSpotlights(state);
  const previousTotalTD = numberOf(latestGame?.passTD) + numberOf(latestGame?.rushTD);
  const venue = clean(brief.matchup?.venue)
    || (schedule.current?.homeAway === 'home' ? 'Home' : schedule.current?.homeAway === 'away' ? 'Away' : schedule.current?.homeAway === 'neutral' ? 'Neutral site' : '');
  const kickoff = clean(brief.matchup?.kickoff || schedule.current?.date);

  return {
    ...brief,
    venue,
    kickoff,
    schedule,
    recentForm: schedule.recent.map((entry) => ({
      week: entry.week,
      opponent: clean(entry.opponent),
      result: clean(entry.result).toUpperCase(),
      score: scoreText(entry),
    })),
    roadAhead: schedule.next.map((entry) => ({
      week: entry.week,
      opponent: clean(entry.opponent),
      site: entry.homeAway,
    })),
    latestGame,
    lastPlayerLine: latestGame ? {
      passYds: numberOf(latestGame.passYds),
      rushYds: numberOf(latestGame.rushYds),
      totalTD: previousTotalTD,
      interceptions: numberOf(latestGame.int ?? latestGame.interceptions),
    } : null,
    stakes: stakesFor({ brief, latestGame, setup }),
    media: latestMedia,
  };
};
