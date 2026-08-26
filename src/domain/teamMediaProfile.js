import {
  FBS_TEAM_MEDIA_ALIASES_2026,
  FBS_TEAM_MEDIA_PROFILES_2026,
} from './fbsTeamMediaProfiles.js';

const clean = (value, maxLength = 180) => String(value ?? '').trim().slice(0, maxLength);

const normalizeKey = (value) => clean(value, 180)
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const lookupKey = (value) => normalizeKey(value)
  .replace(/^university of\s+/, '')
  .replace(/\suniversity$/, '')
  .trim();

const shortSchoolName = (school = '') => {
  const value = clean(school) || 'College';
  return value
    .replace(/^university of\s+/i, '')
    .replace(/\s+university$/i, '')
    .replace(/\s+college$/i, '')
    .trim() || value;
};

const hashHue = (value = '') => {
  const text = normalizeKey(value) || 'college';
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = ((hash * 31) + text.charCodeAt(index)) >>> 0;
  return hash % 360;
};

const catalogByKey = new Map(Object.entries(FBS_TEAM_MEDIA_PROFILES_2026).map(
  ([school, profile]) => [lookupKey(school), { school, profile }],
));

const aliasByKey = new Map(Object.entries(FBS_TEAM_MEDIA_ALIASES_2026).map(
  ([alias, canonicalSchool]) => [lookupKey(alias), canonicalSchool],
));

const fbsProfileFor = (school = '') => {
  const key = lookupKey(school);
  if (!key) return null;
  const canonicalAlias = aliasByKey.get(key);
  if (canonicalAlias) return catalogByKey.get(lookupKey(canonicalAlias)) || null;
  return catalogByKey.get(key) || null;
};

const programKey = (school = '') => normalizeKey(fbsProfileFor(school)?.school || school);

const CINCINNATI_MEDIA_OVERRIDE = Object.freeze({
  primary: '#e00122',
  secondary: '#050505',
  accent: '#ffffff',
  localOutletName: 'Bearcats Insider',
  regionalOutletName: 'Cincinnati Enquirer',
  nationalOutletName: 'National College Football Desk',
  teamNewsLabel: 'Cincinnati Football',
  teamNewsTagline: 'News, analysis and every week of the Bearcats season.',
  localMotto: 'Cincinnati Tough.',
  podcastName: 'Nippert Notebook',
  podcastSubtitle: 'Cincinnati Football Podcast',
  podcastTagline: 'Local coverage. Bearcat focused. Cincinnati proud.',
  podcastHostsLabel: 'Mark Thompson · Sarah Chen',
});

const catalogProfileFor = (school = '') => {
  const match = fbsProfileFor(school);
  if (!match) return null;
  return {
    school: match.school,
    profile: match.school === 'Cincinnati'
      ? { ...match.profile, ...CINCINNATI_MEDIA_OVERRIDE }
      : match.profile,
  };
};

