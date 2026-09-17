import { buildGameDayBrief } from './gameDayBriefV2.js';
import { buildMediaNetworkLayer, latestMeaningfulMediaContext } from './mediaNetworkLayer.js';
import { nextScheduledGame, seasonScheduleFor, syncScheduleWithCareer } from './seasonSchedule.js';

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
  const context = latestMeaningfulMediaContext(state);
  const media = buildMediaNetworkLayer(state, context);
  const items = [];
  if (media.dynasty.newsroomReady && clean(media.dynasty.headline)) items.push({
    id: 'newsroom',
    label: `NEWSROOM · W${media.week}`,
    title: clean(media.dynasty.headline, 240),
    detail: clean(media.dynasty.dek, 420) || `Latest DynastyHQ story from Week ${media.week}.`,
    target: 'newsroom',
  });
  if (media.dynasty.podcastReady && clean(media.dynasty.podcastTitle)) items.push({
    id: 'podcast',
    label: `THE HUDDLE · W${media.week}`,
    title: clean(media.dynasty.podcastTitle, 240),
    detail: media.dynasty.finishedPodcast ? 'The finished episode is ready to play.' : 'The latest episode is ready.',
    target: 'podcast',
  });
  if (media.official.status === 'captured' && clean(media.official.headline)) items.push({
    id: 'official',
    label: `EA SPORTS NETWORK · W${media.week}`,
    title: clean(media.official.headline, 240),
    detail: clean(media.official.summary, 420) || `Official in-game coverage from Week ${media.week}.`,
    target: 'gameHub',
  });
  return { context, items: items.slice(0, 3) };
};

const playerLineSentence = (game = {}) => {
  if (!game) return '';
  const passYds = numberOf(game.passYds);
  const rushYds = numberOf(game.rushYds);
  const totalTD = numberOf(game.passTD) + numberOf(game.rushTD);
  const interceptions = numberOf(game.int ?? game.interceptions);
  const pieces = [`${passYds} passing yards`];
  if (totalTD) pieces.push(`${totalTD} total TD${totalTD === 1 ? '' : 's'}`);
  if (rushYds) pieces.push(`${rushYds} rushing yards`);
  if (interceptions) pieces.push(`${interceptions} INT`);
  return pieces.join(' · ');
};

const teamResultSentence = (brief, entry) => {
  if (!entry) return '';
  const result = clean(entry.result).toUpperCase();
  const score = scoreText(entry);
  return `${brief.school} ${result === 'W' ? 'beat' : result === 'L' ? 'fell to' : 'played'} ${clean(entry.opponent)}${score ? ` ${score}` : ''}.`;
};

const stakesFor = ({ brief, latestGame, setup = {}, schedule = {} }) => {
  const items = [];
  const role = clean(brief.player?.role).toUpperCase();
  const playerName = clean(brief.player?.name) || 'The quarterback';
  const coachTrust = brief.player?.coachTrust;

  if (role) {
    const lastLine = playerLineSentence(latestGame);
    items.push({
      label: 'YOUR STORY',
      title: `${role} moves into Week ${brief.week} against ${brief.opponent}`,
      detail: latestGame
        ? `${playerName}'s last player line came against ${clean(latestGame.opponent)}: ${lastLine}.${coachTrust !== null ? ` Coach Trust is ${numberOf(coachTrust).toLocaleString()}.` : ''}`
        : `${playerName} enters the matchup as ${role}.${coachTrust !== null ? ` Coach Trust is ${numberOf(coachTrust).toLocaleString()}.` : ''}`,
    });
  }

  const latestTeamResult = list(schedule.recent).at(-1);
  if (latestTeamResult) {
    items.push({
      label: 'TEAM MOMENTUM',
      title: `${brief.school} enters ${brief.opponent} week at ${brief.record}`,
      detail: `${teamResultSentence(brief, latestTeamResult)} The focus now shifts to Week ${brief.week}.`,
    });
  }

  const rank = clean(brief.matchup?.rank);
  if (rank) {
    items.push({
      label: 'THE STAGE',
      title: `${brief.opponent} comes in at ${rank.startsWith('#') ? rank : `#${rank}`}`,
      detail: clean(brief.matchup?.record)
        ? `${brief.opponent} enters ${clean(brief.matchup.record)}. ${brief.venue ? `${brief.venue} is the setting.` : ''}`.trim()
        : `${brief.venue ? `${brief.venue} is the setting for` : 'Week ' + brief.week + ' brings'} the next test.`,
    });
  } else {
    const site = schedule.current?.homeAway === 'home'
      ? `${brief.opponent} comes to ${brief.school}`
      : schedule.current?.homeAway === 'away'
        ? `${brief.school} goes on the road to face ${brief.opponent}`
        : `${brief.school} meets ${brief.opponent}`;
    items.push({
      label: 'NEXT TEST',
      title: site,
      detail: [clean(brief.matchup?.kickoff), clean(brief.matchup?.venue)].filter(Boolean).join(' · ')
        || `Week ${brief.week} is next on the schedule.`,
    });
  }

  if (clean(setup.note) && items.length < 3) {
    items.push({ label: 'WEEK NOTE', title: clean(setup.note, 180), detail: `${brief.school} carries that note into kickoff.` });
  }

  return items.slice(0, 3);
};

const effectivePregameState = (state = {}) => {
  const currentSeason = Math.max(1, numberOf(state.currentSeason, 1));
  const setup = state.currentWeekSetup || {};
  const explicitOpponent = clean(setup.opponent);
  const explicitGame = clean(setup.type).toLowerCase() !== 'bye' && Boolean(explicitOpponent);
  if (explicitGame) return { state, source: 'week-setup' };

  const next = nextScheduledGame(state, currentSeason);
  if (!next) return { state, source: 'career' };

  const derivedSetup = {
    ...setup,
    week: Number(next.week),
    type: 'game',
    phase: clean(setup.phase) || 'regular-season',
    label: clean(next.label) || `Week ${next.week}`,
    opponent: clean(next.opponent),
    opponentRecord: '',
    opponentRank: '',
    kickoff: clean(next.date),
    venue: next.homeAway === 'home' ? 'Home' : next.homeAway === 'away' ? 'Away' : next.homeAway === 'neutral' ? 'Neutral site' : '',
    note: '',
    source: 'season-schedule-next-game',
  };

  return {
    state: {
      ...state,
      currentWeek: Number(next.week),
      currentWeekSetup: derivedSetup,
    },
    source: 'season-schedule',
  };
};

export const buildGameDayLiveV2 = (state = {}) => {
  const effective = effectivePregameState(state);
  const workingState = effective.state;
  const brief = buildGameDayBrief(workingState);
  const setup = workingState.currentWeekSetup || {};
  const schedule = scheduleContext(workingState, brief.season, brief.week);
  const latestGame = latestGameFor(workingState, brief.season, brief.week) || brief.previousGame || null;
  const latestMedia = mediaSpotlights(state);
  const previousTotalTD = numberOf(latestGame?.passTD) + numberOf(latestGame?.rushTD);
  const venue = clean(brief.matchup?.venue)
    || (schedule.current?.homeAway === 'home' ? 'Home' : schedule.current?.homeAway === 'away' ? 'Away' : schedule.current?.homeAway === 'neutral' ? 'Neutral site' : '');
  const kickoff = clean(brief.matchup?.kickoff || schedule.current?.date);
  const enrichedBrief = { ...brief, venue, kickoff };

  return {
    ...brief,
    activationSource: effective.source,
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
    stakes: stakesFor({ brief: enrichedBrief, latestGame, setup, schedule }),
    media: latestMedia,
  };
};