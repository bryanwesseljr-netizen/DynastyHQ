import { createNewsroomIssue, createRecruitingNewsroomIssue } from './newsroomEngine.js';
import { createRtgSnapshot, diffRtgSnapshots, hasRtgSnapshot, RTG_FIELDS } from './rtgProgress.js';
import { normalizeCareerTransitions } from './careerTransitions.js';
import { normalizeCollegeNewsroom } from './collegeNewsroom.js';
import { markPostgameFrontPageStale, normalizePostgameFrontPage } from './postgameFrontPage.js';
import {
  highSchoolEvaluationFacts,
  normalizeHighSchoolEvaluation,
  summarizeHighSchoolMoments,
} from './highSchoolEvaluation.js';
import {
  applyPlayerRecruitingPatch,
  normalizePlayerRecruiting,
  normalizeRecruitingSchool,
  snapshotRecruitingChanges,
} from './playerRecruiting.js';

export const CAREER_SCHEMA_VERSION = 12;

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

const matchesPublication = (entry, publicationId, season, week) => (
  entry?.publicationId === publicationId
  || entry?.id === publicationId
  || entry?.weekKey === publicationId
  || (Number(entry?.season || 1) === season && Number(entry?.week) === week)
);

export const removePublishedGame = (state, gameIndex) => {
  const gameLogs = state?.gameLogs || [];
  const game = gameLogs[gameIndex];
  if (!game) return state;

  const season = Number(game.season || 1);
  const week = Number(game.week || 1);
  const publicationId = createWeekKey(season, week);
  const remainingGames = gameLogs.filter((_, index) => index !== gameIndex);
  const remainingUpdates = (state.weeklyUpdates || []).filter(
    (entry) => !matchesPublication(entry, publicationId, season, week),
  );
  const currentSeason = Number(state.currentSeason || 1);
  const remainingCurrentSeasonWeeks = [
    ...remainingGames
      .filter((entry) => Number(entry.season || 1) === currentSeason)
      .map((entry) => Number(entry.week) || 0),
    ...remainingUpdates
      .filter((entry) => Number(entry.season || 1) === currentSeason)
      .map((entry) => Number(entry.week) || 0),
  ];
  const latestRemainingQuote = [...remainingUpdates]
    .reverse()
    .find((entry) => entry.quote)?.quote || '';
  const latestSnapshot = [...remainingUpdates]
    .reverse()
    .find((entry) => entry.recruitingSnapshot || entry.playerRecruitingSnapshot || hasRtgSnapshot(entry.rtgSnapshot));
  const removedCommitment = (state.careerMilestones || []).some((entry) => (
    entry.type === 'commitment'
    && Number(entry.season || 1) === season
    && Number(entry.week || 1) === week
  ));
  const playerRecruiting = normalizePlayerRecruiting(state.playerRecruiting);
  const removedHighSchoolEvaluation = game.stage === 'high-school' || Boolean(game.evaluation);
  const restoredHighSchool = latestSnapshot?.playerRecruitingSnapshot
    ? { ...playerRecruiting.highSchool, ...latestSnapshot.playerRecruitingSnapshot }
    : removedHighSchoolEvaluation
      ? {
          ...playerRecruiting.highSchool,
          gameNumber: Math.max(0, Number(game.evaluation?.gameNumber || 1) - 1),
          tapeScore: Number(game.evaluation?.tapeScoreBefore || 0),
          recruitStars: Number(game.evaluation?.recruitStarsBefore || state.player?.stars || 3),
        }
      : playerRecruiting.highSchool;

  return {
    ...state,
    currentWeek: Math.max(0, ...remainingCurrentSeasonWeeks) + 1,
    latestQuote: latestRemainingQuote,
    gameLogs: remainingGames,
    player: removedCommitment
      ? { ...state.player, isCommitted: false, college: '' }
      : (removedHighSchoolEvaluation && !latestSnapshot?.playerRecruitingSnapshot
        ? { ...state.player, stars: restoredHighSchool.recruitStars }
        : state.player),
    recruiting: latestSnapshot?.recruitingSnapshot
      ? latestSnapshot.recruitingSnapshot.map(normalizeRecruitingSchool)
      : (state.recruiting || []),
    playerRecruiting: {
      ...playerRecruiting,
      ...(removedCommitment ? { finalists: [], highSchoolArchive: null } : {}),
      highSchool: restoredHighSchool,
    },
    rtg: latestSnapshot?.rtgSnapshot && hasRtgSnapshot(latestSnapshot.rtgSnapshot)
      ? { ...(state.rtg || {}), ...latestSnapshot.rtgSnapshot }
      : state.rtg,
    weeklyUpdates: remainingUpdates,
    factLedger: (state.factLedger || []).filter((entry) => entry.publicationId !== publicationId),
    careerChronicle: (state.careerChronicle || []).filter(
      (entry) => entry.id !== publicationId && entry.publicationId !== publicationId,
    ),
    careerMilestones: (state.careerMilestones || []).filter((entry) => !(
      removedCommitment
      && entry.type === 'commitment'
      && Number(entry.season || 1) === season
      && Number(entry.week || 1) === week
    )),
    newsroomIssues: (state.newsroomIssues || []).filter(
      (entry) => !matchesPublication(entry, publicationId, season, week),
    ),
    postgameFrontPages: (state.postgameFrontPages || []).filter(
      (entry) => entry.publicationId !== publicationId,
    ),
    podcastEpisodes: (state.podcastEpisodes || []).filter(
      (entry) => entry.publicationId !== publicationId && entry.id !== `podcast-${publicationId}`,
    ),
  };
};