const readableAccent = (value = '') => {
  const match = /^#([0-9a-f]{6})$/i.exec(clean(value));
  if (!match) return '#ffffff';
  const hex = match[1];
  const [red, green, blue] = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = [red, green, blue].map((channel) => (
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  const luminance = (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
  return luminance > 0.18 ? '#050505' : '#ffffff';
};

const overridesFor = (state = {}, school = '') => {
  const profiles = state?.newsroomMediaSettings?.teamMediaProfiles || {};
  const wanted = programKey(school);
  const entry = Object.entries(profiles).find(([key, value]) => (
    programKey(key) === wanted || programKey(value?.school) === wanted
  ));
  return entry?.[1] || {};
};

const latestMilestoneInstitution = (state = {}, types = []) => {
  const wanted = new Set(types.map(normalizeKey));
  return clean([...(state.careerMilestones || [])]
    .reverse()
    .find((entry) => wanted.has(normalizeKey(entry?.type)) && clean(entry?.institution))
    ?.institution);
};

const isCoachingCareer = (state = {}) => {
  const stages = [state?.careerPhase, state?.careerStage, state?.player?.careerStage].map(normalizeKey);
  return stages.some((stage) => ['oc', 'hc', 'retired'].includes(stage))
    || Boolean(state?.careerTransitions?.coachingUniverseCreated && state?.player?.graduated);
};

export const resolveCurrentProgramSchool = (state = {}) => {
  if (isCoachingCareer(state)) {
    const explicitCoachSchool = clean(
      state?.coach?.school
      || state?.coach?.institution
      || state?.coach?.program
      || state?.coach?.team
      || state?.coach?.college,
    );
    const latestCoachingSchool = latestMilestoneInstitution(state, ['oc-hire', 'hc-hire', 'retirement']);
    return clean(
      explicitCoachSchool
      || latestCoachingSchool
      || state?.player?.graduationSchool
      || state?.player?.college
      || state?.player?.school,
    );
  }

  // A verified transfer milestone is authoritative if an older player profile has
  // not yet been rewritten. This keeps team media identity in sync during transfer
  // transitions without recoloring prior editions.
  const latestTransferSchool = latestMilestoneInstitution(state, ['transfer']);
  return clean(latestTransferSchool || state?.player?.college || state?.player?.school);
};

export const resolveTeamMediaProfile = ({ school = '', outletProfile = null, state = null } = {}) => {
  const requestedSchool = clean(school || outletProfile?.school || (state ? resolveCurrentProgramSchool(state) : '')) || 'College';
  const catalogMatch = catalogProfileFor(requestedSchool);
  const resolvedSchool = catalogMatch?.school || requestedSchool;
  const catalogProfile = catalogMatch?.profile || {};
  const effectiveOutletProfile = !outletProfile?.school || programKey(outletProfile.school) === programKey(resolvedSchool)
    ? outletProfile
    : null;
  const override = state ? overridesFor(state, resolvedSchool) : {};
  const shortName = shortSchoolName(resolvedSchool);
  const hue = hashHue(resolvedSchool);

  const nickname = clean(override.nickname || catalogProfile.nickname) || shortName;
  const city = clean(override.city || catalogProfile.city) || shortName;
  const primary = clean(override.primary || catalogProfile.primary) || `hsl(${hue} 68% 38%)`;
  const secondary = clean(override.secondary || catalogProfile.secondary) || '#08111f';
  const accent = clean(override.accent || catalogProfile.accent) || readableAccent(primary);
  const localOutletName = clean(
    override.localOutletName
    || effectiveOutletProfile?.localOutletName
    || catalogProfile.localOutletName,
  ) || `${nickname} Insider`;
  const regionalOutletName = clean(
    override.regionalOutletName
    || effectiveOutletProfile?.regionalOutletName
    || catalogProfile.regionalOutletName,
  ) || `${city} College Sports`;
  const nationalOutletName = clean(
    override.nationalOutletName
    || effectiveOutletProfile?.nationalOutletName
    || catalogProfile.nationalOutletName,
  ) || 'College Football Central';
  const teamNewsLabel = clean(override.teamNewsLabel || catalogProfile.teamNewsLabel) || `${shortName} Football`;
  const podcastName = clean(override.podcastName || catalogProfile.podcastName) || `${nickname} Notebook`;

  return {
    school: resolvedSchool,
    shortName,
    nickname,
    city,
    primary,
    secondary,
    accent,
    localOutletName,
    regionalOutletName,
    nationalOutletName,
    teamNewsLabel,
    teamNewsTagline: clean(override.teamNewsTagline || catalogProfile.teamNewsTagline)
      || `News, analysis and every week of the ${nickname} season.`,
    localMotto: clean(override.localMotto || catalogProfile.localMotto) || `${nickname} football, covered locally.`,
    podcastName,
    podcastSubtitle: clean(override.podcastSubtitle || catalogProfile.podcastSubtitle) || `${resolvedSchool} Football Podcast`,
    podcastTagline: clean(override.podcastTagline || catalogProfile.podcastTagline)
      || `Local coverage. ${nickname} focused. ${city} connected.`,
    podcastHostsLabel: clean(override.podcastHostsLabel || catalogProfile.podcastHostsLabel) || 'Mark Thompson · Sarah Chen',
    profileSource: catalogMatch ? 'fbs-2026' : 'generated',
  };
};

export const resolveIssueTeamMediaProfile = (issue = {}, state = null) => resolveTeamMediaProfile({
  school: issue?.outletProfile?.school,
  outletProfile: issue?.outletProfile,
  state,
});

export const resolveCareerTeamMediaProfile = (state = {}) => {
  const latestCollegeIssue = [...(state.newsroomIssues || [])].reverse().find((issue) => issue?.outletProfile?.school);
  const currentSchool = resolveCurrentProgramSchool(state) || clean(latestCollegeIssue?.outletProfile?.school);
  const matchingIssue = [...(state.newsroomIssues || [])]
    .reverse()
    .find((issue) => programKey(issue?.outletProfile?.school) === programKey(currentSchool));
  return resolveTeamMediaProfile({
    school: currentSchool,
    outletProfile: matchingIssue?.outletProfile || null,
    state,
  });
};

export const sameProgram = (left = '', right = '') => (
  programKey(left) !== '' && programKey(left) === programKey(right)
);
