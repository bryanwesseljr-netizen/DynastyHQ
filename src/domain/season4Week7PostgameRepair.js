import { createNewsroomIssue } from './newsroomEngine.js';
import { syncScheduleWithCareer } from './seasonSchedule.js';

const arrayOf = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const clean = (value) => String(value ?? '').trim();
const publicationId = 'season-4-week-7';

const weekMatch = (entry = {}) => (
  clean(entry.publicationId || entry.weekKey || entry.id).toLowerCase() === publicationId
  || (Number(entry.season) === 4 && Number(entry.week) === 7)
);

const factMapForWeek = (state = {}) => new Map(
  arrayOf(state.factLedger)
    .filter((entry) => clean(entry.publicationId).toLowerCase() === publicationId)
    .map((entry) => [entry.key, entry.value]),
);

const numberOrBlank = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

const previousRtgSnapshot = (state = {}, targetUpdate = null) => {
  const updates = arrayOf(state.weeklyUpdates);
  const index = targetUpdate ? updates.indexOf(targetUpdate) : -1;
  const prior = (index >= 0 ? updates.slice(0, index) : updates)
    .reverse()
    .find((entry) => entry?.rtgSnapshot && Object.keys(entry.rtgSnapshot).length);
  return prior?.rtgSnapshot || {};
};

const previousRecruitingSnapshot = (state = {}, targetUpdate = null) => {
  const updates = arrayOf(state.weeklyUpdates);
  const index = targetUpdate ? updates.indexOf(targetUpdate) : -1;
  return (index >= 0 ? updates.slice(0, index) : updates)
    .reverse()
    .find((entry) => Array.isArray(entry?.recruitingSnapshot))?.recruitingSnapshot || [];
};

export const inspectSeason4Week7PostgameRepair = (state = {}) => {
  const update = arrayOf(state.weeklyUpdates).find(weekMatch) || null;
  const gameLog = arrayOf(state.gameLogs).find(weekMatch) || null;
  const newsroom = arrayOf(state.newsroomIssues).find(weekMatch) || null;
  const facts = factMapForWeek(state);
  const schedule = arrayOf(state.seasonSchedules).find((entry) => Number(entry?.season) === 4);
  const week7Schedule = arrayOf(schedule?.entries).find((entry) => Number(entry?.week) === 7) || null;

  const game = {
    opponent: clean(gameLog?.opponent || update?.game?.opponent || facts.get('game.opponent') || week7Schedule?.opponent),
    result: clean(gameLog?.result || update?.game?.result || facts.get('game.result')).toUpperCase(),
    homeScore: numberOrBlank(gameLog?.homeScore ?? update?.game?.homeScore ?? facts.get('game.homeScore')),
    awayScore: numberOrBlank(gameLog?.awayScore ?? update?.game?.awayScore ?? facts.get('game.awayScore')),
    passYds: numberOrBlank(gameLog?.passYds ?? update?.game?.passYds ?? facts.get('game.passYds')),
    passTD: numberOrBlank(gameLog?.passTD ?? update?.game?.passTD ?? facts.get('game.passTD')),
    rushYds: numberOrBlank(gameLog?.rushYds ?? update?.game?.rushYds ?? facts.get('game.rushYds')),
    rushTD: numberOrBlank(gameLog?.rushTD ?? update?.game?.rushTD ?? facts.get('game.rushTD')),
    int: numberOrBlank(gameLog?.int ?? update?.game?.int ?? facts.get('game.int')),
  };

  const scoreComplete = game.homeScore !== '' && game.awayScore !== '';
  const coreComplete = Boolean(update && game.opponent && ['W','L'].includes(game.result) && scoreComplete);
  return {
    publicationId,
    updateExists: Boolean(update),
    gameLogExists: Boolean(gameLog),
    newsroomExists: Boolean(newsroom),
    currentWeek: Number(state.currentWeek) || 0,
    game,
    coreComplete,
    needsRepair: Boolean(update && (!gameLog || !newsroom || !update.game)),
  };
};

