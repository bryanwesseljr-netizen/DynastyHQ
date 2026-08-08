export const analyzeScreenshot = async ({
  idToken,
  imageDataUrl,
  fileName,
  careerPhase,
  player,
  recruitingSchools,
  rosterPlayers,
  uploadContext,
}) => {
  const response = await fetch('/api/analyze-screenshot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ imageDataUrl, fileName, careerPhase, player, recruitingSchools, rosterPlayers, uploadContext }),
  });

  let body = {};
  try {
    body = await response.json();
  } catch {
    // Keep the user-facing error useful even if an upstream proxy returns HTML.
  }

  if (!response.ok) {
    const error = new Error(body.error || 'Screenshot analysis failed.');
    error.status = response.status;
    throw error;
  }

  return body;
};
