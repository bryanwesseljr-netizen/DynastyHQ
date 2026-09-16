import sharedVisionHandler, { config as sharedConfig } from './analyze-coverage-reference.js';

export const config = sharedConfig;

const ESPN_TEAMS_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=500';
const clean = (value) => String(value ?? '').trim();

const normalizeTeam = (team = {}) => ({
  id: clean(team.id),
  displayName: clean(team.displayName),
  shortDisplayName: clean(team.shortDisplayName),
  location: clean(team.location),
  name: clean(team.name),
  nickname: clean(team.nickname),
  abbreviation: clean(team.abbreviation),
  slug: clean(team.slug),
  color: clean(team.color),
  alternateColor: clean(team.alternateColor),
});

const serveTeamDirectory = async (res) => {
  const response = await fetch(ESPN_TEAMS_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'DynastyHQ/1.0',
    },
  });
  if (!response.ok) throw new Error(`College team directory returned ${response.status}`);

  const payload = await response.json();
  const entries = payload?.sports?.[0]?.leagues?.[0]?.teams || [];
  const teams = entries
    .map((entry) => entry?.team)
    .filter(Boolean)
    .map(normalizeTeam)
    .filter((team) => team.id && (team.displayName || team.location || team.name));

  if (!teams.length) throw new Error('College team directory returned no teams.');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  return res.status(200).json({ teams });
};

const serveTeamLogo = async (req, res) => {
  const id = clean(req.query?.id);
  if (!/^\d{1,8}$/.test(id)) return res.status(400).send('Invalid team id.');

  const sourceUrl = `https://a.espncdn.com/i/teamlogos/ncaa/500/${encodeURIComponent(id)}.png`;
  const response = await fetch(sourceUrl, { headers: { 'User-Agent': 'DynastyHQ/1.0' } });
  if (!response.ok) throw new Error(`Team logo returned ${response.status}`);

  const bytes = Buffer.from(await response.arrayBuffer());
  res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
  res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=2592000');
  return res.status(200).send(bytes);
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      if (req.query?.resource === 'team-directory') return await serveTeamDirectory(res);
      if (req.query?.resource === 'team-logo') return await serveTeamLogo(req, res);
      return res.status(404).json({ error: 'Unknown resource.' });
    } catch (error) {
      console.error('RTG support resource failed', error);
      return res.status(502).json({ error: 'Team media resource is temporarily unavailable.' });
    }
  }

  req.body = {
    ...(req.body || {}),
    scanKind: 'rtg',
  };
  return sharedVisionHandler(req, res);
}
