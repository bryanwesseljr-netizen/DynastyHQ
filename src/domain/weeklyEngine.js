import { createNewsroomIssue } from './newsroomEngine.js';

export const CAREER_SCHEMA_VERSION = 9;

export class DuplicateWeekPublicationError extends Error {
  constructor(weekKey) {
    super(`${weekKey} has already been published.`);
    this.name = 'DuplicateWeekPublicationError';
    this.code = 'DUPLICATE_WEEK';
    this.weekKey = weekKey;
  }
}

export class StaleWeekPublicationError extends Error {
  constructor(weekKey, currentWeekKey) {
    super(`${weekKey} is stale; the career is currently at ${currentWeekKey}.`);
    this.name = 'StaleWeekPublicationError';
    this.code = 'STALE_WEEK';
    this.weekKey = weekKey;
    this.currentWeekKey = currentWeekKey;
  }
}

export const createWeekKey = (season = 1, week = 1) => `season-${Number(season) || 1}-week-${Number(week) || 1}`;

export const findPublishedWeekConflict = (state, { season, week, weekKey } = {}) => {
  const targetSeason = Number(season) || 1;
  const targetWeek = Number(week) || 1;
  const targetKey = weekKey || createWeekKey(targetSeason, targetWeek);
  const update = (state?.weeklyUpdates || []).find((entry) => (
    entry.weekKey === targetKey
    || (Number(entry.season) === targetSeason && Number(entry.week) === targetWeek)
  ));
  if (update) return { type: 'weekly-update', entry: update, weekKey: targetKey };

  const game = (state?.gameLogs || []).find((entry) => (
    Number(entry.season || 1) === targetSeason && Number(entry.week) === targetWeek
  ));
  return game ? { type: 'game-log', entry: game, weekKey: targetKey } : null;
};

export const WEEK_TYPES = Object.freeze({
  GAME: 'game',
  NO_APPEARANCE: 'no-appearance',
  BYE: 'bye',
});

const numberOrBlank = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
};

const confidenceForMatch = (match, fallback = 0.72) => match ? 0.92 : fallback;

const fact = (key, label, value, confidence, sourceId) => ({
  id: `${sourceId}:${key}`,
  key,
  label,
  value,
  confidence,
  sourceId,
  verified: false,
});

const extractNumber = (text, expression) => {
  const match = text.match(expression);
  return { match, value: match ? numberOrBlank(match[1].replace(/,/g, '')) : '' };
};

const getInterestLevel = (interest) => {
  if (interest >= 75) return 'High';
  if (interest >= 50) return 'Medium';
  if (interest >= 25) return 'Low';
  return 'None';
};

const EDITABLE_NUMERIC_KEYS = new Set([
  'game.homeScore',
  'game.awayScore',
  'game.passYds',
  'game.passTD',
  'game.rushYds',
  'game.rushTD',
  'game.int',
  'rtg.gpa',
  'rtg.energy',
  'rtg.coachTrust',
  'rtg.skillPoints',
  'rtg.followers',
  'rtg.valuation',
  'coach.dynastyPoints',
  'coach.recruitingNIL',
  'coach.rosterNIL',
  'coach.staffBudget',
  'coach.facilitiesBudget',
  'coach.rosterSize',
  'coach.scholarshipsUsed',
  'coach.portalDepartures',
  'coach.openScholarships',
  'coach.classCommits',
  'coach.portalAdditions',
  'roster.qb.count', 'roster.qb.need', 'roster.rb.count', 'roster.rb.need',
  'roster.wr.count', 'roster.wr.need', 'roster.te.count', 'roster.te.need',
  'roster.ol.count', 'roster.ol.need', 'roster.dl.count', 'roster.dl.need',
  'roster.lb.count', 'roster.lb.need', 'roster.cb.count', 'roster.cb.need',
  'roster.s.count', 'roster.s.need', 'roster.st.count', 'roster.st.need',
]);

const recruitingFactParts = (key) => {
  const match = String(key).match(/^recruiting\.(.+)\.(interest|offer|position|stars|status)$/);
  return match ? { schoolId: match[1], field: match[2] } : null;
};

