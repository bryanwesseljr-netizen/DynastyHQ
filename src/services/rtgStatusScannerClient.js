import { recordAiScanUsage } from './aiUsageTracker.js';

export const analyzeRtgStatusScreenshot = async ({ idToken, imageDataUrl, fileName, player }) => {
  const response = await fetch('/api/analyze-rtg-status-free', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ imageDataUrl, fileName, player }),
  });

  let body = {};
  try {
    body = await response.json();
  } catch {
    // Preserve a useful user-facing error if an upstream proxy returns HTML.
  }

  if (!response.ok) {
    const error = new Error(body.error || 'RTG screenshot analysis failed.');
    error.status = response.status;
    throw error;
  }

  recordAiScanUsage('rtg-status', body);
  return body;
};