export const correctPublishedWeek = ({ state, gameIndex, game }) => {
  const existingGame = state?.gameLogs?.[gameIndex];
  if (!existingGame) return state;
  const season = Number(existingGame.season || 1);
  const week = Number(existingGame.week || 1);
  const publicationId = createWeekKey(season, week);
  const correctedGame = { ...existingGame, ...game, season, week };
  const updateIndex = (state.weeklyUpdates || []).findIndex((entry) => matchesPublication(entry, publicationId, season, week));
  if (updateIndex < 0) {
    const gameLogs = [...state.gameLogs];
    gameLogs[gameIndex] = correctedGame;
    return { ...state, gameLogs };
  }

  const weeklyUpdates = [...state.weeklyUpdates];
  const previousUpdate = weeklyUpdates[updateIndex];
  const isHighSchoolEvaluation = existingGame.stage === 'high-school' || Boolean(existingGame.evaluation);
  if (isHighSchoolEvaluation) {
    const evaluation = normalizeHighSchoolEvaluation(game?.evaluation || correctedGame.evaluation || {}, {
      gameNumber: existingGame.evaluation?.gameNumber || week,
      tapeScoreBefore: existingGame.evaluation?.tapeScoreBefore || 0,
      recruitStarsBefore: existingGame.evaluation?.recruitStarsBefore || 3,
    });
    const correctedEvaluationGame = { ...existingGame, ...game, stage: 'high-school', evaluation, season, week, didPlay: true };
    const preservedFacts = (state.factLedger || []).filter((entry) => (
      entry.publicationId === publicationId
      && !entry.key.startsWith('highSchool.')
      && !['recruiting.profile.tapeScore', 'recruiting.profile.recruitStars'].includes(entry.key)
    ));
    const correctedFacts = [...preservedFacts, ...highSchoolEvaluationFacts(evaluation, publicationId)]
      .map((entry) => ({ ...entry, correctedAt: new Date().toISOString() }));
    const factLedger = [
      ...(state.factLedger || []).filter((entry) => entry.publicationId !== publicationId),
      ...correctedFacts,
    ];
    const previousRecruiting = [...weeklyUpdates].slice(0, updateIndex).reverse()
      .find((entry) => entry.recruitingSnapshot)?.recruitingSnapshot || [];
    const playerRecruitingSnapshot = {
      ...(previousUpdate.playerRecruitingSnapshot || {}),
      gameNumber: evaluation.gameNumber,
      tapeScore: evaluation.tapeScoreAfter,
      recruitStars: evaluation.recruitStarsAfter,
    };
    const oldIssue = (state.newsroomIssues || []).find((entry) => matchesPublication(entry, publicationId, season, week));
    const rebuiltIssue = createNewsroomIssue({
      publicationId,
      season,
      week,
      careerPhase: previousUpdate.careerPhase || state.careerPhase,
      player: { ...state.player, stars: evaluation.recruitStarsAfter },
      game: correctedEvaluationGame,
      recruiting: previousUpdate.recruitingSnapshot || state.recruiting || [],
      previousRecruiting,
      playerRecruiting: { highSchool: playerRecruitingSnapshot },
      coverageStage: 'high-school',
      availableFactKeys: factLedger.map((entry) => entry.key),
      currentFactKeys: correctedFacts.map((entry) => entry.key),
      publishedAt: previousUpdate.publishedAt,
    });
    if (oldIssue) {
      rebuiltIssue.articles = rebuiltIssue.articles.map((articleEntry) => {
        const priorArticle = oldIssue.articles?.find((entry) => entry.outletId === articleEntry.outletId);
        return priorArticle?.mediaAssetId ? {
          ...articleEntry,
          mediaAssetId: priorArticle.mediaAssetId,
          mediaSource: priorArticle.mediaSource,
          mediaDisclosure: priorArticle.mediaDisclosure,
        } : articleEntry;
      });
    }
    const momentSummary = summarizeHighSchoolMoments(evaluation);
    weeklyUpdates[updateIndex] = {
      ...previousUpdate,
      game: correctedEvaluationGame,
      highSchoolEvaluation: evaluation,
      playerRecruitingSnapshot,
      factCount: correctedFacts.length,
      correctedAt: new Date().toISOString(),
    };
    const gameLogs = [...state.gameLogs];
    gameLogs[gameIndex] = correctedEvaluationGame;
    const hasLaterEvaluation = gameLogs.some((entry, index) => index !== gameIndex
      && (entry.stage === 'high-school' || entry.evaluation)
      && (Number(entry.season || 1) > season || Number(entry.week || 0) > week));
    const currentRecruiting = normalizePlayerRecruiting(state.playerRecruiting);
    return {
      ...state,
      player: hasLaterEvaluation ? state.player : { ...state.player, stars: evaluation.recruitStarsAfter },
      playerRecruiting: hasLaterEvaluation ? state.playerRecruiting : {
        ...currentRecruiting,
        highSchool: { ...currentRecruiting.highSchool, ...playerRecruitingSnapshot },
      },
      gameLogs,
      weeklyUpdates,
      factLedger,
      careerChronicle: (state.careerChronicle || []).map((entry) => matchesPublication(entry, publicationId, season, week) ? {
        ...entry,
        title: `High-school Game ${evaluation.gameNumber} tape evaluation`,
        summary: `${momentSummary.success} successful, ${momentSummary.partial} partial, ${momentSummary.failed} failed · Tape Score ${Number(evaluation.tapeScoreAfter).toLocaleString()} · ${evaluation.recruitStarsAfter}-star`,
        factKeys: correctedFacts.map((entryFact) => entryFact.key),
        correctedAt: new Date().toISOString(),
      } : entry),
      newsroomIssues: (state.newsroomIssues || []).map((entry) => matchesPublication(entry, publicationId, season, week) ? rebuiltIssue : entry),
      podcastEpisodes: (state.podcastEpisodes || []).map((entry) => entry.publicationId === publicationId || entry.id === `podcast-${publicationId}` ? {
        ...entry,
        status: 'needs-regeneration',
        audioStatus: 'stale',
        segments: [],
        correctedAt: new Date().toISOString(),
      } : entry),
    };
  }
  const factMap = new Map((state.factLedger || [])
    .filter((entry) => entry.publicationId === publicationId)
    .map((entry) => [entry.key, entry]));
  [
    ['opponent', 'Opponent'], ['result', 'Result'], ['homeScore', 'Team score'],
    ['awayScore', 'Opponent score'], ['passYds', 'Passing yards'], ['passTD', 'Passing touchdowns'],
    ['rushYds', 'Rushing yards'], ['rushTD', 'Rushing touchdowns'], ['int', 'Interceptions'],
  ].forEach(([field, label]) => {
    const key = `game.${field}`;
    factMap.set(key, {
      ...(factMap.get(key) || fact(key, label, correctedGame[field], 1, publicationId)),
      value: correctedGame[field],
      verified: true,
      publicationId,
      correctedAt: new Date().toISOString(),
    });
  });
  const correctedFacts = [...factMap.values()];
  const factLedger = [
    ...(state.factLedger || []).filter((entry) => entry.publicationId !== publicationId),
    ...correctedFacts,
  ];
  const previousRecruiting = [...weeklyUpdates]
    .slice(0, updateIndex)
    .reverse()
    .find((entry) => entry.recruitingSnapshot)?.recruitingSnapshot || [];
  const previousGames = state.gameLogs.filter((_, index) => index !== gameIndex && Number(_.season || 1) === season && Number(_.week || 0) < week);
  const oldIssue = (state.newsroomIssues || []).find((entry) => matchesPublication(entry, publicationId, season, week));
  const coverageStage = oldIssue?.articles?.some((entry) => entry.outletId === 'college-local') ? 'college' : 'high-school';
  const correctionCollegeNewsroom = coverageStage === 'college' && oldIssue?.outletProfile ? {
    activeStopId: 'correction-archive',
    stops: [{
      id: 'correction-archive',
      school: oldIssue.outletProfile.school,
      localOutletName: oldIssue.outletProfile.localOutletName,
      regionalOutletName: oldIssue.outletProfile.regionalOutletName,
      nationalOutletName: oldIssue.outletProfile.nationalOutletName,
      startedSeason: season,
      startedWeek: week,
    }],
  } : state.collegeNewsroom;
  const correctionPlayer = {
    ...state.player,
    school: oldIssue?.outletProfile?.school || factMap.get('profile.player.school')?.value || state.player?.school,
  };
  const rebuiltIssue = createNewsroomIssue({
    publicationId,
    season,
    week,
    careerPhase: previousUpdate.careerPhase || state.careerPhase,
    player: correctionPlayer,
    game: correctedGame,
    recruiting: previousUpdate.recruitingSnapshot || state.recruiting || [],
    previousRecruiting,
    previousGames,
    quote: previousUpdate.quote || '',
    rtg: previousUpdate.rtgSnapshot || {},
    previousRtg: [...weeklyUpdates].slice(0, updateIndex).reverse().find((entry) => hasRtgSnapshot(entry.rtgSnapshot))?.rtgSnapshot || {},
    playerRecruiting: { highSchool: previousUpdate.playerRecruitingSnapshot || {} },
    collegeNewsroom: correctionCollegeNewsroom,
    coverageStage,
    availableFactKeys: factLedger.map((entry) => entry.key),
    currentFactKeys: correctedFacts.map((entry) => entry.key),
    publishedAt: previousUpdate.publishedAt,
  });
  if (oldIssue) {
    rebuiltIssue.outletProfile = oldIssue.outletProfile || rebuiltIssue.outletProfile;
    rebuiltIssue.articles = rebuiltIssue.articles.map((articleEntry) => {
      const priorArticle = oldIssue.articles?.find((entry) => entry.outletId === articleEntry.outletId);
      if (!priorArticle) return articleEntry;
      return {
        ...articleEntry,
        outletName: priorArticle.outletName,
        desk: priorArticle.desk,
        theme: priorArticle.theme,
        ...(priorArticle.mediaAssetId ? {
          mediaAssetId: priorArticle.mediaAssetId,
          mediaSource: priorArticle.mediaSource,
          mediaDisclosure: priorArticle.mediaDisclosure,
        } : {}),
      };
    });
  }
  weeklyUpdates[updateIndex] = {
    ...previousUpdate,
    game: correctedGame,
    factCount: correctedFacts.length,
    correctedAt: new Date().toISOString(),
  };
  const gameLogs = [...state.gameLogs];
  gameLogs[gameIndex] = correctedGame;
  const scoreLine = correctedGame.homeScore !== '' && correctedGame.awayScore !== ''
    ? `, ${correctedGame.homeScore}-${correctedGame.awayScore}` : '';
  return {
    ...state,
    gameLogs,
    weeklyUpdates,
    factLedger,
    careerChronicle: (state.careerChronicle || []).map((entry) => matchesPublication(entry, publicationId, season, week) ? {
      ...entry,
      title: `${correctedGame.result} vs. ${correctedGame.opponent}${scoreLine}`,
      summary: correctedGame.didPlay === false
        ? 'The corrected team result is recorded; the tracked player did not appear.'
        : `${correctedGame.passYds || 0} passing yards, ${correctedGame.passTD || 0} passing TD, ${correctedGame.rushYds || 0} rushing yards, ${correctedGame.rushTD || 0} rushing TD.`,
      factKeys: correctedFacts.map((entryFact) => entryFact.key),
      correctedAt: new Date().toISOString(),
    } : entry),
    newsroomIssues: (state.newsroomIssues || []).map((entry) => matchesPublication(entry, publicationId, season, week) ? rebuiltIssue : entry),
    postgameFrontPages: markPostgameFrontPageStale(state.postgameFrontPages || [], publicationId),
    podcastEpisodes: (state.podcastEpisodes || []).map((entry) => entry.publicationId === publicationId || entry.id === `podcast-${publicationId}` ? {
      ...entry,
      status: 'needs-regeneration',
      audioStatus: 'stale',
      segments: [],
      correctedAt: new Date().toISOString(),
    } : entry),
  };
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
  'rtg.trustToNext',
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
  const match = String(key).match(/^recruiting\.(?!profile\.)(.+)\.([a-zA-Z0-9]+)$/);
  return match ? { schoolId: match[1], field: match[2] } : null;
};