const retentionFactParts = (key) => {
  const match = String(key).match(/^retention\.(.+)\.(position|overall|risk|status|nilDemand)$/);
  return match ? { playerId: match[1], field: match[2] } : null;
};

const editableValue = (key, value) => {
  if (value === '' || value === null || value === undefined) return '';
  const retentionParts = retentionFactParts(key);
  if (EDITABLE_NUMERIC_KEYS.has(key) || ['interest', 'stars'].includes(recruitingFactParts(key)?.field) || ['overall', 'nilDemand'].includes(retentionParts?.field)) {
    const parsed = Number(String(value).replace(/[$,%]/g, ''));
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (recruitingFactParts(key)?.field === 'offer') {
    return value === true || /^(true|yes|offered|offer)$/i.test(String(value).trim());
  }
  return String(value).trim();
};

export const validateScanFact = (factEntry) => {
  const { key, value } = factEntry || {};
  if (value === '' || value === null || value === undefined) return 'Enter a value or ignore this fact.';

  const recruitingParts = recruitingFactParts(key);
  const retentionParts = retentionFactParts(key);
  if (EDITABLE_NUMERIC_KEYS.has(key) || ['interest', 'stars'].includes(recruitingParts?.field) || ['overall', 'nilDemand'].includes(retentionParts?.field)) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 'Enter a valid number.';
    if (parsed < 0) return 'Value cannot be negative.';
    if (key === 'rtg.gpa' && parsed > 4) return 'GPA must be between 0 and 4.';
    if ((key === 'rtg.energy' || recruitingParts?.field === 'interest') && parsed > 100) return 'Value must be between 0 and 100.';
    if (recruitingParts?.field === 'stars' && (parsed < 1 || parsed > 5)) return 'Star rating must be between 1 and 5.';
    if (retentionParts?.field === 'overall' && parsed > 99) return 'Overall rating must be between 0 and 99.';
  }

  if (key === 'game.result' && !['W', 'L'].includes(String(value).toUpperCase())) return 'Choose a win or loss.';
  if (key.startsWith('rtg.wear.') && !['Green', 'Yellow', 'Red'].includes(value)) return 'Choose Green, Yellow, or Red.';
  if (recruitingParts?.field === 'offer' && typeof value !== 'boolean') return 'Choose whether an offer was received.';
  return '';
};

const rebuildDraftPatches = (draft, facts) => {
  const gamePatch = {};
  const rtgPatch = {};
  const coachPatch = {};
  const wearPatch = {};
  const originalSchools = new Map((draft.recruitingPatches || []).map((school) => [String(school.id), school]));
  const originalPlayers = new Map((draft.retentionPatches || []).map((player) => [String(player.id), player]));
  const recruitingById = new Map();
  const retentionById = new Map();

  facts.forEach((entry) => {
    if (validateScanFact(entry)) return;
    if (entry.key.startsWith('game.')) {
      gamePatch[entry.key.slice('game.'.length)] = entry.value;
      return;
    }
    if (entry.key.startsWith('rtg.wear.')) {
      wearPatch[entry.key.slice('rtg.wear.'.length)] = entry.value;
      return;
    }
    if (entry.key.startsWith('rtg.')) {
      rtgPatch[entry.key.slice('rtg.'.length)] = entry.value;
      return;
    }
    if (entry.key.startsWith('coach.')) {
      coachPatch[entry.key.slice('coach.'.length)] = entry.value;
      return;
    }
    if (entry.key.startsWith('roster.')) return;

    const retentionParts = retentionFactParts(entry.key);
    if (retentionParts) {
      const original = originalPlayers.get(retentionParts.playerId);
      if (!original) return;
      const current = retentionById.get(retentionParts.playerId) || { id: original.id, name: original.name };
      current[retentionParts.field] = ['overall', 'nilDemand'].includes(retentionParts.field)
        ? Number(entry.value)
        : String(entry.value).trim();
      retentionById.set(retentionParts.playerId, current);
      return;
    }

    const parts = recruitingFactParts(entry.key);
    if (!parts) return;
    const original = originalSchools.get(parts.schoolId);
    if (!original) return;
    const current = recruitingById.get(parts.schoolId) || { id: original.id, name: original.name };
    if (parts.field === 'interest') {
      current.interest = Number(entry.value);
      current.level = getInterestLevel(current.interest);
    } else if (parts.field === 'offer') {
      current.offered = entry.value;
    } else if (parts.field === 'stars') {
      current.stars = Number(entry.value);
    } else {
      current[parts.field] = String(entry.value).trim();
    }
    recruitingById.set(parts.schoolId, current);
  });

  if (Object.keys(wearPatch).length) rtgPatch.wear = wearPatch;
  return {
    gamePatch,
    rtgPatch,
    coachPatch,
    recruitingPatches: [...recruitingById.values()],
    retentionPatches: [...retentionById.values()],
  };
};

