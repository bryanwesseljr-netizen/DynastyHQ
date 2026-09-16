import { enrichPayloadWithStorylines } from './storylinePayloadBridge.js';

export const generateNewsroomEdition = async ({ idToken, payload }) => {
  const response = await fetch('/api/generate-newsroom', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(enrichPayloadWithStorylines(payload)),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The newsroom writing desk did not respond.');
  return result;
};
