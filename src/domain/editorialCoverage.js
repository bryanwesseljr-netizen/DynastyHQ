const clean = (value, max = 600) => String(value ?? '').trim().slice(0, max);

const publicationMatches = (entry, publicationId) => (
  entry?.publicationId === publicationId || entry?.id === publicationId || entry?.weekKey === publicationId
);

const COVERAGE_ORDER = Object.freeze({
  'no-coverage': 0,
  brief: 1,
  standard: 2,
  major: 3,
  'career-defining': 4,
});

export const COVERAGE_TIERS = Object.freeze({
  NONE: 'no-coverage',
  BRIEF: 'brief',
  STANDARD: 'standard',
  MAJOR: 'major',
  CAREER: 'career-defining',
});

export const AUDIENCE_REACH = Object.freeze({
  LOCAL: 'local',
  REGIONAL: 'regional',
  NATIONAL: 'national',
  NATIONAL_LEAD: 'national-lead',
});

const TIER_CONFIG = Object.freeze({
  'no-coverage': { articleCount: 0, podcastEligible: false, newsroomWordRange: null, podcastWordRange: null },
  brief: { articleCount: 1, podcastEligible: false, newsroomWordRange: { min: 180, max: 320 }, podcastWordRange: null },
  standard: { articleCount: 2, podcastEligible: true, newsroomWordRange: { min: 300, max: 500 }, podcastWordRange: { min: 450, max: 700 } },
  major: { articleCount: 3, podcastEligible: true, newsroomWordRange: { min: 450, max: 650 }, podcastWordRange: { min: 600, max: 850 } },
  'career-defining': { articleCount: 4, podcastEligible: true, newsroomWordRange: { min: 550, max: 750 }, podcastWordRange: { min: 700, max: 950 } },
});