export const updateScanDraftFact = (draft, factKey, value) => {
  if (!draft) return draft;
  const facts = draft.facts.map((entry) => {
    if (entry.key !== factKey) return entry;
    const nextValue = editableValue(entry.key, value);
    const originalValue = Object.hasOwn(entry, 'originalValue') ? entry.originalValue : entry.value;
    return {
      ...entry,
      value: nextValue,
      originalValue,
      userVerified: true,
      corrected: String(nextValue) !== String(originalValue),
    };
  });
  return { ...draft, ...rebuildDraftPatches(draft, facts), facts };
};

export const verifyScanDraftFact = (draft, factKey) => {
  if (!draft) return draft;
  const facts = draft.facts.map((entry) => entry.key === factKey
    ? { ...entry, userVerified: true, corrected: Boolean(entry.corrected) }
    : entry);
  return { ...draft, facts };
};

export const removeScanDraftFact = (draft, factKey) => {
  if (!draft) return draft;
  const facts = draft.facts.filter((entry) => entry.key !== factKey);
  return { ...draft, ...rebuildDraftPatches(draft, facts), facts };
};

export const createEmptyScanDraft = ({
  season = 1,
  week = 1,
  careerPhase = 'Player',
  isCommitted = false,
  weekType = WEEK_TYPES.GAME,
} = {}) => ({
  id: createWeekKey(season, week),
  weekKey: createWeekKey(season, week),
  status: 'scanning',
  season,
  week,
  careerPhase,
  isCommitted,
  weekType,
  createdAt: new Date().toISOString(),
  sources: [],
  facts: [],
  gamePatch: {},
  rtgPatch: {},
  coachPatch: {},
  recruitingPatches: [],
  retentionPatches: [],
});

export const updateScanDraftWeekType = (draft, weekType) => {
  if (!draft || !Object.values(WEEK_TYPES).includes(weekType)) return draft;
  return { ...draft, weekType };
};

const hasEveryFact = (keys, availableKeys) => keys.every((key) => availableKeys.has(key));
const hasSomeFact = (keys, availableKeys) => keys.some((key) => availableKeys.has(key));

