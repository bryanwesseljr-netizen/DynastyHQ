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
  logo: clean(
    team.logos?.find?.((entry) => String(entry?.href || '').includes('/500/'))?.href
    || team.logos?.[0]?.href,
  ),
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
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
      .filter((team) => team.displayName || team.location || team.name);

    if (!teams.length) throw new Error('College team directory returned no teams.');

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ teams });
  } catch (error) {
    console.error('College team brand directory failed', error);
    return res.status(502).json({ error: 'College team logos are temporarily unavailable.' });
  }
}
