import {
  scheduleDisplayLabel,
  schedulePhaseForEntry,
  seasonScheduleFor,
  syncScheduleWithCareer,
  teamRecordThroughWeek,
} from './seasonSchedule.js';

const clean = (value) => String(value ?? '').trim();
const numberOf = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

const tierRank = { 'no-coverage': 0, brief: 1, standard: 2, major: 3, 'career-defining': 4 };
const rankTier = (rank) => Object.entries(tierRank).find(([,value]) => value === rank)?.[0] || 'standard';

const stageForLabel = (label = '') => {
  const text = clean(label).toLowerCase();
  if (/national championship|championship game|title game/.test(text)) return 'national-championship';
  if (/semi[- ]?final/.test(text)) return 'semifinal';
  if (/quarterfinal/.test(text)) return 'quarterfinal';
  if (/first round/.test(text)) return 'first-round';
  if (/bowl\s*\d+/.test(text)) return 'bowl';
  if (/cfp|college football playoff|playoff/.test(text)) return 'playoff';
  if (/championship|conf\s+champ/.test(text)) return 'championship';
  return 'postseason';
};

const findScheduleRow = (state = {}, season = state.currentSeason || 1, week = state.currentWeek || 0) => {
  const schedule = seasonScheduleFor(state, season);
  if (!schedule?.entries?.length) return null;
  const synced = syncScheduleWithCareer(state, schedule);
  return synced.entries.find((entry) => Number(entry.week) === Number(week)) || null;
};

export const postseasonContextForWeek = (state = {}, options = {}) => {
  const season = Math.max(1, numberOf(options.season ?? state.currentSeason, 1));
  const week = Math.max(0, numberOf(options.week ?? state.currentWeek, 0));
  const row = options.scheduleEntry || findScheduleRow(state, season, week);
  const setup = options.setup || (
    Number(state.currentSeason) === season && Number(state.currentWeek) === week
      ? state.currentWeekSetup || {}
      : {}
  );
  const suppliedLabel = clean(options.label || options.weekLabel || setup.label || setup.customLabel);
  const displayLabel = row
    ? scheduleDisplayLabel(row)
    : (suppliedLabel || (clean(setup.phase) === 'postseason' ? 'POSTSEASON' : `W${week}`));
  const phase = row
    ? schedulePhaseForEntry(row)
    : (clean(options.phase || options.weekPhase || setup.phase) === 'postseason' ? 'postseason' : 'regular-season');
  const active = phase === 'postseason';
  const opponent = clean(options.game?.opponent || row?.opponent || setup.opponent);
  const isBye = Boolean(row?.isBye || setup.type === 'bye' || setup.isBye);
  const stage = active ? (clean(row?.postseasonRound) || stageForLabel(displayLabel)) : '';
  const bowlName = active ? clean(row?.bowlName) : '';
  const playoffGame = active && !isBye && Boolean(opponent);
  const entering = active ? teamRecordThroughWeek(state, season, Math.max(0, week - 1)) : null;
  const importance = !active
    ? ''
    : stage === 'national-championship'
      ? 'career-defining'
      : 'major';

  return {
    active,
    season,
    week,
    phase: active ? 'postseason' : phase,
    displayLabel,
    stage,
    bowlName,
    playoffGame,
    isBye,
    opponent,
    importance,
    enteringRecord: entering ? {
      wins: Number(entering.wins) || 0,
      losses: Number(entering.losses) || 0,
      games: Number(entering.games) || 0,
    } : null,
    stakes: active
      ? `Postseason/playoff game: ${displayLabel}. ${bowlName ? `Confirmed bowl: ${bowlName}. ` : ''}Treat this as materially higher-stakes than a regular-season week; never invent an unconfirmed bracket round, bowl assignment, advancement destination, title claim, ranking, or elimination detail.`
      : '',
  };
};

