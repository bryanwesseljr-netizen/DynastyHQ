const normalizeTeamKey = (value) => String(value || '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(university|college|the)\b/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const COLLEGE_FOOTBALL_CONFERENCES = Object.freeze([
  'ACC',
  'Big 12',
  'Big Ten',
  'SEC',
  'American Conference',
  'Conference USA',
  'MAC',
  'Mountain West',
  'Pac-12',
  'Sun Belt',
  'Independent',
]);

const CONFERENCE_ALIASES = Object.freeze({
  acc: 'ACC',
  'atlantic coast conference': 'ACC',
  'big 12': 'Big 12',
  big12: 'Big 12',
  b12: 'Big 12',
  'big ten': 'Big Ten',
  big10: 'Big Ten',
  b1g: 'Big Ten',
  sec: 'SEC',
  'southeastern conference': 'SEC',
  american: 'American Conference',
  'american conference': 'American Conference',
  'american athletic conference': 'American Conference',
  aac: 'American Conference',
  'conference usa': 'Conference USA',
  cusa: 'Conference USA',
  'c usa': 'Conference USA',
  mac: 'MAC',
  'mid american conference': 'MAC',
  'mountain west': 'Mountain West',
  'mountain west conference': 'Mountain West',
  mw: 'Mountain West',
  'pac 12': 'Pac-12',
  pac12: 'Pac-12',
  'pac-12': 'Pac-12',
  'sun belt': 'Sun Belt',
  'sun belt conference': 'Sun Belt',
  sbc: 'Sun Belt',
  independent: 'Independent',
  'fbs independent': 'Independent',
});

export const normalizeCollegeFootballConference = (value) => {
  const key = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!key) return '';
  return CONFERENCE_ALIASES[key] || '';
};

// Canonical real-world FBS football alignment for the 2026 season.
// This remains the fallback when a DynastyHQ save has no custom realignment override.
const CONFERENCE_TEAMS_2026 = Object.freeze({
  ACC: [
    'Boston College', 'California', 'Clemson', 'Duke', 'Florida State', 'Georgia Tech',
    'Louisville', 'Miami', 'NC State', 'North Carolina', 'Pittsburgh', 'SMU', 'Stanford',
    'Syracuse', 'Virginia', 'Virginia Tech', 'Wake Forest',
  ],
  'Big 12': [
    'Arizona', 'Arizona State', 'Baylor', 'BYU', 'Cincinnati', 'Colorado', 'Houston',
    'Iowa State', 'Kansas', 'Kansas State', 'Oklahoma State', 'TCU', 'Texas Tech',
    'UCF', 'Utah', 'West Virginia',
  ],
  'Big Ten': [
    'Illinois', 'Indiana', 'Iowa', 'Maryland', 'Michigan', 'Michigan State', 'Minnesota',
    'Nebraska', 'Northwestern', 'Ohio State', 'Oregon', 'Penn State', 'Purdue', 'Rutgers',
    'UCLA', 'USC', 'Washington', 'Wisconsin',
  ],
  SEC: [
    'Alabama', 'Arkansas', 'Auburn', 'Florida', 'Georgia', 'Kentucky', 'LSU',
    'Mississippi State', 'Missouri', 'Oklahoma', 'Ole Miss', 'South Carolina', 'Tennessee',
    'Texas', 'Texas A&M', 'Vanderbilt',
  ],
  'American Conference': [
    'Army', 'Charlotte', 'East Carolina', 'Florida Atlantic', 'Memphis', 'Navy',
    'North Texas', 'Rice', 'South Florida', 'Temple', 'Tulane', 'Tulsa', 'UAB', 'UTSA',
  ],
  'Conference USA': [
    'Delaware', 'FIU', 'Jacksonville State', 'Kennesaw State', 'Liberty', 'Louisiana Tech',
    'Middle Tennessee', 'Missouri State', 'New Mexico State', 'Sam Houston', 'Western Kentucky',
  ],
  MAC: [
    'Akron', 'Ball State', 'Bowling Green', 'Buffalo', 'Central Michigan', 'Eastern Michigan',
    'Kent State', 'Miami (OH)', 'Ohio', 'Sacramento State', 'Toledo', 'UMass', 'Western Michigan',
  ],
  'Mountain West': [
    'Air Force', 'Hawaii', 'Nevada', 'New Mexico', 'NIU', 'North Dakota State',
    'San Jose State', 'UNLV', 'UTEP', 'Wyoming',
  ],
  'Pac-12': [
    'Boise State', 'Colorado State', 'Fresno State', 'Oregon State', 'San Diego State',
    'Texas State', 'Utah State', 'Washington State',
  ],
  'Sun Belt': [
    'Appalachian State', 'Arkansas State', 'Coastal Carolina', 'Georgia Southern',
    'Georgia State', 'James Madison', 'Louisiana', 'UL Monroe', 'Marshall', 'Old Dominion',
    'South Alabama', 'Southern Miss', 'Troy',
  ],
});