export const getWeeklyCompleteness = (draft) => {
  if (!draft) return { checks: [], missingRequired: 0, missingRecommended: 0, isComplete: false };

  const availableKeys = new Set((draft.facts || [])
    .filter((entry) => !validateScanFact(entry))
    .map((entry) => entry.key));
  const detectedTypes = new Set((draft.sources || []).flatMap((source) => source.detectedTypes || []));
  const successfulSources = (draft.sources || []).filter((source) => !source.error);
  const unresolvedFacts = (draft.facts || []).filter((entry) => entry.confidence < 0.9 && !entry.userVerified);
  const invalidFacts = (draft.facts || []).filter((entry) => validateScanFact(entry));
  const isPlayer = draft.careerPhase === 'Player';
  const isBye = draft.weekType === WEEK_TYPES.BYE;
  const isNoAppearance = draft.weekType === WEEK_TYPES.NO_APPEARANCE;
  const gameIdentityKeys = ['game.opponent', 'game.result', 'game.homeScore', 'game.awayScore'];
  const playerStatKeys = ['game.passYds', 'game.passTD', 'game.rushYds', 'game.rushTD', 'game.int'];
  const playerStatusKeys = ['rtg.gpa', 'rtg.energy', 'rtg.coachTrust', 'rtg.skillPoints'];
  const wearKeys = ['rtg.wear.head', 'rtg.wear.chest', 'rtg.wear.arm', 'rtg.wear.legs'];
  const hasRecruiting = [...availableKeys].some((key) => key.startsWith('recruiting.'));
  const hasProgramBudget = [...availableKeys].some((key) => key.startsWith('coach.') && /(?:dynastyPoints|NIL|Budget)$/.test(key));
  const hasRosterSnapshot = [...availableKeys].some((key) => (
    (key.startsWith('coach.') && /(?:rosterSize|scholarshipsUsed|portalDepartures|openScholarships|classCommits|portalAdditions)$/.test(key))
    || key.startsWith('roster.')
    || key.startsWith('retention.')
  ));
  const nonGameFacts = [...availableKeys].filter((key) => !key.startsWith('game.'));
  const checks = [];
  const addCheck = (id, label, detail, status, importance = 'recommended') => {
    checks.push({ id, label, detail, status, importance });
  };

  addCheck(
    'sources',
    'Readable screenshot source',
    successfulSources.length ? `${successfulSources.length} source${successfulSources.length === 1 ? '' : 's'} analyzed.` : 'Upload at least one readable screenshot.',
    successfulSources.length > 0 ? 'complete' : 'missing',
    'required',
  );
  addCheck(
    'review',
    'Extraction review resolved',
    unresolvedFacts.length || invalidFacts.length
      ? `${unresolvedFacts.length + invalidFacts.length} value${unresolvedFacts.length + invalidFacts.length === 1 ? '' : 's'} still need attention.`
      : 'No unresolved or invalid extracted values.',
    unresolvedFacts.length || invalidFacts.length ? 'missing' : 'complete',
    'required',
  );

  if (isBye) {
    addCheck(
      'bye-update',
      'Bye-week activity',
      nonGameFacts.length ? 'At least one non-game update is ready.' : 'Add player, recruiting, health, or program information for this bye week.',
      nonGameFacts.length ? 'complete' : 'missing',
      'required',
    );
  } else {
    addCheck(
      'final-score',
      'Opponent, result, and final score',
      hasEveryFact(gameIdentityKeys, availableKeys) ? 'The matchup and final score are complete.' : 'Upload or enter the opponent, result, team score, and opponent score.',
      hasEveryFact(gameIdentityKeys, availableKeys) ? 'complete' : 'missing',
      'required',
    );
    if (isPlayer && !isNoAppearance) {
      addCheck(
        'player-stats',
        'Quarterback stat line',
        hasEveryFact(playerStatKeys, availableKeys) ? 'Passing, rushing, touchdown, and interception totals are complete.' : 'Add passing yards/TDs, rushing yards/TDs, and interceptions—even when a value is zero.',
        hasEveryFact(playerStatKeys, availableKeys) ? 'complete' : 'missing',
        'required',
      );
    }
  }

  if (isPlayer) {
    addCheck(
      'player-status',
      'Player status',
      hasSomeFact(playerStatusKeys, availableKeys) || detectedTypes.has('Player Mechanics')
        ? 'Player development or weekly status is represented.'
        : 'Recommended: add the Player Hub or weekly mechanics screen.',
      hasSomeFact(playerStatusKeys, availableKeys) || detectedTypes.has('Player Mechanics') ? 'complete' : 'missing',
    );
    addCheck(
      'wear',
      'Wear & tear',
      hasSomeFact(wearKeys, availableKeys) || detectedTypes.has('Wear & Tear')
        ? 'At least one wear-and-tear status is captured.'
        : 'Recommended after games: add the wear-and-tear screen.',
      hasSomeFact(wearKeys, availableKeys) || detectedTypes.has('Wear & Tear') ? 'complete' : 'missing',
    );
  }

  if (!isPlayer || !draft.isCommitted) {
    addCheck(
      'recruiting',
      isPlayer ? 'Recruiting progress' : 'Recruiting board',
      hasRecruiting
        ? 'Recruiting interest or offer information is captured.'
        : `Recommended: add the ${isPlayer ? 'RTG recruiting' : 'coach recruiting board'} screen when it changed this week.`,
      hasRecruiting ? 'complete' : 'missing',
    );
  }

  if (!isPlayer) {
    addCheck(
      'program-budget',
      'Dynasty Points / NIL budget',
      hasProgramBudget || detectedTypes.has('NIL / Program Budget')
        ? 'At least one program-budget field is captured.'
        : 'Recommended when resources change: add the Dynasty Points or NIL budget screen.',
      hasProgramBudget || detectedTypes.has('NIL / Program Budget') ? 'complete' : 'missing',
    );
    addCheck(
      'roster-snapshot',
      'Roster-management snapshot',
      hasRosterSnapshot || detectedTypes.has('Roster Management')
        ? 'Roster or scholarship-management data is represented.'
        : 'Recommended during recruiting and portal weeks: add the roster-management screen.',
      hasRosterSnapshot || detectedTypes.has('Roster Management') ? 'complete' : 'missing',
    );
  }

  const missingRequired = checks.filter((check) => check.importance === 'required' && check.status === 'missing').length;
  const missingRecommended = checks.filter((check) => check.importance === 'recommended' && check.status === 'missing').length;
  return {
    checks,
    missingRequired,
    missingRecommended,
    isComplete: missingRequired === 0,
  };
};

