const normalizeTeamKey = (value) => String(value || '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(university|college|the)\b/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

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

const PATCH_LABELS = Object.freeze({
  ACC: 'ACC',
  'Big 12': 'Big 12',
  'Big Ten': 'Big Ten',
  SEC: 'SEC',
  'American Conference': 'American Conference',
  'Conference USA': 'Conference USA / CUSA',
  MAC: 'MAC',
  'Mountain West': 'Mountain West',
  'Pac-12': 'Pac-12',
  'Sun Belt': 'Sun Belt',
});

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
  'massachusetts': 'UMass',
  'northern illinois': 'NIU',
  'northern illinois university': 'NIU',
  'hawai i': 'Hawaii',
  hawaii: 'Hawaii',
  'app state': 'Appalachian State',
  'louisiana lafayette': 'Louisiana',
  'ul lafayette': 'Louisiana',
  'louisiana monroe': 'UL Monroe',
  'ulm': 'UL Monroe',
  'southern mississippi': 'Southern Miss',
  'southern miss': 'Southern Miss',
});

const LEGACY_CONFERENCE_MARKS = Object.freeze({
  Cincinnati: ['American Athletic Conference', 'AAC', 'American'],
  Houston: ['American Athletic Conference', 'AAC'],
  UCF: ['American Athletic Conference', 'AAC'],
  Arizona: ['Pac-12'],
  'Arizona State': ['Pac-12'],
  Colorado: ['Pac-12'],
  Utah: ['Pac-12'],
  California: ['Pac-12'],
  Stanford: ['Pac-12'],
  SMU: ['American Athletic Conference', 'AAC'],
  Oregon: ['Pac-12'],
  USC: ['Pac-12'],
  UCLA: ['Pac-12'],
  Washington: ['Pac-12'],
  Oklahoma: ['Big 12'],
  Texas: ['Big 12'],
  'Boise State': ['Mountain West'],
  'Colorado State': ['Mountain West'],
  'Fresno State': ['Mountain West'],
  'San Diego State': ['Mountain West'],
  'Utah State': ['Mountain West'],
  'Texas State': ['Sun Belt'],
  UTEP: ['Conference USA', 'CUSA'],
  NIU: ['MAC'],
});

const INDEPENDENTS_2026 = Object.freeze(['Notre Dame', 'UConn']);

const teamConferenceLookup = (() => {
  const lookup = new Map();
  Object.entries(CONFERENCE_TEAMS_2026).forEach(([conference, teams]) => {
    teams.forEach((team) => lookup.set(normalizeTeamKey(team), { team, conference }));
  });
  INDEPENDENTS_2026.forEach((team) => lookup.set(normalizeTeamKey(team), { team, conference: 'Independent' }));
  Object.entries(EXTRA_ALIASES).forEach(([alias, canonical]) => {
    const existing = lookup.get(normalizeTeamKey(canonical));
    if (existing) lookup.set(normalizeTeamKey(alias), existing);
  });
  return lookup;
})();

export const getCollegeFootballTeamIdentity = (teamName) => {
  const key = normalizeTeamKey(teamName);
  if (!key) return null;
  const entry = teamConferenceLookup.get(key);
  if (!entry) return null;
  const conference = entry.conference;
  return {
    team: entry.team,
    conference,
    conferencePatch: conference === 'Independent' ? '' : PATCH_LABELS[conference] || conference,
    legacyConferenceMarks: LEGACY_CONFERENCE_MARKS[entry.team] || [],
    seasonBasis: 2026,
  };
};

export { normalizeTeamKey };
