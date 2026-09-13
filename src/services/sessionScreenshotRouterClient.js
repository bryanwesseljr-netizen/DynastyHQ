import { recordAiScanUsage } from './aiUsageTracker.js';

const normalizeName = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const maxConfidence = (facts = []) => facts.reduce(
  (best, fact) => Math.max(best, Number(fact?.confidence) || 0),
  0,
);

const analyze = async ({ idToken, imageDataUrl, fileName, player, scanKind }) => {
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
      scanKind,
      // Routing should never spend paid fallback credits. The dedicated scanner
      // still follows the user's normal fallback preference after routing.
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
    const error = new Error(body.error || `Session ${scanKind} classification failed.`);
    error.status = response.status;
    throw error;
  }

  recordAiScanUsage('session-routing', body);
  return body.analysis || {};
};

export const routeSessionScreenshot = async ({ idToken, imageDataUrl, fileName, player }) => {
  const coverage = await analyze({ idToken, imageDataUrl, fileName, player, scanKind: 'coverage' });
  const coverageType = coverage.screenType || 'unknown';
  const coverageFacts = coverage.facts || [];

  if (coverageType === 'scoring_summary') {
    return {
      lanes: ['coverage'],
      screenType: 'scoring_summary',
      confidence: maxConfidence(coverageFacts),
      reason: 'Scoring Summary belongs to editorial coverage.',
    };
  }

  if (coverageType === 'team_stats') {
    return {
      lanes: ['game'],
      screenType: 'team_stats',
      confidence: maxConfidence(coverageFacts),
      reason: 'Team Stats belongs to verified Game Data.',
    };
  }

  if (coverageType === 'player_stats') {
    const trackedName = normalizeName(player?.name);
    const containsTrackedPlayer = Boolean(trackedName) && coverageFacts.some((fact) => (
      normalizeName(fact?.subject) === trackedName
    ));
    return {
      lanes: containsTrackedPlayer ? ['game', 'coverage'] : ['coverage'],
      screenType: 'player_stats',
      confidence: maxConfidence(coverageFacts),
      reason: containsTrackedPlayer
        ? 'Player Stats contains the tracked player and additional coverage context.'
        : 'Player Stats provides teammate or opponent coverage context.',
    };
  }

  // Coverage intentionally returns unknown for RTG menu/status screens and many
  // score-only game screens. A second free-first pass cleanly separates those.
  const rtg = await analyze({ idToken, imageDataUrl, fileName, player, scanKind: 'rtg' });
  const rtgType = rtg.screenType || 'unknown';
  if (rtgType !== 'unknown') {
    return {
      lanes: ['rtg'],
      screenType: rtgType,
      confidence: maxConfidence(rtg.facts || []),
      reason: 'Recognized Road to Glory current-state screen.',
    };
  }

  // Final score/game-summary screens are outside the editorial and RTG schemas.
  // The verified Game Data scanner is the safest final destination and will still
  // reject unsupported or unreadable facts rather than inventing them.
  return {
    lanes: ['game'],
    screenType: 'final_score',
    confidence: 0.6,
    reason: 'Not RTG or editorial coverage; send to verified Game Data.',
  };
};
