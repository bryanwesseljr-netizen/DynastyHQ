import {
  normalizeSeasonSchedule,
  scheduleWeekSetup,
  seasonScheduleFor,
  upsertSeasonSchedule,
} from './seasonSchedule.js';
import { inferConferenceGame } from './conferenceRecord.js';

const clean = (value) => String(value ?? '').trim();
const arrayOf = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const isBackupRole = (role = '') => {
  const text = clean(role).toUpperCase();
  if (!text) return false;
  if (/\b(BACKUP|RESERVE|SECOND STRING|THIRD STRING)\b/.test(text)) return true;
  if (/\b[A-Z]{1,4}\s*[2-9]\b/.test(text)) return true;
  return false;
};

const resultValue = (value) => {
  const result = clean(value).toUpperCase();
  return ['W', 'L'].includes(result) ? result : '';
};

const normalizeBulkResult = (entry = {}) => ({
  week: Math.max(0, Number(entry.week) || 0),
  result: resultValue(entry.result),
  teamScore: numberOrNull(entry.teamScore),
  opponentScore: numberOrNull(entry.opponentScore),
});

const scoreResult = (teamScore, opponentScore) => {
  if (teamScore === null || opponentScore === null || teamScore === opponentScore) return '';
  return teamScore > opponentScore ? 'W' : 'L';
};

export const backupSeasonTargetOptions = (state = {}) => {
  const currentWeek = Math.max(1, Number(state.currentWeek) || 1);
  const schedule = seasonScheduleFor(state);
  const scheduleMax = Math.max(0, ...(schedule?.entries || []).map((entry) => Number(entry.week) || 0));
  const maxWeek = Math.max(scheduleMax + 1, currentWeek + 8, 16);
  return Array.from({ length: Math.max(0, maxWeek - currentWeek) }, (_, index) => currentWeek + index + 1);
};

export const backupSeasonRange = (state = {}, targetWeek) => {
  const season = Math.max(1, Number(state.currentSeason) || 1);
  const startWeek = Math.max(1, Number(state.currentWeek) || 1);
  const endExclusive = Math.max(startWeek + 1, Number(targetWeek) || startWeek + 1);
  const schedule = seasonScheduleFor(state, season);
  const byWeek = new Map((schedule?.entries || []).map((entry) => [Number(entry.week), entry]));
  return Array.from({ length: Math.max(0, endExclusive - startWeek) }, (_, index) => {
    const week = startWeek + index;
    const scheduled = byWeek.get(week);
    return scheduled || {
      week,
      opponent: '',
      homeAway: 'unknown',
      isBye: false,
      completed: false,
      status: 'upcoming',
      result: '',
      teamScore: null,
      opponentScore: null,
      date: '',
      conference: '',
      label: '',
    };
  });
};

const resultGame = ({ state, season, scheduleEntry, result }) => {
  const resolved = result.result || scoreResult(result.teamScore, result.opponentScore);
  if (!resolved || scheduleEntry?.isBye) return null;
  const opponent = clean(scheduleEntry?.opponent);
  if (!opponent) return null;
  return {
    season,
    week: Number(scheduleEntry.week),
    opponent,
    result: resolved,
    homeScore: result.teamScore,
    awayScore: result.opponentScore,
    didPlay: false,
    passYds: '',
    passTD: '',
    rushYds: '',
    rushTD: '',
    int: '',
    stage: 'college',
    bulkBackup: true,
    isConferenceGame: inferConferenceGame(state, opponent),
    conferenceGameSource: 'auto',
  };
};

const mergeGameLogs = (state = {}, games = []) => {
  const byKey = new Map(arrayOf(state.gameLogs).map((game) => [
    `${Number(game?.season || 1)}:${Number(game?.week || 0)}`,
    game,
  ]));
  games.forEach((game) => {
    const key = `${game.season}:${game.week}`;
    const existing = byKey.get(key);
    if (existing && existing.didPlay !== false) return;
    byKey.set(key, existing ? { ...existing, ...game, didPlay: false, bulkBackup: true } : game);
  });
  return [...byKey.values()].sort((left, right) => (
    Number(left?.season || 1) - Number(right?.season || 1)
    || Number(left?.week || 0) - Number(right?.week || 0)
  ));
};

const mergeBackupStretch = (stretches = [], next = {}) => {
  const rows = arrayOf(stretches);
  const previous = rows.at(-1);
  if (
    previous
    && Number(previous.season) === Number(next.season)
    && clean(previous.role) === clean(next.role)
    && Number(previous.endWeek) + 1 === Number(next.startWeek)
  ) {
    return [...rows.slice(0, -1), {
      ...previous,
      endWeek: next.endWeek,
      advancedToWeek: next.advancedToWeek,
      updatedAt: next.updatedAt,
    }];
  }
  return [...rows, next];
};

