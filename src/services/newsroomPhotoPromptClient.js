export const buildNewsroomPhotoPrompt = async ({ idToken, payload }) => {
  const response = await fetch('/api/build-newsroom-photo-prompt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The Editorial Photo Director did not respond.');
  return result;
};
