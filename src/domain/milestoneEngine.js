import { CAREER_SCHEMA_VERSION } from './weeklyEngine.js';
import { findExistingCommitment } from './careerDataHygiene.js';

export const MILESTONE_TYPES = Object.freeze({
  COMMITMENT: 'commitment',
  TRANSFER: 'transfer',
  GRADUATION: 'graduation',
  OC_HIRE: 'oc-hire',
  HC_HIRE: 'hc-hire',
  CHAMPIONSHIP: 'championship',
  AWARD: 'award',
  RECORD: 'record',
  RETIREMENT: 'retirement',
});

export const MILESTONE_DEFINITIONS = Object.freeze({
  [MILESTONE_TYPES.COMMITMENT]: {
    label: 'College commitment',
    description: 'Record the school selected at the end of high-school recruiting.',
    institutionLabel: 'Committed school',
    requiresInstitution: true,
  },
  [MILESTONE_TYPES.TRANSFER]: {
    label: 'Transfer decision',
    description: 'Record an accepted transfer destination without inventing portal interest.',
    institutionLabel: 'New school',
    previousInstitutionLabel: 'Previous school',
    requiresInstitution: true,
  },
  [MILESTONE_TYPES.GRADUATION]: {
    label: 'Graduation',
    description: 'Close the playing chapter while preserving the school and season.',
    institutionLabel: 'Graduating school',
    requiresInstitution: true,
  },
  [MILESTONE_TYPES.OC_HIRE]: {
    label: 'Offensive coordinator hire',
    description: 'Begin the coaching career at a verified school.',
    institutionLabel: 'Hiring school',
    requiresInstitution: true,
  },
  [MILESTONE_TYPES.HC_HIRE]: {
    label: 'Head coach hire / promotion',
    description: 'Record the first head-coaching job or a later head-coach move.',
    institutionLabel: 'Hiring school',
    previousInstitutionLabel: 'Previous school',
    requiresInstitution: true,
  },
  [MILESTONE_TYPES.CHAMPIONSHIP]: {
    label: 'Championship',
    description: 'Add a verified team championship to the Chronicle and Trophy Case.',
    institutionLabel: 'School',
    achievementLabel: 'Championship name',
    requiresAchievement: true,
  },
  [MILESTONE_TYPES.AWARD]: {
    label: 'Individual award',
    description: 'Record only an award actually shown or confirmed in the game.',
    institutionLabel: 'School',
    achievementLabel: 'Award name',
    requiresAchievement: true,
  },
  [MILESTONE_TYPES.RECORD]: {
    label: 'Career or program record',
    description: 'Preserve a verified record without adding unsupported totals.',
    institutionLabel: 'School',
    achievementLabel: 'Record or milestone',
    requiresAchievement: true,
  },
  [MILESTONE_TYPES.RETIREMENT]: {
    label: 'Retirement',
    description: 'Close the coaching career and preserve the final program.',
    institutionLabel: 'Final school',
  },
});

export class DuplicateMilestoneError extends Error {
  constructor(milestoneKey) {
    super(`${milestoneKey} has already been recorded.`);
    this.name = 'DuplicateMilestoneError';
    this.code = 'DUPLICATE_MILESTONE';
    this.milestoneKey = milestoneKey;
  }
}

const clean = (value) => String(value || '').trim();

const slug = (value) => clean(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 64) || 'career-event';

export const createMilestoneKey = (draft = {}) => {
  const season = Number(draft.season) || 1;
  const week = Number(draft.week) || 1;
  const subject = clean(draft.achievement) || clean(draft.institution) || draft.type;
  return `milestone-${season}-${week}-${slug(draft.type)}-${slug(subject)}`;
};

