import { directNewsroomImage } from './newsroomImageDirector.js';
import {
  getNewsroomIssueFolder,
  getNewsroomMediaFolder,
} from './newsroomMediaFolders.js';
import { resolveNewsroomTeamIdentity } from './newsroomConferenceContext.js';
import { normalizePlayerVisualProfile } from './playerVisualProfile.js';
import {
  getNewsroomReferenceRole,
  NEWSROOM_REFERENCE_ROLES,
  newsroomReferenceRoleInstruction,
  newsroomReferenceRoleLabel,
} from './newsroomReferenceRoles.js';

const clean = (value, max = 240) => String(value ?? '').trim().slice(0, max);

const ROLE_PRIORITY = Object.freeze({
  player: Object.freeze([
    NEWSROOM_REFERENCE_ROLES.IDENTITY,
    NEWSROOM_REFERENCE_ROLES.FULL_BODY,
    NEWSROOM_REFERENCE_ROLES.UNIFORM,
    NEWSROOM_REFERENCE_ROLES.HELMET,
    NEWSROOM_REFERENCE_ROLES.EQUIPMENT,
    NEWSROOM_REFERENCE_ROLES.TEAM_STYLE,
    NEWSROOM_REFERENCE_ROLES.GENERAL,
  ]),
  team: Object.freeze([
    NEWSROOM_REFERENCE_ROLES.TEAM_STYLE,
    NEWSROOM_REFERENCE_ROLES.UNIFORM,
    NEWSROOM_REFERENCE_ROLES.HELMET,
    NEWSROOM_REFERENCE_ROLES.EQUIPMENT,
    NEWSROOM_REFERENCE_ROLES.GENERAL,
  ]),
  coach: Object.freeze([
    NEWSROOM_REFERENCE_ROLES.TEAM_STYLE,
    NEWSROOM_REFERENCE_ROLES.GENERAL,
    NEWSROOM_REFERENCE_ROLES.UNIFORM,
    NEWSROOM_REFERENCE_ROLES.EQUIPMENT,
  ]),
});

const PLAYER_VISUAL_FIELDS = Object.freeze([
  ['throwingHand', 'Throwing hand'],
  ['skinTone', 'Skin tone'],
  ['hairDescription', 'Hair'],
  ['helmetStyle', 'Helmet'],
  ['visor', 'Visor'],
  ['leftArm', 'Left arm'],
  ['rightArm', 'Right arm'],
  ['leftHand', 'Left hand'],
  ['rightHand', 'Right hand'],
  ['legAccessories', 'Leg accessories'],
  ['cleats', 'Cleats'],
  ['towel', 'Towel'],
  ['additionalDetails', 'Additional durable appearance details'],
]);

const rolePriorityFor = (subject) => ROLE_PRIORITY[subject] || ROLE_PRIORITY.team;

export const buildVisualProfileDirectives = (profile = {}, subject = 'player') => {
  if (subject !== 'player') return [];
  const normalized = normalizePlayerVisualProfile(profile);
  return PLAYER_VISUAL_FIELDS
    .map(([key, label]) => normalized[key] ? `${label}: ${normalized[key]}` : '')
    .filter(Boolean);
};

const eligibleReferenceAssets = ({ state = {}, issue = {}, subject = 'player' }) => {
  const targetFolder = getNewsroomIssueFolder(issue);
  const allowedRoles = new Set(rolePriorityFor(subject));
  return (state.newsroomMediaLibrary || []).filter((asset) => (
    asset?.isReference
    && asset?.id
    && asset?.downloadUrl
    && getNewsroomMediaFolder(asset) === targetFolder
    && allowedRoles.has(getNewsroomReferenceRole(asset))
  ));
};

export const selectNewsroomImageReferences = ({ state = {}, issue = {}, subject = 'player', limit = 4 } = {}) => {
  const profile = normalizePlayerVisualProfile(state.player?.visualProfile || {});
  const linkedIds = new Set(profile.referenceAssetIds);
  const priorities = rolePriorityFor(subject);
  const candidates = eligibleReferenceAssets({ state, issue, subject })
    .map((asset, index) => ({
      asset,
      index,
      role: getNewsroomReferenceRole(asset),
      linked: linkedIds.has(String(asset.id)),
    }))
    .sort((a, b) => {
      if (a.linked !== b.linked) return a.linked ? -1 : 1;
      const roleDiff = priorities.indexOf(a.role) - priorities.indexOf(b.role);
      return roleDiff || a.index - b.index;
    });

  const selected = [];
  const selectedIds = new Set();
  for (const role of priorities) {
    const match = candidates.find((entry) => entry.role === role && !selectedIds.has(entry.asset.id));
    if (!match) continue;
    selected.push(match);
    selectedIds.add(match.asset.id);
    if (selected.length >= Math.max(1, Number(limit) || 4)) break;
  }

  if (selected.length < Math.max(1, Number(limit) || 4)) {
    candidates.forEach((entry) => {
      if (selected.length >= Math.max(1, Number(limit) || 4) || selectedIds.has(entry.asset.id)) return;
      selected.push(entry);
      selectedIds.add(entry.asset.id);
    });
  }

  return selected.map(({ asset, role }) => ({
    assetId: clean(asset.id, 120),
    imageUrl: clean(asset.downloadUrl, 2400),
    label: clean(asset.referenceLabel || asset.fileName || newsroomReferenceRoleLabel(role), 120),
    role,
    roleLabel: newsroomReferenceRoleLabel(role),
    instruction: newsroomReferenceRoleInstruction(role),
  }));
};

export const buildNewsroomImageGenerationContext = ({
  state = {},
  issue = {},
  article = {},
  verifiedFacts = [],
  sceneOverride,
} = {}) => {
  const effectiveSceneOverride = sceneOverride || article.imageSceneOverride || 'auto';
  const director = directNewsroomImage({ state, issue, article, verifiedFacts, sceneOverride: effectiveSceneOverride });
  const visualProfile = normalizePlayerVisualProfile(state.player?.visualProfile || {});
  const visualProfileDirectives = buildVisualProfileDirectives(visualProfile, director.subject);
  const references = selectNewsroomImageReferences({ state, issue, subject: director.subject, limit: 4 });
  const team = clean(state.player?.college || state.player?.school, 120);
  const opponent = clean(director.verifiedDetails?.opponent, 120);
  const dynastySeason = Math.max(1, Number(issue.season || state.currentSeason) || 1);
  const teamIdentity = team
    ? resolveNewsroomTeamIdentity({ state, teamName: team, dynastySeason })
    : null;
  const opponentIdentity = opponent && opponent.toLowerCase() !== team.toLowerCase()
    ? resolveNewsroomTeamIdentity({ state, teamName: opponent, dynastySeason })
    : null;

  return {
    director,
    visualProfile: director.subject === 'player' ? visualProfile : {},
    visualProfileDirectives,
    references,
    conferenceContext: {
      dynastySeason,
      teamIdentity,
      opponentIdentity,
    },
    playerContext: {
      position: director.subject === 'player' ? clean(state.player?.pos || article.position, 40) : '',
      jerseyNumber: director.subject === 'player' ? clean(state.player?.number, 12) : '',
      team,
    },
  };
};
