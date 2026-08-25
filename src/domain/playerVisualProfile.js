const clean = (value, max = 180) => String(value ?? '').trim().slice(0, max);

export const DEFAULT_PLAYER_VISUAL_PROFILE = Object.freeze({
  throwingHand: '',
  skinTone: '',
  hairDescription: '',
  helmetStyle: '',
  visor: '',
  leftArm: '',
  rightArm: '',
  leftHand: '',
  rightHand: '',
  legAccessories: '',
  cleats: '',
  towel: '',
  additionalDetails: '',
  referenceAssetIds: [],
});

export const normalizeThrowingHand = (value) => {
  const normalized = clean(value, 24).toLowerCase();
  if (normalized.startsWith('l')) return 'left';
  if (normalized.startsWith('r')) return 'right';
  return '';
};

export const normalizePlayerVisualProfile = (profile = {}) => ({
  throwingHand: normalizeThrowingHand(profile.throwingHand),
  skinTone: clean(profile.skinTone, 120),
  hairDescription: clean(profile.hairDescription, 180),
  helmetStyle: clean(profile.helmetStyle, 180),
  visor: clean(profile.visor, 120),
  leftArm: clean(profile.leftArm, 180),
  rightArm: clean(profile.rightArm, 180),
  leftHand: clean(profile.leftHand, 180),
  rightHand: clean(profile.rightHand, 180),
  legAccessories: clean(profile.legAccessories, 220),
  cleats: clean(profile.cleats, 160),
  towel: clean(profile.towel, 120),
  additionalDetails: clean(profile.additionalDetails, 320),
  referenceAssetIds: [...new Set((Array.isArray(profile.referenceAssetIds) ? profile.referenceAssetIds : [])
    .map((entry) => clean(entry, 120))
    .filter(Boolean))].slice(0, 16),
});

export const applyPlayerVisualProfile = (state = {}, profile = {}) => ({
  ...state,
  player: {
    ...(state.player || {}),
    visualProfile: normalizePlayerVisualProfile(profile),
  },
});

export const removeVisualProfileReference = (state = {}, assetId) => {
  const safeId = clean(assetId, 120);
  if (!safeId) return state;
  const current = normalizePlayerVisualProfile(state.player?.visualProfile || {});
  if (!current.referenceAssetIds.includes(safeId)) return state;
  return applyPlayerVisualProfile(state, {
    ...current,
    referenceAssetIds: current.referenceAssetIds.filter((id) => id !== safeId),
  });
};
