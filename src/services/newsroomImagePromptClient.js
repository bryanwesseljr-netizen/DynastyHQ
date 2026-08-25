export const requestNewsroomImagePrompt = async ({ idToken, payload }) => {
  const response = await fetch('/api/get-newsroom-image-prompt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The Photo Director prompt service did not respond.');
  return result;
};