export const validateMilestoneDraft = (draft = {}) => {
  const errors = {};
  const definition = MILESTONE_DEFINITIONS[draft.type];
  if (!definition) errors.type = 'Choose a supported milestone type.';
  if (definition?.requiresInstitution && !clean(draft.institution)) {
    errors.institution = `${definition.institutionLabel} is required.`;
  }
  if (definition?.requiresAchievement && !clean(draft.achievement)) {
    errors.achievement = `${definition.achievementLabel} is required.`;
  }
  if (!Number.isInteger(Number(draft.season)) || Number(draft.season) < 1) {
    errors.season = 'Season must be 1 or greater.';
  }
  if (!Number.isInteger(Number(draft.week)) || Number(draft.week) < 1) {
    errors.week = 'Week must be 1 or greater.';
  }
  if (!draft.confirmed) errors.confirmed = 'Confirm that the milestone is supported by the game or your verified career record.';
  return errors;
};

const milestoneTitle = (type, playerName, institution, achievement) => {
  const name = clean(playerName) || 'Career subject';
  if (type === MILESTONE_TYPES.COMMITMENT) return `${name} commits to ${institution}`;
  if (type === MILESTONE_TYPES.TRANSFER) return `${name} transfers to ${institution}`;
  if (type === MILESTONE_TYPES.GRADUATION) return `${name} graduates from ${institution}`;
  if (type === MILESTONE_TYPES.OC_HIRE) return `${name} hired as offensive coordinator at ${institution}`;
  if (type === MILESTONE_TYPES.HC_HIRE) return `${name} hired as head coach at ${institution}`;
  if (type === MILESTONE_TYPES.RETIREMENT) return `${name} retires${institution ? ` at ${institution}` : ''}`;
  return achievement;
};

const milestoneSummary = (type, institution, previousInstitution, achievement, notes) => {
  if (notes) return notes;
  if (type === MILESTONE_TYPES.COMMITMENT) return `The college commitment to ${institution} was user-confirmed and added to the permanent career record.`;
  if (type === MILESTONE_TYPES.TRANSFER) return `The transfer${previousInstitution ? ` from ${previousInstitution}` : ''} to ${institution} was user-confirmed.`;
  if (type === MILESTONE_TYPES.GRADUATION) return `Graduation from ${institution} was user-confirmed, closing the playing chapter at that school.`;
  if (type === MILESTONE_TYPES.OC_HIRE) return `The offensive coordinator appointment at ${institution} was user-confirmed.`;
  if (type === MILESTONE_TYPES.HC_HIRE) return `The head coach appointment at ${institution} was user-confirmed.`;
  if (type === MILESTONE_TYPES.RETIREMENT) return `Retirement${institution ? ` at ${institution}` : ''} was user-confirmed.`;
  return `${achievement}${institution ? ` at ${institution}` : ''} was user-confirmed.`;
};

export const findMilestoneConflict = (state, draft) => {
  if (draft?.type === MILESTONE_TYPES.COMMITMENT) {
    const existingCommitment = findExistingCommitment([
      ...(state?.careerMilestones || []),
      ...(state?.careerChronicle || []),
    ], draft.institution);
    if (existingCommitment) return existingCommitment;
  }

  const milestoneKey = createMilestoneKey(draft);
  const record = (state?.careerMilestones || []).find((entry) => entry.milestoneKey === milestoneKey);
  if (record) return record;
  return (state?.careerChronicle || []).find((entry) => entry.milestoneKey === milestoneKey) || null;
};

const verifiedFact = (eventId, field, label, value) => ({
  id: `${eventId}:${field}`,
  publicationId: eventId,
  key: `career.${eventId}.${field}`,
  label,
  value,
  confidence: 1,
  verified: true,
  verificationMethod: 'user-confirmed',
  sourceType: 'manual-confirmation',
});

