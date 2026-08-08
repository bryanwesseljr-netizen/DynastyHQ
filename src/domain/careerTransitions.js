import { addCollegeNewsroomStop } from './collegeNewsroom.js';

export const DEFAULT_CAREER_TRANSITIONS = Object.freeze({
  collegeStartedAt: '',
  graduationChecklist: {
    finalSeasonComplete: false,
    statsArchived: false,
    awardsReviewed: false,
    transferDecisionClosed: false,
  },
  coachingUniverseCreated: false,
  coachingUniverseCreatedAt: '',
});

export const normalizeCareerTransitions = (value = {}) => ({
  ...DEFAULT_CAREER_TRANSITIONS,
  ...value,
  graduationChecklist: {
    ...DEFAULT_CAREER_TRANSITIONS.graduationChecklist,
    ...(value.graduationChecklist || {}),
  },
});

export const beginCollegeCareer = (state, outletProfile, occurredAt = new Date().toISOString()) => {
  if (!state.player?.isCommitted || !state.player?.college) {
    throw new Error('A verified college commitment is required before the college career can begin.');
  }
  const transitions = normalizeCareerTransitions(state.careerTransitions);
  const nextSeason = (Number(state.currentSeason) || 1) + 1;
  const collegeNewsroom = addCollegeNewsroomStop({
    collegeNewsroom: state.collegeNewsroom,
    school: state.player.college,
    profile: outletProfile,
    season: nextSeason,
    week: 1,
    startedAt: occurredAt,
  });
  return {
    ...state,
    currentSeason: nextSeason,
    currentWeek: 1,
    careerStage: 'College',
    player: { ...state.player, school: state.player.college, careerStage: 'College' },
    collegeNewsroom,
    careerTransitions: { ...transitions, collegeStartedAt: occurredAt },
    careerChronicle: [...(state.careerChronicle || []), {
      id: `college-career-${nextSeason}`,
      type: 'college-enrollment',
      season: nextSeason,
      week: 1,
      careerPhase: 'Player',
      occurredAt,
      title: `${state.player.name || 'The player'} begins his college career at ${state.player.college}`,
      summary: 'The signed high-school recruitment is archived and the college Road to Glory chapter is now active.',
      factKeys: ['profile.player.name', 'profile.player.college'],
    }],
  };
};

export const updateGraduationChecklist = (state, field, checked) => {
  if (!Object.hasOwn(DEFAULT_CAREER_TRANSITIONS.graduationChecklist, field)) return state;
  const transitions = normalizeCareerTransitions(state.careerTransitions);
  return {
    ...state,
    careerTransitions: {
      ...transitions,
      graduationChecklist: { ...transitions.graduationChecklist, [field]: Boolean(checked) },
    },
  };
};

export const isGraduationReady = (state) => Object.values(
  normalizeCareerTransitions(state.careerTransitions).graduationChecklist,
).every(Boolean);

export const createCoachingUniverse = (state, occurredAt = new Date().toISOString()) => {
  if (!state.player?.graduated) throw new Error('Graduation must be recorded before creating the coaching universe.');
  const transitions = normalizeCareerTransitions(state.careerTransitions);
  return {
    ...state,
    recruiting: [],
    playerRecruiting: {
      ...(state.playerRecruiting || {}),
      transfer: { status: 'inactive', openedSeason: null, openedWeek: null, targets: [], decisions: state.playerRecruiting?.transfer?.decisions || [] },
    },
    careerTransitions: {
      ...transitions,
      coachingUniverseCreated: true,
      coachingUniverseCreatedAt: occurredAt,
    },
    careerChronicle: [...(state.careerChronicle || []), {
      id: `coaching-universe-${state.currentSeason || 1}-${state.currentWeek || 1}`,
      type: 'coaching-universe',
      season: state.currentSeason || 1,
      week: state.currentWeek || 1,
      careerPhase: 'Player',
      occurredAt,
      title: 'Coaching universe created',
      summary: `The coaching career will begin at ${state.player.graduationSchool || state.player.college || state.player.school}, with a clean coach prospect board and the complete RTG archive preserved.`,
      factKeys: ['profile.player.name', 'profile.player.college'],
    }],
  };
};
