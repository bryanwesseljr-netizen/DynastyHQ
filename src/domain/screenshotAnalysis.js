const SCREEN_TYPE_LABELS = {
  box_score: 'Box Score',
  high_school_moments: 'High-School Moments',
  player_mechanics: 'Player Mechanics',
  rtg_recruiting: 'RTG Recruiting',
  coach_recruiting: 'Coach Recruiting',
  wear_and_tear: 'Wear & Tear',
  nil_budget: 'NIL / Program Budget',
  roster_management: 'Roster Management',
  offseason_retention: 'Roster Retention',
  transfer_portal: 'Transfer Portal',
  recruiting_class: 'Recruiting Class',
  season_summary: 'Season Summary',
  depth_chart: 'Depth Chart',
  unknown: 'Unclassified',
};

export const HIGH_SCHOOL_UPLOAD_SLOT_TYPES = Object.freeze({
  MOMENT: 'high_school_moment',
  POSTGAME: 'high_school_postgame',
});

export const HIGH_SCHOOL_UPLOAD_SLOTS = Object.freeze([
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `moment-${index + 1}`,
    kind: HIGH_SCHOOL_UPLOAD_SLOT_TYPES.MOMENT,
    momentNumber: index + 1,
    label: `Moment ${index + 1}`,
    description: 'Objective screen showing each Passed or Failed result.',
    multiple: false,
  })),
  {
    id: 'postgame-summary',
    kind: HIGH_SCHOOL_UPLOAD_SLOT_TYPES.POSTGAME,
    label: 'Postgame Tape Score / Recruiting Summary',
    description: 'Tape Score, star rating, rankings, Top Schools, or official offer screens.',
    multiple: true,
  },
]);

export const normalizeHighSchoolUploadContext = (value = {}) => {
  if (value?.kind === HIGH_SCHOOL_UPLOAD_SLOT_TYPES.MOMENT) {
    const momentNumber = Number(value.momentNumber);
    if (momentNumber >= 1 && momentNumber <= 4) {
      return {
        id: `moment-${momentNumber}`,
        kind: HIGH_SCHOOL_UPLOAD_SLOT_TYPES.MOMENT,
        momentNumber,
        label: `Moment ${momentNumber}`,
      };
    }
  }
  if (value?.kind === HIGH_SCHOOL_UPLOAD_SLOT_TYPES.POSTGAME) {
    return {
      id: 'postgame-summary',
      kind: HIGH_SCHOOL_UPLOAD_SLOT_TYPES.POSTGAME,
      label: 'Postgame Tape Score / Recruiting Summary',
    };
  }
  return null;
};

export const scopeAnalysisToHighSchoolUpload = (analysis = {}, uploadContext = null) => {
  const context = normalizeHighSchoolUploadContext(uploadContext);
  if (!context) return analysis;

  if (context.kind === HIGH_SCHOOL_UPLOAD_SLOT_TYPES.MOMENT) {
    const targetPrefix = `highSchool.moment${context.momentNumber}`;
    const facts = (analysis.facts || []).flatMap((fact) => {
      if (fact.key === 'highSchool.teamImpact') return [fact];
      if (!/^highSchool\.moment[1-4]\./.test(String(fact.key || ''))) return [];
      return [{ ...fact, key: String(fact.key).replace(/^highSchool\.moment[1-4]/, targetPrefix) }];
    });
    return {
      ...analysis,
      screenTypes: facts.length ? ['high_school_moments'] : (analysis.screenTypes || []),
      facts,
    };
  }

  const facts = (analysis.facts || []).filter((fact) => String(fact.key || '').startsWith('recruiting.'));
  return {
    ...analysis,
    screenTypes: facts.length ? ['rtg_recruiting'] : (analysis.screenTypes || []),
    facts,
  };
};

const GAME_KEYS = new Set([
  'game.opponent',
  'game.result',
  'game.homeScore',
  'game.awayScore',
  'game.passYds',
  'game.passTD',
  'game.rushYds',
  'game.rushTD',
  'game.int',
]);

const HIGH_SCHOOL_KEYS = new Set([
  ...Array.from({ length: 4 }, (_, index) => {
    const prefix = `highSchool.moment${index + 1}`;
    return [
      `${prefix}.result`, `${prefix}.type`, `${prefix}.scholarshipSchool`, `${prefix}.objective`,
      `${prefix}.objective1`, `${prefix}.objective1Result`, `${prefix}.objective2`, `${prefix}.objective2Result`,
    ];
  }).flat(),
  'highSchool.teamImpact',
]);

