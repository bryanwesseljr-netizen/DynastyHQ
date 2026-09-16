const clean = (value, max = 240) => String(value ?? '').trim().slice(0, max);
const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};
const arrayOf = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const resultForScores = (teamScore, opponentScore) => {
  if (teamScore === null || opponentScore === null || teamScore === opponentScore) return '';
  return teamScore > opponentScore ? 'W' : 'L';
};

export const normalizeScheduleEntry = (entry = {}, index = 0) => {
  const week = Math.max(0, Number(entry.week) || index + 1);
  const opponent = clean(entry.opponent || entry.team || entry.opponentName, 160);
  const statusText = clean(entry.status, 40).toLowerCase();
  const isBye = Boolean(entry.isBye) || statusText === 'bye' || /^bye$/i.test(opponent);
  const teamScore = numberOrNull(entry.teamScore ?? entry.homeScore);
  const opponentScore = numberOrNull(entry.opponentScore ?? entry.awayScore);
  const explicitResult = clean(entry.result, 10).toUpperCase();
  const result = ['W', 'L'].includes(explicitResult) ? explicitResult : resultForScores(teamScore, opponentScore);
  const completed = Boolean(entry.completed) || statusText === 'completed' || Boolean(result);
  const homeAway = ['home', 'away', 'neutral'].includes(clean(entry.homeAway, 20).toLowerCase())
    ? clean(entry.homeAway, 20).toLowerCase()
    : 'unknown';

  return {
    week,
    opponent: isBye ? 'BYE' : opponent,
    homeAway,
    isBye,
    completed: isBye ? false : completed,
    status: isBye ? 'bye' : completed ? 'completed' : 'upcoming',
    result: isBye ? '' : result,
    teamScore: isBye ? null : teamScore,
    opponentScore: isBye ? null : opponentScore,
    date: clean(entry.date, 80),
    conference: clean(entry.conference, 80),
    label: clean(entry.label, 120),
    confidence: Number.isFinite(Number(entry.confidence)) ? Number(entry.confidence) : null,
    evidence: clean(entry.evidence, 300),
  };
};

export const normalizeSeasonSchedule = (schedule = {}, fallbackSeason = 1) => {
  const season = Math.max(1, Number(schedule.season) || Number(fallbackSeason) || 1);
  const byWeek = new Map();
  arrayOf(schedule.entries).forEach((entry, index) => {
    const normalized = normalizeScheduleEntry(entry, index);
    if (!normalized.week) return;
    const previous = byWeek.get(normalized.week) || {};
    byWeek.set(normalized.week, { ...previous, ...normalized });
  });
  return {
    season,
    school: clean(schedule.school, 160),
    importedAt: clean(schedule.importedAt, 80),
    updatedAt: clean(schedule.updatedAt, 80),
    sourceFiles: arrayOf(schedule.sourceFiles).map((name) => clean(name, 180)).filter(Boolean),
    entries: [...byWeek.values()].sort((a, b) => a.week - b.week),
  };
};

export const seasonScheduleFor = (state = {}, season = state.currentSeason || 1) => {
  const target = Math.max(1, Number(season) || 1);
  const raw = arrayOf(state.seasonSchedules).find((schedule) => Number(schedule?.season) === target);
  return raw ? normalizeSeasonSchedule(raw, target) : null;
};

export const mergeSeasonSchedule = (existing = null, incoming = {}, fallbackSeason = 1) => {
  const base = normalizeSeasonSchedule(existing || { season: fallbackSeason, entries: [] }, fallbackSeason);
  const next = normalizeSeasonSchedule(incoming, base.season || fallbackSeason);
  const byWeek = new Map(base.entries.map((entry) => [entry.week, entry]));
  next.entries.forEach((entry) => {
    const prior = byWeek.get(entry.week) || {};
    byWeek.set(entry.week, {
      ...prior,
      ...entry,
      opponent: entry.opponent || prior.opponent || '',
      result: entry.result || prior.result || '',
      teamScore: entry.teamScore ?? prior.teamScore ?? null,
      opponentScore: entry.opponentScore ?? prior.opponentScore ?? null,
      completed: entry.completed || prior.completed || false,
      status: entry.isBye ? 'bye' : (entry.completed || prior.completed) ? 'completed' : 'upcoming',
    });
  });
  return {
    season: next.season || base.season,
    school: next.school || base.school,
    importedAt: next.importedAt || base.importedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceFiles: [...new Set([...base.sourceFiles, ...next.sourceFiles])],
    entries: [...byWeek.values()].sort((a, b) => a.week - b.week),
  };
};