export const elevatePostseasonCoverageDecision = (decision = {}, postseason = {}) => {
  if (!postseason?.active || !postseason?.playoffGame) return decision || {};
  const requestedTier = postseason.importance === 'career-defining' ? 'career-defining' : 'major';
  const currentTier = clean(decision?.tier) || 'standard';
  const tier = rankTier(Math.max(tierRank[currentTier] ?? 2, tierRank[requestedTier]));
  const baseNews = decision?.newsroomWordRange || {};
  const basePodcast = decision?.podcastWordRange || {};
  const articleFloor = tier === 'career-defining' ? 4 : 3;
  const nationalReasons = [
    ...(decision?.audienceReach?.nationalReasons || []),
    `${postseason.displayLabel} postseason stakes`,
  ].filter(Boolean);

  return {
    ...(decision || {}),
    tier,
    articleCount: Math.max(articleFloor, Number(decision?.articleCount) || 0),
    podcastEligible: true,
    newsroomWordRange: {
      min: Math.max(tier === 'career-defining' ? 520 : 440, Number(baseNews.min) || 0),
      max: Math.max(tier === 'career-defining' ? 760 : 680, Number(baseNews.max) || 0),
    },
    podcastWordRange: {
      min: Math.max(tier === 'career-defining' ? 600 : 520, Number(basePodcast.min) || 0),
      max: Math.max(tier === 'career-defining' ? 900 : 780, Number(basePodcast.max) || 0),
    },
    audienceReach: {
      ...(decision?.audienceReach || {}),
      level: decision?.audienceReach?.level === 'national-lead' || tier === 'career-defining' ? 'national-lead' : 'national',
      regionalEligible: true,
      nationalEligible: true,
      nationalLead: Boolean(decision?.audienceReach?.nationalLead || tier === 'career-defining'),
      nationalReasons: [...new Set(nationalReasons)].slice(0, 8),
      reasons: [...new Set([
        ...(decision?.audienceReach?.reasons || []),
        'Postseason/playoff stakes',
      ])].slice(0, 8),
    },
  };
};

export const postseasonAdvanceCandidate = (state = {}) => {
  const season = Math.max(1, numberOf(state.currentSeason, 1));
  const currentWeek = Math.max(0, numberOf(state.currentWeek, 0));
  const schedule = seasonScheduleFor(state, season);
  if (!schedule?.entries?.length) return null;
  const entries = syncScheduleWithCareer(state, schedule).entries
    .slice()
    .sort((a,b) => Number(a.week) - Number(b.week));

  const target = entries.find((entry) => (
    Number(entry.week) >= currentWeek
    && !entry.completed
    && !entry.isBye
    && clean(entry.opponent)
    && schedulePhaseForEntry(entry) === 'postseason'
  ));
  if (!target) return null;

  const blockers = entries.filter((entry) => (
    Number(entry.week) >= currentWeek
    && Number(entry.week) < Number(target.week)
    && !entry.completed
    && !entry.isBye
  ));
  if (blockers.length) return null;

  const context = postseasonContextForWeek(state, {
    season,
    week: target.week,
    scheduleEntry: target,
  });
  return { ...context, entry: target };
};

export const advancePostseasonCareer = (state = {}) => {
  const candidate = postseasonAdvanceCandidate(state);
  if (!candidate) return state;
  const targetWeek = Number(candidate.week);
  const alreadyActive = Number(state.currentWeek) === targetWeek
    && clean(state.currentWeekSetup?.opponent).toLowerCase() === clean(candidate.opponent).toLowerCase()
    && clean(state.currentWeekSetup?.phase) === 'postseason';
  if (alreadyActive) return state;

  return {
    ...state,
    currentWeek: targetWeek,
    currentWeekSetup: {
      ...(Number(state.currentWeek) === targetWeek ? state.currentWeekSetup || {} : {}),
      week: targetWeek,
      type: 'game',
      phase: 'postseason',
      label: candidate.displayLabel,
      customLabel: candidate.displayLabel,
      opponent: candidate.opponent,
      opponentRecord: '',
      kickoff: clean(candidate.entry?.date),
      venue: candidate.entry?.homeAway === 'home'
        ? 'Home'
        : candidate.entry?.homeAway === 'away'
          ? 'Away'
          : candidate.entry?.homeAway === 'neutral'
            ? 'Neutral site'
            : '',
      conferenceGameOverride: '',
      isConferenceGame: false,
      conferenceGameSource: 'auto',
      conferenceName: '',
      opponentConference: '',
      note: '',
      source: 'season-schedule-postseason',
    },
  };
};

export const postseasonPendingLabel = (state = {}) => {
  const season = Math.max(1, numberOf(state.currentSeason, 1));
  const week = Math.max(0, numberOf(state.currentWeek, 0));
  if (findScheduleRow(state, season, week)) return '';
  const priorPostseason = (state.gameLogs || []).some((game) => (
    Number(game?.season || 1) === season
    && (game?.weekPhase === 'postseason' || game?.postseason?.active)
  ));
  return priorPostseason ? 'POSTSEASON TBD' : '';
};
