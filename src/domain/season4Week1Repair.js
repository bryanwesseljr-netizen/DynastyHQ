const arrayOf = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const clean = (value) => String(value ?? '').trim();

export const SEASON4_WEEK1_PUBLICATION_ID = 'season-4-week-1';

export const matchesSeason4Week1 = (entry = {}) => {
  const publicationId = clean(entry.publicationId || entry.weekKey || entry.id).toLowerCase();
  if (publicationId === SEASON4_WEEK1_PUBLICATION_ID) return true;
  return Number(entry.season) === 4 && Number(entry.week) === 1;
};

const filterWeek = (value) => arrayOf(value).filter((entry) => !matchesSeason4Week1(entry));

const clearWeekFinalization = (value) => {
  if (Array.isArray(value)) return value.filter((entry) => !matchesSeason4Week1(entry));
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value).filter(([key, entry]) => (
    clean(key).toLowerCase() !== SEASON4_WEEK1_PUBLICATION_ID
    && !matchesSeason4Week1(entry)
  )));
};

const resetWeekOneSchedule = (schedules = []) => {
  const current = arrayOf(schedules);
  const season4 = current.find((schedule) => Number(schedule?.season) === 4);
  const baseEntries = arrayOf(season4?.entries);
  const weekOne = {
    ...(baseEntries.find((entry) => Number(entry?.week) === 1) || {}),
    week: 1,
    opponent: 'Vanderbilt',
    homeAway: 'unknown',
    isBye: false,
    completed: false,
    status: 'upcoming',
    result: '',
    teamScore: null,
    opponentScore: null,
    date: '',
    conference: '',
    label: 'Week 1',
    confidence: null,
    evidence: 'Season 4 Week 1 opponent corrected to Vanderbilt after corrupted Ohio State save removal.',
  };
  const entries = [
    ...baseEntries.filter((entry) => Number(entry?.week) !== 1),
    weekOne,
  ].sort((a, b) => Number(a?.week || 0) - Number(b?.week || 0));

  const repairedSchedule = {
    ...(season4 || {}),
    season: 4,
    school: season4?.school || 'Oregon',
    updatedAt: new Date().toISOString(),
    entries,
  };

  return [
    ...current.filter((schedule) => Number(schedule?.season) !== 4),
    repairedSchedule,
  ].sort((a, b) => Number(a?.season || 0) - Number(b?.season || 0));
};

export const hasCorruptedOhioStateWeek1 = (state = {}) => {
  const schedule = arrayOf(state.seasonSchedules)
    .find((entry) => Number(entry?.season) === 4);
  const scheduleWeek = arrayOf(schedule?.entries)
    .find((entry) => Number(entry?.week) === 1);
  const game = arrayOf(state.gameLogs)
    .find((entry) => Number(entry?.season) === 4 && Number(entry?.week) === 1);
  const weekly = arrayOf(state.weeklyUpdates)
    .find((entry) => matchesSeason4Week1(entry));
  const newsroom = arrayOf(state.newsroomIssues)
    .find((entry) => matchesSeason4Week1(entry));

  return [scheduleWeek?.opponent, game?.opponent, weekly?.game?.opponent, newsroom?.headline]
    .some((value) => /ohio\s*state/i.test(clean(value)));
};

export const repairSeason4Week1Vanderbilt = (state = {}) => {
  const removedCounts = {};
  const remove = (key) => {
    const before = arrayOf(state[key]);
    const after = filterWeek(before);
    removedCounts[key] = before.length - after.length;
    return after;
  };

  const repaired = {
    ...state,
    currentSeason: 4,
    currentWeek: 1,
    currentWeekSetup: {
      week: 1,
      type: 'game',
      phase: 'regular-season',
      label: 'Week 1',
      customLabel: '',
      opponent: 'Vanderbilt',
      opponentRecord: '',
      kickoff: '',
      venue: '',
      note: '',
      source: 'season4-week1-vanderbilt-repair',
    },
    seasonSchedules: resetWeekOneSchedule(state.seasonSchedules),
    weeklyUpdates: remove('weeklyUpdates'),
    gameLogs: remove('gameLogs'),
    newsroomIssues: remove('newsroomIssues'),
    podcastEpisodes: remove('podcastEpisodes'),
    careerChronicle: remove('careerChronicle'),
    careerMilestones: remove('careerMilestones'),
    factLedger: remove('factLedger'),
    postgameFrontPages: remove('postgameFrontPages'),
    coverageReferences: remove('coverageReferences'),
    eaSportsNetworkArticles: remove('eaSportsNetworkArticles'),
    eaSportsNetwork: remove('eaSportsNetwork'),
    officialCoverage: remove('officialCoverage'),
    gameDayBriefs: remove('gameDayBriefs'),
    newsroomMediaLibrary: arrayOf(state.newsroomMediaLibrary).filter((entry) => !matchesSeason4Week1(entry)),
    weekFinalizations: clearWeekFinalization(state.weekFinalizations),
    weeklyAgendaDraft: null,
  };

  if (repaired.rtg?.lastStatusScan && matchesSeason4Week1(repaired.rtg.lastStatusScan)) {
    repaired.rtg = { ...repaired.rtg };
    delete repaired.rtg.lastStatusScan;
  }

  return { state: repaired, removedCounts };
};