const CONFERENCE_PATCH_METADATA = Object.freeze({
  ACC: Object.freeze({
    conferencePatchLabel: 'ACC conference patch',
    conferencePatchVisual: 'the official ACC wordmark/logo used as the football conference mark',
  }),
  'Big 12': Object.freeze({
    conferencePatchLabel: 'Big 12 Conference patch',
    conferencePatchVisual: 'the official Big 12 Conference stylized "XII" logo/mark',
  }),
  'Big Ten': Object.freeze({
    conferencePatchLabel: 'Big Ten Conference patch',
    conferencePatchVisual: 'the official Big Ten "B1G" wordmark/logo',
  }),
  SEC: Object.freeze({
    conferencePatchLabel: 'SEC conference patch',
    conferencePatchVisual: 'the official SEC circular "SEC" conference mark/logo',
  }),
  'American Conference': Object.freeze({
    conferencePatchLabel: 'American Conference patch',
    conferencePatchVisual: 'the current official American Conference football conference mark/logo',
  }),
  'Conference USA': Object.freeze({
    conferencePatchLabel: 'Conference USA / CUSA patch',
    conferencePatchVisual: 'the current official Conference USA / CUSA wordmark/logo',
  }),
  MAC: Object.freeze({
    conferencePatchLabel: 'MAC conference patch',
    conferencePatchVisual: 'the current official Mid-American Conference / MAC wordmark/logo',
  }),
  'Mountain West': Object.freeze({
    conferencePatchLabel: 'Mountain West conference patch',
    conferencePatchVisual: 'the official Mountain West "MW" mountain-style conference mark/logo',
  }),
  'Pac-12': Object.freeze({
    conferencePatchLabel: 'Pac-12 Conference patch',
    conferencePatchVisual: 'the official Pac-12 shield-style conference mark/logo',
  }),
  'Sun Belt': Object.freeze({
    conferencePatchLabel: 'Sun Belt Conference patch',
    conferencePatchVisual: 'the current official Sun Belt Conference mark/logo',
  }),
});

export const getConferencePatchMetadata = (conferenceName) => {
  const conference = normalizeCollegeFootballConference(conferenceName);
  if (!conference || conference === 'Independent') return null;
  return CONFERENCE_PATCH_METADATA[conference] || null;
};

const EXTRA_ALIASES = Object.freeze({
  cal: 'California',
  'miami fl': 'Miami',
  'miami florida': 'Miami',
  'miami hurricanes': 'Miami',
  'miami ohio': 'Miami (OH)',
  'miami oh': 'Miami (OH)',
  'nc state': 'NC State',
  'north carolina state': 'NC State',
  pitt: 'Pittsburgh',
  'southern california': 'USC',
  'southern california usc': 'USC',
  'texas a and m': 'Texas A&M',
  'texas am': 'Texas A&M',
  'central florida': 'UCF',
  'brigham young': 'BYU',
  'south florida usf': 'South Florida',
  usf: 'South Florida',
  'florida international': 'FIU',
  'middle tennessee state': 'Middle Tennessee',
  mtsu: 'Middle Tennessee',
  'sam houston state': 'Sam Houston',
  massachusetts: 'UMass',
  'northern illinois': 'NIU',
  'northern illinois university': 'NIU',
  'hawai i': 'Hawaii',
  hawaii: 'Hawaii',
  'app state': 'Appalachian State',
  'louisiana lafayette': 'Louisiana',
  'ul lafayette': 'Louisiana',
  'louisiana monroe': 'UL Monroe',
  ulm: 'UL Monroe',
  'southern mississippi': 'Southern Miss',
  'southern miss': 'Southern Miss',
});