export const parseScreenshotText = ({ text, sourceId, fileName = 'Screenshot', recruiting = [], isCoach = false }) => {
  const normalizedText = text || '';
  const textLower = normalizedText.toLowerCase();
  const detectedTypes = [];
  const facts = [];
  const gamePatch = {};
  const rtgPatch = {};
  const coachPatch = {};
  const recruitingPatches = [];
  const retentionPatches = [];

  if (/pass(?:ing)?\s*y(?:ar)?ds?/i.test(normalizedText) || /rush(?:ing)?\s*y(?:ar)?ds?/i.test(normalizedText) || /interceptions?/i.test(normalizedText)) {
    detectedTypes.push('Box Score');
    const fields = [
      ['passYds', 'Passing yards', /pass(?:ing)?\s*y(?:ar)?ds?\s*[:-]?\s*(\d[\d,]*)/i],
      ['passTD', 'Passing touchdowns', /pass(?:ing)?\s*tds?\s*[:-]?\s*(\d+)/i],
      ['rushYds', 'Rushing yards', /rush(?:ing)?\s*y(?:ar)?ds?\s*[:-]?\s*(\d[\d,]*)/i],
      ['rushTD', 'Rushing touchdowns', /rush(?:ing)?\s*tds?\s*[:-]?\s*(\d+)/i],
      ['int', 'Interceptions', /interceptions?\s*[:-]?\s*(\d+)/i],
    ];

    fields.forEach(([key, label, expression]) => {
      const extracted = extractNumber(normalizedText, expression);
      if (extracted.match) {
        gamePatch[key] = extracted.value;
        facts.push(fact(`game.${key}`, label, extracted.value, confidenceForMatch(extracted.match), sourceId));
      }
    });
  }

  if (!isCoach && (/gpa/i.test(normalizedText) || /energy/i.test(normalizedText) || /coach\s*trust/i.test(normalizedText) || /wear\s*(?:&|and)?\s*tear/i.test(normalizedText))) {
    detectedTypes.push('Player Mechanics');
    const fields = [
      ['gpa', 'GPA', /gpa\s*[:-]?\s*(\d(?:\.\d{1,2})?)/i],
      ['energy', 'Energy', /energy\s*[:-]?\s*(\d+)/i],
      ['coachTrust', 'Coach trust', /coach\s*trust\s*[:-]?\s*(\d[\d,]*)/i],
      ['skillPoints', 'Skill points', /skill\s*points?\s*[:-]?\s*(\d+)/i],
      ['followers', 'Followers', /followers?\s*[:-]?\s*(\d[\d,]*)/i],
      ['valuation', 'NIL valuation', /(?:valuation|nil)\s*\$?\s*[:-]?\s*\$?([\d,]+)/i],
    ];

    fields.forEach(([key, label, expression]) => {
      const extracted = extractNumber(normalizedText, expression);
      if (extracted.match) {
        rtgPatch[key] = extracted.value;
        facts.push(fact(`rtg.${key}`, label, extracted.value, confidenceForMatch(extracted.match), sourceId));
      }
    });

    const wearPatch = {};
    ['head', 'chest', 'arm', 'legs'].forEach((part) => {
      const match = normalizedText.match(new RegExp(`${part}\\s*[:\\-]?\\s*(green|yellow|red)`, 'i'));
      if (match) {
        const value = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
        wearPatch[part] = value;
        facts.push(fact(`rtg.wear.${part}`, `${part} wear`, value, 0.9, sourceId));
      }
    });
    if (Object.keys(wearPatch).length) rtgPatch.wear = wearPatch;
  }

  const recruitingSignal = /(interest|offer|target|board|commit|pipeline|university|college)/i.test(normalizedText);
  const matchingSchools = recruiting.filter((school) => textLower.includes(school.name.toLowerCase()));
  if (recruitingSignal || matchingSchools.length) {
    matchingSchools.forEach((school) => {
      const escapedName = school.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = normalizedText.match(new RegExp(`${escapedName}[^0-9]{0,24}(\\d{1,3})\\s*%?`, 'i'));
      if (!match) return;
      const interest = Math.min(100, Number(match[1]));
      recruitingPatches.push({ id: school.id, name: school.name, interest, level: getInterestLevel(interest) });
      facts.push(fact(`recruiting.${school.id}.interest`, `${school.name} interest`, interest, 0.86, sourceId));
    });
    if (recruitingPatches.length) detectedTypes.push('Recruiting Board');
  }

  return {
    source: {
      id: sourceId,
      fileName,
      detectedTypes: [...new Set(detectedTypes)],
      capturedAt: new Date().toISOString(),
      ocrPreview: normalizedText.slice(0, 600),
    },
    facts,
    gamePatch,
    rtgPatch,
    coachPatch,
    recruitingPatches,
    retentionPatches,
  };
};

