import { createWeekKey, findPublishedWeekConflict } from './weeklyEngine.js';

export const WEEKLY_DRAFT_STORAGE_VERSION = 1;

const withoutLargePreview = (source) => {
  if (!source) return source;
  const { previewUrl, ...rest } = source;
  return previewUrl ? { ...rest, previewWasRemoved: true } : rest;
};

const compactDraft = (draft) => draft ? {
  ...draft,
  sources: (draft.sources || []).map(withoutLargePreview),
} : null;

export const createWeeklyDraftRecoveryRecord = ({
  ownerId,
  scanDraft = null,
  appliedScanDraft = null,
  newGame = null,
  rtgUpdate = null,
  coachUpdate = null,
  savedAt = new Date().toISOString(),
}) => {
  if (!ownerId || (!scanDraft && !appliedScanDraft)) return null;
  return {
    version: WEEKLY_DRAFT_STORAGE_VERSION,
    ownerId,
    savedAt,
    scanDraft: compactDraft(scanDraft),
    appliedScanDraft: compactDraft(appliedScanDraft),
    newGame,
    rtgUpdate,
    coachUpdate,
  };
};

const recordDraft = (record) => record?.appliedScanDraft || record?.scanDraft || null;

export const inspectWeeklyDraftRecovery = ({ record, ownerId, state }) => {
  if (!record || record.version !== WEEKLY_DRAFT_STORAGE_VERSION) return { status: 'invalid' };
  if (!ownerId || record.ownerId !== ownerId) return { status: 'wrong-owner' };

  const draft = recordDraft(record);
  if (!draft) return { status: 'empty' };
  const season = Number(draft.season) || 1;
  const week = Number(draft.week) || 1;
  const weekKey = draft.weekKey || draft.id || createWeekKey(season, week);
  if (findPublishedWeekConflict(state, { season, week, weekKey })) {
    return { status: 'already-published', weekKey };
  }

  const currentWeekKey = createWeekKey(state.currentSeason || 1, state.currentWeek || 1);
  if (weekKey !== currentWeekKey || draft.careerPhase !== state.careerPhase) {
    return { status: 'stale', weekKey, currentWeekKey };
  }

  return {
    status: 'recoverable',
    weekKey,
    record: {
      ...record,
      scanDraft: record.scanDraft ? { ...record.scanDraft, weekKey } : null,
      appliedScanDraft: record.appliedScanDraft ? { ...record.appliedScanDraft, weekKey } : null,
    },
  };
};