const RTG_NUMERIC_KEYS = new Set([
  'rtg.gpa',
  'rtg.energy',
  'rtg.coachTrust',
  'rtg.trustToNext',
  'rtg.skillPoints',
  'rtg.followers',
  'rtg.valuation',
]);

const RTG_TEXT_KEYS = new Set([
  'rtg.rank',
  'rtg.sponsorships',
]);

const RTG_KEYS = new Set([...RTG_NUMERIC_KEYS, ...RTG_TEXT_KEYS]);

const WEAR_KEYS = new Set([
  'rtg.wear.head',
  'rtg.wear.chest',
  'rtg.wear.arm',
  'rtg.wear.legs',
]);

const COACH_KEYS = new Set([
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
]);

const ROSTER_POSITION_KEYS = new Set([
  'roster.qb.count', 'roster.qb.need', 'roster.rb.count', 'roster.rb.need',
  'roster.wr.count', 'roster.wr.need', 'roster.te.count', 'roster.te.need',
  'roster.ol.count', 'roster.ol.need', 'roster.dl.count', 'roster.dl.need',
  'roster.lb.count', 'roster.lb.need', 'roster.cb.count', 'roster.cb.need',
  'roster.s.count', 'roster.s.need', 'roster.st.count', 'roster.st.need',
]);

const RETENTION_KEYS = new Set([
  'retention.position',
  'retention.overall',
  'retention.risk',
  'retention.status',
  'retention.nilDemand',
]);

const NUMERIC_KEYS = new Set([
  'game.homeScore',
  'game.awayScore',
  'game.passYds',
  'game.passTD',
  'game.rushYds',
  'game.rushTD',
  'game.int',
  ...RTG_NUMERIC_KEYS,
  ...COACH_KEYS,
  ...ROSTER_POSITION_KEYS,
  'retention.overall',
  'retention.nilDemand',
  'recruiting.interest',
  'recruiting.stars',
  'recruiting.recruitStars',
  'recruiting.tapeScore',
  'recruiting.nationalRank',
  'recruiting.stateRank',
  'recruiting.positionRank',
  'recruiting.gameNumber',
  'recruiting.topSchoolsSelected',
  'recruiting.preferenceRank',
  'recruiting.programStars',
  'recruiting.teamRank',
  'recruiting.tapeScoreAssessed',
  'recruiting.tapeScoreRequired',
  'recruiting.teamOverall',
  'recruiting.teamOffense',
  'recruiting.teamDefense',
  'recruiting.runPercent',
  'recruiting.passPercent',
  'recruiting.aggressivePercent',
  'recruiting.conservativePercent',
  'recruiting.coachLevel',
  'recruiting.bonusAcademics',
  'recruiting.bonusBrand',
  'recruiting.bonusLeadership',
  'recruiting.bonusFitness',
  'recruiting.bonusCoachTrust',
  'recruiting.bonusSkillPoints',
]);

const PLAYER_RECRUITING_PROFILE_FIELDS = new Map([
  ['recruiting.recruitStars', 'recruitStars'],
  ['recruiting.tapeScore', 'tapeScore'],
  ['recruiting.gameNumber', 'gameNumber'],
  ['recruiting.topSchoolsSelected', 'topSchoolsSelected'],
]);

const PLAYER_RECRUITING_RANK_FIELDS = new Map([
  ['recruiting.nationalRank', 'national'],
  ['recruiting.stateRank', 'state'],
  ['recruiting.positionRank', 'position'],
]);

const SCHOOL_RECRUITING_FIELDS = new Set([
  'recruiting.preferenceRank', 'recruiting.progressStage', 'recruiting.offer',
  'recruiting.programStars', 'recruiting.teamRank', 'recruiting.schemeFit',
  'recruiting.tapeScoreAssessed', 'recruiting.tapeScoreRequired', 'recruiting.projectedRole',
  'recruiting.teamOverall', 'recruiting.teamOffense', 'recruiting.teamDefense',
  'recruiting.offensiveScheme', 'recruiting.runPercent', 'recruiting.passPercent',
  'recruiting.aggressivePercent', 'recruiting.conservativePercent', 'recruiting.headCoach',
  'recruiting.coachArchetype', 'recruiting.coachLevel', 'recruiting.coachImpact',
  'recruiting.bonusAcademics', 'recruiting.bonusBrand', 'recruiting.bonusLeadership',
  'recruiting.bonusFitness', 'recruiting.bonusCoachTrust', 'recruiting.bonusSkillPoints',
  'recruiting.depthQB1', 'recruiting.depthQB2', 'recruiting.depthQB3',
]);

