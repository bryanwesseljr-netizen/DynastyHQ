import { recordAiScanUsage } from './aiUsageTracker.js';
import { readPaidVisionFallbackEnabled } from './visionFallbackPreference.js';
import { reportSessionLaneResult } from './sessionImportTelemetry.js';
import { postFreeVisionJson } from './freeVisionQuotaQueue.js';

const postRtg = async ({ idToken, body: requestBody }) => {
  const { response, body } = await postFreeVisionJson({
    url: '/api/analyze-coverage-reference',
    idToken,
    body: requestBody,
  });
  if (!response.ok) {
    const error = new Error(body.error || 'RTG screenshot analysis failed.');
    error.status = response.status;
    throw error;
  }
  recordAiScanUsage('rtg-status', body);
  return body;
};

export const analyzeRtgStatusScreenshot = async ({ idToken, imageDataUrl, fileName, player }) => {
  try {
    const body = await postRtg({
      idToken,
      body: {
        imageDataUrl,
        fileName,
        player,
        scanKind: 'rtg',
        allowPaidFallback: readPaidVisionFallbackEnabled(),
      },
    });
    reportSessionLaneResult({ fileName, lane: 'rtg', status: 'analyzed', factCount: (body?.analysis?.facts || []).length, screenType: body?.analysis?.screenType || '' });
    return body;
  } catch (error) {
    reportSessionLaneResult({ fileName, lane: 'rtg', status: 'failed', message: error.message });
    throw error;
  }
};

export const analyzeRtgStatusScreenshotPair = async ({ idToken, imageDataUrl, fileNames, player }) => {
  try {
    const body = await postRtg({
      idToken,
      body: {
        imageDataUrl,
        fileNames,
        player,
        scanKind: 'rtg_batch',
        allowPaidFallback: readPaidVisionFallbackEnabled(),
      },
    });
    const rows = Array.isArray(body?.analysis?.screens) ? body.analysis.screens : [];
    const bySlot = new Map(rows.map((row) => [Number(row.slot), row]));
    return fileNames.map((fileName, index) => {
      const analysis = bySlot.get(index + 1) || { screenType: 'unknown', screenTitle: '', summary: '', facts: [] };
      reportSessionLaneResult({ fileName, lane: 'rtg', status: 'analyzed', factCount: (analysis.facts || []).length, screenType: analysis.screenType || '' });
      return { fileName, analysis };
    });
  } catch (error) {
    fileNames.forEach((fileName) => reportSessionLaneResult({ fileName, lane: 'rtg', status: 'failed', message: error.message }));
    throw error;
  }
};
