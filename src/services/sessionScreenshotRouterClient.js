import { recordAiScanUsage } from './aiUsageTracker.js';
import { postFreeVisionJson } from './freeVisionQuotaQueue.js';

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

const postRoute = async ({ idToken, body: requestBody }) => {
  const { response, body } = await postFreeVisionJson({
    url: '/api/analyze-coverage-reference',
    idToken,
    body: requestBody,
  });

  if (!response.ok) {
    const error = new Error(body.error || 'Session screenshot classification failed.');
    error.status = response.status;
    throw error;
  }

  recordAiScanUsage('session-routing', body);
  return body.analysis || {};
};

const analyzeRoute = async ({ idToken, imageDataUrl, fileName, player, careerPhase }) => {
  const school = player?.college || player?.school || '';
  return postRoute({
    idToken,
    body: {
      imageDataUrl,
      fileName,
      player,
      school,
      careerPhase,
      scanKind: 'route',
      allowPaidFallback: false,
    },
  });
};

const analyzeRouteBatch = async ({ idToken, imageDataUrl, fileNames, player, careerPhase }) => {
  const school = player?.college || player?.school || '';
  return postRoute({
    idToken,
    body: {
      imageDataUrl,
      fileNames,
      player,
      school,
      careerPhase,
      scanKind: 'route_batch',
      allowPaidFallback: false,
    },
  });
};

export const normalizeSessionRoute = (analysis = {}) => {
  const screenType = String(analysis.screenType || 'unknown');
  const modelLanes = [...new Set((analysis.lanes || []).filter((lane) => ALLOWED_LANES.has(lane)))];
  let lanes = modelLanes;

  if (GAME_SCREEN_TYPES.has(screenType)) lanes = ['game'];
  else if (COVERAGE_SCREEN_TYPES.has(screenType)) lanes = ['coverage'];
  else if (RTG_SCREEN_TYPES.has(screenType)) lanes = ['rtg'];
  else if (HIGH_SCHOOL_SCREEN_TYPES.has(screenType)) lanes = ['high_school'];
  else if (screenType === 'player_stats') {
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

export const routeSessionScreenshotBatch = async ({ idToken, imageDataUrl, fileNames, player, careerPhase }) => {
  const analysis = await analyzeRouteBatch({ idToken, imageDataUrl, fileNames, player, careerPhase });
  const rows = Array.isArray(analysis.routes) ? analysis.routes : [];
  const bySlot = new Map(rows.map((row) => [Number(row.slot), row]));
  return fileNames.map((fileName, index) => {
    const row = bySlot.get(index + 1) || {};
    return {
      fileName,
      route: normalizeSessionRoute(row),
    };
  });
};
