import { recordAiScanUsage } from './aiUsageTracker.js';

export const routeSessionScreenshot = async ({ idToken, imageDataUrl, fileName, player }) => {
  const response = await fetch('/api/route-session-screenshot', {
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
    // Preserve a useful error if an upstream proxy returns HTML.
  }

  if (!response.ok) {
    const error = new Error(body.error || 'Session screenshot routing failed.');
    error.status = response.status;
    throw error;
  }

  recordAiScanUsage('session-routing', body);
  return body.route || { lanes: [], screenType: 'unknown', confidence: 0, reason: '' };
};