export const mergeScanResult = (draft, result) => {
  const factsByKey = new Map(draft.facts.map((entry) => [entry.key, entry]));
  result.facts.forEach((entry) => factsByKey.set(entry.key, entry));

  const schoolsById = new Map(draft.recruitingPatches.map((school) => [school.id, school]));
  result.recruitingPatches.forEach((school) => schoolsById.set(school.id, school));
  const playersById = new Map((draft.retentionPatches || []).map((player) => [player.id, player]));
  (result.retentionPatches || []).forEach((player) => playersById.set(player.id, player));

  return {
    ...draft,
    status: 'review',
    sources: [...draft.sources, result.source],
    facts: [...factsByKey.values()],
    gamePatch: { ...draft.gamePatch, ...result.gamePatch },
    rtgPatch: {
      ...draft.rtgPatch,
      ...result.rtgPatch,
      wear: { ...(draft.rtgPatch.wear || {}), ...(result.rtgPatch.wear || {}) },
    },
    coachPatch: { ...(draft.coachPatch || {}), ...(result.coachPatch || {}) },
    recruitingPatches: [...schoolsById.values()],
    retentionPatches: [...playersById.values()],
  };
};

export const applyRecruitingPatches = (recruiting = [], patches = []) => {
  const patchMap = new Map(patches.map((patch) => [patch.id, patch]));
  const existingIds = new Set(recruiting.map((school) => school.id));
  const updated = recruiting.map((school) => patchMap.has(school.id) ? { ...school, ...patchMap.get(school.id) } : school);
  const additions = patches
    .filter((patch) => !existingIds.has(patch.id))
    .map((patch, index) => ({
      level: 'None', interest: 0, offered: false,
      customOrder: recruiting.length + index + 1,
      ...patch,
    }));
  return [...updated, ...additions];
};

export const applyRetentionPatches = (retentionBoard = [], patches = []) => {
  const patchMap = new Map(patches.map((patch) => [patch.id, patch]));
  const existingIds = new Set(retentionBoard.map((player) => player.id));
  const updated = retentionBoard.map((player) => patchMap.has(player.id) ? { ...player, ...patchMap.get(player.id) } : player);
  return [
    ...updated,
    ...patches.filter((patch) => !existingIds.has(patch.id)).map((patch) => ({ ...patch })),
  ];
};

