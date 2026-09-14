import { recordAiScanUsage } from './aiUsageTracker.js';
import { readPaidVisionFallbackEnabled } from './visionFallbackPreference.js';
import { reportSessionLaneResult } from './sessionImportTelemetry.js';

export const analyzeRtgStatusScreenshot = async ({ idToken, imageDataUrl, fileName, player }) => {
  const response = await fetch('/api/analyze-coverage-reference', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      imageDataUrl,
      fileName,
      player,
      scanKind: 'rtg',
      allowPaidFallback: readPaidVisionFallbackEnabled(),
    }),
  });

  let body = {};
  try {
    body = await response.json();
  } catch {
    // Preserve a useful user-facing error if an upstream proxy returns HTML.
  }

  if (!response.ok) {
    const message = body.error || 'RTG screenshot analysis failed.';
    reportSessionLaneResult({
      fileName,
      lane: 'rtg',
      status: 'failed',
      message,
    });
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  recordAiScanUsage('rtg-status', body);
  reportSessionLaneResult({
    fileName,
    lane: 'rtg',
    status: 'analyzed',
    factCount: (body?.analysis?.facts || []).length,
    screenType: body?.analysis?.screenType || '',
  });
  return body;
};
