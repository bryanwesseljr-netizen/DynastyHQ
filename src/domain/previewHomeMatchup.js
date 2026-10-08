import { scheduleDisplayLabel } from './seasonSchedule.js';

const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clean = (value) => String(value ?? '').trim();
const opponentKey = (value) => clean(value).replace(/[^a-z0-9]/gi, '').toLowerCase();
const isRealOpponent = (value) => {
  const text = clean(value);
  return Boolean(text) && !/^(?:bye(?: week)?|tba|tbd|unknown|opponent tbd|next opponent)$/i.test(text);
};
const isSavedCollegeGame = (game, season) => (
  game && number(game.season, season) === season
  && game.didPlay !== false && !game.evaluation
  && game.stage !== 'high-school' && number(game.week, -1) >= 0
  && isRealOpponent(game.opponent)
);

const seasonScheduleRows = (state, season) => {
  const schedule = (state?.seasonSchedules || [])
    .find((item) => number(item?.season, 1) === season) || {};
  const rows = schedule.entries || schedule.games || schedule.schedule || [];
  return Array.isArray(rows) ? rows : [];
};

// A published Game Log is stronger evidence of completion than an old
// schedule status. Never re-offer a played game as the next matchup.
export const nextCareerMatchupForHome = (data = {}) => {
  const state = data.state || {};
  const season = number(state.currentSeason || data.season || 1, 1);
  const currentWeek = number(state.currentWeek ?? data.week, 0);
  const games = (state.gameLogs || [])
    .filter((game) => isSavedCollegeGame(game, season));
  const playedWeeks = new Set(games.map((game) => number(game.week)));
  const lastPlayedWeek = games.reduce((latest, game) => Math.max(latest, number(game.week)), -1);
  const firstPossibleWeek = Math.max(currentWeek, lastPlayedWeek + 1);
  const schedule = seasonScheduleRows(state, season)
    .filter((entry) => entry && !entry.isBye && isRealOpponent(entry.opponent))
    .sort((a, b) => number(a.week) - number(b.week));
  const next = schedule.find((entry) => {
    const week = number(entry.week, -1);
    if (week < firstPossibleWeek || playedWeeks.has(week)) return false;
    if (entry.completed === true || clean(entry.status).toLowerCase() === 'completed') return false;
    // Guard against an accidental phantom Bowl 2 row added to the NEXT slot
    // after the same Bowl 2 opponent and round were already published.
    const duplicatePlayedRound = games.some((game) => {
      const gap = week - number(game.week, -1);
      if (gap !== 1 || opponentKey(entry.opponent) !== opponentKey(game.opponent)) return false;
      const rowRound = clean(entry.postseasonRound).toLowerCase();
      const gameRound = clean(game.postseason?.stage).toLowerCase();
      const rowBowl = clean(entry.bowlName).toLowerCase();
      const gameBowl = clean(game.postseason?.bowlName).toLowerCase();
      return (rowRound && gameRound && rowRound === gameRound)
        || (rowBowl && gameBowl && rowBowl === gameBowl);
    });
    return !duplicatePlayedRound;
  });
  if (next) {
    return {
      season, week: number(next.week), awaiting: false,
      displayLabel: scheduleDisplayLabel(next),
      opponent: clean(next.opponent).toUpperCase(),
    };
  }

  const isPostseason = schedule.some((entry) =>
    entry.postseasonRound || entry.bowlName || /\bbowl\s*\d+\b|\bCFP\b|\bplayoff\b/i.test(clean(entry.label)),
  );
  return {
    season,
    week: firstPossibleWeek,
    awaiting: true,
    displayLabel: isPostseason ? 'NEXT PLAYOFF MATCHUP' : 'NEXT GAME',
    opponent: 'TO BE ANNOUNCED',
  };
};

// The archive keeps every unique internal week, including history and byes.
// Include the internal slot for named postseason rounds, so a pair of archived
// rows never LOOK identical when their labels are the same.
export const weekSelectorOptions = (values = []) =>
  [...new Set(values.map((value) => number(value, NaN)).filter(Number.isInteger))]
    .sort((a, b) => b - a);

export const weekSelectorDisplayLabel = (week, title = '') => {
  const text = clean(title) || `W${week}`;
  return /^W\d+$/i.test(text) ? text : `W${week} · ${text}`;
};
