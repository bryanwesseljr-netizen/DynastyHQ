import { closeTransferRecruiting, normalizePlayerRecruiting } from './playerRecruiting.js';

const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const numberOf = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const hasMeaningfulCareerHistory = (state = {}) => {
  const school = String(state?.player?.college || state?.player?.school || '').trim();
  if (!state?.player?.isCommitted || !school) return false;
  return Boolean(
    list(state.gameLogs).length
    || list(state.weeklyUpdates).length
    || list(state.careerChronicle).length
    || list(state.seasonSchedules).length
    || list(state.careerMilestones).length
  );
};

export const hasOffseasonDecisionForSeason = (state = {}, season = state.currentSeason || 1) => {
  const transfer = normalizePlayerRecruiting(state.playerRecruiting).transfer;
  return transfer.decisions.some((entry) => Number(entry?.season || 0) === Number(season));
};

export const ensureReturnDecision = (state = {}) => {
  const season = Math.max(1, numberOf(state.currentSeason, 1));
  if (hasOffseasonDecisionForSeason(state, season)) return state;
  return closeTransferRecruiting(state, 'stay');
};

export const advanceCareerSeason = (state = {}, options = {}) => {
  if (!hasMeaningfulCareerHistory(state)) {
    const error = new Error('DynastyHQ blocked the season advance because the loaded save does not contain the verified college career.');
    error.code = 'EMPTY_CAREER_ADVANCE';
    throw error;
  }
  const currentSeason = Math.max(1, numberOf(state.currentSeason, 1));
  const requestedSeason = Number(options.nextSeason);
  const nextSeason = Number.isFinite(requestedSeason) && requestedSeason > 0
    ? requestedSeason
    : currentSeason + 1;
  if (nextSeason <= currentSeason) {
    const error = new Error('The next season must be later than the current season.');
    error.code = 'INVALID_SEASON_ADVANCE';
    throw error;
  }
  return {
    ...state,
    currentSeason: nextSeason,
    currentWeek: 1,
    currentWeekSetup: null,
    weeklyAgendaDraft: null,
    coach: {
      ...state.coach,
      contractYear: (numberOf(state.coach?.contractYear, 1) || 1) + 1,
    },
  };
};

export const recoverProductionCareerForSeason = (productionState = {}, targetSeason) => {
  if (!hasMeaningfulCareerHistory(productionState)) {
    const error = new Error('The live production save does not contain enough verified career history to use as a recovery source.');
    error.code = 'RECOVERY_SOURCE_EMPTY';
    throw error;
  }
  const currentSeason = Math.max(1, numberOf(productionState.currentSeason, 1));
  const desiredSeason = Math.max(1, numberOf(targetSeason, currentSeason));

  if (desiredSeason === currentSeason) return productionState;
  if (desiredSeason !== currentSeason + 1) {
    const error = new Error(`Recovery can only restore the live season or advance exactly one season. Live is Season ${currentSeason}; requested Season ${desiredSeason}.`);
    error.code = 'RECOVERY_SEASON_MISMATCH';
    throw error;
  }

  const withDecision = ensureReturnDecision(productionState);
  return advanceCareerSeason(withDecision, { nextSeason: desiredSeason });
};