export const syncScheduleWithCareer = (state = {}, scheduleInput = null) => {
  const season = Number(scheduleInput?.season || state.currentSeason || 1) || 1;
  const schedule = normalizeSeasonSchedule(scheduleInput || seasonScheduleFor(state, season) || { season, entries: [] }, season);
  if (!schedule.entries.length) return schedule;
  const games = arrayOf(state.gameLogs).filter((game) => Number(game?.season || 1) === season && game?.stage !== 'high-school' && !game?.evaluation);
  const byWeek = new Map(games.map((game) => [Number(game.week), game]));
  return {
    ...schedule,
    entries: schedule.entries.map((entry) => {
      const game = byWeek.get(entry.week);
      if (!game || entry.isBye) return entry;
      const teamScore = numberOrNull(game.homeScore);
      const opponentScore = numberOrNull(game.awayScore);
      const result = ['W', 'L'].includes(clean(game.result, 10).toUpperCase())
        ? clean(game.result, 10).toUpperCase()
        : resultForScores(teamScore, opponentScore);
      return {
        ...entry,
        opponent: clean(game.opponent, 160) || entry.opponent,
        completed: Boolean(result) || entry.completed,
        status: Boolean(result) ? 'completed' : entry.status,
        result: result || entry.result,
        teamScore: teamScore ?? entry.teamScore,
        opponentScore: opponentScore ?? entry.opponentScore,
      };
    }),
  };
};

export const teamRecordForSeason = (state = {}, season = state.currentSeason || 1) => {
  const schedule = seasonScheduleFor(state, season);
  if (schedule?.entries?.length) {
    const synced = syncScheduleWithCareer(state, schedule);
    const decided = synced.entries.filter((entry) => ['W', 'L'].includes(entry.result));
    return {
      wins: decided.filter((entry) => entry.result === 'W').length,
      losses: decided.filter((entry) => entry.result === 'L').length,
      games: decided.length,
      source: 'schedule',
    };
  }
  const games = arrayOf(state.gameLogs).filter((game) => Number(game?.season || 1) === Number(season) && game?.stage !== 'high-school' && !game?.evaluation);
  return {
    wins: games.filter((game) => clean(game.result, 10).toUpperCase() === 'W').length,
    losses: games.filter((game) => clean(game.result, 10).toUpperCase() === 'L').length,
    games: games.filter((game) => ['W', 'L'].includes(clean(game.result, 10).toUpperCase())).length,
    source: 'game-log',
  };
};

export const nextScheduledGame = (state = {}, season = state.currentSeason || 1) => {
  const schedule = seasonScheduleFor(state, season);
  if (!schedule?.entries?.length) return null;
  const synced = syncScheduleWithCareer(state, schedule);
  const currentWeek = Math.max(0, Number(state.currentWeek) || 0);
  return synced.entries.find((entry) => !entry.isBye && !entry.completed && entry.week >= currentWeek)
    || synced.entries.find((entry) => !entry.isBye && !entry.completed)
    || null;
};

export const scheduleWeekSetup = (state = {}) => {
  const next = nextScheduledGame(state);
  if (!next) return null;
  return {
    week: next.week,
    type: 'game',
    phase: 'regular',
    label: next.label || `Week ${next.week}`,
    customLabel: '',
    opponent: next.opponent,
    opponentRecord: '',
    kickoff: next.date || '',
    venue: next.homeAway === 'home' ? 'Home' : next.homeAway === 'away' ? 'Away' : next.homeAway === 'neutral' ? 'Neutral site' : '',
    note: '',
    source: 'season-schedule',
  };
};

export const scheduleWindowForHome = (state = {}, count = 5) => {
  const schedule = seasonScheduleFor(state);
  if (!schedule?.entries?.length) return [];
  const synced = syncScheduleWithCareer(state, schedule);
  const next = nextScheduledGame(state);
  const anchorIndex = next ? Math.max(0, synced.entries.findIndex((entry) => entry.week === next.week)) : Math.max(0, synced.entries.length - count);
  const start = Math.max(0, anchorIndex - 2);
  return synced.entries.slice(start, start + count);
};

export const upsertSeasonSchedule = (state = {}, scheduleInput = {}) => {
  const season = Math.max(1, Number(scheduleInput.season || state.currentSeason) || 1);
  const existing = seasonScheduleFor(state, season);
  const merged = mergeSeasonSchedule(existing, scheduleInput, season);
  const schedules = arrayOf(state.seasonSchedules).filter((entry) => Number(entry?.season) !== season);
  return { ...state, seasonSchedules: [...schedules, merged].sort((a, b) => Number(a.season) - Number(b.season)) };
};