const playerRecruitingFactParts = (key) => {
  const match = String(key).match(/^recruiting\.profile\.(recruitStars|tapeScore|nationalRank|stateRank|positionRank|gameNumber|topSchoolsSelected)$/);
  return match ? { field: match[1] } : null;
};

const PLAYER_RECRUITING_NUMERIC_FIELDS = new Set([
  'recruitStars', 'tapeScore', 'nationalRank', 'stateRank', 'positionRank', 'gameNumber', 'topSchoolsSelected',
]);

const SCHOOL_RECRUITING_NUMERIC_FIELDS = new Set([
  'interest', 'stars', 'preferenceRank', 'programStars', 'teamRank', 'tapeScoreAssessed',
  'tapeScoreRequired', 'teamOverall', 'teamOffense', 'teamDefense', 'runPercent', 'passPercent',
  'aggressivePercent', 'conservativePercent', 'coachLevel', 'bonusAcademics', 'bonusBrand',
  'bonusLeadership', 'bonusFitness', 'bonusCoachTrust', 'bonusSkillPoints',
]);

const setRecruitingPatchField = (school, field, value) => {
  const current = { ...school };
  if (field.startsWith('bonus')) {
    const suffix = field.slice('bonus'.length);
    const key = suffix.charAt(0).toLowerCase() + suffix.slice(1);
    current.scholarshipBonuses = { ...(current.scholarshipBonuses || {}), [key]: Number(value) };
  } else if (field.startsWith('team') && ['teamOverall', 'teamOffense', 'teamDefense'].includes(field)) {
    current.programRatings = { ...(current.programRatings || {}), [field.slice(4).toLowerCase()]: Number(value) };
  } else if (field.endsWith('Percent')) {
    current.tendencies = { ...(current.tendencies || {}), [field.replace('Percent', '')]: Number(value) };
  } else if (field.startsWith('depthQB')) {
    const role = field.slice('depth'.length).toUpperCase();
    const depthChart = Array.isArray(current.depthChart) ? [...current.depthChart] : [];
    const existing = depthChart.findIndex((entry) => entry.role === role);
    const entry = { role, summary: String(value).trim() };
    if (existing >= 0) depthChart[existing] = entry;
    else depthChart.push(entry);
    current.depthChart = depthChart;
  } else {
    current[field] = SCHOOL_RECRUITING_NUMERIC_FIELDS.has(field) ? Number(value) : value;
  }
  return current;
};

