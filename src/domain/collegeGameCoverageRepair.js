import { createNewsroomIssue } from './newsroomEngine.js';

const finite = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const publicationIdFor = (entry = {}) => entry.publicationId || entry.weekKey || entry.id
  || `season-${finite(entry.season, 1)}-week-${Math.max(0, finite(entry.week, 0))}`;

const matchesPublication = (entry, publicationId) => (
  entry?.publicationId === publicationId || entry?.weekKey === publicationId || entry?.id === publicationId
);

const isCollegePlayerCareer = (state = {}) => {
  const phase = String(state.careerPhase || '').trim();
  return !['OC', 'HC', 'Retired'].includes(phase)
    && Boolean(state.player?.isCommitted || state.player?.college);
};

const isCollegeGameUpdate = (entry = {}) => Boolean(
  entry?.status === 'published'
  && entry?.game
  && entry.game.stage !== 'high-school'
  && !entry.game.evaluation
  && String(entry.weekType || '').toLowerCase() !== 'bye'
);

export const missingCollegeGameCoverageUpdates = (state = {}) => {
  if (!isCollegePlayerCareer(state)) return [];
  const issueIds = new Set((state.newsroomIssues || []).map((issue) => publicationIdFor(issue)));
  return (state.weeklyUpdates || [])
    .filter(isCollegeGameUpdate)
    .filter((entry) => !issueIds.has(publicationIdFor(entry)))
    .sort((a, b) => {
      const seasonDelta = finite(a.season, 1) - finite(b.season, 1);
      return seasonDelta || finite(a.week, 0) - finite(b.week, 0);
    });
};

export const buildCollegeGameCoverageIssue = (state = {}, update = {}) => {
  const publicationId = publicationIdFor(update);
  const season = finite(update.season, finite(state.currentSeason, 1));
  const week = Math.max(0, finite(update.week, 0));
  const priorUpdates = (state.weeklyUpdates || [])
    .filter((entry) => finite(entry.season, 1) === season && finite(entry.week, 0) < week)
    .sort((a, b) => finite(a.week, 0) - finite(b.week, 0));
  const previousUpdate = priorUpdates.at(-1) || null;
  const currentFacts = (state.factLedger || []).filter((fact) => fact?.publicationId === publicationId);
  const previousGames = (state.gameLogs || []).filter((game) => (
    finite(game.season, 1) === season
    && finite(game.week, 0) < week
    && game.stage !== 'high-school'
    && !game.evaluation
  ));

  return createNewsroomIssue({
    publicationId,
    season,
    week,
    careerPhase: update.careerPhase || state.careerPhase,
    player: state.player,
    game: update.game,
    recruiting: update.recruitingSnapshot || state.recruiting || [],
    previousRecruiting: previousUpdate?.recruitingSnapshot || [],
    previousGames,
    quote: update.quote || '',
    rtg: update.rtgSnapshot || state.rtg || {},
    previousRtg: previousUpdate?.rtgSnapshot || {},
    playerRecruiting: state.playerRecruiting,
    collegeNewsroom: state.collegeNewsroom,
    availableFactKeys: (state.factLedger || []).map((fact) => fact.key),
    currentFactKeys: currentFacts.map((fact) => fact.key),
    publishedAt: update.publishedAt || new Date().toISOString(),
  });
};

export const addMissingCollegeGameCoverageIssues = (state = {}) => {
  const missing = missingCollegeGameCoverageUpdates(state);
  if (!missing.length) return state;
  const nextIssues = [...(state.newsroomIssues || [])];
  missing.forEach((update) => {
    const publicationId = publicationIdFor(update);
    if (nextIssues.some((issue) => matchesPublication(issue, publicationId))) return;
    nextIssues.push(buildCollegeGameCoverageIssue({ ...state, newsroomIssues: nextIssues }, update));
  });
  return { ...state, newsroomIssues: nextIssues };
};