const cleanString = (value) => String(value ?? '').trim();

const normalizeValue = (key, value) => {
  const cleaned = cleanString(value).replace(/,/g, '');
  if (NUMERIC_KEYS.has(key)) {
    const number = Number(cleaned.replace(/[$%]/g, ''));
    return Number.isFinite(number) ? number : '';
  }
  if (key === 'recruiting.offer' || key === 'recruiting.schemeFit') return /^(true|yes|offered|offer|fit)$/i.test(cleaned);
  if (key === 'game.result') {
    const result = cleaned.toUpperCase();
    return result === 'W' || result === 'L' ? result : '';
  }
  if (/^highSchool\.moment[1-4]\.result$/.test(key)) {
    if (/partial/i.test(cleaned)) return 'partial';
    if (/success|complete|passed?/i.test(cleaned)) return 'success';
    if (/fail|incomplete|missed?/i.test(cleaned)) return 'failed';
    return '';
  }
  if (/^highSchool\.moment[1-4]\.type$/.test(key)) {
    if (/scholarship|offer/i.test(cleaned)) return 'scholarship';
    if (/standard|highlight|normal/i.test(cleaned)) return 'standard';
    return '';
  }
  if (/^highSchool\.moment[1-4]\.objective[12]Result$/.test(key)) {
    if (/pass|success|complete/i.test(cleaned)) return 'passed';
    if (/fail|incomplete|miss/i.test(cleaned)) return 'failed';
    return '';
  }
  if (WEAR_KEYS.has(key)) {
    const status = cleaned.toLowerCase();
    return ['green', 'yellow', 'red'].includes(status)
      ? status[0].toUpperCase() + status.slice(1)
      : '';
  }
  return cleaned;
};

const confidence = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.5;
  return Math.min(0.99, Math.max(0, parsed));
};

const findSchool = (schools, schoolName) => {
  const normalizedName = cleanString(schoolName).toLowerCase();
  if (!normalizedName) return null;
  return schools.find((school) => school.name.toLowerCase() === normalizedName) || null;
};

const prospectId = (name) => `prospect-${cleanString(name)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 64)}`;

const retentionId = (name) => `player-${cleanString(name)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 64)}`;

const interestLevel = (interest) => {
  if (interest >= 75) return 'High';
  if (interest >= 50) return 'Medium';
  if (interest >= 25) return 'Low';
  return 'None';
};

