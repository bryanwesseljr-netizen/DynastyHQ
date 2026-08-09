import { normalizeHighSchoolEvaluation } from './highSchoolEvaluation.js';
import { createWeekKey } from './weeklyEngine.js';

export const createWeeklyAgendaProgress = ({
  state = {},
  highSchoolEvaluation = {},
  newGame = {},
  rtgUpdate = {},
  coachUpdate = {},
  newRumor = '',
  savedAt = new Date().toISOString(),
} = {}) => {
  const season = Number(state.currentSeason) || 1;
  const week = Number(state.currentWeek) || 1;
  return {
    season,
    week,
    weekKey: createWeekKey(season, week),
    careerPhase: state.careerPhase || 'Player',
    savedAt,
    highSchoolEvaluation: normalizeHighSchoolEvaluation(highSchoolEvaluation),
    newGame: { ...newGame },
    rtgUpdate: { ...rtgUpdate, wear: { ...(rtgUpdate.wear || {}) } },
    coachUpdate: { ...coachUpdate },
    newRumor: String(newRumor || ''),
  };
};

export const getRecoverableWeeklyAgendaProgress = (draft, state = {}) => {
  if (!draft) return null;
  const season = Number(state.currentSeason) || 1;
  const week = Number(state.currentWeek) || 1;
  if (draft.weekKey !== createWeekKey(season, week)) return null;
  if (draft.careerPhase !== (state.careerPhase || 'Player')) return null;
  return {
    ...draft,
    highSchoolEvaluation: normalizeHighSchoolEvaluation(draft.highSchoolEvaluation),
    newGame: { ...(draft.newGame || {}) },
    rtgUpdate: { ...(draft.rtgUpdate || {}), wear: { ...(draft.rtgUpdate?.wear || {}) } },
    coachUpdate: { ...(draft.coachUpdate || {}) },
    newRumor: String(draft.newRumor || ''),
  };
};
