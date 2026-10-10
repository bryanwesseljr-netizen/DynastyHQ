const clean = (value, max = 240) => String(value ?? '').trim().slice(0, max);
const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};
const arrayOf = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const weekNumber = (value, fallback) => {
  if (value === '' || value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : fallback;
};

const resultForScores = (teamScore, opponentScore) => {
  if (teamScore === null || opponentScore === null || teamScore === opponentScore) return '';
  return teamScore > opponentScore ? 'W' : 'L';
};

export const CFP_ROUND_LABELS = {
  'first-round': 'CFP FIRST ROUND',
  quarterfinal: 'CFP QUARTERFINAL',
  semifinal: 'CFP SEMIFINAL',
  'national-championship': 'CFP NATIONAL CHAMPIONSHIP',
  bowl: 'POSTSEASON BOWL',
};
const verifiedPostseasonRound = (value) => {
  const round = clean(value, 40).toLowerCase();
  return Object.hasOwn(CFP_ROUND_LABELS, round) ? round : '';
};
const SPECIAL_SCHEDULE_LABEL_PATTERN = /\b(cfp|college football playoff|playoff|postseason|bowl|championship|conf\s+champ|quarterfinal|semi[- ]?final|first round)\b/i;
const POSTSEASON_LABEL_PATTERN = /\b(cfp|college football playoff|playoff|postseason|bowl|championship|quarterfinal|semi[- ]?final|first round)\b/i;

export const schedulePhaseForEntry = (entry = {}) => {
  const explicit = clean(entry.phase, 40).toLowerCase();
  if (explicit === 'postseason' || explicit === 'postseason-playoff') return 'postseason';
  if (explicit === 'regular-season') return 'regular-season';
  const label = clean(entry.label, 120);
  if (/^conf\s+champ\b/i.test(label) && entry.isBye) return 'regular-season';
  const visibleContext = [
    label,
    clean(entry.postseasonRound, 40),
    clean(entry.bowlName, 90),
    entry.conference,
    entry.evidence,
  ].map((value) => clean(value, 300)).filter(Boolean).join(' ');
  return POSTSEASON_LABEL_PATTERN.test(visibleContext) ? 'postseason' : 'regular-season';
};

export const scheduleDisplayLabel = (entry = {}) => {
  const round = verifiedPostseasonRound(entry.postseasonRound);
  const bowl = clean(entry.bowlName, 90).toUpperCase();
  if (round && round !== 'bowl') return CFP_ROUND_LABELS[round] + (bowl ? ` · ${bowl}` : '');
  if (bowl) return bowl;
  if (round === 'bowl') return CFP_ROUND_LABELS.bowl;
  const label = clean(entry.label, 120);
  if (label && SPECIAL_SCHEDULE_LABEL_PATTERN.test(label)) return label.toUpperCase();
  return `W${weekNumber(entry.week, 0)}`;
};

const recordDetails = (entries = []) => {
  const decided = entries.filter((entry) => ['W', 'L'].includes(clean(entry?.result, 10).toUpperCase()));
  const wins = decided.filter((entry) => clean(entry.result, 10).toUpperCase() === 'W').length;
  const losses = decided.filter((entry) => clean(entry.result, 10).toUpperCase() === 'L').length;
  const lastResult = clean(decided.at(-1)?.result, 10).toUpperCase();
  let streakCount = 0;
  for (let index = decided.length - 1; index >= 0; index -= 1) {
    if (clean(decided[index]?.result, 10).toUpperCase() !== lastResult) break;
    streakCount += 1;
  }
  return {
    wins,
    losses,
    games: decided.length,
    lastResult,
    streakCount,
    streak: streakCount >= 2 ? `${streakCount}-game ${lastResult === 'W' ? 'winning' : 'losing'} streak` : '',
  };
};

export const normalizeScheduleEntry = (entry = {}, index = 0) => {
  const week = weekNumber(entry.week, index + 1);
  const opponent = clean(entry.opponent || entry.team || entry.opponentName, 160);
  const statusText = clean(entry.status, 40).toLowerCase();
  const isBye = Boolean(entry.isBye) || statusText === 'bye' || /^bye(?:\s+week)?$/i.test(opponent);
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
    postseasonRound: verifiedPostseasonRound(entry.postseasonRound),
    bowlName: clean(entry.bowlName, 90),
    phase: schedulePhaseForEntry(entry),
    confidence: Number.isFinite(Number(entry.confidence)) ? Number(entry.confidence) : null,
    evidence: clean(entry.evidence, 300),
  };
};

