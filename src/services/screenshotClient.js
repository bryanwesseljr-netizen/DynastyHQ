import { recordAiScanUsage } from './aiUsageTracker.js';
import { readPaidVisionFallbackEnabled } from './visionFallbackPreference.js';

const OFFENSIVE_TOTAL_YARD_KEYS = new Set([
  'game.teamTotalYards',
  'game.opponentTotalYards',
]);

const PASSING_YARD_KEYS = new Set([
  'game.passYds',
  'game.teamPassYds',
  'game.opponentPassYds',
]);

const looksLikePassingAttemptsOrCompletions = (fact = {}) => {
  if (!PASSING_YARD_KEYS.has(fact?.key)) return false;
  const label = String(fact.label || '').trim().toLowerCase();
  const evidence = String(fact.evidence || '').trim().toLowerCase();
  const labelIsWrongColumn = /\b(?:pass(?:ing)?\s*)?(?:att(?:empt)?s?|cmp|comp(?:letion)?s?)\b/.test(label);
  if (labelIsWrongColumn) return true;

  const evidenceNamesWrongColumn = /^(?:pass(?:ing)?\s*)?(?:att(?:empt)?s?|cmp|comp(?:letion)?s?)\b/.test(evidence);
  const evidenceNamesYards = /\b(?:yds?|yards?)\b/.test(evidence);
  return evidenceNamesWrongColumn && !evidenceNamesYards;
};

const totalSourceText = (fact = {}) => `${String(fact.label || '')} ${String(fact.evidence || '')}`.toLowerCase();

const isExplicitTotalOffenseSource = (fact = {}) => {
  if (!OFFENSIVE_TOTAL_YARD_KEYS.has(fact?.key)) return false;
  const source = totalSourceText(fact);
  return /\btotal\s+offense\b/.test(source) || /\btotal\s+offensive\s+yards?\b/.test(source);
};

const isGenericTotalYardsSource = (fact = {}) => {
  if (!OFFENSIVE_TOTAL_YARD_KEYS.has(fact?.key)) return false;
  const source = totalSourceText(fact);
  return /\btotal\s+yards?\b/.test(source) && !isExplicitTotalOffenseSource(fact);
};

const normalizeCoreAnalysis = (analysis = {}) => {
  const initialFacts = (analysis.facts || [])
    .filter((fact) => !looksLikePassingAttemptsOrCompletions(fact));

  // College Football 27 exposes both "Total Offense" and "Total Yards" as
  // separate rows. DynastyHQ wants the offensive total only. Never let the
  // generic Total Yards row compete with Total Offense for the same field.
  const facts = initialFacts.filter((fact) => {
    if (!OFFENSIVE_TOTAL_YARD_KEYS.has(fact?.key)) return true;
    return isExplicitTotalOffenseSource(fact) || !isGenericTotalYardsSource(fact);
  });

  return {
    ...analysis,
    facts: facts.map((fact) => {
      if (!OFFENSIVE_TOTAL_YARD_KEYS.has(fact?.key)) return fact;

      const confidence = Number(fact.confidence);
      const semanticMeaningIsResolved = isExplicitTotalOffenseSource(fact)
        && Number.isFinite(confidence)
        && confidence >= 0.75;
      const teamLabel = fact.key === 'game.teamTotalYards' ? 'Team total offense' : 'Opponent total offense';
      const evidence = String(fact.evidence || '').trim();
      const semanticNote = 'Uses the on-screen Total Offense value; the separate Total Yards row is ignored.';

      return {
        ...fact,
        label: teamLabel,
        ...(semanticMeaningIsResolved ? { userVerified: true } : {}),
        evidence: evidence ? `${evidence} · ${semanticNote}` : semanticNote,
      };
    }),
  };
};

export const normalizeScreenshotAnalysis = (payload = {}) => {
  if (payload?.analysis && typeof payload.analysis === 'object') {
    return {
      ...payload,
      analysis: normalizeCoreAnalysis(payload.analysis),
    };
  }
  return normalizeCoreAnalysis(payload);
};

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
    ? '/api/analyze-coverage-reference'
    : '/api/analyze-screenshot';
  const allowPaidFallback = readPaidVisionFallbackEnabled();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      imageDataUrl,
      fileName,
      careerPhase,
      player,
      recruitingSchools,
      rosterPlayers,
      uploadContext,
      allowPaidFallback,
      ...(useFreeCollegeScanner ? { scanKind: 'game' } : {}),
    }),
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

  recordAiScanUsage(useFreeCollegeScanner ? 'game-data' : 'general-data', body);
  return normalizeScreenshotAnalysis(body);
};
