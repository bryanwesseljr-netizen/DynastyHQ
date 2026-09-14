import { recordAiScanUsage } from './aiUsageTracker.js';

const ALLOWED_LANES = new Set(['game', 'rtg', 'coverage', 'high_school']);
const RTG_SCREEN_TYPES = new Set([
  'rtg_overview',
  'rtg_academics',
  'rtg_leadership',
  'rtg_health',
  'rtg_fitness',
  'rtg_brand',
]);
const GAME_SCREEN_TYPES = new Set(['final_score', 'box_score', 'team_stats']);
const COVERAGE_SCREEN_TYPES = new Set(['scoring_summary', 'ea_network_article']);
const HIGH_SCHOOL_SCREEN_TYPES = new Set(['high_school_moment', 'high_school_postgame']);

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

export const normalizeSessionRoute = (analysis = {}) => {
  const screenType = String(analysis.screenType || 'unknown');
  const modelLanes = [...new Set((analysis.lanes || []).filter((lane) => ALLOWED_LANES.has(lane)))];
  let lanes = modelLanes;

  // The screen type is the stronger signal for deterministic CFB27 screens. The
  // model occasionally identified a Scoring Summary correctly but still returned
  // the Game lane, which meant those scoring plays never reached Coverage review.
  if (GAME_SCREEN_TYPES.has(screenType)) lanes = ['game'];
  else if (COVERAGE_SCREEN_TYPES.has(screenType)) lanes = ['coverage'];
  else if (RTG_SCREEN_TYPES.has(screenType)) lanes = ['rtg'];
  else if (HIGH_SCHOOL_SCREEN_TYPES.has(screenType)) lanes = ['high_school'];
  else if (screenType === 'player_stats') {
    // Every Player Stats table is useful editorial context. Preserve Game Data when
    // the router saw the tracked player's row, but always also feed Coverage so
    // teammate/opponent individual stats remain available for verification.
    lanes = [...new Set([...modelLanes.filter((lane) => lane === 'game'), 'coverage'])];
  } else if (screenType === 'unknown') {
    lanes = [];
  }

  return {
    lanes,
    screenType,
    momentNumber: Math.max(0, Math.min(4, Number(analysis.momentNumber) || 0)),
    confidence: Math.max(0, Math.min(1, Number(analysis.confidence) || 0)),
    reason: String(analysis.reason || '').trim() || 'Session Import classification completed.',
  };
};

export const routeSessionScreenshot = async ({ idToken, imageDataUrl, fileName, player, careerPhase }) => {
  const analysis = await analyzeRoute({ idToken, imageDataUrl, fileName, player, careerPhase });
  return normalizeSessionRoute(analysis);
};
