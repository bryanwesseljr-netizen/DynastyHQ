import { recordAiScanUsage } from './aiUsageTracker.js';
import { readPaidVisionFallbackEnabled } from './visionFallbackPreference.js';
import { reportSessionLaneResult } from './sessionImportTelemetry.js';
import { postFreeVisionJson } from './freeVisionQuotaQueue.js';

export const analyzeRtgStatusScreenshot = async ({ idToken, imageDataUrl, fileName, player }) => {
  const { response, body } = await postFreeVisionJson({
    url: '/api/analyze-coverage-reference',
    idToken,
    body: {
      imageDataUrl,
      fileName,
      player,
      scanKind: 'rtg',
      allowPaidFallback: readPaidVisionFallbackEnabled(),
    },
  });

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
