export const analyzeCoverageReference = async ({ idToken, imageDataUrl, fileName, school }) => {
  const response = await fetch('/api/analyze-coverage-reference', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ imageDataUrl, fileName, school }),
  });

  let body = {};
  try {
    body = await response.json();
  } catch {
    // Preserve the useful status error below if an upstream response is not JSON.
  }

  if (!response.ok) {
    const error = new Error(body.error || 'Coverage reference analysis failed.');
    error.status = response.status;
    throw error;
  }

  return body;
};
