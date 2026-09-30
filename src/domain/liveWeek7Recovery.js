const clean = (value) => String(value ?? '').trim();
const list = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

const publicationParts = (entry = {}) => {
  const text = clean(entry.publicationId || entry.weekKey || entry.id);
  const match = text.match(/season-(\d+)-week-(\d+)/i);
  return {
    season: Number(entry.season) || Number(match?.[1]) || 0,
    week: Number(entry.week) || Number(match?.[2]) || 0,
  };
};

const opponentForEntry = (entry = {}) => clean(entry.opponent || entry.game?.opponent || entry.matchup?.opponent);

const scheduleOpponent = (state = {}, season, week) => {
  const schedule = list(state.seasonSchedules).find((entry) => Number(entry?.season) === Number(season));
  const row = list(schedule?.entries).find((entry) => Number(entry?.week) === Number(week));
  return row && !row.isBye ? clean(row.opponent) : '';
};

const opponentAtWeek = (state = {}, season, week) => {
  const scheduled = scheduleOpponent(state, season, week);
  if (scheduled) return scheduled;
  const game = list(state.gameLogs).find((entry) => Number(entry?.season) === Number(season) && Number(entry?.week) === Number(week));
  if (game) return opponentForEntry(game);
  const update = list(state.weeklyUpdates).find((entry) => {
    const parts = publicationParts(entry);
    return parts.season === Number(season) && parts.week === Number(week);
  });
  return opponentForEntry(update);
};

const latestSeason4ContentWeek = (state = {}) => {
  const weeks = [
    ...list(state.weeklyUpdates).map(publicationParts),
    ...list(state.gameLogs).map((entry) => ({ season: Number(entry?.season) || 0, week: Number(entry?.week) || 0 })),
    ...list(state.newsroomIssues).map(publicationParts),
    ...list(state.podcastEpisodes).map(publicationParts),
    ...list(state.careerChronicle).map(publicationParts),
    ...list(state.factLedger).map(publicationParts),
  ].filter((parts) => parts.season === 4).map((parts) => parts.week).filter(Number.isFinite);
  return weeks.length ? Math.max(...weeks) : 0;
};

export const summarizeLiveWeek7RecoveryCandidate = ({ id = '', state = {} } = {}) => {
  const week1Opponent = opponentAtWeek(state, 4, 1);
  const week7Opponent = opponentAtWeek(state, 4, 7);
  const latestContentWeek = latestSeason4ContentWeek(state);
  const currentSeason = Number(state.currentSeason) || 1;
  const currentWeek = Number(state.currentWeek) || 1;
  const school = clean(state.player?.college || state.player?.school);
  const newsroom7 = list(state.newsroomIssues).some((entry) => {
    const parts = publicationParts(entry);
    return parts.season === 4 && parts.week === 7;
  });
  const podcast7 = list(state.podcastEpisodes).some((entry) => {
    const parts = publicationParts(entry);
    return parts.season === 4 && parts.week === 7;
  });
  const game7 = list(state.gameLogs).some((entry) => Number(entry?.season) === 4 && Number(entry?.week) === 7);
  const week7Update = list(state.weeklyUpdates).some((entry) => {
    const parts = publicationParts(entry);
    return parts.season === 4 && parts.week === 7;
  });
  const hasVanderbiltWeek1 = /vanderbilt/i.test(week1Opponent);
  const hasPurdueWeek7 = /purdue/i.test(week7Opponent);
  const hasOhioWeek1 = /ohio\s*state/i.test(week1Opponent);
  const exactCheckpoint = id === 'checkpoint-season-4-week-7';
  const immutableCheckpoint = Boolean(state?._checkpoint?.immutable && Number(state?._checkpoint?.season) === 4 && Number(state?._checkpoint?.week) === 7);
  const qualifies = currentSeason === 4
    && /oregon/i.test(school)
    && hasVanderbiltWeek1
    && hasPurdueWeek7
    && !hasOhioWeek1
    && latestContentWeek >= 7
    && week7Update;

  const score = (qualifies ? 100000 : 0)
    + (exactCheckpoint ? 30000 : 0)
    + (immutableCheckpoint ? 25000 : 0)
    + (game7 ? 7000 : 0)
    + (newsroom7 ? 6000 : 0)
    + (podcast7 ? 5000 : 0)
    + Math.min(latestContentWeek, 7) * 1000
    + Math.min(list(state.weeklyUpdates).filter((entry) => publicationParts(entry).season === 4).length, 20) * 100;

  return {
    id,
    state,
    school,
    currentSeason,
    currentWeek,
    week1Opponent,
    week7Opponent,
    latestContentWeek,
    game7,
    newsroom7,
    podcast7,
    week7Update,
    exactCheckpoint,
    immutableCheckpoint,
    qualifies,
    score,
  };
};

export const chooseBestLiveWeek7RecoveryCandidate = (candidates = []) => (
  [...candidates]
    .filter((candidate) => candidate?.qualifies)
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0]
  || null
);
