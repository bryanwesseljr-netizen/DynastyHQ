import { recordAiScanUsage } from './aiUsageTracker.js';

const OFFENSIVE_TOTAL_YARD_KEYS = new Set([
  'game.teamTotalYards',
  'game.opponentTotalYards',
]);

export const normalizeScreenshotAnalysis = (analysis = {}) => ({
  ...analysis,
  facts: (analysis.facts || []).map((fact) => {
    if (!OFFENSIVE_TOTAL_YARD_KEYS.has(fact?.key)) return fact;

    const confidence = Number(fact.confidence);
    const semanticMeaningIsResolved = Number.isFinite(confidence) && confidence >= 0.75;
    const teamLabel = fact.key === 'game.teamTotalYards' ? 'Team total offensive yards' : 'Opponent total offensive yards';
    const evidence = String(fact.evidence || '').trim();
    const semanticNote = 'Total Yards is treated as total offensive yards (rushing + passing only; kick and punt return yards excluded).';

    return {
      ...fact,
      label: teamLabel,
      ...(semanticMeaningIsResolved ? { userVerified: true } : {}),
      evidence: evidence ? `${evidence} · ${semanticNote}` : semanticNote,
    };
  }),
});

export const analyzeScreenshot = async ({
  idToken,
  imageDataUrl,
  fileName,
  careerPhase,
  player,
  recruitingSchools,
  rosterPlayers,
  uploadContext,
}) => {
  const useFreeCollegeScanner = careerPhase === 'Player'
    && Boolean(player?.college)
    && !uploadContext;
  const endpoint = useFreeCollegeScanner
    ? '/api/analyze-college-game-free'
    : '/api/analyze-screenshot';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ imageDataUrl, fileName, careerPhase, player, recruitingSchools, rosterPlayers, uploadContext }),
  });

  let body = {};
  try {
    body = await response.json();
  } catch {
    // Keep the user-facing error useful even if an upstream proxy returns HTML.
  }

  if (!response.ok) {
    const error = new Error(body.error || 'Screenshot analysis failed.');
    error.status = response.status;
    throw error;
  }

  if (useFreeCollegeScanner) recordAiScanUsage('game-data', body);
  return normalizeScreenshotAnalysis(body);
};