export const repairSeason4Week7Postgame = (state = {}) => {
  const inspection = inspectSeason4Week7PostgameRepair(state);
  if (!inspection.updateExists) throw new Error('Season 4 Week 7 is not published in this career. Nothing was changed.');
  if (!inspection.coreComplete) throw new Error('Week 7 does not contain enough verified game facts to safely rebuild Purdue postgame coverage. Nothing was changed.');

  const updates = arrayOf(state.weeklyUpdates);
  const updateIndex = updates.findIndex(weekMatch);
  const targetUpdate = updates[updateIndex];
  const game = {
    ...(targetUpdate?.game || {}),
    ...inspection.game,
    season: 4,
    week: 7,
    didPlay: true,
    isConferenceGame: Boolean(targetUpdate?.isConferenceGame || targetUpdate?.game?.isConferenceGame),
    conferenceGameSource: targetUpdate?.game?.conferenceGameSource || 'verified-week7-repair',
  };

  const weeklyUpdates = [...updates];
  weeklyUpdates[updateIndex] = {
    ...targetUpdate,
    game,
    correctedAt: new Date().toISOString(),
  };

  const gameLogs = arrayOf(state.gameLogs);
  const gameIndex = gameLogs.findIndex(weekMatch);
  const nextGameLogs = gameIndex >= 0
    ? gameLogs.map((entry, index) => index === gameIndex ? { ...entry, ...game } : entry)
    : [...gameLogs, game];

  const weekFacts = arrayOf(state.factLedger)
    .filter((entry) => clean(entry.publicationId).toLowerCase() === publicationId);
  const availableFactKeys = arrayOf(state.factLedger).map((entry) => entry.key).filter(Boolean);
  const currentFactKeys = weekFacts.map((entry) => entry.key).filter(Boolean);
  const oldIssue = arrayOf(state.newsroomIssues).find(weekMatch) || null;
  const previousGames = nextGameLogs.filter((entry) => (
    Number(entry?.season || 1) === 4 && Number(entry?.week || 0) < 7
  ));
  const rebuiltIssue = createNewsroomIssue({
    publicationId,
    season: 4,
    week: 7,
    careerPhase: targetUpdate?.careerPhase || state.careerPhase,
    player: state.player,
    game,
    recruiting: targetUpdate?.recruitingSnapshot || state.recruiting || [],
    previousRecruiting: previousRecruitingSnapshot(state, targetUpdate),
    previousGames,
    quote: targetUpdate?.quote || '',
    rtg: targetUpdate?.rtgSnapshot || state.rtg || {},
    previousRtg: previousRtgSnapshot(state, targetUpdate),
    playerRecruiting: state.playerRecruiting || {},
    collegeNewsroom: state.collegeNewsroom || {},
    coverageStage: 'college',
    availableFactKeys,
    currentFactKeys,
    publishedAt: targetUpdate?.publishedAt || new Date().toISOString(),
  });

  if (oldIssue) {
    rebuiltIssue.outletProfile = oldIssue.outletProfile || rebuiltIssue.outletProfile;
  }

  const newsroomIssues = oldIssue
    ? arrayOf(state.newsroomIssues).map((entry) => weekMatch(entry) ? rebuiltIssue : entry)
    : [...arrayOf(state.newsroomIssues), rebuiltIssue];

  const scoreLine = game.homeScore !== '' && game.awayScore !== '' ? `, ${game.homeScore}-${game.awayScore}` : '';
  const careerChronicle = arrayOf(state.careerChronicle).map((entry) => (
    weekMatch(entry)
      ? {
          ...entry,
          type: 'game',
          title: `${game.result} vs. ${game.opponent}${scoreLine}`,
          summary: `${game.passYds || 0} passing yards, ${game.passTD || 0} passing TD, ${game.rushYds || 0} rushing yards, ${game.rushTD || 0} rushing TD.`,
          factKeys: currentFactKeys,
          correctedAt: new Date().toISOString(),
        }
      : entry
  ));

  const withGame = {
    ...state,
    gameLogs: nextGameLogs,
    weeklyUpdates,
    careerChronicle,
    newsroomIssues,
  };

  const seasonSchedules = arrayOf(state.seasonSchedules).map((schedule) => (
    Number(schedule?.season) === 4
      ? syncScheduleWithCareer(withGame, schedule)
      : schedule
  ));

  return {
    ...withGame,
    seasonSchedules,
    _repair: {
      ...(state._repair || {}),
      season4Week7Postgame: {
        repairedAt: new Date().toISOString(),
        publicationId,
        opponent: game.opponent,
        result: game.result,
        score: `${game.homeScore}-${game.awayScore}`,
      },
    },
  };
};
