import { recordAiScanUsage } from './aiUsageTracker.js';
import { readPaidVisionFallbackEnabled } from './visionFallbackPreference.js';
import { reportSessionLaneResult } from './sessionImportTelemetry.js';
import { postFreeVisionJson } from './freeVisionQuotaQueue.js';

export const analyzeCoverageReference = async ({ idToken, imageDataUrl, fileName, school }) => {
  const { response, body } = await postFreeVisionJson({
    url: '/api/analyze-coverage-reference',
    idToken,
    body: {
      imageDataUrl,
      fileName,
      school,
      scanKind: 'coverage',
      allowPaidFallback: readPaidVisionFallbackEnabled(),
    },
  });

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
