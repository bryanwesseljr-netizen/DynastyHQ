const request = async (url, { idToken, body }) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'The podcast service did not respond.');
  return payload;
};

export const generatePodcastScript = ({ idToken, payload }) => (
  request('/api/generate-podcast', { idToken, body: payload })
);

export const synthesizePodcastSegment = ({ idToken, hostId, text }) => (
  request('/api/synthesize-podcast', { idToken, body: { hostId, text } })
);