export const normalizeSeasonSchedule = (schedule = {}, fallbackSeason = 1) => {
  const season = Math.max(1, Number(schedule.season) || Number(fallbackSeason) || 1);
  const byWeek = new Map();
  arrayOf(schedule.entries).forEach((entry, index) => {
    const normalized = normalizeScheduleEntry(entry, index);
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
    // Keep manually confirmed playoff metadata when rereading the SAME game,
    // but never carry the old bowl identity into a different unplayed opponent.
    const opponentChanged = Boolean(prior.opponent && entry.opponent)
      && clean(prior.opponent).toLowerCase() !== clean(entry.opponent).toLowerCase();
    const retainPriorPlayoffIdentity = !opponentChanged || Boolean(prior.completed);
    const postseasonRound = entry.postseasonRound
      || (retainPriorPlayoffIdentity ? prior.postseasonRound : '') || '';
    const bowlName = entry.bowlName
      || (retainPriorPlayoffIdentity ? prior.bowlName : '') || '';
    byWeek.set(entry.week, {
      ...prior,
      ...entry,
      opponent: entry.opponent || prior.opponent || '',
      homeAway: entry.homeAway !== 'unknown' ? entry.homeAway : (prior.homeAway || 'unknown'),
      result: entry.result || prior.result || '',
      teamScore: entry.teamScore ?? prior.teamScore ?? null,
      opponentScore: entry.opponentScore ?? prior.opponentScore ?? null,
      date: entry.date || prior.date || '',
      conference: entry.conference || prior.conference || '',
      label: entry.label || prior.label || '',
      postseasonRound,
      bowlName,
      phase: schedulePhaseForEntry({
        ...prior,
        ...entry,
        label: entry.label || prior.label || '',
        postseasonRound,
        bowlName,
        conference: entry.conference || prior.conference || '',
        evidence: entry.evidence || prior.evidence || '',
      }),
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

// Manual fallback when the screenshot provider is unavailable. This only stages an
// upcoming postseason calendar row; it cannot rewrite a completed game or a bye.
export const manualPostseasonScheduleDraft = ({
  existing = null,
  season = 1,
  school = '',
  week,
  opponent,
  label = '',
  date = '',
  homeAway = 'unknown',
  postseasonRound = '',
  bowlName = '',
} = {}) => {
  const targetWeek = Number(week);
  if (!Number.isInteger(targetWeek) || targetWeek < 1 || targetWeek > 40) {
    throw new Error('Enter a valid in-game schedule week between 1 and 40.');
  }
  const team = clean(opponent, 160);
  if (!team || /^(?:bye(?: week)?|tbd|unknown|opponent tbd)$/i.test(team)) {
    throw new Error('Enter the confirmed opponent before adding a manual matchup.');
  }
  const original = normalizeSeasonSchedule(existing || { season, entries: [] }, season);
  const prior = original.entries.find((entry) => entry.week === targetWeek);
  if (prior?.completed || prior?.isBye) {
    throw new Error('This week is already completed or marked as a bye. Manual matchup entry cannot overwrite it.');
  }
  const round = verifiedPostseasonRound(postseasonRound);
  if (postseasonRound && !round) throw new Error('Select a recognized playoff round or leave it unconfirmed.');
  const cleanLabel = clean(label, 120) || prior?.label || 'Postseason';
  const venue = ['home','away','neutral'].includes(homeAway) ? homeAway : 'unknown';
  const confirmedBowl = clean(bowlName, 90);
  const previous = original.entries.find((entry) => entry.week === targetWeek - 1);
  if (
    round
    && round !== 'bowl'
    && previous?.completed
    && previous.postseasonRound === round
  ) {
    throw new Error('This round is the same as the completed previous playoff game. Select the confirmed new round (for example CFP Semifinal), or leave it unconfirmed.');
  }
  const merged = mergeSeasonSchedule(original, {
    season: original.season,
    school: clean(school, 160) || original.school,
    entries: [{
      week: targetWeek,
      opponent: team,
      label: cleanLabel,
      date: clean(date, 80),
      phase: 'postseason',
      homeAway: venue,
      postseasonRound: round,
      bowlName: confirmedBowl,
      isBye: false,
      status: 'upcoming',
    }],
  }, season);
  // Manual input is authoritative for this ONE upcoming slot. In particular,
  // empty round/bowl fields mean "unconfirmed": do not resurrect stale Sugar
  // Bowl or quarterfinal metadata from an earlier mistaken schedule row.
  return {
    ...merged,
    entries: merged.entries.map((entry) => entry.week === targetWeek
      ? {
          ...entry,
          opponent: team,
          label: cleanLabel,
          date: clean(date, 80) || entry.date,
          phase: 'postseason',
          homeAway: venue,
          postseasonRound: round,
          bowlName: confirmedBowl,
        }
      : entry),
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

const fallbackTeamResults = (state = {}, season, throughWeek) => {
  const byWeek = new Map();
  arrayOf(state.weeklyUpdates)
    .filter((entry) => Number(entry?.season || 1) === season && Number(entry?.week ?? 0) <= throughWeek)
    .filter((entry) => entry?.game && entry.game.stage !== 'high-school' && !entry.game.evaluation)
    .forEach((entry) => byWeek.set(Number(entry.week), { ...entry.game, week: Number(entry.week), season }));
  arrayOf(state.gameLogs)
    .filter((game) => Number(game?.season || 1) === season && Number(game?.week ?? 0) <= throughWeek)
    .filter((game) => game?.stage !== 'high-school' && !game?.evaluation)
    .forEach((game) => byWeek.set(Number(game.week), game));
  return [...byWeek.values()].sort((left, right) => Number(left.week ?? 0) - Number(right.week ?? 0));
};

export const teamRecordThroughWeek = (state = {}, season = state.currentSeason || 1, week = Number.MAX_SAFE_INTEGER) => {
  const targetSeason = Math.max(1, Number(season) || 1);
  const throughWeek = Number.isFinite(Number(week)) ? Number(week) : Number.MAX_SAFE_INTEGER;
  const schedule = seasonScheduleFor(state, targetSeason);
  if (schedule?.entries?.length) {
    const synced = syncScheduleWithCareer(state, schedule);
    return { ...recordDetails(synced.entries.filter((entry) => entry.week <= throughWeek)), source: 'schedule' };
  }
  return { ...recordDetails(fallbackTeamResults(state, targetSeason, throughWeek)), source: 'career-results' };
};

export const teamRecordForSeason = (state = {}, season = state.currentSeason || 1) => {
  const record = teamRecordThroughWeek(state, season);
  return { wins: record.wins, losses: record.losses, games: record.games, source: record.source === 'schedule' ? 'schedule' : 'game-log' };
};

export const scheduleHighlightWeek = (entries = [], currentWeek = 0) => {
  const targetWeek = Math.max(0, Number(currentWeek) || 0);
  const sorted = arrayOf(entries).slice().sort((left, right) => Number(left?.week ?? 0) - Number(right?.week ?? 0));
  const current = sorted.find((entry) => Number(entry?.week) === targetWeek);

  if (current && !current.completed && !current.isBye) return Number(current.week);

  const nextPlayable = sorted.find((entry) => (
    Number(entry?.week) >= targetWeek
    && !entry?.completed
    && !entry?.isBye
    && clean(entry?.opponent, 160)
  ));

  return nextPlayable ? Number(nextPlayable.week) : targetWeek;
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
  const schedule = seasonScheduleFor(state);
  if (!schedule?.entries?.length) return null;
  const synced = syncScheduleWithCareer(state, schedule);
  const currentWeek = Math.max(0, Number(state.currentWeek) || 0);
  const currentRow = synced.entries.find((entry) => entry.week === currentWeek && (!entry.completed || entry.isBye));
  const row = currentRow || synced.entries.find((entry) => !entry.completed && entry.week >= currentWeek) || null;
  if (!row) return null;
  if (row.isBye) {
    return {
      week: row.week,
      type: 'bye',
      phase: schedulePhaseForEntry(row),
      label: row.label || `Week ${row.week} Bye`,
      customLabel: '',
      opponent: '',
      opponentRecord: '',
      kickoff: '',
      venue: '',
      note: '',
      source: 'season-schedule',
    };
  }
  return {
    week: row.week,
    type: 'game',
    phase: schedulePhaseForEntry(row),
    label: row.postseasonRound || row.bowlName
      ? scheduleDisplayLabel(row)
      : (row.label || `Week ${row.week}`),
    customLabel: '',
    opponent: row.opponent,
    opponentRecord: '',
    kickoff: row.date || '',
    venue: row.homeAway === 'home' ? 'Home' : row.homeAway === 'away' ? 'Away' : row.homeAway === 'neutral' ? 'Neutral site' : '',
    note: '',
    source: 'season-schedule',
  };
};

export const scheduleWindowForHome = (state = {}, count = 5) => {
  const schedule = seasonScheduleFor(state);
  if (!schedule?.entries?.length) return [];
  const synced = syncScheduleWithCareer(state, schedule);
  const currentWeek = Math.max(0, Number(state.currentWeek) || 0);
  const currentIndex = synced.entries.findIndex((entry) => entry.week === currentWeek);
  const next = nextScheduledGame(state);
  const anchorIndex = currentIndex >= 0
    ? currentIndex
    : next
      ? Math.max(0, synced.entries.findIndex((entry) => entry.week === next.week))
      : Math.max(0, synced.entries.length - count);
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
