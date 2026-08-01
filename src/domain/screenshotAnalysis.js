const SCREEN_TYPE_LABELS = {
  box_score: 'Box Score',
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
]);

const cleanString = (value) => String(value ?? '').trim();

const normalizeValue = (key, value) => {
  const cleaned = cleanString(value).replace(/,/g, '');
  if (NUMERIC_KEYS.has(key)) {
    const number = Number(cleaned.replace(/[$%]/g, ''));
    return Number.isFinite(number) ? number : '';
  }
  if (key === 'recruiting.offer') return /^(true|yes|offered|offer)$/i.test(cleaned);
  if (key === 'game.result') {
    const result = cleaned.toUpperCase();
    return result === 'W' || result === 'L' ? result : '';
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
  recruiting = [],
  retentionBoard = [],
  careerPhase = 'Player',
}) => {
  const facts = [];
  const gamePatch = {};
  const rtgPatch = {};
  const coachPatch = {};
  const wearPatch = {};
  const recruitingById = new Map();
  const retentionById = new Map();

  (analysis?.facts || []).forEach((rawFact, index) => {
    const key = cleanString(rawFact.key);
    const value = normalizeValue(key, rawFact.value);
    if (!key || value === '') return;

    const subjectName = cleanString(rawFact.subjectName || rawFact.schoolName);
    const knownSchool = key.startsWith('recruiting.')
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
    } else if (RTG_KEYS.has(key)) {
      rtgPatch[key.slice('rtg.'.length)] = value;
    } else if (WEAR_KEYS.has(key)) {
      wearPatch[key.slice('rtg.wear.'.length)] = value;
    } else if (COACH_KEYS.has(key)) {
      coachPatch[key.slice('coach.'.length)] = value;
    } else if (ROSTER_POSITION_KEYS.has(key)) {
      ledgerKey = key;
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

  const detectedTypes = (analysis?.screenTypes || [])
    .map((type) => SCREEN_TYPE_LABELS[type])
    .filter(Boolean);

  return {
    source: {
      id: sourceId,
      fileName,
      detectedTypes: [...new Set(detectedTypes)],
      capturedAt: new Date().toISOString(),
      screenTitle: cleanString(analysis?.screenTitle),
      summary: cleanString(analysis?.summary),
      previewUrl,
      analyzer: 'Secure AI',
    },
    facts,
    gamePatch,
    rtgPatch,
    coachPatch,
    recruitingPatches: [...recruitingById.values()],
    retentionPatches: [...retentionById.values()],
  };
};

export const createFailedScreenshotResult = ({ sourceId, fileName, previewUrl = '', message }) => ({
  source: {
    id: sourceId,
    fileName,
    detectedTypes: [],
    capturedAt: new Date().toISOString(),
    previewUrl,
    analyzer: 'Secure AI',
    error: cleanString(message) || 'Analysis failed',
  },
  facts: [],
  gamePatch: {},
  rtgPatch: {},
  coachPatch: {},
  recruitingPatches: [],
  retentionPatches: [],
});
