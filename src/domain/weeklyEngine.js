import * as legacy from './weeklyEngineBase.js';

export * from './weeklyEngineBase.js';

export const SIGNED_YARDAGE_KEYS = new Set(['game.passYds', 'game.rushYds']);
export const isSignedYardageKey = (key) => SIGNED_YARDAGE_KEYS.has(String(key || ''));

export const MANUAL_QB_STAT_LABELS = Object.freeze({
  'game.passYds': 'Passing yards',
  'game.passTD': 'Passing TDs',
  'game.rushYds': 'Rushing yards',
  'game.rushTD': 'Rushing TDs',
  'game.int': 'Interceptions',
});
export const isManualQbStatKey = (key) => Object.hasOwn(MANUAL_QB_STAT_LABELS, String(key || ''));

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

const seedMissingManualQbFact = (draft, factKey) => {
  if (!draft || !isManualQbStatKey(factKey)) return draft;
  if ((draft.facts || []).some((entry) => entry.key === factKey)) return draft;
  const sourceId = 'manual-verification';
  return {
    ...draft,
    facts: [
      ...(draft.facts || []),
      {
        id: `${draft.weekKey || draft.id || 'weekly'}:${factKey}:manual`,
        key: factKey,
        label: MANUAL_QB_STAT_LABELS[factKey],
        value: '',
        confidence: 1,
        sourceId,
        verified: true,
        userVerified: true,
        corrected: true,
        manual: true,
        evidence: 'Entered manually during verification because the scanner did not return this required stat.',
      },
    ],
  };
};

// The legacy editor only changes facts that already exist. The verification desk
// can now supply a missing required QB stat (especially a visible zero) without
// inventing it: the user explicitly enters the value, we seed a manual fact, and
// then the established patch builder handles it normally.
export const updateScanDraftFact = (draft, factKey, value) => {
  const seeded = !valueMissing(value) ? seedMissingManualQbFact(draft, factKey) : draft;
  return repairSignedGamePatch(legacy.updateScanDraftFact(seeded, factKey, value));
};

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
