import { recordAiScanUsage } from './aiUsageTracker.js';

const ALLOWED_LANES = new Set(['game', 'rtg', 'coverage', 'high_school']);

const analyzeRoute = async ({ idToken, imageDataUrl, fileName, player, careerPhase }) => {
  const school = player?.college || player?.school || '';
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
      school,
      careerPhase,
      scanKind: 'route',
      // Routing is classification only and should never spend paid fallback credits.
      // Dedicated lane scanners still follow the user's normal preference afterward.
      allowPaidFallback: false,
    }),
  });

  let body = {};
  try {
    body = await response.json();
  } catch {
    // Preserve a useful error if an upstream proxy returns HTML.
  }

  if (!response.ok) {
    const error = new Error(body.error || 'Session screenshot classification failed.');
    error.status = response.status;
    throw error;
  }

  recordAiScanUsage('session-routing', body);
  return body.analysis || {};
};

export const routeSessionScreenshot = async ({ idToken, imageDataUrl, fileName, player, careerPhase }) => {
  const analysis = await analyzeRoute({ idToken, imageDataUrl, fileName, player, careerPhase });
  const lanes = [...new Set((analysis.lanes || []).filter((lane) => ALLOWED_LANES.has(lane)))];
  const screenType = String(analysis.screenType || 'unknown');
  const momentNumber = Math.max(0, Math.min(4, Number(analysis.momentNumber) || 0));
  const confidence = Math.max(0, Math.min(1, Number(analysis.confidence) || 0));

  return {
    lanes: screenType === 'unknown' ? [] : lanes,
    screenType,
    momentNumber,
    confidence,
    reason: String(analysis.reason || '').trim() || 'Session Import classification completed.',
  };
};