export const createPublishedWeek = ({
  state,
  game,
  rtg,
  coach,
  recruitingPatches = [],
  retentionPatches = [],
  quote = '',
  facts = [],
  sources = [],
  weekType = WEEK_TYPES.GAME,
  season = state.currentSeason || 1,
  week = state.currentWeek,
  weekKey = createWeekKey(season, week),
}) => {
  const targetSeason = Number(season) || 1;
  const targetWeek = Number(week) || 1;
  const targetWeekKey = weekKey || createWeekKey(targetSeason, targetWeek);
  const currentWeekKey = createWeekKey(state.currentSeason || 1, state.currentWeek);
  if (findPublishedWeekConflict(state, { season: targetSeason, week: targetWeek, weekKey: targetWeekKey })) {
    throw new DuplicateWeekPublicationError(targetWeekKey);
  }
  if (targetWeekKey !== currentWeekKey) {
    throw new StaleWeekPublicationError(targetWeekKey, currentWeekKey);
  }

  const publishedAt = new Date().toISOString();
  const isNoAppearance = weekType === WEEK_TYPES.NO_APPEARANCE;
  const hasGame = weekType !== WEEK_TYPES.BYE && Boolean(game?.opponent?.trim());
  const advancesWeek = hasGame || weekType === WEEK_TYPES.BYE;
  const playerStatFactKeys = new Set(['game.passYds', 'game.passTD', 'game.rushYds', 'game.rushTD', 'game.int']);
  const publishableFacts = facts.filter((entry) => {
    if (weekType === WEEK_TYPES.BYE) return !entry.key.startsWith('game.');
    if (isNoAppearance) return !playerStatFactKeys.has(entry.key);
    return true;
  });
  const gameRecord = hasGame ? {
    ...game,
    ...(isNoAppearance ? { passYds: '', passTD: '', rushYds: '', rushTD: '', int: '', didPlay: false } : {}),
    week: targetWeek,
    season: targetSeason,
  } : null;

  const publicationId = targetWeekKey;
  const verifiedFactsByKey = new Map(
    publishableFacts.map((entry) => [entry.key, { ...entry, verified: true, publicationId }]),
  );
  const publicationFact = (key, label, value) => {
    if (value === '' || value === null || value === undefined) return;
    verifiedFactsByKey.set(key, {
      ...fact(key, label, value, 1, publicationId),
      verified: true,
      publicationId,
    });
  };

  publicationFact('profile.player.name', 'Player', state.player?.name);
  publicationFact('profile.player.school', 'School', state.player?.school);
  if (hasGame) {
    [
      ['opponent', 'Opponent'], ['result', 'Result'], ['homeScore', 'Team score'],
      ['awayScore', 'Opponent score'], ['passYds', 'Passing yards'],
      ['passTD', 'Passing touchdowns'], ['rushYds', 'Rushing yards'],
      ['rushTD', 'Rushing touchdowns'], ['int', 'Interceptions'],
    ].forEach(([key, label]) => publicationFact(`game.${key}`, label, gameRecord[key]));
  }
  if (quote) publicationFact('weekly.quote', 'Postgame quote', quote);
  const ledgerFacts = [...verifiedFactsByKey.values()];

  const scoreLine = hasGame && gameRecord.homeScore !== '' && gameRecord.awayScore !== ''
    ? `, ${gameRecord.homeScore}-${gameRecord.awayScore}`
    : '';
  const chronicleEvent = {
    id: publicationId,
    type: hasGame ? 'game' : (weekType === WEEK_TYPES.BYE ? 'bye' : 'weekly-update'),
    season: targetSeason,
    week: targetWeek,
    careerPhase: state.careerPhase,
    occurredAt: publishedAt,
    title: hasGame
      ? `${gameRecord.result} vs. ${gameRecord.opponent}${scoreLine}`
      : (weekType === WEEK_TYPES.BYE ? `Week ${targetWeek} bye` : `Week ${targetWeek} update`),
    summary: hasGame
      ? (isNoAppearance
        ? 'The team result was recorded; the tracked player did not appear.'
        : `${gameRecord.passYds || 0} passing yards, ${gameRecord.passTD || 0} passing TD, ${gameRecord.rushYds || 0} rushing yards, ${gameRecord.rushTD || 0} rushing TD.`)
      : (weekType === WEEK_TYPES.BYE
        ? 'A verified bye-week player, recruiting, or program update was published.'
        : 'Verified player, recruiting, or program information was published.'),
    factKeys: ledgerFacts.map((entry) => entry.key),
  };

  const weeklyUpdate = {
    id: publicationId,
    weekKey: targetWeekKey,
    status: 'published',
    season: targetSeason,
    week: targetWeek,
    careerPhase: state.careerPhase,
    weekType,
    publishedAt,
    sourceCount: sources.length,
    factCount: ledgerFacts.length,
    game: gameRecord,
    quote,
  };

  const updatedRecruiting = applyRecruitingPatches(state.recruiting, recruitingPatches);
  const updatedRetentionBoard = applyRetentionPatches(state.retentionBoard || [], retentionPatches);
  const newsroomIssue = hasGame && !isNoAppearance ? createNewsroomIssue({
    publicationId,
    season: targetSeason,
    week: targetWeek,
    careerPhase: state.careerPhase,
    player: state.player,
    game: gameRecord,
    recruiting: updatedRecruiting,
    previousRecruiting: state.recruiting,
    previousGames: state.gameLogs || [],
    quote,
    availableFactKeys: [...(state.factLedger || []), ...ledgerFacts].map((entry) => entry.key),
    currentFactKeys: ledgerFacts.map((entry) => entry.key),
    publishedAt,
  }) : null;

  return {
    ...state,
    schemaVersion: CAREER_SCHEMA_VERSION,
    currentWeek: advancesWeek ? state.currentWeek + 1 : state.currentWeek,
    latestQuote: quote || state.latestQuote,
    gameLogs: hasGame ? [...(state.gameLogs || []), gameRecord] : (state.gameLogs || []),
    rtg: rtg || state.rtg,
    coach: coach || state.coach,
    recruiting: updatedRecruiting,
    retentionBoard: updatedRetentionBoard,
    weeklyUpdates: [...(state.weeklyUpdates || []), weeklyUpdate],
    factLedger: [...(state.factLedger || []), ...ledgerFacts],
    careerChronicle: [...(state.careerChronicle || []), chronicleEvent],
    newsroomIssues: newsroomIssue
      ? [...(state.newsroomIssues || []), newsroomIssue]
      : (state.newsroomIssues || []),
  };
};

