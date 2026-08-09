const clean = (value) => String(value ?? '').trim();

export const normalizePlayerProfile = (profile = {}) => ({
  name: clean(profile.name),
  school: clean(profile.school),
  number: clean(profile.number),
  pos: clean(profile.pos).toUpperCase(),
  height: clean(profile.height),
  weight: clean(profile.weight),
  archetype: clean(profile.archetype),
  stars: Number(profile.stars),
  overall: Number(profile.overall),
});

export const validatePlayerProfile = (profile = {}) => {
  const normalized = normalizePlayerProfile(profile);
  const errors = {};

  for (const [field, label] of [
    ['name', 'Player name'],
    ['school', 'School'],
    ['number', 'Jersey number'],
    ['pos', 'Position'],
    ['height', 'Height'],
    ['weight', 'Weight'],
    ['archetype', 'Archetype'],
  ]) {
    if (!normalized[field]) errors[field] = `${label} is required.`;
  }

  const jerseyNumber = Number(normalized.number);
  if (normalized.number && (!Number.isInteger(jerseyNumber) || jerseyNumber < 0 || jerseyNumber > 99)) {
    errors.number = 'Use a jersey number from 0 to 99.';
  }
  if (!Number.isInteger(normalized.stars) || normalized.stars < 1 || normalized.stars > 5) {
    errors.stars = 'Recruit rating must be between 1 and 5 stars.';
  }
  if (!Number.isInteger(normalized.overall) || normalized.overall < 1 || normalized.overall > 99) {
    errors.overall = 'Overall rating must be between 1 and 99.';
  }

  return errors;
};

export const applyPlayerProfile = (state = {}, profile = {}) => {
  const normalized = normalizePlayerProfile(profile);
  const nextState = {
    ...state,
    player: {
      ...(state.player || {}),
      ...normalized,
    },
  };

  const isActiveHighSchoolRecruit = state.careerPhase === 'Player'
    && !state.player?.isCommitted
    && !state.playerRecruiting?.highSchoolArchive;

  if (!isActiveHighSchoolRecruit || !state.playerRecruiting?.highSchool) return nextState;

  return {
    ...nextState,
    playerRecruiting: {
      ...state.playerRecruiting,
      highSchool: {
        ...state.playerRecruiting.highSchool,
        recruitStars: normalized.stars,
      },
    },
  };
};
