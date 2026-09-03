const clean = (value, max = 300) => String(value ?? '').trim().slice(0, max);

const publicationMatches = (entry = {}, issue = {}) => {
  const publicationId = issue.publicationId || issue.id || '';
  if (publicationId && (entry.publicationId === publicationId || entry.id === publicationId || entry.weekKey === publicationId)) return true;
  return Number(entry.season || 1) === Number(issue.season || 1)
    && Number(entry.week ?? 0) === Number(issue.week ?? 0);
};

const suffixPattern = /^(?:jr\.?|sr\.?|ii|iii|iv|v)$/i;
const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const surnameFromFullName = (value) => {
  const parts = clean(value, 120).split(/\s+/).filter(Boolean);
  while (parts.length > 1 && suffixPattern.test(parts[parts.length - 1])) parts.pop();
  return parts[parts.length - 1] || '';
};

const positionNoun = (position) => ({
  QB: 'quarterback',
  RB: 'running back',
  HB: 'running back',
  FB: 'fullback',
  WR: 'wide receiver',
  TE: 'tight end',
  LT: 'left tackle',
  RT: 'right tackle',
  LG: 'left guard',
  RG: 'right guard',
  C: 'center',
  DE: 'defensive end',
  DT: 'defensive tackle',
  LB: 'linebacker',
  MLB: 'linebacker',
  OLB: 'outside linebacker',
  CB: 'cornerback',
  FS: 'free safety',
  SS: 'strong safety',
  S: 'safety',
  K: 'kicker',
  P: 'punter',
}[clean(position, 20).toUpperCase()] || 'player');

const roleNumber = (value) => {
  const raw = clean(value, 60).toUpperCase();
  const qb = raw.match(/\bQB\s*([1-9])\b/);
  if (qb) return Number(qb[1]);
  const string = raw.match(/\b([1-9])(?:ST|ND|RD|TH)?[-\s]?STRING\b/);
  return string ? Number(string[1]) : null;
};

const ordinal = (value) => {
  const number = Number(value);
  const mod100 = number % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
  if (number % 10 === 1) return `${number}st`;
  if (number % 10 === 2) return `${number}nd`;
  if (number % 10 === 3) return `${number}rd`;
  return `${number}th`;
};

export const naturalRoleDescription = (role, position = 'QB') => {
  const number = roleNumber(role);
  const noun = positionNoun(position);
  if (!number) return '';
  if (noun === 'quarterback') {
    if (number === 1) return 'starting quarterback';
    if (number === 2) return 'second-string quarterback';
    if (number === 3) return 'third-string quarterback';
    return `${ordinal(number)}-string quarterback`;
  }
  if (number === 1) return `starting ${noun}`;
  return `${ordinal(number)}-string ${noun}`;
};