const EVENT_PREFIX_RE = /^(milestone\.|award\.|transfer\.|portal\.|coach\.(?:job|hire|fired|promotion|championship))/i;
const STRONG_EVENT_RE = /^(transfer\.|portal\.|coach\.(?:job|hire|fired|promotion|championship))/i;
const NATIONAL_EVENT_KEY_RE = /^(award\.(?:heisman|national|allAmerican)|milestone\.(?:national|record|championship)|coach\.(?:hire|fired|job|championship))/i;
const NATIONAL_SIGNAL_RE = /(?:\bcollege football playoff\b|\bcfp\b|national championship|national semifinal|conference championship|new year'?s six|\bny6\b|heisman|all[- ]american|national player of the year|national award|top[- ]?25|top[- ]?10|top[- ]?5|ranked opponent|ranked team|\bno\.?\s*#?\d{1,2}\b|#\d{1,2}\b|record[- ]setting|school record|conference record|national record)/i;
const NATIONAL_ROSTER_RE = /(?:starting quarterback|starting qb|all[- ]american|heisman|national award|five[- ]star|5[- ]star|top[- ]?100|top[- ]?50|first[- ]team all|award winner|nationally ranked|national attention)/i;

const currentEditorialFacts = (state, publicationId) => (state.factLedger || [])
  .filter((fact) => fact?.verified && publicationMatches(fact, publicationId));

const recentCoverageKeys = (state, publicationId, limit = 3) => {
  const keys = [];
  const pushFrom = (entry) => {
    if (!entry || publicationMatches(entry, publicationId)) return;
    const candidate = entry.coverageDecision?.storylineKeys || entry.storylineKeys || [];
    candidate.forEach((key) => {
      const normalized = clean(key, 160);
      if (normalized) keys.push(normalized);
    });
  };
  [...(state.newsroomIssues || [])].slice(-limit - 1).forEach(pushFrom);
  [...(state.podcastEpisodes || [])].slice(-limit - 1).forEach(pushFrom);
  return new Set(keys);
};

const currentWeeklyNote = (facts) => facts.find((fact) => fact.key === 'weekly.note' && clean(fact.value, 1000));
const eventFactsFor = (facts) => facts.filter((fact) => EVENT_PREFIX_RE.test(clean(fact.key, 180)));

const factText = (fact = {}) => clean(`${fact.key || ''} ${fact.label || ''} ${fact.value ?? ''}`, 1800);
const relevantNationalFacts = (facts = []) => facts.filter((fact) => (
  String(fact?.key || '').startsWith('game.')
  || String(fact?.key || '').startsWith('milestone.')
  || String(fact?.key || '').startsWith('award.')
  || String(fact?.key || '').startsWith('transfer.')
  || String(fact?.key || '').startsWith('portal.')
  || String(fact?.key || '').startsWith('coach.')
  || fact?.key === 'weekly.note'
));

const numberFact = (facts, key, fallback = null) => {
  const exact = facts.find((fact) => clean(fact?.key, 180) === key);
  const raw = exact?.value ?? fallback;
  if (raw === '' || raw === null || raw === undefined) return null;
  const parsed = Number(String(raw).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const priorNumberFact = (state, publicationId, key) => {
  const candidate = [...(state.factLedger || [])]
    .filter((fact) => fact?.verified && fact.key === key && !publicationMatches(fact, publicationId))
    .reverse()
    .find((fact) => fact.value !== '' && fact.value !== null && fact.value !== undefined);
  if (!candidate) return null;
  const parsed = Number(String(candidate.value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const audienceReachFor = ({ state, issue, publicationId, program, relevance, facts, eventFacts, strongEvent }) => {
  if (!facts.length) {
    return {
      level: AUDIENCE_REACH.LOCAL,
      regionalEligible: false,
      nationalEligible: false,
      nationalLead: false,
      regionalScore: 0,
      nationalScore: 0,
      reasons: [],
      nationalReasons: [],
    };
  }

  const result = clean(program?.currentGame?.result, 10);
  const resultKnown = ['W', 'L'].includes(result);
  const isWin = result === 'W';
  const teamScore = Number(program?.currentGame?.homeScore);
  const opponentScore = Number(program?.currentGame?.awayScore);
  const scoringMargin = Number.isFinite(teamScore) && Number.isFinite(opponentScore) ? teamScore - opponentScore : null;
  const teamRank = numberFact(facts, 'game.teamRank', program?.currentGame?.teamRank);
  const opponentRank = numberFact(facts, 'game.opponentRank', program?.currentGame?.opponentRank);
  const previousTeamRank = priorNumberFact(state, publicationId, 'game.teamRank');
  const phase = clean(issue?.weekPhase, 120).toLowerCase();
  const nationalFacts = relevantNationalFacts(facts);
  const explicitNationalFacts = nationalFacts.filter((fact) => NATIONAL_SIGNAL_RE.test(factText(fact)));
  const nationallySignificantRosterEvent = eventFacts.some((fact) => (
    /^(transfer\.|portal\.)/i.test(clean(fact.key, 180)) && NATIONAL_ROSTER_RE.test(factText(fact))
  ));
  const nationalAwardOrProgramEvent = eventFacts.some((fact) => (
    NATIONAL_EVENT_KEY_RE.test(clean(fact.key, 180)) || NATIONAL_SIGNAL_RE.test(factText(fact))
  ));
  const playoffOrTitleStage = /(?:college football playoff|\bcfp\b|national semifinal|national championship|conference championship)/i.test(phase)
    || explicitNationalFacts.some((fact) => /(?:college football playoff|\bcfp\b|national semifinal|national championship|conference championship)/i.test(factText(fact)));
  const majorCoachEvent = eventFacts.some((fact) => /^coach\.(?:hire|fired|job)/i.test(clean(fact.key, 180)));
  const hugePlayerPerformance = Boolean(
    relevance?.didPlay
    && ((Number(relevance.totalYards) || 0) >= 500 || (Number(relevance.totalTouchdowns) || 0) >= 6)
  );
  const strongPlayerPerformance = Boolean(
    relevance?.didPlay
    && ((Number(relevance.totalYards) || 0) >= 400 || (Number(relevance.totalTouchdowns) || 0) >= 5)
  );

  let regionalScore = 0;
  const regionalReasons = [];
  if (resultKnown) { regionalScore += 2; regionalReasons.push('completed FBS game result'); }
  if (relevance?.roleChanged && relevance?.starter) { regionalScore += 2; regionalReasons.push('starting-quarterback change'); }
  else if (relevance?.roleChanged) { regionalScore += 1; regionalReasons.push('depth-chart movement'); }
  if (eventFacts.length) { regionalScore += 2; regionalReasons.push('verified program/career event'); }
  if (Number(program?.streakCount || 0) >= 4) { regionalScore += 1; regionalReasons.push('sustained program streak'); }
  if (phase.includes('postseason')) { regionalScore += 2; regionalReasons.push('postseason setting'); }
  if (teamRank && teamRank <= 25) { regionalScore += 1; regionalReasons.push('ranked team context'); }

  let nationalScore = 0;
  const nationalReasons = [];
  if (isWin && opponentRank && opponentRank <= 25) {
    nationalScore += opponentRank <= 10 ? 7 : 5;
    nationalReasons.push(`win over No. ${opponentRank} opponent`);
  }
  if (isWin && opponentRank && opponentRank <= 25 && scoringMargin !== null && scoringMargin >= 14) {
    nationalScore += 2;
    nationalReasons.push('decisive ranked-opponent win');
  }
  if (playoffOrTitleStage) {
    nationalScore += 6;
    nationalReasons.push('playoff or championship-stage development');
  }
  if (majorCoachEvent) {
    nationalScore += 5;
    nationalReasons.push('major coaching news');
  }
  if (nationallySignificantRosterEvent) {
    nationalScore += 5;
    nationalReasons.push('nationally significant roster movement');
  }
  if (nationalAwardOrProgramEvent) {
    nationalScore += 5;
    nationalReasons.push('national award, record, or program milestone');
  }
  if (hugePlayerPerformance) {
    nationalScore += 5;
    nationalReasons.push('exceptional nationally notable individual performance');
  } else if (strongPlayerPerformance && (opponentRank && opponentRank <= 25)) {
    nationalScore += 2;
    nationalReasons.push('major performance in ranked-opponent game');
  }
  if (teamRank && teamRank <= 15 && previousTeamRank && previousTeamRank > 15) {
    nationalScore += 2;
    nationalReasons.push('meaningful rise into the national rankings');
  }
  if (Number(program?.streakCount || 0) >= 8) {
    nationalScore += 3;
    nationalReasons.push('extended winning or losing streak with national-scale significance');
  }
  if (explicitNationalFacts.length && nationalScore < 5) {
    nationalScore += 2;
    nationalReasons.push('explicit verified national-context signal');
  }
  if (strongEvent && !nationallySignificantRosterEvent && !majorCoachEvent && !nationalAwardOrProgramEvent) {
    nationalReasons.push('major career event remained below national-attention threshold');
  }

  const regionalEligible = regionalScore >= 2;
  const nationalEligible = nationalScore >= 5;
  const nationalLead = nationalScore >= 8;
  const level = nationalLead
    ? AUDIENCE_REACH.NATIONAL_LEAD
    : nationalEligible
      ? AUDIENCE_REACH.NATIONAL
      : regionalEligible
        ? AUDIENCE_REACH.REGIONAL
        : AUDIENCE_REACH.LOCAL;

  return {
    level,
    regionalEligible,
    nationalEligible,
    nationalLead,
    regionalScore,
    nationalScore,
    reasons: regionalReasons,
    nationalReasons,
    teamRank,
    opponentRank,
  };
};

const storylineThreadsFor = ({ issue, program, relevance, eventFacts, recentKeys }) => {
  const threads = [];
  const add = (thread) => {
    if (!thread?.key) return;
    const recentlyCovered = recentKeys.has(thread.key);
    threads.push({
      ...thread,
      recentlyCovered,
      editorialUse: thread.changedThisWeek || !recentlyCovered ? (thread.editorialUse || 'context') : 'background-only',
    });
  };

  if (relevance?.currentRole) {
    add({
      key: `player-role:${clean(relevance.currentRole, 40).toUpperCase()}`,
      label: 'Quarterback role',
      value: clean(relevance.currentRole, 40),
      changedThisWeek: Boolean(relevance.roleChanged),
      status: relevance.roleChanged ? 'new-development' : 'established',
      editorialUse: relevance.roleChanged ? 'primary' : 'background-only',
    });
  }

  if (relevance?.firstAppearance) {
    add({ key: 'player:first-appearance', label: 'First college appearance', value: true, changedThisWeek: true, status: 'new-development', editorialUse: 'primary' });
  } else if (relevance?.didPlay) {
    add({ key: 'player:active-role', label: 'Tracked player in game action', value: true, changedThisWeek: true, status: 'active', editorialUse: relevance.level === 'primary' ? 'primary' : 'context' });
  }

  if (program?.streakCount >= 3) {
    const thresholdCrossed = Number(program.previousStreakCount || 0) < 3;
    add({
      key: `program:${program.streak?.includes('losing') ? 'losing' : 'winning'}-streak`,
      label: 'Sustained team streak',
      value: clean(program.streak, 100),
      changedThisWeek: thresholdCrossed,
      status: thresholdCrossed ? 'new-development' : 'continuing',
      editorialUse: thresholdCrossed ? 'primary' : 'context',
    });
  }

  if (clean(issue?.weekPhase, 80).toLowerCase().includes('postseason')) {
    add({ key: 'program:postseason', label: 'Postseason stage', value: clean(issue.weekPhase, 80), changedThisWeek: true, status: 'active', editorialUse: 'primary' });
  }

  eventFacts.forEach((fact) => add({
    key: `event:${clean(fact.key, 150)}`,
    label: clean(fact.label || fact.key, 160),
    value: fact.value,
    changedThisWeek: true,
    status: 'new-development',
    editorialUse: 'primary',
  }));

  return threads;
};

const tierForScore = ({ score, careerDefining = false, hasAnyStory = false }) => {
  if (!hasAnyStory) return COVERAGE_TIERS.NONE;
  if (careerDefining || score >= 8) return COVERAGE_TIERS.CAREER;
  if (score >= 5) return COVERAGE_TIERS.MAJOR;
  if (score >= 3) return COVERAGE_TIERS.STANDARD;
  return COVERAGE_TIERS.BRIEF;
};

export const buildEditorialCoverageDecision = ({ state = {}, issue = {}, publicationId = '', program = {}, relevance = {} } = {}) => {
  const facts = currentEditorialFacts(state, publicationId);
  const eventFacts = eventFactsFor(facts);
  const weeklyNote = currentWeeklyNote(facts);
  const recentKeys = recentCoverageKeys(state, publicationId);
  const resultKnown = ['W', 'L'].includes(clean(program?.currentGame?.result, 10));
  const roleEvent = Boolean(relevance.roleChanged);
  const appearanceEvent = Boolean(relevance.didPlay || relevance.firstAppearance);
  const playerPerformanceEvent = relevance.totalYards !== null && relevance.totalYards !== undefined
    ? Number(relevance.totalYards) >= 200 || Number(relevance.totalTouchdowns || 0) >= 2 || Number(relevance.interceptions || 0) >= 3
    : false;
  const postseason = clean(issue.weekPhase, 80).toLowerCase().includes('postseason');
  const streakThreshold = Number(program.streakCount || 0) >= 3 && Number(program.previousStreakCount || 0) < 3;
  const strongEvent = eventFacts.some((fact) => STRONG_EVENT_RE.test(clean(fact.key, 180)));

  let score = 0;
  const reasons = [];
  if (resultKnown) { score += 3; reasons.push('completed game result'); }
  if (roleEvent) { score += 3; reasons.push(relevance.promoted ? 'depth-chart promotion' : relevance.demoted ? 'depth-chart demotion' : 'depth-chart change'); }
  if (relevance.firstAppearance) { score += 3; reasons.push('first college appearance'); }
  else if (appearanceEvent) { score += 1; reasons.push('game appearance'); }
  if (relevance.starter && relevance.didPlay) { score += 1; reasons.push('starting-quarterback role'); }
  if (playerPerformanceEvent) { score += 1; reasons.push('meaningful player production'); }
  if (streakThreshold) { score += 2; reasons.push('sustained team streak became a storyline'); }
  if (postseason) { score += 2; reasons.push('postseason stakes'); }
  if (eventFacts.length) { score += Math.min(4, 2 + eventFacts.length); reasons.push('verified career/program event'); }
  if (strongEvent) { score += 2; reasons.push('major transfer/portal/coaching event'); }
  if (weeklyNote) { score += 1; reasons.push('meaningful weekly football note'); }

  const hasAnyStory = resultKnown || roleEvent || appearanceEvent || postseason || eventFacts.length > 0 || Boolean(weeklyNote) || streakThreshold;
  const careerDefining = strongEvent && (postseason || relevance.level === 'primary' || eventFacts.length > 1);
  const tier = tierForScore({ score, careerDefining, hasAnyStory });
  const config = TIER_CONFIG[tier];
  const audienceReach = audienceReachFor({ state, issue, publicationId, program, relevance, facts, eventFacts, strongEvent });
  const storylineThreads = storylineThreadsFor({ issue, program, relevance, eventFacts, recentKeys });
  const storylineKeys = storylineThreads.filter((thread) => thread.editorialUse !== 'background-only').map((thread) => thread.key);
  const playerMentionPolicy = relevance.level === 'primary'
    ? 'focal-when-story-requires'
    : relevance.level === 'high'
      ? 'secondary'
      : relevance.level === 'developing'
        ? 'brief-only-for-player-event'
        : 'omit';

  return {
    tier,
    rank: COVERAGE_ORDER[tier],
    score,
    reasons,
    articleCount: config.articleCount,
    podcastEligible: config.podcastEligible,
    newsroomWordRange: config.newsroomWordRange,
    podcastWordRange: config.podcastWordRange,
    playerMentionPolicy,
    audienceReach,
    storylineKeys,
    storylineThreads,
    noCoverageReason: tier === COVERAGE_TIERS.NONE
      ? 'No completed game, player-role event, appearance, postseason development, milestone, transfer/portal event, sustained-streak threshold, or meaningful football note created a legitimate story this week.'
      : '',
  };
};

export const coverageAtLeast = (decision, tier) => Number(decision?.rank ?? -1) >= Number(COVERAGE_ORDER[tier] ?? 99);
