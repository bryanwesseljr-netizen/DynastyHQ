import { recordAiScanUsage } from './aiUsageTracker.js';
import { readPaidVisionFallbackEnabled } from './visionFallbackPreference.js';
import { reportSessionLaneResult } from './sessionImportTelemetry.js';

export const analyzeCoverageReference = async ({ idToken, imageDataUrl, fileName, school }) => {
  const response = await fetch('/api/analyze-coverage-reference', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      imageDataUrl,
      fileName,
      school,
      scanKind: 'coverage',
      allowPaidFallback: readPaidVisionFallbackEnabled(),
    }),
  });

  let body = {};
  try {
    body = await response.json();
  } catch {
    // Preserve the useful status error below if an upstream response is not JSON.
  }

  if (!response.ok) {
    const message = body.error || 'Coverage reference analysis failed.';
    reportSessionLaneResult({
      fileName,
      lane: 'coverage',
      status: 'failed',
      message,
    });
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  recordAiScanUsage('coverage-data', body);
  reportSessionLaneResult({
    fileName,
    lane: 'coverage',
    status: 'analyzed',
    factCount: (body?.analysis?.facts || []).length,
    screenType: body?.analysis?.screenType || '',
  });
  return body;
};
