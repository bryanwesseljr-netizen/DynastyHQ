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

export const json = (res, status, body) => {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(body));
};
