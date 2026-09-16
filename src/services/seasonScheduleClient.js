import { readPaidVisionFallbackEnabled } from './visionFallbackPreference.js';

export const analyzeSeasonScheduleScreenshot = async ({
  idToken,
  imageDataUrl,
  fileName,
  player,
  season,
}) => {
  const response = await fetch('/api/analyze-coverage-reference', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      scanKind: 'schedule',
      imageDataUrl,
      fileName,
      player,
      season,
      school: player?.college || player?.school || '',
      allowPaidFallback: readPaidVisionFallbackEnabled(),
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || 'The season schedule could not be read.');
    error.status = response.status;
    throw error;
  }
  return body;
};
