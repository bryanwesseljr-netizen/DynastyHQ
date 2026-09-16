export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method not allowed.');
  }

  const id = String(req.query?.id || '').trim();
  if (!/^\d{1,8}$/.test(id)) return res.status(400).send('Invalid team id.');

  try {
    const sourceUrl = `https://a.espncdn.com/i/teamlogos/ncaa/500/${encodeURIComponent(id)}.png`;
    const response = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'DynastyHQ/1.0' },
    });
    if (!response.ok) throw new Error(`Team logo returned ${response.status}`);

    const bytes = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
    res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=2592000');
    return res.status(200).send(bytes);
  } catch (error) {
    console.error('College team logo proxy failed', error);
    return res.status(502).send('Team logo unavailable.');
  }
}