export const applyBackupSeasonCatchUp = ({
  state = {},
  targetWeek,
  results = [],
  now = new Date().toISOString(),
}) => {
  const season = Math.max(1, Number(state.currentSeason) || 1);
  const startWeek = Math.max(1, Number(state.currentWeek) || 1);
  const nextWeek = Number(targetWeek);
  if (!Number.isFinite(nextWeek) || nextWeek <= startWeek) {
    const error = new Error('Choose a later week before fast-forwarding.');
    error.code = 'INVALID_BACKUP_TARGET';
    throw error;
  }
  if (!isBackupRole(state?.rtg?.rank)) {
    const error = new Error('Backup Season Mode is only available while the saved RTG role is a backup or reserve.');
    error.code = 'NOT_BACKUP_ROLE';
    throw error;
  }

  const range = backupSeasonRange(state, nextWeek);
  const resultMap = new Map(arrayOf(results).map((entry) => {
    const normalized = normalizeBulkResult(entry);
    return [normalized.week, normalized];
  }));

  let nextState = state;
  const schedule = seasonScheduleFor(state, season);
  if (schedule?.entries?.length) {
    const entries = normalizeSeasonSchedule(schedule, season).entries.map((entry) => {
      if (entry.week < startWeek || entry.week >= nextWeek || entry.isBye) return entry;
      const patch = resultMap.get(entry.week);
      if (!patch) return entry;
      const result = patch.result || scoreResult(patch.teamScore, patch.opponentScore) || entry.result;
      if (!result && patch.teamScore === null && patch.opponentScore === null) return entry;
      return {
        ...entry,
        result,
        teamScore: patch.teamScore ?? entry.teamScore,
        opponentScore: patch.opponentScore ?? entry.opponentScore,
        completed: Boolean(result) || entry.completed,
        status: Boolean(result) ? 'completed' : entry.status,
      };
    });
    nextState = upsertSeasonSchedule(nextState, { ...schedule, entries, updatedAt: now });
  }

  const scheduleAfter = seasonScheduleFor(nextState, season);
  const scheduleByWeek = new Map((scheduleAfter?.entries || []).map((entry) => [Number(entry.week), entry]));
  const resultGames = range
    .map((entry) => {
      const patch = resultMap.get(Number(entry.week));
      if (!patch) return null;
      return resultGame({
        state: nextState,
        season,
        scheduleEntry: scheduleByWeek.get(Number(entry.week)) || entry,
        result: patch,
      });
    })
    .filter(Boolean);

  const role = clean(state?.rtg?.rank) || 'backup';
  const stretch = {
    id: `backup-stretch-${season}-${startWeek}-${nextWeek - 1}`,
    season,
    startWeek,
    endWeek: nextWeek - 1,
    advancedToWeek: nextWeek,
    role,
    recordedAt: now,
    updatedAt: now,
  };
  const chronicleId = stretch.id;
  const existingChronicle = arrayOf(nextState.careerChronicle).filter((entry) => entry?.id !== chronicleId);
  const resultCount = resultGames.length;

  nextState = {
    ...nextState,
    currentWeek: nextWeek,
    currentWeekSetup: null,
    weeklyAgendaDraft: null,
    gameLogs: mergeGameLogs(nextState, resultGames),
    backupStretches: mergeBackupStretch(nextState.backupStretches, stretch),
    careerChronicle: [...existingChronicle, {
      id: chronicleId,
      publicationId: chronicleId,
      type: 'backup-stretch',
      season,
      week: nextWeek - 1,
      startWeek,
      endWeek: nextWeek - 1,
      careerPhase: nextState.careerPhase || 'Player',
      occurredAt: now,
      title: startWeek === nextWeek - 1
        ? `Backup week · Week ${startWeek}`
        : `Backup stretch · Weeks ${startWeek}–${nextWeek - 1}`,
      summary: `Remained ${role} through ${startWeek === nextWeek - 1 ? `Week ${startWeek}` : `Weeks ${startWeek}–${nextWeek - 1}`}.${resultCount ? ` ${resultCount} team result${resultCount === 1 ? '' : 's'} recorded in bulk.` : ' Team results can be added later in one batch.'}`,
      factKeys: [],
    }],
  };

  const setup = scheduleWeekSetup(nextState);
  if (setup && Number(setup.week) === Number(nextWeek)) {
    nextState = { ...nextState, currentWeekSetup: setup };
  }
  return nextState;
};
