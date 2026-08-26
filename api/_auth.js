const firebaseApiKey = () => process.env.FIREBASE_WEB_API_KEY?.trim() || '';

const bearerToken = (authorization = '') => {
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
};

export const verifyFirebaseUser = async (authorization) => {
  const idToken = bearerToken(authorization);
  const apiKey = firebaseApiKey();
  if (!idToken || !apiKey) return null;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) return null;
  const body = await response.json();
  return body.users?.[0] || null;
};

const isHumanizedPodcastAudio = (status, body) => (
  status >= 200
  && status < 300
  && typeof body?.audioBase64 === 'string'
  && body.audioBase64.length > 0
  && String(body?.engine || '') === 'gemini-multispeaker-v3.5-leveled-paced'
);

export const json = (res, status, body) => {
  if (isHumanizedPodcastAudio(status, body)) {
    const audio = Buffer.from(body.audioBase64, 'base64');
    console.info('Humanized podcast binary response', {
      transcriptWords: body?.transcriptWords || 0,
      transcriptTurns: body?.transcriptTurns || 0,
      performanceSections: body?.performanceSections || 0,
      mp3Bytes: audio.length,
      base64Bytes: Buffer.byteLength(body.audioBase64, 'utf8'),
    });
    res.status(status).setHeader('Content-Type', body?.mimeType || 'audio/mpeg');
    res.setHeader('Content-Length', String(audio.length));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-DynastyHQ-Model', String(body?.model || 'gemini-multispeaker'));
    res.setHeader('X-DynastyHQ-Engine', String(body?.engine || 'gemini-multispeaker-v3'));
    res.setHeader('X-DynastyHQ-Transcript-Words', String(body?.transcriptWords || 0));
    res.setHeader('X-DynastyHQ-Performance-Sections', String(body?.performanceSections || 0));
    return res.end(audio);
  }

  res.status(status).setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(body));
};
