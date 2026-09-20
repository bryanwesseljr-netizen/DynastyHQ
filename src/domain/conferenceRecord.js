import {
  getCollegeFootballTeamIdentity,
  normalizeCollegeFootballConference,
} from './collegeFootballTeamIdentity.js';
import { seasonScheduleFor, syncScheduleWithCareer } from './seasonSchedule.js';

const clean = (value) => String(value ?? '').trim();
const arrayOf = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const conferenceOverrideFor = (state = {}, team = '') => {
  const overrides = state?.newsroomMediaSettings?.conferenceOverrides || {};
  const direct = overrides[team] || overrides[clean(team)] || '';
  return normalizeCollegeFootballConference(direct);
};

export const conferenceForTeam = (state = {}, team = '') => {
  const name = clean(team);
  if (!name) return '';
  const identity = getCollegeFootballTeamIdentity(name, {
    conferenceOverride: conferenceOverrideFor(state, name),
    dynastySeason: state.currentSeason || 1,
  });
  return normalizeCollegeFootballConference(identity?.conference || identity?.primaryConference || '');
};

export const inferConferenceGame = (state = {}, opponent = '') => {
  const school = clean(state?.player?.college || state?.player?.school);
  const schoolConference = conferenceForTeam(state, school);
  const opponentConference = conferenceForTeam(state, opponent);
  if (!schoolConference || !opponentConference) return false;
  if (schoolConference === 'Independent' || opponentConference === 'Independent') return false;
  return schoolConference === opponentConference;
};

export const resolveConferenceGame = (state = {}, entry = {}) => {
  if (entry?.conferenceGameOverride === 'conference') return true;
  if (entry?.conferenceGameOverride === 'non-conference') return false;
  if (entry?.conferenceGameSource === 'manual' && typeof entry?.isConferenceGame === 'boolean') {
    return entry.isConferenceGame;
  }
  if (typeof entry?.isConferenceGame === 'boolean') return entry.isConferenceGame;
  return inferConferenceGame(state, entry?.opponent || entry?.team || entry?.opponentName);
};

const seasonTeamGames = (state = {}, season = state.currentSeason || 1) => {
  const targetSeason = Math.max(1, Number(season) || 1);
  const byWeek = new Map();

  const schedule = seasonScheduleFor(state, targetSeason);
  if (schedule?.entries?.length) {
    syncScheduleWithCareer(state, schedule).entries
      .filter((entry) => !entry.isBye)
      .forEach((entry) => byWeek.set(Number(entry.week), {
        season: targetSeason,
        week: Number(entry.week),
        opponent: entry.opponent,
        result: entry.result,
        completed: entry.completed,
        isConferenceGame: typeof entry.isConferenceGame === 'boolean' ? entry.isConferenceGame : undefined,
      }));
  }

  arrayOf(state.weeklyUpdates)
    .filter((entry) => Number(entry?.season || 1) === targetSeason)
    .filter((entry) => entry?.game && entry.game.stage !== 'high-school' && !entry.game.evaluation)
    .forEach((entry) => byWeek.set(Number(entry.week), {
      ...entry.game,
      week: Number(entry.week),
      season: targetSeason,
      isConferenceGame: typeof entry.isConferenceGame === 'boolean'
        ? entry.isConferenceGame
        : entry.game?.isConferenceGame,
    }));

  arrayOf(state.gameLogs)
    .filter((game) => Number(game?.season || 1) === targetSeason)
    .filter((game) => game?.stage !== 'high-school' && !game?.evaluation)
    .forEach((game) => byWeek.set(Number(game.week), game));

  return [...byWeek.values()].sort((left, right) => Number(left.week || 0) - Number(right.week || 0));
};

export const conferenceRecordThroughWeek = (
  state = {},
  season = state.currentSeason || 1,
  throughWeek = Number.MAX_SAFE_INTEGER,
) => {
  const limit = Number.isFinite(Number(throughWeek)) ? Number(throughWeek) : Number.MAX_SAFE_INTEGER;
  const games = seasonTeamGames(state, season)
    .filter((game) => Number(game?.week || 0) <= limit)
    .filter((game) => ['W', 'L'].includes(clean(game?.result).toUpperCase()))
    .filter((game) => resolveConferenceGame(state, game));
  const wins = games.filter((game) => clean(game.result).toUpperCase() === 'W').length;
  const losses = games.filter((game) => clean(game.result).toUpperCase() === 'L').length;
  const conference = conferenceForTeam(state, state?.player?.college || state?.player?.school);
  return { wins, losses, games: games.length, conference };
};

export const conferenceRecordForSeason = (state = {}, season = state.currentSeason || 1) => (
  conferenceRecordThroughWeek(state, season)
);

export const conferenceAbbreviation = (conference = '') => ({
  ACC: 'ACC',
  'Big 12': 'B12',
  'Big Ten': 'B1G',
  SEC: 'SEC',
  'American Conference': 'AAC',
  'Conference USA': 'CUSA',
  MAC: 'MAC',
  'Mountain West': 'MW',
  'Pac-12': 'P12',
  'Sun Belt': 'SBC',
  Independent: 'IND',
}[conference] || clean(conference).toUpperCase().slice(0, 5));
