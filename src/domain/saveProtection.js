const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const clean = (value) => String(value ?? '').trim();

const seasonWeek = (entry = {}) => {
  const text = clean(entry.publicationId || entry.weekKey || entry.id);
  const match = text.match(/season-(\d+)-week-(\d+)/i);
  return {
    season: Math.max(0, Number(entry.season) || Number(match?.[1]) || 0),
    week: Math.max(0, Number(entry.week) || Number(match?.[2]) || 0),
  };
};

const progressOrdinal = ({ season = 0, week = 0 } = {}) => Number(season || 0) * 100 + Number(week || 0);

export const publishedCareerProgress = (state = {}) => {
  const entries = [
    ...list(state.weeklyUpdates),
    ...list(state.gameLogs),
    ...list(state.newsroomIssues),
    ...list(state.podcastEpisodes),
    ...list(state.careerChronicle),
    ...list(state.factLedger),
  ];
  let best = { season: 0, week: 0, ordinal: 0 };
  entries.forEach((entry) => {
    const point = seasonWeek(entry);
    const ordinal = progressOrdinal(point);
    if (ordinal > best.ordinal) best = { ...point, ordinal };
  });
  return best;
};

export const careerArchiveCounts = (state = {}) => ({
  weeklyUpdates: list(state.weeklyUpdates).length,
  gameLogs: list(state.gameLogs).length,
  newsroomIssues: list(state.newsroomIssues).length,
  podcastEpisodes: list(state.podcastEpisodes).length,
  careerChronicle: list(state.careerChronicle).length,
  factLedger: list(state.factLedger).length,
});

export const detectDestructiveCareerRegression = (remoteState = {}, nextState = {}) => {
  const remote = publishedCareerProgress(remoteState);
  const next = publishedCareerProgress(nextState);
  const remoteCounts = careerArchiveCounts(remoteState);
  const nextCounts = careerArchiveCounts(nextState);
  const shrunk = Object.keys(remoteCounts).filter((key) => nextCounts[key] < remoteCounts[key]);

  if (next.ordinal < remote.ordinal && shrunk.length) {
    return {
      blocked: true,
      reason: `Incoming save would roll published career progress back from Season ${remote.season} Week ${remote.week} to Season ${next.season} Week ${next.week} and shrink: ${shrunk.join(', ')}.`,
      remote,
      next,
      shrunk,
    };
  }

  const criticalArchiveShrink = ['newsroomIssues', 'podcastEpisodes', 'weeklyUpdates']
    .filter((key) => nextCounts[key] < remoteCounts[key]);
  if (criticalArchiveShrink.length >= 2 && next.ordinal <= remote.ordinal) {
    return {
      blocked: true,
      reason: `Incoming save would remove multiple published archives at the same or lower career progress: ${criticalArchiveShrink.join(', ')}.`,
      remote,
      next,
      shrunk: criticalArchiveShrink,
    };
  }

  return { blocked: false, remote, next, shrunk };
};

export const checkpointForCareerAdvance = (remoteState = {}, nextState = {}) => {
  const remote = publishedCareerProgress(remoteState);
  const next = publishedCareerProgress(nextState);
  if (next.ordinal <= remote.ordinal || !next.season) return null;
  return {
    id: `checkpoint-season-${next.season}-week-${next.week}`,
    season: next.season,
    week: next.week,
  };
};