const parseHeight = (value) => {
  const raw = clean(value, 40).toLowerCase().replace(/[“”]/g, '"').replace(/[’]/g, "'");
  let match = raw.match(/^(\d)\s*(?:'|ft\.?|feet|foot)\s*(\d{1,2})\s*(?:"|in\.?|inches?)?$/i);
  if (!match) match = raw.match(/^(\d)\s*[-–]\s*(\d{1,2})$/);
  if (!match) return null;
  const feet = Number(match[1]);
  const inches = Number(match[2]);
  if (feet < 4 || feet > 7 || inches < 0 || inches > 11) return null;
  return { feet, inches };
};

export const naturalHeightDescription = (height, position = 'QB') => {
  const parsed = parseHeight(height);
  if (!parsed) return '';
  return `${parsed.feet}-foot-${parsed.inches} ${positionNoun(position)}`;
};

const exactUpdateFor = (state = {}, issue = {}) => (state.weeklyUpdates || []).find((entry) => publicationMatches(entry, issue)) || null;

const exactRoleFactFor = (state = {}, issue = {}) => (state.factLedger || []).find((fact) => (
  fact?.verified && fact.key === 'rtg.rank' && publicationMatches(fact, issue)
)) || null;

const previousRoleFor = (state = {}, issue = {}) => [...(state.weeklyUpdates || [])]
  .filter((entry) => Number(entry.season || 1) === Number(issue.season || 1))
  .filter((entry) => Number(entry.week ?? 0) < Number(issue.week ?? 0))
  .filter((entry) => clean(entry?.rtgSnapshot?.rank, 60))
  .sort((left, right) => Number(right.week ?? 0) - Number(left.week ?? 0))[0]?.rtgSnapshot?.rank || '';

const isCurrentIssue = (state = {}, issue = {}) => (
  Number(issue.season || 1) === Number(state.currentSeason || 1)
  && Number(issue.week ?? 0) === Number(state.currentWeek ?? 0)
);

export const buildVerifiedPlayerMediaReference = (state = {}, issue = {}) => {
  const player = state.player || {};
  const fullName = clean(player.name, 120);
  const surname = surnameFromFullName(fullName);
  const position = clean(player.pos, 20).toUpperCase();
  const noun = positionNoun(position);
  const archetype = clean(player.archetype, 80);
  const height = clean(player.height, 40);
  const exactUpdate = exactUpdateFor(state, issue);
  const exactRoleFact = exactRoleFactFor(state, issue);

  let role = clean(exactUpdate?.rtgSnapshot?.rank, 60);
  let roleSource = role ? 'weekly-snapshot' : '';
  if (!role && exactRoleFact) {
    role = clean(exactRoleFact.value, 60);
    roleSource = role ? 'fact-ledger' : '';
  }
  if (!role && isCurrentIssue(state, issue)) {
    role = clean(state.rtg?.rank, 60);
    roleSource = role ? 'current-state' : '';
  }

  const previousRole = clean(previousRoleFor(state, issue), 60);
  const roleDescription = naturalRoleDescription(role, position);
  const previousRoleDescription = naturalRoleDescription(previousRole, position);
  const roleIndex = roleNumber(role);
  const descriptors = [];

  if (noun !== 'player') descriptors.push(`the ${noun}`);
  if (noun === 'quarterback') descriptors.push('the signal-caller');

  if (roleDescription) {
    descriptors.push(`the ${roleDescription}`);
    if (noun === 'quarterback' && roleIndex && roleIndex > 1) descriptors.push('the backup quarterback');
    if (noun === 'quarterback' && roleIndex && roleIndex > 2) descriptors.push('the reserve quarterback');
  }

  if (noun === 'quarterback' && /\bdual[-\s]?threat\b/i.test(archetype)) descriptors.push('the dual-threat quarterback');
  const heightDescription = naturalHeightDescription(height, position);
  if (heightDescription) descriptors.push(`the ${heightDescription}`);

  return {
    fullName,
    surname,
    position,
    archetype,
    height,
    role,
    previousRole,
    roleSource,
    roleDescription,
    previousRoleDescription,
    descriptors: [...new Set(descriptors.filter(Boolean))].slice(0, 10),
  };
};

export const createPlayerReferenceNormalizer = (reference = {}) => {
  const fullName = clean(reference.fullName, 120);
  const surname = clean(reference.surname, 80) || surnameFromFullName(fullName);
  const firstName = fullName.split(/\s+/).filter(Boolean)[0] || '';
  let fullNameUsed = false;

  const initialPattern = firstName && surname
    ? new RegExp(`\\b${escapeRegExp(firstName.charAt(0))}\\.\\s+${escapeRegExp(surname)}\\b`, 'gi')
    : null;
  const fullNamePattern = fullName && surname && fullName.toLowerCase() !== surname.toLowerCase()
    ? new RegExp(escapeRegExp(fullName), 'gi')
    : null;

  return (value) => {
    let result = String(value ?? '');
    if (!result) return result;
    if (initialPattern) result = result.replace(initialPattern, surname);
    if (fullNamePattern) {
      result = result.replace(fullNamePattern, (match) => {
        if (!fullNameUsed) {
          fullNameUsed = true;
          return match;
        }
        return surname;
      });
    }
    return result;
  };
};