export const normalizeScreenshotAnalysis = ({
  analysis,
  sourceId,
  fileName,
  previewUrl = '',
  uploadContext = null,
  recruiting = [],
  retentionBoard = [],
  careerPhase = 'Player',
}) => {
  const scopedAnalysis = scopeAnalysisToHighSchoolUpload(analysis, uploadContext);
  const normalizedUploadContext = normalizeHighSchoolUploadContext(uploadContext);
  const facts = [];
  const gamePatch = {};
  const rtgPatch = {};
  const coachPatch = {};
  const wearPatch = {};
  const recruitingById = new Map();
  const retentionById = new Map();
  const playerRecruitingPatch = { rankings: {} };
  const highSchoolEvaluationPatch = { moments: [] };

  (scopedAnalysis?.facts || []).forEach((rawFact, index) => {
    const key = cleanString(rawFact.key);
    const value = normalizeValue(key, rawFact.value);
    if (!key || value === '') return;

    const subjectName = cleanString(rawFact.subjectName || rawFact.schoolName);
    const knownSchool = SCHOOL_RECRUITING_FIELDS.has(key) || ['recruiting.interest', 'recruiting.position', 'recruiting.stars', 'recruiting.status'].includes(key)
      ? findSchool(recruiting, subjectName)
      : null;
    const knownRetentionPlayer = key.startsWith('retention.')
      ? findSchool(retentionBoard, subjectName)
      : null;
    const coachRecruiting = ['OC', 'HC'].includes(careerPhase);
    const visibleRecruitName = subjectName;
    const school = knownSchool || (coachRecruiting && key.startsWith('recruiting.') && visibleRecruitName
      ? { id: prospectId(visibleRecruitName), name: visibleRecruitName, isNew: true }
      : null);
    const retentionPlayer = knownRetentionPlayer || (coachRecruiting && RETENTION_KEYS.has(key) && subjectName
      ? { id: retentionId(subjectName), name: subjectName, isNew: true }
      : null);
    let ledgerKey = key;

    if (GAME_KEYS.has(key)) {
      gamePatch[key.slice('game.'.length)] = value;
    } else if (HIGH_SCHOOL_KEYS.has(key)) {
      const objectiveMatch = key.match(/^highSchool\.moment([1-4])\.objective([12])(Result)?$/);
      const legacyObjectiveMatch = key.match(/^highSchool\.moment([1-4])\.objective$/);
      const momentMatch = key.match(/^highSchool\.moment([1-4])\.(result|type|scholarshipSchool)$/);
      if (objectiveMatch || legacyObjectiveMatch) {
        const momentNumber = Number((objectiveMatch || legacyObjectiveMatch)[1]);
        const momentIndex = momentNumber - 1;
        const objectiveNumber = objectiveMatch ? Number(objectiveMatch[2]) : 1;
        const objectiveIndex = objectiveNumber - 1;
        const field = objectiveMatch?.[3] ? 'result' : 'text';
        const currentMoment = highSchoolEvaluationPatch.moments[momentIndex] || { id: momentNumber, objectives: [] };
        const objectives = Array.from({ length: 2 }, (_, index) => ({
          ...(currentMoment.objectives?.[index] || { id: index + 1 }),
          ...(index === objectiveIndex ? { [field]: value } : {}),
        }));
        highSchoolEvaluationPatch.moments[momentIndex] = { ...currentMoment, objectives };
        ledgerKey = `highSchool.moment.${momentNumber}.objective.${objectiveNumber}.${field}`;
      } else if (momentMatch) {
        const momentIndex = Number(momentMatch[1]) - 1;
        highSchoolEvaluationPatch.moments[momentIndex] = {
          ...(highSchoolEvaluationPatch.moments[momentIndex] || { id: momentIndex + 1 }),
          [momentMatch[2]]: value,
        };
        ledgerKey = `highSchool.moment.${momentMatch[1]}.${momentMatch[2]}`;
      } else if (key === 'highSchool.teamImpact') {
        highSchoolEvaluationPatch.teamImpact = value;
      }
    } else if (RTG_KEYS.has(key)) {
      rtgPatch[key.slice('rtg.'.length)] = value;
    } else if (WEAR_KEYS.has(key)) {
      wearPatch[key.slice('rtg.wear.'.length)] = value;
    } else if (COACH_KEYS.has(key)) {
      coachPatch[key.slice('coach.'.length)] = value;
    } else if (ROSTER_POSITION_KEYS.has(key)) {
      ledgerKey = key;
    } else if (PLAYER_RECRUITING_PROFILE_FIELDS.has(key)) {
      playerRecruitingPatch[PLAYER_RECRUITING_PROFILE_FIELDS.get(key)] = Number(value);
      ledgerKey = `recruiting.profile.${PLAYER_RECRUITING_PROFILE_FIELDS.get(key)}`;
    } else if (PLAYER_RECRUITING_RANK_FIELDS.has(key)) {
      const field = PLAYER_RECRUITING_RANK_FIELDS.get(key);
      playerRecruitingPatch.rankings[field] = Number(value);
      ledgerKey = `recruiting.profile.${field}Rank`;
    } else if (school && key === 'recruiting.interest') {
      const interest = Math.min(100, Math.max(0, Number(value)));
      const current = recruitingById.get(school.id) || { id: school.id, name: school.name };
      recruitingById.set(school.id, { ...current, interest, level: interestLevel(interest) });
    } else if (school && key === 'recruiting.offer') {
      const current = recruitingById.get(school.id) || { id: school.id, name: school.name };
      recruitingById.set(school.id, { ...current, offered: Boolean(value) });
    } else if (school && key === 'recruiting.position') {
      const current = recruitingById.get(school.id) || { id: school.id, name: school.name };
      recruitingById.set(school.id, { ...current, position: cleanString(value).toUpperCase().slice(0, 8) });
    } else if (school && key === 'recruiting.stars') {
      const stars = Math.min(5, Math.max(1, Number(value)));
      const current = recruitingById.get(school.id) || { id: school.id, name: school.name };
      recruitingById.set(school.id, { ...current, stars });
    } else if (school && key === 'recruiting.status') {
      const current = recruitingById.get(school.id) || { id: school.id, name: school.name };
      recruitingById.set(school.id, { ...current, status: cleanString(value).slice(0, 80) });
    } else if (school && SCHOOL_RECRUITING_FIELDS.has(key)) {
      const field = key.slice('recruiting.'.length);
      const current = recruitingById.get(school.id) || { id: school.id, name: school.name };
      if (field.startsWith('bonus')) {
        const bonusKey = field.slice('bonus'.length);
        const normalizedKey = bonusKey.charAt(0).toLowerCase() + bonusKey.slice(1);
        current.scholarshipBonuses = { ...(current.scholarshipBonuses || {}), [normalizedKey]: Number(value) };
      } else if (field === 'teamOverall' || field === 'teamOffense' || field === 'teamDefense') {
        const ratingKey = field.replace('team', '').toLowerCase();
        current.programRatings = { ...(current.programRatings || {}), [ratingKey]: Number(value) };
      } else if (['runPercent', 'passPercent', 'aggressivePercent', 'conservativePercent'].includes(field)) {
        const tendencyKey = field.replace('Percent', '');
        current.tendencies = { ...(current.tendencies || {}), [tendencyKey]: Number(value) };
      } else if (field.startsWith('depthQB')) {
        const slot = field.slice('depth'.length).toUpperCase();
        const depthChart = Array.isArray(current.depthChart) ? [...current.depthChart] : [];
        const existing = depthChart.findIndex((entry) => entry.role === slot);
        const entry = { role: slot, summary: cleanString(value) };
        if (existing >= 0) depthChart[existing] = entry;
        else depthChart.push(entry);
        current.depthChart = depthChart;
      } else {
        current[field] = value;
      }
      recruitingById.set(school.id, current);
    } else if (retentionPlayer && RETENTION_KEYS.has(key)) {
      const field = key.slice('retention.'.length);
      const current = retentionById.get(retentionPlayer.id) || { id: retentionPlayer.id, name: retentionPlayer.name };
      const normalized = ['overall', 'nilDemand'].includes(field)
        ? Number(value)
        : (field === 'position' ? cleanString(value).toUpperCase().slice(0, 8) : cleanString(value).slice(0, 80));
      retentionById.set(retentionPlayer.id, { ...current, [field]: normalized });
      ledgerKey = `retention.${retentionPlayer.id}.${field}`;
    } else {
      return;
    }

    if (school) ledgerKey = `recruiting.${school.id}.${key.split('.')[1]}`;

    facts.push({
      id: `${sourceId}:${key}:${index}`,
      key: ledgerKey,
      label: cleanString(rawFact.label) || key,
      value,
      confidence: confidence(rawFact.confidence),
      evidence: cleanString(rawFact.evidence).slice(0, 180),
      sourceId,
      verified: false,
    });
  });

  if (Object.keys(wearPatch).length) rtgPatch.wear = wearPatch;

  const detectedTypes = (scopedAnalysis?.screenTypes || [])
    .map((type) => SCREEN_TYPE_LABELS[type])
    .filter(Boolean);

  return {
    source: {
      id: sourceId,
      fileName,
      detectedTypes: [...new Set(detectedTypes)],
      capturedAt: new Date().toISOString(),
      screenTitle: cleanString(scopedAnalysis?.screenTitle),
      summary: cleanString(scopedAnalysis?.summary),
      previewUrl,
      analyzer: 'Secure AI',
      ...(normalizedUploadContext ? { uploadContext: normalizedUploadContext } : {}),
    },
    facts,
    gamePatch,
    rtgPatch,
    coachPatch,
    recruitingPatches: [...recruitingById.values()],
    playerRecruitingPatch: {
      ...playerRecruitingPatch,
      ...(Object.keys(playerRecruitingPatch.rankings).length ? {} : { rankings: undefined }),
    },
    highSchoolEvaluationPatch,
    retentionPatches: [...retentionById.values()],
  };
};

export const createFailedScreenshotResult = ({ sourceId, fileName, previewUrl = '', message, uploadContext = null }) => ({
  source: {
    id: sourceId,
    fileName,
    detectedTypes: [],
    capturedAt: new Date().toISOString(),
    previewUrl,
    analyzer: 'Secure AI',
    error: cleanString(message) || 'Analysis failed',
    ...(normalizeHighSchoolUploadContext(uploadContext)
      ? { uploadContext: normalizeHighSchoolUploadContext(uploadContext) }
      : {}),
  },
  facts: [],
  gamePatch: {},
  rtgPatch: {},
  coachPatch: {},
  recruitingPatches: [],
  playerRecruitingPatch: {},
  highSchoolEvaluationPatch: {},
  retentionPatches: [],
});
