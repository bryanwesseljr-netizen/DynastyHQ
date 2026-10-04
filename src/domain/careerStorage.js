const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const clean = (value) => String(value ?? '').trim();

export const CAREER_STORAGE_VERSION = 2;
export const CAREER_ARCHIVE_COLLECTION = 'hq_week_archives';

export const SHARDED_CAREER_FIELDS = Object.freeze([
  'weeklyUpdates',
  'factLedger',
  'newsroomIssues',
  'eaSportsNetworkArticles',
  'podcastEpisodes',
  'careerChronicle',
  'postgameFrontPages',
  'coverageReferences',
]);

const publicationPoint = (entry = {}) => {
  const publicationId = clean(entry.publicationId || entry.weekKey || entry.id);
  const seasonWeekMatch = publicationId.match(/season-(\d+)-week-(\d+)/i);
  const eventMatch = publicationId.match(/(?:^|-)s(\d+)-w(\d+)(?:-|$)/i);
  const season = Number(entry.season) || Number(seasonWeekMatch?.[1]) || Number(eventMatch?.[1]) || 0;
  const weekRaw = entry.week ?? seasonWeekMatch?.[2] ?? eventMatch?.[2];
  const week = weekRaw === '' || weekRaw === null || weekRaw === undefined ? -1 : Number(weekRaw);
  return {
    publicationId,
    season: Number.isFinite(season) ? Math.max(0, season) : 0,
    week: Number.isFinite(week) ? Math.max(0, week) : -1,
  };
};

export const archiveIdForEntry = (entry = {}) => {
  const point = publicationPoint(entry);
  if (!point.season || point.week < 0) return '';
  return `season-${point.season}-week-${point.week}`;
};

const archiveSort = (left, right) => (
  Number(left?.season || 0) - Number(right?.season || 0)
  || Number(left?.week || 0) - Number(right?.week || 0)
  || clean(left?.archiveId).localeCompare(clean(right?.archiveId))
);

const entryKey = (field, entry = {}, index = 0) => {
  if (field === 'factLedger') {
    return clean(entry.id) || `${clean(entry.publicationId)}:${clean(entry.key)}:${index}`;
  }
  return clean(entry.id || entry.publicationId || entry.weekKey)
    || `${archiveIdForEntry(entry)}:${field}:${index}`;
};

const dedupe = (field, values = []) => {
  const byKey = new Map();
  list(values).forEach((entry, index) => {
    byKey.set(entryKey(field, entry, index), entry);
  });
  return [...byKey.values()];
};

export const splitCareerStateForStorage = (state = {}, now = new Date().toISOString()) => {
  const mainState = { ...state };
  const archivesById = new Map();

  SHARDED_CAREER_FIELDS.forEach((field) => {
    const keepInMain = [];
    list(state[field]).forEach((entry) => {
      const archiveId = archiveIdForEntry(entry);
      if (!archiveId) {
        keepInMain.push(entry);
        return;
      }
      if (!archivesById.has(archiveId)) {
        const point = publicationPoint(entry);
        archivesById.set(archiveId, {
          archiveId,
          season: point.season,
          week: point.week,
          storageVersion: 1,
          updatedAt: now,
        });
      }
      const archive = archivesById.get(archiveId);
      archive[field] = [...list(archive[field]), entry];
    });
    mainState[field] = keepInMain;
  });

  const archives = [...archivesById.values()]
    .map((archive) => {
      const next = { ...archive };
      SHARDED_CAREER_FIELDS.forEach((field) => {
        if (archive[field]) next[field] = dedupe(field, archive[field]);
      });
      return next;
    })
    .sort(archiveSort);

  mainState._storage = {
    ...(state._storage || {}),
    version: CAREER_STORAGE_VERSION,
    archiveCollection: CAREER_ARCHIVE_COLLECTION,
    archiveIds: archives.map((archive) => archive.archiveId),
    shardedFields: [...SHARDED_CAREER_FIELDS],
    updatedAt: now,
  };

  return { mainState, archives };
};

export const hydrateCareerStateFromArchives = (mainState = {}, archives = []) => {
  if (Number(mainState?._storage?.version || 0) < CAREER_STORAGE_VERSION) return mainState;
  const ordered = list(archives).sort(archiveSort);
  const hydrated = { ...mainState };

  SHARDED_CAREER_FIELDS.forEach((field) => {
    hydrated[field] = dedupe(field, [
      ...list(mainState[field]),
      ...ordered.flatMap((archive) => list(archive?.[field])),
    ]);
  });

  return hydrated;
};

export const storageArchiveIds = (state = {}) => (
  Number(state?._storage?.version || 0) >= CAREER_STORAGE_VERSION
    ? list(state?._storage?.archiveIds).map(clean).filter(Boolean)
    : []
);

export const estimatedJsonBytes = (value) => {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return 0;
  }
};
