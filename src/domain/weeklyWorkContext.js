const finite = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const weeklyPublicationId = (season = 1, week = 0) => (
  `season-${finite(season, 1)}-week-${Math.max(0, finite(week, 0))}`
);

const finalizationExists = (career = {}, publicationId = '') => {
  const raw = career.weekFinalizations || {};
  if (Array.isArray(raw)) return raw.some((entry) => entry?.publicationId === publicationId);
  return Boolean(raw?.[publicationId]);
};

const publishedWeeks = (career = {}) => [...(career.weeklyUpdates || [])]
  .filter((entry) => Number.isFinite(Number(entry?.week)))
  .sort((a, b) => {
    const seasonDelta = finite(a?.season, 1) - finite(b?.season, 1);
    return seasonDelta || finite(a?.week, 0) - finite(b?.week, 0);
  });

export const resolveWeeklyWorkContext = (career = {}) => {
  const currentSeason = finite(career.currentSeason, 1);
  const currentWeek = Math.max(0, finite(career.currentWeek, 0));
  const latest = publishedWeeks(career).at(-1) || null;
  const latestSeason = finite(latest?.season, currentSeason);
  const latestWeek = Math.max(0, finite(latest?.week, 0));
  const latestPublicationId = latest?.publicationId || latest?.weekKey || latest?.id
    || weeklyPublicationId(latestSeason, latestWeek);
  const wrapUp = latest
    && latestSeason === currentSeason
    && currentWeek <= latestWeek + 1
    && !finalizationExists(career, latestPublicationId)
    ? { ...latest, publicationId: latestPublicationId, season: latestSeason, week: latestWeek }
    : null;

  const season = wrapUp?.season ?? currentSeason;
  const week = wrapUp?.week ?? currentWeek;
  const publicationId = wrapUp?.publicationId || weeklyPublicationId(season, week);
  const setup = career.currentWeekSetup || {};
  const setupWeek = Number(setup.week);
  const setupReady = Number.isFinite(setupWeek)
    && setupWeek === week
    && ['game', 'bye'].includes(String(setup.type || 'game').toLowerCase());

  return {
    currentSeason,
    currentWeek,
    season,
    week,
    publicationId,
    wrapUp,
    setup,
    setupReady,
    label: setupReady ? (setup.label || setup.customLabel || `Week ${week}`) : `Week ${week}`,
  };
};
