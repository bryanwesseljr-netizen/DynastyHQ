export const generateCustomNewsroomPhoto = async ({ idToken, prompt, folderLabel, references = [] }) => {
  const response = await fetch('/api/generate-custom-newsroom-photo', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, folderLabel, references }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'The custom newsroom photo could not be generated.');
  return body;
};