export const migrateCareerState = (state, defaults) => ({
  ...defaults,
  ...state,
  player: { ...defaults.player, ...(state?.player || {}) },
  coach: { ...defaults.coach, ...(state?.coach || {}) },
  rtg: {
    ...defaults.rtg,
    ...(state?.rtg || {}),
    wear: { ...defaults.rtg.wear, ...(state?.rtg?.wear || {}) },
  },
  recruiting: (state?.recruiting || defaults.recruiting).map((school, index) => ({
    ...school,
    customOrder: school.customOrder || index + 1,
  })),
  schemaVersion: CAREER_SCHEMA_VERSION,
  weeklyUpdates: (state?.weeklyUpdates || []).map((entry) => ({
    ...entry,
    weekKey: entry.weekKey || createWeekKey(entry.season || 1, entry.week || 1),
  })),
  factLedger: state?.factLedger || [],
  careerMilestones: state?.careerMilestones || [],
  careerChronicle: state?.careerChronicle || [],
  newsroomIssues: state?.newsroomIssues || [],
  newsroomMediaLibrary: state?.newsroomMediaLibrary || [],
  newsroomMediaSettings: {
    ...defaults.newsroomMediaSettings,
    ...(state?.newsroomMediaSettings || {}),
  },
  retentionBoard: state?.retentionBoard || [],
  podcastEpisodes: state?.podcastEpisodes || [],
});