const FORBIDDEN_LEGACY_PATCHES = Object.freeze({
  Cincinnati: [
    'American Athletic Conference patch',
    'AAC patch',
    'American/AAC star-A conference logo',
  ],
  Houston: ['American Athletic Conference patch', 'AAC patch'],
  UCF: ['American Athletic Conference patch', 'AAC patch'],
  Arizona: ['Pac-12 patch'],
  'Arizona State': ['Pac-12 patch'],
  Colorado: ['Pac-12 patch'],
  Utah: ['Pac-12 patch'],
  California: ['Pac-12 patch'],
  Stanford: ['Pac-12 patch'],
  SMU: ['American Athletic Conference patch', 'AAC patch'],
  Oregon: ['Pac-12 patch'],
  USC: ['Pac-12 patch'],
  UCLA: ['Pac-12 patch'],
  Washington: ['Pac-12 patch'],
  Oklahoma: ['Big 12 patch'],
  Texas: ['Big 12 patch'],
  'Boise State': ['Mountain West patch'],
  'Colorado State': ['Mountain West patch'],
  'Fresno State': ['Mountain West patch'],
  'San Diego State': ['Mountain West patch'],
  'Utah State': ['Mountain West patch'],
  'Texas State': ['Sun Belt patch'],
  UTEP: ['Conference USA patch', 'CUSA patch'],
  NIU: ['MAC patch'],
});

const INDEPENDENTS_2026 = Object.freeze(['Notre Dame', 'UConn']);

const teamConferenceLookup = (() => {
  const lookup = new Map();
  Object.entries(CONFERENCE_TEAMS_2026).forEach(([primaryConference, teams]) => {
    teams.forEach((team) => lookup.set(normalizeTeamKey(team), { team, primaryConference }));
  });
  INDEPENDENTS_2026.forEach((team) => lookup.set(normalizeTeamKey(team), { team, primaryConference: 'Independent' }));
  Object.entries(EXTRA_ALIASES).forEach(([alias, canonical]) => {
    const existing = lookup.get(normalizeTeamKey(canonical));
    if (existing) lookup.set(normalizeTeamKey(alias), existing);
  });
  return lookup;
})();

export const getCollegeFootballTeamIdentity = (teamName, {
  conferenceOverride = '',
  dynastySeason = null,
} = {}) => {
  const key = normalizeTeamKey(teamName);
  if (!key) return null;
  const entry = teamConferenceLookup.get(key);
  const canonicalTeam = entry?.team || String(teamName || '').trim();
  if (!canonicalTeam) return null;

  const realWorldConference = entry?.primaryConference || '';
  const overrideConference = normalizeCollegeFootballConference(conferenceOverride);
  const primaryConference = overrideConference || realWorldConference;
  if (!primaryConference) return null;

  const patchMeta = getConferencePatchMetadata(primaryConference);
  const forbiddenLegacyPatches = [...(FORBIDDEN_LEGACY_PATCHES[canonicalTeam] || [])];
  if (overrideConference && realWorldConference && overrideConference !== realWorldConference) {
    const fallbackPatch = getConferencePatchMetadata(realWorldConference);
    if (fallbackPatch?.conferencePatchLabel) forbiddenLegacyPatches.push(fallbackPatch.conferencePatchLabel);
    forbiddenLegacyPatches.push(`${realWorldConference} conference branding`);
  }

  return {
    team: canonicalTeam,
    primaryConference,
    conferencePatchLabel: patchMeta?.conferencePatchLabel || '',
    conferencePatchVisual: patchMeta?.conferencePatchVisual || '',
    forbiddenLegacyPatches: [...new Set(forbiddenLegacyPatches)],
    seasonBasis: overrideConference ? Math.max(1, Number(dynastySeason) || 1) : 2026,
    identitySource: overrideConference ? 'save-override' : 'real-world-2026',
    realWorldConference,
    conference: primaryConference,
    conferencePatch: patchMeta?.conferencePatchLabel || '',
    legacyConferenceMarks: [...new Set(forbiddenLegacyPatches)],
  };
};

export { normalizeTeamKey };
