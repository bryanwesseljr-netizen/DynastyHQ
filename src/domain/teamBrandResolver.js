const ESPN_TEAMS_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=500';
const CACHE_KEY = 'dynastyhq-college-team-brands-v1';
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

let brandIndexPromise = null;

const clean = (value) => String(value ?? '').trim();

export const normalizeTeamName = (value) => clean(value)
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/\bthe\b/g, ' ')
  .replace(/\buniversity\b/g, ' ')
  .replace(/\bcollege\b/g, ' college ')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const ensureHex = (value, fallback) => {
  const text = clean(value).replace(/^#/, '');
  return /^[0-9a-f]{6}$/i.test(text) ? `#${text}` : fallback;
};

const initialsFor = (name) => {
  const words = clean(name).split(/\s+/).filter(Boolean);
  if (!words.length) return 'DHQ';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((word) => word[0]).join('').toUpperCase();
};

const fallbackPalette = (name) => {
  let hash = 0;
  for (const char of clean(name)) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  const hue = Math.abs(hash) % 360;
  return {
    primaryColor: `hsl(${hue} 48% 24%)`,
    secondaryColor: `hsl(${hue} 55% 70%)`,
  };
};

export const fallbackTeamBrand = (name, options = {}) => {
  const palette = fallbackPalette(name);
  return {
    id: null,
    displayName: clean(name) || 'Team',
    abbreviation: initialsFor(name),
    primaryColor: options.primaryColor || palette.primaryColor,
    secondaryColor: options.secondaryColor || palette.secondaryColor,
    logo: options.logo || '',
    source: options.source || 'fallback',
  };
};

const teamAliases = (team = {}) => {
  const aliases = new Set([
    team.displayName,
    team.shortDisplayName,
    team.location,
    team.name,
    team.nickname,
    team.abbreviation,
    team.slug,
  ].map(normalizeTeamName).filter(Boolean));

  const display = normalizeTeamName(team.displayName);
  const nickname = normalizeTeamName(team.nickname || team.name);
  if (display && nickname && display.endsWith(` ${nickname}`)) aliases.add(display.slice(0, -(nickname.length + 1)).trim());

  return [...aliases];
};

const toBrand = (team = {}) => ({
  id: clean(team.id) || null,
  displayName: clean(team.displayName || team.shortDisplayName || team.location || team.name) || 'Team',
  abbreviation: clean(team.abbreviation) || initialsFor(team.displayName || team.location || team.name),
  primaryColor: ensureHex(team.color, '#23313f'),
  secondaryColor: ensureHex(team.alternateColor, '#d7dee5'),
  logo: team.logos?.find?.((logo) => String(logo?.href || '').includes('/500/'))?.href || team.logos?.[0]?.href || '',
  aliases: teamAliases(team),
  source: 'espn',
});

const readCache = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null');
    if (!cached?.savedAt || !Array.isArray(cached?.teams)) return null;
    if (Date.now() - cached.savedAt > CACHE_MAX_AGE) return null;
    return cached.teams;
  } catch {
    return null;
  }
};

const writeCache = (teams) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), teams }));
  } catch {
    // A blocked/full localStorage cache should never break matchup rendering.
  }
};

const fetchTeams = async () => {
  const cached = readCache();
  if (cached) return cached;

  const response = await fetch(ESPN_TEAMS_URL, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`College team directory returned ${response.status}`);
  const payload = await response.json();
  const entries = payload?.sports?.[0]?.leagues?.[0]?.teams || [];
  const teams = entries.map((entry) => entry?.team).filter(Boolean).map(toBrand);
  if (!teams.length) throw new Error('College team directory returned no teams');
  writeCache(teams);
  return teams;
};

const buildIndex = async () => {
  const teams = await fetchTeams();
  const exact = new Map();

  teams.forEach((team) => {
    team.aliases.forEach((alias) => {
      if (!exact.has(alias)) exact.set(alias, team);
    });
  });

  return { teams, exact };
};

const getIndex = () => {
  if (!brandIndexPromise) brandIndexPromise = buildIndex().catch((error) => {
    brandIndexPromise = null;
    throw error;
  });
  return brandIndexPromise;
};

const scoreCandidate = (query, team) => {
  let score = 0;
  for (const alias of team.aliases || []) {
    if (alias === query) return 1000;
    if (alias.startsWith(query) || query.startsWith(alias)) score = Math.max(score, 700 - Math.abs(alias.length - query.length));
    if (alias.includes(query) || query.includes(alias)) score = Math.max(score, 500 - Math.abs(alias.length - query.length));
  }
  return score;
};

export const resolveCollegeTeamBrand = async (name) => {
  const query = normalizeTeamName(name);
  if (!query) return fallbackTeamBrand(name);

  try {
    const index = await getIndex();
    const exact = index.exact.get(query);
    if (exact) return exact;

    const ranked = index.teams
      .map((team) => ({ team, score: scoreCandidate(query, team) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score);

    return ranked[0]?.team || fallbackTeamBrand(name);
  } catch {
    return fallbackTeamBrand(name);
  }
};

export const resolveTeamBrand = async (name, options = {}) => {
  if (options.highSchool) return fallbackTeamBrand(name, { ...options, source: 'high-school' });
  return resolveCollegeTeamBrand(name);
};

export const TEAM_BRAND_CACHE_KEY = CACHE_KEY;
export const TEAM_BRAND_SOURCE_URL = ESPN_TEAMS_URL;
