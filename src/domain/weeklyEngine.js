import * as legacy from './weeklyEngineBase.js';

export * from './weeklyEngineBase.js';

export const SIGNED_YARDAGE_KEYS = new Set(['game.passYds', 'game.rushYds']);
export const isSignedYardageKey = (key) => SIGNED_YARDAGE_KEYS.has(String(key || ''));

const valueMissing = (value) => value === '' || value === null || value === undefined;

// Football yardage can legitimately finish below zero (for example a QB can
// record -6 rushing yards after sacks/kneel-downs). Other numeric weekly facts
// keep the stricter non-negative validation from the established engine.
export const validateScanFact = (factEntry) => {
  const { key, value } = factEntry || {};
  if (!isSignedYardageKey(key)) return legacy.validateScanFact(factEntry);
  if (valueMissing(value)) return 'Enter a value or ignore this fact.';
  return Number.isFinite(Number(value)) ? '' : 'Enter a valid number.';
};

const repairSignedGamePatch = (draft) => {
  if (!draft) return draft;
  const gamePatch = { ...(draft.gamePatch || {}) };
  (draft.facts || []).forEach((entry) => {
    if (!isSignedYardageKey(entry.key) || valueMissing(entry.value)) return;
    const parsed = Number(entry.value);
    if (Number.isFinite(parsed)) gamePatch[entry.key.slice('game.'.length)] = parsed;
  });
  return { ...draft, gamePatch };
};

// The legacy patch rebuilder rejects every negative numeric value. Repair only
// the two signed yardage fields after edits/removals so a reviewed -6 survives
// all the way into the verified game patch.
export const updateScanDraftFact = (draft, factKey, value) => repairSignedGamePatch(
  legacy.updateScanDraftFact(draft, factKey, value),
);

export const removeScanDraftFact = (draft, factKey) => repairSignedGamePatch(
  legacy.removeScanDraftFact(draft, factKey),
);

// Completeness checks only need to know that a valid yardage value exists.
// Feed the established checker an equivalent non-negative sentinel so signed
// yardage is not falsely reported as a missing quarterback-stat requirement.
export const getWeeklyCompleteness = (draft) => {
  if (!draft) return legacy.getWeeklyCompleteness(draft);
  const facts = (draft.facts || []).map((entry) => (
    isSignedYardageKey(entry.key) && Number(entry.value) < 0
      ? { ...entry, value: Math.abs(Number(entry.value)) }
      : entry
  ));
  return legacy.getWeeklyCompleteness({ ...draft, facts });
};

const signedYardageFromText = (text, label) => {
  const normalized = String(text || '');
  const expression = label === 'pass'
    ? /pass(?:ing)?\s*y(?:ar)?ds?\s*:?\s*(-\d[\d,]*)/i
    : /rush(?:ing)?\s*y(?:ar)?ds?\s*:?\s*(-\d[\d,]*)/i;
  const match = normalized.match(expression);
  if (!match) return null;
  const parsed = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

// Preserve legacy OCR behavior while correcting the special case where its
// optional hyphen separator would otherwise turn “Rushing Yards: -6” into +6.
export const parseScreenshotText = (args = {}) => {
  const result = legacy.parseScreenshotText(args);
  const sourceId = args.sourceId || result?.source?.id || 'screenshot';
  const corrections = [
    ['game.passYds', 'passYds', 'Passing yards', signedYardageFromText(args.text, 'pass')],
    ['game.rushYds', 'rushYds', 'Rushing yards', signedYardageFromText(args.text, 'rush')],
  ].filter(([, , , value]) => value !== null);
  if (!corrections.length) return result;

  const correctedKeys = new Set(corrections.map(([key]) => key));
  const facts = (result.facts || []).filter((entry) => !correctedKeys.has(entry.key));
  const gamePatch = { ...(result.gamePatch || {}) };
  corrections.forEach(([key, field, label, value]) => {
    gamePatch[field] = value;
    facts.push({
      id: `${sourceId}:${key}`,
      key,
      label,
      value,
      confidence: 0.92,
      sourceId,
      verified: false,
    });
  });
  return { ...result, facts, gamePatch };
};
