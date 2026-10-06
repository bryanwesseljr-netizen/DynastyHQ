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
    const providerBusy = response.status === 503 || response.status === 504;
    const error = new Error(
      body.error
      || (providerBusy
        ? 'The schedule scanner is temporarily busy. Your screenshots are still fine; retry in a moment.'
        : 'The season schedule could not be read.'),
    );
    error.status = response.status;
    error.retryable = body.retryable === true || providerBusy;
    throw error;
  }
  return body;
};