const retentionFactParts = (key) => {
  const match = String(key).match(/^retention\.(.+)\.(position|overall|risk|status|nilDemand)$/);
  return match ? { playerId: match[1], field: match[2] } : null;
};

const editableValue = (key, value) => {
  if (value === '' || value === null || value === undefined) return '';
  const retentionParts = retentionFactParts(key);
  const profileParts = playerRecruitingFactParts(key);
  if (EDITABLE_NUMERIC_KEYS.has(key) || SCHOOL_RECRUITING_NUMERIC_FIELDS.has(recruitingFactParts(key)?.field) || PLAYER_RECRUITING_NUMERIC_FIELDS.has(profileParts?.field) || ['overall', 'nilDemand'].includes(retentionParts?.field)) {
    const parsed = Number(String(value).replace(/[$,%]/g, ''));
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (['offer', 'schemeFit'].includes(recruitingFactParts(key)?.field)) {
    return value === true || /^(true|yes|offered|offer)$/i.test(String(value).trim());
  }
  return String(value).trim();
};

export const validateScanFact = (factEntry) => {
  const { key, value } = factEntry || {};
  if (value === '' || value === null || value === undefined) return 'Enter a value or ignore this fact.';

  const recruitingParts = recruitingFactParts(key);
  const profileParts = playerRecruitingFactParts(key);
  const retentionParts = retentionFactParts(key);
  if (EDITABLE_NUMERIC_KEYS.has(key) || SCHOOL_RECRUITING_NUMERIC_FIELDS.has(recruitingParts?.field) || PLAYER_RECRUITING_NUMERIC_FIELDS.has(profileParts?.field) || ['overall', 'nilDemand'].includes(retentionParts?.field)) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 'Enter a valid number.';
    if (parsed < 0) return 'Value cannot be negative.';
    if (key === 'rtg.gpa' && parsed > 4) return 'GPA must be between 0 and 4.';
    if ((key === 'rtg.energy' || recruitingParts?.field === 'interest') && parsed > 100) return 'Value must be between 0 and 100.';
    if (recruitingParts?.field === 'stars' && (parsed < 1 || parsed > 5)) return 'Star rating must be between 1 and 5.';
    if (profileParts?.field === 'recruitStars' && (parsed < 1 || parsed > 5)) return 'Star rating must be between 1 and 5.';
    if (profileParts?.field === 'gameNumber' && parsed > 5) return 'High-school game number must be between 0 and 5.';
    if (profileParts?.field === 'topSchoolsSelected' && parsed > 10) return 'Top Schools count must be between 0 and 10.';
    if (retentionParts?.field === 'overall' && parsed > 99) return 'Overall rating must be between 0 and 99.';
  }

  if (key === 'game.result' && !['W', 'L'].includes(String(value).toUpperCase())) return 'Choose a win or loss.';
  if (/^highSchool\.moment\.\d\.result$/.test(key) && !['success', 'partial', 'failed'].includes(String(value))) return 'Choose Successful, Partial, or Failed.';
  if (key.startsWith('rtg.wear.') && !['Green', 'Yellow', 'Red'].includes(value)) return 'Choose Green, Yellow, or Red.';
  if (['offer', 'schemeFit'].includes(recruitingParts?.field) && typeof value !== 'boolean') return 'Choose Yes or No.';
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
  const playerRecruitingPatch = { rankings: {} };
  const highSchoolEvaluationPatch = { moments: [] };

  facts.forEach((entry) => {
    if (validateScanFact(entry)) return;
    if (entry.key.startsWith('game.')) {
      gamePatch[entry.key.slice('game.'.length)] = entry.value;
      return;
    }
    const highSchoolMoment = entry.key.match(/^highSchool\.moment\.?(\d)\.(result|objective)$/)
      || entry.key.match(/^highSchool\.moment(\d)\.(result|objective)$/);
    if (highSchoolMoment) {
      const index = Number(highSchoolMoment[1]) - 1;
      highSchoolEvaluationPatch.moments[index] = {
        ...(highSchoolEvaluationPatch.moments[index] || { id: index + 1 }),
        [highSchoolMoment[2]]: entry.value,
      };
      return;
    }
    if (entry.key === 'highSchool.teamImpact') {
      highSchoolEvaluationPatch.teamImpact = entry.value;
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

    const playerRecruitingParts = playerRecruitingFactParts(entry.key);
    if (playerRecruitingParts) {
      const field = playerRecruitingParts.field;
      if (field.endsWith('Rank')) {
        const rankKey = field.replace('Rank', '');
        playerRecruitingPatch.rankings[rankKey] = Number(entry.value);
      } else {
        playerRecruitingPatch[field] = Number(entry.value);
      }
      return;
    }

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
    } else if (parts.field === 'offer' || parts.field === 'schemeFit') {
      current.offered = entry.value;
      if (parts.field === 'schemeFit') {
        delete current.offered;
        current.schemeFit = entry.value;
      }
    } else if (parts.field === 'stars') {
      current.stars = Number(entry.value);
    } else {
      Object.assign(current, setRecruitingPatchField(current, parts.field, entry.value));
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
    playerRecruitingPatch: {
      ...playerRecruitingPatch,
      ...(Object.keys(playerRecruitingPatch.rankings).length ? {} : { rankings: undefined }),
    },
    highSchoolEvaluationPatch,
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
  playerRecruitingPatch: {},
  highSchoolEvaluationPatch: {},
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
  const isHighSchool = isPlayer && !draft.isCommitted;
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
  } else if (isHighSchool) {
    const momentResultKeys = Array.from({ length: 4 }, (_, index) => `highSchool.moment.${index + 1}.result`);
    const hasFourMoments = hasEveryFact(momentResultKeys, availableKeys);
    const hasEvaluationSnapshot = hasEveryFact([
      'recruiting.profile.tapeScore', 'recruiting.profile.recruitStars',
    ], availableKeys);
    addCheck(
      'high-school-moments',
      'Four playable moments',
      hasFourMoments ? 'All four moment outcomes were extracted.' : 'Review or enter Successful, Partial, or Failed for all four moments below.',
      hasFourMoments ? 'complete' : 'missing',
      'required',
    );
    addCheck(
      'high-school-evaluation',
      'Tape Score and star rating',
      hasEvaluationSnapshot ? 'The postgame recruiting evaluation is captured.' : 'Add the Tape Score and star rating shown after the game.',
      hasEvaluationSnapshot ? 'complete' : 'missing',
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

  if (isPlayer && !isHighSchool) {
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

  if (!isCoach && (/gpa/i.test(normalizedText) || /energy/i.test(normalizedText) || /coach\s*trust/i.test(normalizedText) || /skill\s*points?/i.test(normalizedText) || /followers?/i.test(normalizedText) || /valuation|nil/i.test(normalizedText) || /depth\s*chart/i.test(normalizedText) || /wear\s*(?:&|and)?\s*tear/i.test(normalizedText))) {
    detectedTypes.push('Player Mechanics');
    const fields = [
      ['gpa', 'GPA', /gpa\s*[:-]?\s*(\d(?:\.\d{1,2})?)/i],
      ['energy', 'Energy', /energy\s*[:-]?\s*(\d+)/i],
      ['coachTrust', 'Coach trust', /coach\s*trust\s*[:-]?\s*(\d[\d,]*)/i],
      ['trustToNext', 'Next trust threshold', /(?:trust\s*to\s*next(?:\s*rank)?|next\s*trust\s*threshold)\s*[:-]?\s*(\d[\d,]*)/i],
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

    const rankMatch = normalizedText.match(/(?:depth\s*chart(?:\s*rank)?|position\s*rank)\s*[:-]?\s*(QB[1-3]|Redshirt)/i);
    if (rankMatch) {
      const value = rankMatch[1].toUpperCase() === 'REDSHIRT' ? 'Redshirt' : rankMatch[1].toUpperCase();
      rtgPatch.rank = value;
      facts.push(fact('rtg.rank', 'Depth chart rank', value, 0.9, sourceId));
    }

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
    playerRecruitingPatch: {
      ...(draft.playerRecruitingPatch || {}),
      ...(result.playerRecruitingPatch || {}),
      rankings: {
        ...(draft.playerRecruitingPatch?.rankings || {}),
        ...(result.playerRecruitingPatch?.rankings || {}),
      },
    },
    highSchoolEvaluationPatch: {
      ...(draft.highSchoolEvaluationPatch || {}),
      ...(result.highSchoolEvaluationPatch || {}),
      moments: Array.from({ length: 4 }, (_, index) => ({
        ...(draft.highSchoolEvaluationPatch?.moments?.[index] || {}),
        ...(result.highSchoolEvaluationPatch?.moments?.[index] || {}),
      })),
    },
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
  return [...updated, ...additions].map(normalizeRecruitingSchool);
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

export const createStandaloneRecruitingUpdate = ({
  state,
  recruitingPatches = [],
  playerRecruitingPatch = {},
  facts = [],
  sources = [],
}) => {
  const publishedAt = new Date().toISOString();
  const stateWithProfile = applyPlayerRecruitingPatch(state, playerRecruitingPatch);
  const recruiting = applyRecruitingPatches(stateWithProfile.recruiting || [], recruitingPatches);
  const highSchool = normalizePlayerRecruiting(stateWithProfile.playerRecruiting).highSchool;
  const sequence = (state.weeklyUpdates || []).filter((entry) => entry.editionType === 'recruiting').length + 1;
  const publicationId = `season-${state.currentSeason || 1}-preseason-recruiting-${sequence}`;
  const verifiedFacts = facts
    .filter((entry) => entry.key.startsWith('recruiting.'))
    .map((entry) => ({ ...entry, verified: true, publicationId }));
  const profileFact = {
    id: `${publicationId}:profile.player.name`,
    key: 'profile.player.name',
    label: 'Player',
    value: stateWithProfile.player?.name || '',
    confidence: 1,
    sourceId: publicationId,
    verified: true,
    publicationId,
  };
  const factKeys = [profileFact, ...verifiedFacts].map((entry) => entry.key);
  const recruitingChanges = snapshotRecruitingChanges(state.recruiting || [], recruiting);
  const weeklyUpdate = {
    id: publicationId,
    weekKey: publicationId,
    status: 'published',
    editionType: 'recruiting',
    season: state.currentSeason || 1,
    week: 0,
    careerPhase: state.careerPhase,
    publishedAt,
    sourceCount: sources.length,
    factCount: verifiedFacts.length + 1,
    game: null,
    recruitingSnapshot: recruiting.map((school) => ({ ...school })),
    recruitingChanges,
    playerRecruitingSnapshot: highSchool,
  };
  const newsroomIssue = createRecruitingNewsroomIssue({
    publicationId,
    season: state.currentSeason || 1,
    week: 0,
    player: stateWithProfile.player,
    playerRecruiting: stateWithProfile.playerRecruiting,
    recruiting,
    previousRecruiting: state.recruiting || [],
    currentFactKeys: factKeys,
    publishedAt,
  });
  return {
    ...stateWithProfile,
    schemaVersion: CAREER_SCHEMA_VERSION,
    recruiting,
    weeklyUpdates: [...(state.weeklyUpdates || []), weeklyUpdate],
    factLedger: [...(state.factLedger || []), profileFact, ...verifiedFacts],
    careerChronicle: [...(state.careerChronicle || []), {
      id: publicationId,
      publicationId,
      type: 'recruiting-update',
      season: state.currentSeason || 1,
      week: 0,
      careerPhase: state.careerPhase,
      occurredAt: publishedAt,
      title: recruitingChanges.some((entry) => entry.type === 'offer')
        ? 'Scholarship offer update'
        : (recruiting.length ? `Top ${recruiting.length} recruiting update` : 'Initial recruiting rankings'),
      summary: `${highSchool.recruitStars || state.player?.stars || 3}-star · Tape Score ${Number(highSchool.tapeScore || 0).toLocaleString()} · ${recruiting.filter((entry) => entry.offered).length} offer${recruiting.filter((entry) => entry.offered).length === 1 ? '' : 's'}`,
      factKeys,
    }],
    newsroomIssues: [...(state.newsroomIssues || []), newsroomIssue],
  };
};

export const createPublishedWeek = ({
  state,
  game,
  rtg,
  coach,
  recruitingPatches = [],
  playerRecruitingPatch = {},
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
  const isHighSchoolEvaluation = game?.stage === 'high-school' || Boolean(game?.evaluation);
  const highSchoolProfileBefore = normalizePlayerRecruiting(state.playerRecruiting).highSchool;
  const evaluation = isHighSchoolEvaluation ? normalizeHighSchoolEvaluation(game?.evaluation || game, {
    gameNumber: Number(highSchoolProfileBefore.gameNumber || 0) + 1 || targetWeek,
    tapeScoreBefore: highSchoolProfileBefore.tapeScore,
    recruitStarsBefore: highSchoolProfileBefore.recruitStars || state.player?.stars || 3,
  }) : null;
  const effectivePlayerRecruitingPatch = isHighSchoolEvaluation ? {
    ...playerRecruitingPatch,
    gameNumber: evaluation.gameNumber,
    tapeScore: evaluation.tapeScoreAfter,
    recruitStars: evaluation.recruitStarsAfter,
    rankings: { ...(playerRecruitingPatch.rankings || {}) },
  } : playerRecruitingPatch;
  const hasGame = weekType !== WEEK_TYPES.BYE && (isHighSchoolEvaluation || Boolean(game?.opponent?.trim()));
  const advancesWeek = hasGame || weekType === WEEK_TYPES.BYE;
  const playerStatFactKeys = new Set(['game.passYds', 'game.passTD', 'game.rushYds', 'game.rushTD', 'game.int']);
  const publishableFacts = facts.filter((entry) => {
    if (weekType === WEEK_TYPES.BYE) return !entry.key.startsWith('game.');
    if (isHighSchoolEvaluation) return !entry.key.startsWith('game.') && !entry.key.startsWith('rtg.');
    if (isNoAppearance) return !playerStatFactKeys.has(entry.key);
    return true;
  });
  const gameRecord = hasGame ? {
    ...(isHighSchoolEvaluation
      ? { stage: 'high-school', evaluation, didPlay: true }
      : {
          ...game,
          ...(isNoAppearance ? { passYds: '', passTD: '', rushYds: '', rushTD: '', int: '', didPlay: false } : {}),
        }),
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

  const stateWithRecruitingProfile = applyPlayerRecruitingPatch(state, effectivePlayerRecruitingPatch);
  publicationFact('profile.player.name', 'Player', stateWithRecruitingProfile.player?.name);
  publicationFact('profile.player.school', 'School', stateWithRecruitingProfile.player?.school);
  publicationFact('profile.player.college', 'Committed college', stateWithRecruitingProfile.player?.college);
  if (hasGame) {
    if (isHighSchoolEvaluation) {
      highSchoolEvaluationFacts(evaluation, publicationId).forEach((entry) => verifiedFactsByKey.set(entry.key, entry));
    } else {
      [
        ['opponent', 'Opponent'], ['result', 'Result'], ['homeScore', 'Team score'],
        ['awayScore', 'Opponent score'], ['passYds', 'Passing yards'],
        ['passTD', 'Passing touchdowns'], ['rushYds', 'Rushing yards'],
        ['rushTD', 'Rushing touchdowns'], ['int', 'Interceptions'],
      ].forEach(([key, label]) => publicationFact(`game.${key}`, label, gameRecord[key]));
    }
  }
  if (quote) publicationFact('weekly.quote', 'Postgame quote', quote);

  const isPlayerCareer = !['OC', 'HC', 'Retired'].includes(state.careerPhase) && !isHighSchoolEvaluation;
  const rtgSnapshot = isPlayerCareer ? createRtgSnapshot(rtg || state.rtg || {}) : {};
  const previousRtgSnapshot = [...(state.weeklyUpdates || [])]
    .reverse()
    .find((entry) => hasRtgSnapshot(entry.rtgSnapshot))?.rtgSnapshot || {};
  const rtgChanges = hasRtgSnapshot(previousRtgSnapshot)
    ? diffRtgSnapshots(rtgSnapshot, previousRtgSnapshot)
    : [];

  if (isPlayerCareer) {
    RTG_FIELDS.forEach(({ key, label }) => publicationFact(`rtg.${key}`, label, rtgSnapshot[key]));
    Object.entries(rtgSnapshot.wear || {}).forEach(([part, value]) => {
      publicationFact(`rtg.wear.${part}`, `${part.charAt(0).toUpperCase()}${part.slice(1)} wear`, value);
    });
  }
  const finalLedgerFacts = [...verifiedFactsByKey.values()];

  const scoreLine = hasGame && !isHighSchoolEvaluation && gameRecord.homeScore !== '' && gameRecord.awayScore !== ''
    ? `, ${gameRecord.homeScore}-${gameRecord.awayScore}`
    : '';
  const chronicleEvent = {
    id: publicationId,
    type: isHighSchoolEvaluation ? 'high-school-evaluation' : (hasGame ? 'game' : (weekType === WEEK_TYPES.BYE ? 'bye' : 'weekly-update')),
    season: targetSeason,
    week: targetWeek,
    careerPhase: state.careerPhase,
    occurredAt: publishedAt,
    title: isHighSchoolEvaluation
      ? `High-school Game ${evaluation.gameNumber} tape evaluation`
      : hasGame
      ? `${gameRecord.result} vs. ${gameRecord.opponent}${scoreLine}`
      : (weekType === WEEK_TYPES.BYE ? `Week ${targetWeek} bye` : `Week ${targetWeek} update`),
    summary: isHighSchoolEvaluation
      ? (() => {
          const momentSummary = summarizeHighSchoolMoments(evaluation);
          const delta = momentSummary.tapeScoreDelta === null ? '' : ` (${momentSummary.tapeScoreDelta >= 0 ? '+' : '−'}${Math.abs(momentSummary.tapeScoreDelta).toLocaleString()})`;
          return `${momentSummary.success} successful, ${momentSummary.partial} partial, ${momentSummary.failed} failed · Tape Score ${Number(evaluation.tapeScoreAfter).toLocaleString()}${delta} · ${evaluation.recruitStarsAfter}-star`;
        })()
      : hasGame
      ? (isNoAppearance
        ? 'The team result was recorded; the tracked player did not appear.'
        : `${gameRecord.passYds || 0} passing yards, ${gameRecord.passTD || 0} passing TD, ${gameRecord.rushYds || 0} rushing yards, ${gameRecord.rushTD || 0} rushing TD.`)
      : (weekType === WEEK_TYPES.BYE
        ? 'A verified bye-week player, recruiting, or program update was published.'
        : 'Verified player, recruiting, or program information was published.'),
    factKeys: finalLedgerFacts.map((entry) => entry.key),
  };

  const updatedRecruiting = applyRecruitingPatches(stateWithRecruitingProfile.recruiting, recruitingPatches);
  const recruitingChanges = snapshotRecruitingChanges(state.recruiting || [], updatedRecruiting);
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
    factCount: finalLedgerFacts.length,
    game: gameRecord,
    highSchoolEvaluation: evaluation,
    rtgSnapshot,
    rtgChanges,
    quote,
    recruitingSnapshot: updatedRecruiting.map((school) => ({ ...school })),
    recruitingChanges,
    playerRecruitingSnapshot: normalizePlayerRecruiting(stateWithRecruitingProfile.playerRecruiting).highSchool,
  };

  const updatedRetentionBoard = applyRetentionPatches(state.retentionBoard || [], retentionPatches);
  const newsroomIssue = hasGame && !isNoAppearance ? createNewsroomIssue({
    publicationId,
    season: targetSeason,
    week: targetWeek,
    careerPhase: state.careerPhase,
    player: stateWithRecruitingProfile.player,
    game: gameRecord,
    recruiting: updatedRecruiting,
    previousRecruiting: state.recruiting,
    previousGames: state.gameLogs || [],
    quote,
    rtg: rtgSnapshot,
    previousRtg: previousRtgSnapshot,
    playerRecruiting: stateWithRecruitingProfile.playerRecruiting,
    collegeNewsroom: stateWithRecruitingProfile.collegeNewsroom,
    availableFactKeys: [...(state.factLedger || []), ...finalLedgerFacts].map((entry) => entry.key),
    currentFactKeys: finalLedgerFacts.map((entry) => entry.key),
    publishedAt,
  }) : null;

  return {
    ...stateWithRecruitingProfile,
    schemaVersion: CAREER_SCHEMA_VERSION,
    currentWeek: advancesWeek ? state.currentWeek + 1 : state.currentWeek,
    latestQuote: quote || state.latestQuote,
    gameLogs: hasGame ? [...(state.gameLogs || []), gameRecord] : (state.gameLogs || []),
    rtg: rtg || state.rtg,
    coach: coach || state.coach,
    recruiting: updatedRecruiting,
    retentionBoard: updatedRetentionBoard,
    weeklyUpdates: [...(state.weeklyUpdates || []), weeklyUpdate],
    factLedger: [...(state.factLedger || []), ...finalLedgerFacts],
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
    ...normalizeRecruitingSchool(school, index),
  })),
  playerRecruiting: normalizePlayerRecruiting(state?.playerRecruiting || defaults.playerRecruiting),
  careerTransitions: normalizeCareerTransitions(state?.careerTransitions || defaults.careerTransitions),
  collegeNewsroom: normalizeCollegeNewsroom(state?.collegeNewsroom || defaults.collegeNewsroom),
  schemaVersion: CAREER_SCHEMA_VERSION,
  weeklyUpdates: (state?.weeklyUpdates || []).map((entry) => ({
    ...entry,
    weekKey: entry.weekKey || createWeekKey(entry.season || 1, entry.week || 1),
  })),
  factLedger: state?.factLedger || [],
  careerMilestones: state?.careerMilestones || [],
  careerChronicle: state?.careerChronicle || [],
  newsroomIssues: state?.newsroomIssues || [],
  postgameFrontPages: (state?.postgameFrontPages || []).map(normalizePostgameFrontPage),
  newsroomMediaLibrary: state?.newsroomMediaLibrary || [],
  newsroomMediaSettings: {
    ...defaults.newsroomMediaSettings,
    ...(state?.newsroomMediaSettings || {}),
  },
  retentionBoard: state?.retentionBoard || [],
  podcastEpisodes: state?.podcastEpisodes || [],
});
