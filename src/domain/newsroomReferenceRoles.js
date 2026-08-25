const clean = (value, max = 120) => String(value ?? '').trim().slice(0, max);

export const NEWSROOM_REFERENCE_ROLES = Object.freeze({
  GENERAL: 'general',
  IDENTITY: 'identity',
  FULL_BODY: 'full-body',
  UNIFORM: 'uniform',
  HELMET: 'helmet',
  EQUIPMENT: 'equipment',
  TEAM_STYLE: 'team-style',
});

export const NEWSROOM_REFERENCE_ROLE_OPTIONS = Object.freeze([
  { value: NEWSROOM_REFERENCE_ROLES.GENERAL, label: 'General reference', hint: 'Legacy or mixed-purpose visual reference.' },
  { value: NEWSROOM_REFERENCE_ROLES.IDENTITY, label: 'Face / identity', hint: 'Preserve the player’s recognizable facial identity and appearance.' },
  { value: NEWSROOM_REFERENCE_ROLES.FULL_BODY, label: 'Full body', hint: 'Preserve body build, proportions, and overall player appearance.' },
  { value: NEWSROOM_REFERENCE_ROLES.UNIFORM, label: 'Uniform', hint: 'Preserve jersey, pants, colors, numbering style, and uniform details.' },
  { value: NEWSROOM_REFERENCE_ROLES.HELMET, label: 'Helmet', hint: 'Preserve helmet shell, facemask, decals, stripe treatment, and visor details.' },
  { value: NEWSROOM_REFERENCE_ROLES.EQUIPMENT, label: 'Equipment', hint: 'Preserve gloves, sleeves, wrist gear, towel, cleats, pads, and accessories.' },
  { value: NEWSROOM_REFERENCE_ROLES.TEAM_STYLE, label: 'Team style', hint: 'Preserve team visual language without copying the original pose or background.' },
]);

const VALID_ROLES = new Set(Object.values(NEWSROOM_REFERENCE_ROLES));

export const normalizeNewsroomReferenceRole = (value) => {
  const normalized = clean(value, 40).toLowerCase();
  return VALID_ROLES.has(normalized) ? normalized : NEWSROOM_REFERENCE_ROLES.GENERAL;
};

export const getNewsroomReferenceRole = (asset = {}) => normalizeNewsroomReferenceRole(asset.referenceRole);

export const newsroomReferenceRoleLabel = (value) => (
  NEWSROOM_REFERENCE_ROLE_OPTIONS.find((option) => option.value === normalizeNewsroomReferenceRole(value))?.label
  || 'General reference'
);

export const newsroomReferenceRoleInstruction = (value) => {
  const role = normalizeNewsroomReferenceRole(value);
  return ({
    [NEWSROOM_REFERENCE_ROLES.IDENTITY]: 'Use this reference to preserve facial identity and recognizable player appearance only; do not copy its pose, camera angle, or background.',
    [NEWSROOM_REFERENCE_ROLES.FULL_BODY]: 'Use this reference to preserve body build, proportions, and overall appearance only; create a new pose and scene.',
    [NEWSROOM_REFERENCE_ROLES.UNIFORM]: 'Use this reference to preserve uniform colors, jersey/pants styling, numbering treatment, and visible uniform details; do not copy the original pose or background.',
    [NEWSROOM_REFERENCE_ROLES.HELMET]: 'Use this reference to preserve helmet shell, facemask, decals, stripe treatment, visor, and related helmet details; do not copy the original pose or scene.',
    [NEWSROOM_REFERENCE_ROLES.EQUIPMENT]: 'Use this reference to preserve visible football equipment and accessories such as gloves, sleeves, wrist gear, towel, cleats, and pads; do not copy the original pose.',
    [NEWSROOM_REFERENCE_ROLES.TEAM_STYLE]: 'Use this reference to preserve the team’s visual language, equipment styling, and color treatment without copying the original player pose or background.',
  }[role] || 'Use this as a general visual reference only; preserve relevant appearance details without copying the original pose or background.');
};

export const setNewsroomReferenceRole = (library = [], assetId, role) => {
  const safeId = clean(assetId, 120);
  const normalizedRole = normalizeNewsroomReferenceRole(role);
  return library.map((asset) => (
    asset?.id !== safeId || !asset?.isReference
      ? asset
      : { ...asset, referenceRole: normalizedRole }
  ));
};
