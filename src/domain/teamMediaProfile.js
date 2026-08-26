const clean = (value, maxLength = 180) => String(value ?? '').trim().slice(0, maxLength);

const normalizeKey = (value) => clean(value, 180)
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, ' ')
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

const SPECIAL_PROFILES = Object.freeze({
  cincinnati: Object.freeze({
    nickname: 'Bearcats',
    city: 'Cincinnati',
    primary: '#e00122',
    secondary: '#050505',
    accent: '#ffffff',
    localOutletName: 'Bearcats Insider',
    teamNewsLabel: 'Cincinnati Football',
    teamNewsTagline: 'News, analysis and every week of the Bearcats season.',
    localMotto: 'Cincinnati Tough.',
    podcastName: 'Nippert Notebook',
    podcastSubtitle: 'Cincinnati Football Podcast',
    podcastTagline: 'Local coverage. Bearcat focused. Cincinnati proud.',
    podcastHostsLabel: 'Mark Thompson · Sarah Chen',
  }),
  michigan: Object.freeze({ nickname: 'Wolverines', city: 'Ann Arbor', primary: '#00274c', secondary: '#ffcb05', accent: '#ffffff' }),
  'michigan state': Object.freeze({ nickname: 'Spartans', city: 'East Lansing', primary: '#18453b', secondary: '#ffffff', accent: '#ffffff' }),
  'eastern michigan': Object.freeze({ nickname: 'Eagles', city: 'Ypsilanti', primary: '#006633', secondary: '#ffffff', accent: '#ffffff' }),
  toledo: Object.freeze({ nickname: 'Rockets', city: 'Toledo', primary: '#15397f', secondary: '#ffcc00', accent: '#ffffff' }),
  'ohio state': Object.freeze({ nickname: 'Buckeyes', city: 'Columbus', primary: '#bb0000', secondary: '#666666', accent: '#ffffff' }),
  'notre dame': Object.freeze({ nickname: 'Fighting Irish', city: 'Notre Dame', primary: '#0c2340', secondary: '#c99700', accent: '#ffffff' }),
  'penn state': Object.freeze({ nickname: 'Nittany Lions', city: 'State College', primary: '#041e42', secondary: '#ffffff', accent: '#ffffff' }),
  alabama: Object.freeze({ nickname: 'Crimson Tide', city: 'Tuscaloosa', primary: '#9e1b32', secondary: '#ffffff', accent: '#ffffff' }),
  georgia: Object.freeze({ nickname: 'Bulldogs', city: 'Athens', primary: '#ba0c2f', secondary: '#000000', accent: '#ffffff' }),
  texas: Object.freeze({ nickname: 'Longhorns', city: 'Austin', primary: '#bf5700', secondary: '#ffffff', accent: '#ffffff' }),
  oregon: Object.freeze({ nickname: 'Ducks', city: 'Eugene', primary: '#154733', secondary: '#fee123', accent: '#ffffff' }),
  lsu: Object.freeze({ nickname: 'Tigers', city: 'Baton Rouge', primary: '#461d7c', secondary: '#fdd023', accent: '#ffffff' }),
  clemson: Object.freeze({ nickname: 'Tigers', city: 'Clemson', primary: '#f56600', secondary: '#522d80', accent: '#ffffff' }),
  tennessee: Object.freeze({ nickname: 'Volunteers', city: 'Knoxville', primary: '#ff8200', secondary: '#ffffff', accent: '#ffffff' }),
});

const specialProfileFor = (school = '') => {
  const key = normalizeKey(school)
    .replace(/^university of\s+/, '')
    .replace(/\suniversity$/, '');
  return SPECIAL_PROFILES[key] || null;
};

const overridesFor = (state = {}, school = '') => {
  const profiles = state?.newsroomMediaSettings?.teamMediaProfiles || {};
  const wanted = normalizeKey(school);
  const entry = Object.entries(profiles).find(([key, value]) => (
    normalizeKey(key) === wanted || normalizeKey(value?.school) === wanted
  ));
  return entry?.[1] || {};
};

export const resolveTeamMediaProfile = ({ school = '', outletProfile = null, state = null } = {}) => {
  const resolvedSchool = clean(school || outletProfile?.school || state?.player?.college || state?.coach?.school || state?.player?.school) || 'College';
  const special = specialProfileFor(resolvedSchool) || {};
  const override = state ? overridesFor(state, resolvedSchool) : {};
  const shortName = shortSchoolName(resolvedSchool);
  const hue = hashHue(resolvedSchool);
  const localOutletName = clean(override.localOutletName || outletProfile?.localOutletName || special.localOutletName) || `${shortName} Football`;
  const regionalOutletName = clean(override.regionalOutletName || outletProfile?.regionalOutletName) || `${shortName} Regional Sports`;
  const nationalOutletName = clean(override.nationalOutletName || outletProfile?.nationalOutletName) || 'College Football Central';
  const nickname = clean(override.nickname || special.nickname) || shortName;
  const city = clean(override.city || special.city) || shortName;
  const primary = clean(override.primary || special.primary) || `hsl(${hue} 68% 38%)`;
  const secondary = clean(override.secondary || special.secondary) || '#08111f';
  const accent = clean(override.accent || special.accent) || '#ffffff';
  const teamNewsLabel = clean(override.teamNewsLabel || special.teamNewsLabel) || `${shortName} Football`;
  const podcastName = clean(override.podcastName || special.podcastName) || `${shortName} Football Notebook`;

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
    teamNewsTagline: clean(override.teamNewsTagline || special.teamNewsTagline) || `The local home for ${resolvedSchool} football coverage, week after week.`,
    localMotto: clean(override.localMotto || special.localMotto) || `${nickname} football, covered locally.`,
    podcastName,
    podcastSubtitle: clean(override.podcastSubtitle || special.podcastSubtitle) || `${resolvedSchool} Football Podcast`,
    podcastTagline: clean(override.podcastTagline || special.podcastTagline) || `Local coverage of ${resolvedSchool} football.`,
    podcastHostsLabel: clean(override.podcastHostsLabel || special.podcastHostsLabel) || 'Mark Thompson · Sarah Chen',
  };
};

export const resolveIssueTeamMediaProfile = (issue = {}, state = null) => resolveTeamMediaProfile({
  school: issue?.outletProfile?.school,
  outletProfile: issue?.outletProfile,
  state,
});

export const resolveCareerTeamMediaProfile = (state = {}) => {
  const latestCollegeIssue = [...(state.newsroomIssues || [])].reverse().find((issue) => issue?.outletProfile?.school);
  const currentSchool = clean(state?.player?.college || state?.coach?.school || state?.player?.school || latestCollegeIssue?.outletProfile?.school);
  const matchingIssue = [...(state.newsroomIssues || [])].reverse().find((issue) => normalizeKey(issue?.outletProfile?.school) === normalizeKey(currentSchool));
  return resolveTeamMediaProfile({ school: currentSchool, outletProfile: matchingIssue?.outletProfile || latestCollegeIssue?.outletProfile, state });
};

export const sameProgram = (left = '', right = '') => normalizeKey(left) === normalizeKey(right);
