import { recordAiScanUsage } from './aiUsageTracker.js';
import { readPaidVisionFallbackEnabled } from './visionFallbackPreference.js';
import { reportSessionLaneResult } from './sessionImportTelemetry.js';
import { postFreeVisionJson } from './freeVisionQuotaQueue.js';

const postCoverage = async ({ idToken, body: requestBody }) => {
  const { response, body } = await postFreeVisionJson({
    url: '/api/analyze-coverage-reference',
    idToken,
    body: requestBody,
  });
  if (!response.ok) {
    const error = new Error(body.error || 'Coverage reference analysis failed.');
    error.status = response.status;
    throw error;
  }
  recordAiScanUsage('coverage-data', body);
  return body;
};

export const analyzeCoverageReference = async ({ idToken, imageDataUrl, fileName, school }) => {
  try {
    const body = await postCoverage({
      idToken,
      body: {
        imageDataUrl,
        fileName,
        school,
        scanKind: 'coverage',
        allowPaidFallback: readPaidVisionFallbackEnabled(),
      },
    });
    reportSessionLaneResult({ fileName, lane: 'coverage', status: 'analyzed', factCount: (body?.analysis?.facts || []).length, screenType: body?.analysis?.screenType || '' });
    return body;
  } catch (error) {
    reportSessionLaneResult({ fileName, lane: 'coverage', status: 'failed', message: error.message });
    throw error;
  }
};

export const analyzeCoverageReferencePair = async ({ idToken, imageDataUrl, fileNames, school }) => {
  try {
    const body = await postCoverage({
      idToken,
      body: {
        imageDataUrl,
        fileNames,
        school,
        scanKind: 'coverage_batch',
        allowPaidFallback: readPaidVisionFallbackEnabled(),
      },
    });
    const rows = Array.isArray(body?.analysis?.screens) ? body.analysis.screens : [];
    const bySlot = new Map(rows.map((row) => [Number(row.slot), row]));
    return fileNames.map((fileName, index) => {
      const analysis = bySlot.get(index + 1) || { screenType: 'unknown', screenTitle: '', summary: '', facts: [] };
      reportSessionLaneResult({ fileName, lane: 'coverage', status: 'analyzed', factCount: (analysis.facts || []).length, screenType: analysis.screenType || '' });
      return { fileName, analysis };
    });
  } catch (error) {
    fileNames.forEach((fileName) => reportSessionLaneResult({ fileName, lane: 'coverage', status: 'failed', message: error.message }));
    throw error;
  }
};