const applyCareerTransition = (state, type, institution, previousInstitution, occurredAt) => {
  const player = { ...(state.player || {}) };
  const coach = { ...(state.coach || {}) };
  let careerPhase = state.careerPhase || 'Player';

  if (type === MILESTONE_TYPES.COMMITMENT) {
    player.isCommitted = true;
    player.college = institution;
  } else if (type === MILESTONE_TYPES.TRANSFER) {
    player.previousCollege = previousInstitution || player.college || player.school || '';
    player.college = institution;
    player.school = institution;
  } else if (type === MILESTONE_TYPES.GRADUATION) {
    player.graduated = true;
    player.graduationSchool = institution;
    player.graduatedAt = occurredAt;
  } else if (type === MILESTONE_TYPES.OC_HIRE) {
    careerPhase = 'OC';
    player.school = institution;
    coach.role = 'OC';
    coach.currentSchool = institution;
    coach.retired = false;
  } else if (type === MILESTONE_TYPES.HC_HIRE) {
    careerPhase = 'HC';
    player.school = institution;
    coach.role = 'HC';
    coach.currentSchool = institution;
    coach.retired = false;
  } else if (type === MILESTONE_TYPES.RETIREMENT) {
    careerPhase = 'Retired';
    if (institution) {
      player.school = institution;
      coach.currentSchool = institution;
    }
    coach.retired = true;
    coach.retiredAt = occurredAt;
  }

  return { player, coach, careerPhase };
};

export const createCareerMilestone = ({ state, draft, occurredAt = new Date().toISOString() }) => {
  const errors = validateMilestoneDraft(draft);
  if (Object.keys(errors).length) {
    const error = new Error('The milestone draft is incomplete.');
    error.code = 'INVALID_MILESTONE';
    error.validation = errors;
    throw error;
  }

  const milestoneKey = createMilestoneKey(draft);
  if (findMilestoneConflict(state, draft)) throw new DuplicateMilestoneError(milestoneKey);

  const season = Number(draft.season);
  const week = Number(draft.week);
  const type = draft.type;
  const institution = clean(draft.institution);
  const previousInstitution = clean(draft.previousInstitution);
  const achievement = clean(draft.achievement);
  const notes = clean(draft.notes);
  const eventId = milestoneKey;
  const title = milestoneTitle(type, state.player?.name, institution, achievement);
  const summary = milestoneSummary(type, institution, previousInstitution, achievement, notes);
  const transition = applyCareerTransition(state, type, institution, previousInstitution, occurredAt);

  const facts = [
    verifiedFact(eventId, 'type', 'Milestone type', MILESTONE_DEFINITIONS[type].label),
    institution && verifiedFact(eventId, 'institution', MILESTONE_DEFINITIONS[type].institutionLabel || 'School', institution),
    previousInstitution && verifiedFact(eventId, 'previousInstitution', MILESTONE_DEFINITIONS[type].previousInstitutionLabel || 'Previous school', previousInstitution),
    achievement && verifiedFact(eventId, 'achievement', MILESTONE_DEFINITIONS[type].achievementLabel || 'Achievement', achievement),
    notes && verifiedFact(eventId, 'notes', 'User-confirmed notes', notes),
  ].filter(Boolean);

  const milestone = {
    id: eventId,
    milestoneKey,
    type,
    season,
    week,
    careerPhase: transition.careerPhase,
    institution,
    previousInstitution,
    achievement,
    notes,
    title,
    summary,
    occurredAt,
    verificationMethod: 'user-confirmed',
    factKeys: facts.map((entry) => entry.key),
  };

  const trophyType = type === MILESTONE_TYPES.CHAMPIONSHIP
    ? 'Championship'
    : (type === MILESTONE_TYPES.AWARD ? 'Award' : (type === MILESTONE_TYPES.RECORD ? 'Milestone' : ''));
  const trophy = trophyType ? {
    id: eventId,
    name: achievement,
    year: `Season ${season}`,
    type: trophyType,
  } : null;

  return {
    ...state,
    schemaVersion: CAREER_SCHEMA_VERSION,
    ...transition,
    recruiting: type === MILESTONE_TYPES.OC_HIRE ? [] : (state.recruiting || []),
    careerMilestones: [...(state.careerMilestones || []), milestone],
    careerChronicle: [...(state.careerChronicle || []), milestone],
    factLedger: [...(state.factLedger || []), ...facts],
    trophies: trophy ? [trophy, ...(state.trophies || [])] : (state.trophies || []),
  };
};
