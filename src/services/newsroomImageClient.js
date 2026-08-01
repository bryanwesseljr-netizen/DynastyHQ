export const generateNewsroomImage = async ({ idToken, payload }) => {
  const response = await fetch('/api/generate-newsroom-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The newsroom image service did not respond.');
  return result;
};
