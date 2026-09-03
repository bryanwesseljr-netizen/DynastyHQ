import OpenAI from 'openai';

export const GEMINI_EDITORIAL_MODEL = process.env.GEMINI_EDITORIAL_MODEL || 'gemini-3.7-flash';
export const GEMINI_EDITORIAL_FALLBACK_MODEL = process.env.GEMINI_EDITORIAL_FALLBACK_MODEL || 'gemini-3.6-flash';
export const GEMINI_EDITORIAL_RESERVE_MODEL = process.env.GEMINI_EDITORIAL_RESERVE_MODEL || 'gemini-3.5-flash-lite';
export const OPENAI_EDITORIAL_FALLBACK_MODEL = process.env.OPENAI_EDITORIAL_FALLBACK_MODEL || 'gpt-5.6-terra';

const PRIMARY_GEMINI_TIMEOUT_MS = Math.max(12000, Number(process.env.GEMINI_EDITORIAL_PRIMARY_TIMEOUT_MS) || 32000);
const FALLBACK_GEMINI_TIMEOUT_MS = Math.max(10000, Number(process.env.GEMINI_EDITORIAL_FALLBACK_TIMEOUT_MS) || 28000);
const RESERVE_GEMINI_TIMEOUT_MS = Math.max(8000, Number(process.env.GEMINI_EDITORIAL_RESERVE_TIMEOUT_MS) || 24000);
const FALLBACK_HEDGE_DELAY_MS = Math.max(0, Number(process.env.GEMINI_EDITORIAL_FALLBACK_HEDGE_MS) || 4500);
const RESERVE_HEDGE_DELAY_MS = Math.max(FALLBACK_HEDGE_DELAY_MS, Number(process.env.GEMINI_EDITORIAL_RESERVE_HEDGE_MS) || 9000);

const geminiGenerateUrl = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

export const EDITORIAL_PLAYER_REFERENCE_POLICY = `PLAYER REFERENCE VARIETY — THIS APPLIES TO EVERY NAMED PLAYER, NOT ONLY THE TRACKED PLAYER:
- Reader-facing Newsroom and Podcast copy must NEVER use an initial plus surname such as "S. Jones", "T. Smith", or "J. Brown". Source initials are internal identity/disambiguation data only; they are not publishable name style.
- When a verified full name is supplied, introduce the player naturally with the full name, preferably inside verified football context when that context is available. Good patterns include "Cincinnati's signal-caller, Sam Jones" or "Sam Jones, Cincinnati's quarterback." After the introduction, use the surname as the normal shorthand.
- When the source supplies only an initial plus surname and no verified first name exists, NEVER print the initial and never invent the missing first name. Introduce the player with the surname alone or, preferably, with verified football context such as "Hawaii's running back, Smith", "Cincinnati's signal-caller, Jones", or "the Bearcats' quarterback, Jones" when those team/role facts are actually supplied.
- The first meaningful mention should tell the reader who the player is in football terms whenever the verified packet supports it. Do not default to a bare surname merely because the source name is abbreviated. Team + position, team + role, team nickname + role, verified class year + position, or a directly supported performance role are all more natural identity anchors when available.
- If an exact roster position is not verified, you may use a directly supported statistical football role instead of guessing a position. Examples include "Hawaii's leading rusher, Smith", "Cincinnati's leading receiver, Brown", or "the game's leading passer, Jones" when the supplied facts explicitly support that distinction. A rushing line alone does not prove running back; receiving production alone does not prove wide receiver; passing production alone does not prove quarterback.
- Surname remains the most common repeated reference, but when a player appears several times, naturally mix in a verified contextual reference roughly every two or three surname uses when the sentence benefits from it. Do not mechanically count or rotate phrases.
- Team-affiliated constructions are encouraged when BOTH the team affiliation and the football role/position are verified. Natural patterns include "Cincinnati's quarterback," "Cincinnati's signal-caller," "Hawaii's running back," "the program's wide receiver," or an appositive such as "Cincinnati's signal-caller, Jones." These are style patterns, not permission to invent the underlying team or position.
- For the tracked player, a team-affiliated phrase may wrap an approved playerReference descriptor. If playerReference allows "the signal-caller," then "Cincinnati's signal-caller" is also allowed when Cincinnati is the verified school. If playerReference does not support a role, archetype, height, or position label, do not create it through a team possessive.
- For Cincinnati local coverage and conversational podcast copy, "Cincy" is an approved occasional shorthand, so phrases such as "Cincy's quarterback", "Cincy's signal-caller, Jones", or "Cincy's senior running back, Johnson" may be used sparingly when every descriptive detail is verified. Prefer Cincinnati or the verified team identity in more formal regional/national copy. Do not invent informal shorthand for other schools unless it is explicitly supplied.
- Team nickname constructions such as "the Bearcats' quarterback" are allowed only when that nickname is explicitly present in the supplied packet. Never guess a nickname.
- A phrase such as "playmaker at wide receiver" is an editorial performance description, not a permanent player identity. Use "playmaker" only when supplied current performance facts clearly support that characterization; never use it merely because the player's position is wide receiver.
- Class-year phrases such as "senior running back," "junior quarterback," or "freshman receiver" require an explicit verified class-year/eligibility fact for that player. Never infer senior/junior/sophomore/freshman from season number, age, career stage, or context.
- Height, archetype, starter/backup status, recruiting pedigree, hometown/native status, awards, class year, previous school, captaincy, and other biographical labels remain evidence-gated exactly as before.
- Avoid repeating the exact same contextual descriptor in adjacent sentences. Also avoid a thesaurus-like carousel where every mention gets a different label. The goal is natural sportswriting rhythm: contextual introduction, surname, football context, surname.
- This policy expands the existing tracked-player reference rules; it does not weaken any grounding, historical-role, no-invention, or player-mention suppression rule.`;

const withPlayerReferencePolicy = (instructions = '') => `${instructions}\n\n${EDITORIAL_PLAYER_REFERENCE_POLICY}`;

const INITIAL_SURNAME_PATTERN = /\b[A-Z]\.\s+([A-Z][A-Za-z'’\-]{1,})\b/g;

export const removeReaderFacingPlayerInitials = (value) => {
  if (typeof value === 'string') return value.replace(INITIAL_SURNAME_PATTERN, '$1');
  if (Array.isArray(value)) return value.map((entry) => removeReaderFacingPlayerInitials(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, removeReaderFacingPlayerInitials(entry)]),
    );
  }
  return value;
};

const geminiText = (payload = {}) => (
  (payload.candidates?.[0]?.content?.parts || [])
    .map((part) => typeof part?.text === 'string' ? part.text : '')
    .join('')
    .trim()
);

const normalizeUsage = ({
  provider,
  model,
  usage = {},
  fallbackUsed = false,
  fallbackReason = '',
  freeFallbackUsed = false,
  freeFallbackReason = '',
}) => ({
  provider,
  model,
  fallbackUsed,
  fallbackReason,
  freeFallbackUsed,
  freeFallbackReason,
  inputTokens: Number(usage.promptTokenCount ?? usage.input_tokens ?? usage.inputTokens ?? 0) || 0,
  outputTokens: Number(usage.candidatesTokenCount ?? usage.output_tokens ?? usage.outputTokens ?? 0) || 0,
  totalTokens: Number(usage.totalTokenCount ?? usage.total_tokens ?? usage.totalTokens ?? 0) || 0,
});

export const sanitizeToSchema = (value, schema = {}) => {
  const type = schema?.type;

  if (type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const properties = schema.properties || {};
    const result = {};
    Object.entries(properties).forEach(([key, childSchema]) => {
      if (!(key in value)) return;
      const sanitized = sanitizeToSchema(value[key], childSchema);
      if (sanitized !== undefined) result[key] = sanitized;
    });
    return result;
  }

  if (type === 'array') {
    if (!Array.isArray(value)) return undefined;
    const items = value
      .map((entry) => sanitizeToSchema(entry, schema.items || {}))
      .filter((entry) => entry !== undefined);
    const maxItems = Number(schema.maxItems);
    return Number.isFinite(maxItems) ? items.slice(0, maxItems) : items;
  }

  if (type === 'string') {
    if (typeof value !== 'string') return undefined;
    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) return undefined;
    const maxLength = Number(schema.maxLength);
    return Number.isFinite(maxLength) ? value.slice(0, maxLength) : value;
  }

  if (type === 'number' || type === 'integer') {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) return undefined;
    if (type === 'integer' && !Number.isInteger(number)) return undefined;
    if (Number.isFinite(Number(schema.minimum)) && number < Number(schema.minimum)) return undefined;
    if (Number.isFinite(Number(schema.maximum)) && number > Number(schema.maximum)) return undefined;
    if (Array.isArray(schema.enum) && !schema.enum.includes(number)) return undefined;
    return number;
  }

  if (type === 'boolean') return typeof value === 'boolean' ? value : undefined;
  return value;
};

const hasCompleteOutletCoverage = (value, schema = {}) => {
  if (!Array.isArray(value) || schema?.items?.type !== 'object') return true;
  const itemSchema = schema.items || {};
  const required = Array.isArray(itemSchema.required) ? itemSchema.required : [];
  const outletSchema = itemSchema.properties?.outletId;
  const expectedOutletIds = Array.isArray(outletSchema?.enum) ? outletSchema.enum : [];
  if (!required.includes('outletId') || expectedOutletIds.length < 2) return true;
  if (value.length !== expectedOutletIds.length) return false;

  const actualOutletIds = value.map((entry) => entry?.outletId);
  if (new Set(actualOutletIds).size !== actualOutletIds.length) return false;
  return expectedOutletIds.every((outletId) => actualOutletIds.includes(outletId));
};

export const satisfiesSchemaShape = (value, schema = {}) => {
  const type = schema?.type;

  if (type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const required = Array.isArray(schema.required) ? schema.required : [];
    if (required.some((key) => value[key] === undefined)) return false;
    const properties = schema.properties || {};
    return Object.entries(value).every(([key, child]) => (
      !properties[key] || satisfiesSchemaShape(child, properties[key])
    ));
  }

  if (type === 'array') {
    if (!Array.isArray(value)) return false;
    const minItems = Number(schema.minItems);
    const maxItems = Number(schema.maxItems);
    if (Number.isFinite(minItems) && value.length < minItems) return false;
    if (Number.isFinite(maxItems) && value.length > maxItems) return false;
    if (!hasCompleteOutletCoverage(value, schema)) return false;
    return value.every((entry) => satisfiesSchemaShape(entry, schema.items || {}));
  }

  if (type === 'string') {
    if (typeof value !== 'string') return false;
    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) return false;
    if (Number.isFinite(Number(schema.maxLength)) && value.length > Number(schema.maxLength)) return false;
    return true;
  }

  if (type === 'number' || type === 'integer') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return false;
    if (type === 'integer' && !Number.isInteger(value)) return false;
    if (Number.isFinite(Number(schema.minimum)) && value < Number(schema.minimum)) return false;
    if (Number.isFinite(Number(schema.maximum)) && value > Number(schema.maximum)) return false;
    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) return false;
    return true;
  }

  if (type === 'boolean') return typeof value === 'boolean';
  return true;
};

const requestGeminiEditorial = async ({
  model,
  schema,
  instructions,
  userText,
  maxOutputTokens,
  thinkingLevel = 'low',
  timeoutMs = PRIMARY_GEMINI_TIMEOUT_MS,
  externalSignal = null,
}) => {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error('Gemini editorial writing is not configured.');
    error.code = 'GEMINI_NOT_CONFIGURED';
    throw error;
  }

  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', forwardAbort, { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(geminiGenerateUrl(model), {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: withPlayerReferencePolicy(instructions) }],
        },
        contents: [{
          role: 'user',
          parts: [{
            text: `${userText}\n\nReturn ONLY valid JSON. Do not wrap it in Markdown or commentary. Match the output shape below exactly and do not invent keys. If the output contains an articles array, return every allowed outletId exactly once with no duplicates. Source player initials are internal only: never copy an initial-plus-surname into reader-facing output.\nOUTPUT SHAPE:\n${JSON.stringify(schema)}`,
          }],
        }],
        generationConfig: {
          maxOutputTokens,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel },
        },
      }),
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error(`Gemini editorial request exceeded its latency window and was failed over.`);
      timeoutError.status = 504;
      timeoutError.code = 'DEADLINE_EXCEEDED';
      timeoutError.model = model;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    if (externalSignal) externalSignal.removeEventListener('abort', forwardAbort);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Gemini editorial request failed (${response.status}).`);
    error.status = response.status;
    error.code = payload?.error?.status || payload?.error?.code || 'GEMINI_REQUEST_FAILED';
    error.details = payload?.error?.details || null;
    error.model = model;
    throw error;
  }

  const outputText = geminiText(payload);
  if (!outputText) {
    const error = new Error('Gemini returned no editorial JSON.');
    error.code = 'GEMINI_EMPTY_OUTPUT';
    error.model = model;
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    const error = new Error('Gemini returned malformed editorial JSON.');
    error.code = 'GEMINI_INVALID_JSON';
    error.model = model;
    throw error;
  }

  const data = removeReaderFacingPlayerInitials(sanitizeToSchema(parsed, schema));
  if (!satisfiesSchemaShape(data, schema)) {
    const error = new Error('Gemini returned an editorial draft outside the allowed DynastyHQ structure.');
    error.code = 'GEMINI_SCHEMA_MISMATCH';
    error.model = model;
    throw error;
  }

  return {
    data,
    usage: normalizeUsage({
      provider: 'google',
      model,
      usage: payload.usageMetadata || {},
    }),
  };
};

const runHedgedGeminiEditorial = async ({
  models,
  schema,
  instructions,
  userText,
  maxOutputTokens,
}) => new Promise((resolve, reject) => {
  const errors = new Array(models.length);
  const started = new Array(models.length).fill(false);
  const controllers = models.map(() => new AbortController());
  const timers = [];
  let settled = false;
  let completed = 0;

  const finish = (result, index) => {
    if (settled) return;
    settled = true;
    timers.forEach(clearTimeout);
    controllers.forEach((controller, controllerIndex) => {
      if (controllerIndex !== index) controller.abort();
    });
    const firstPrimaryError = errors[0];
    resolve({
      result,
      index,
      fallbackReason: index === 0
        ? ''
        : (firstPrimaryError?.code || (started[0] ? 'PRIMARY_SLOW_HEDGE' : 'PRIMARY_NOT_STARTED')),
    });
  };

  const failIfDone = () => {
    if (settled || completed < models.length) return;
    settled = true;
    timers.forEach(clearTimeout);
    reject({ errors });
  };

  const launch = (index) => {
    if (settled || index >= models.length || started[index]) return;
    started[index] = true;
    const config = models[index];
    requestGeminiEditorial({
      model: config.model,
      schema,
      instructions,
      userText,
      maxOutputTokens,
      thinkingLevel: config.thinkingLevel,
      timeoutMs: config.timeoutMs,
      externalSignal: controllers[index].signal,
    }).then((result) => {
      finish(result, index);
    }).catch((error) => {
      if (settled) return;
      errors[index] = error;
      completed += 1;
      if (index + 1 < models.length) launch(index + 1);
      failIfDone();
    });
  };

  launch(0);
  timers.push(setTimeout(() => launch(1), FALLBACK_HEDGE_DELAY_MS));
  timers.push(setTimeout(() => launch(2), RESERVE_HEDGE_DELAY_MS));
});

const requestOpenAiEditorial = async ({
  schema,
  schemaName,
  instructions,
  userText,
  maxOutputTokens,
  safetyIdentifier,
  openAiModel,
  fallbackReason,
}) => {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('OpenAI editorial fallback is not configured.');
    error.code = 'OPENAI_FALLBACK_NOT_CONFIGURED';
    throw error;
  }

  const model = openAiModel || OPENAI_EDITORIAL_FALLBACK_MODEL;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 20000 });
  const response = await client.responses.create({
    model,
    store: false,
    ...(safetyIdentifier ? { safety_identifier: safetyIdentifier } : {}),
    reasoning: { effort: 'low' },
    max_output_tokens: maxOutputTokens,
    instructions: withPlayerReferencePolicy(instructions),
    input: [{
      role: 'user',
      content: [{ type: 'input_text', text: `${userText}\n\nFor any articles array, return every requested outletId exactly once with no duplicates. Source player initials are internal only: never copy an initial-plus-surname into reader-facing output.` }],
    }],
    text: {
      format: {
        type: 'json_schema',
        name: schemaName,
        strict: true,
        schema,
      },
    },
  });

  if (!response.output_text) {
    const error = new Error('OpenAI returned no structured editorial draft.');
    error.code = 'OPENAI_EMPTY_OUTPUT';
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    const error = new Error('OpenAI returned malformed editorial JSON.');
    error.code = 'OPENAI_INVALID_JSON';
    throw error;
  }

  const data = removeReaderFacingPlayerInitials(sanitizeToSchema(parsed, schema));
  if (!satisfiesSchemaShape(data, schema)) {
    const error = new Error('OpenAI returned an editorial draft outside the allowed DynastyHQ structure.');
    error.code = 'OPENAI_SCHEMA_MISMATCH';
    throw error;
  }

  return {
    data,
    usage: normalizeUsage({
      provider: 'openai',
      model,
      usage: response.usage || {},
      fallbackUsed: true,
      fallbackReason,
    }),
  };
};

export const generateEditorialJsonPaidFallback = async ({
  schema,
  schemaName,
  instructions,
  userText,
  maxOutputTokens = 8000,
  safetyIdentifier = '',
  openAiModel = '',
  fallbackReason = 'QUALITY_GATE',
}) => requestOpenAiEditorial({
  schema,
  schemaName,
  instructions,
  userText,
  maxOutputTokens,
  safetyIdentifier,
  openAiModel,
  fallbackReason,
});

export const generateEditorialJsonFreeFirst = async ({
  schema,
  schemaName,
  instructions,
  userText,
  maxOutputTokens = 8000,
  safetyIdentifier = '',
  openAiModel = '',
}) => {
  let geminiErrors = [];

  if (process.env.GEMINI_API_KEY) {
    const modelConfigs = [
      {
        model: GEMINI_EDITORIAL_MODEL,
        timeoutMs: PRIMARY_GEMINI_TIMEOUT_MS,
        thinkingLevel: 'low',
      },
      {
        model: GEMINI_EDITORIAL_FALLBACK_MODEL,
        timeoutMs: FALLBACK_GEMINI_TIMEOUT_MS,
        thinkingLevel: 'low',
      },
      {
        model: GEMINI_EDITORIAL_RESERVE_MODEL,
        timeoutMs: RESERVE_GEMINI_TIMEOUT_MS,
        thinkingLevel: 'minimal',
      },
    ].filter((entry, index, entries) => entry.model && entries.findIndex((other) => other.model === entry.model) === index);

    try {
      const hedged = await runHedgedGeminiEditorial({
        models: modelConfigs,
        schema,
        instructions,
        userText,
        maxOutputTokens,
      });
      if (hedged.index > 0) {
        hedged.result.usage = {
          ...hedged.result.usage,
          freeFallbackUsed: true,
          freeFallbackReason: hedged.fallbackReason || 'PRIMARY_SLOW_HEDGE',
        };
      }
      return hedged.result;
    } catch (aggregate) {
      geminiErrors = Array.isArray(aggregate?.errors) ? aggregate.errors.filter(Boolean) : [];
    }
  } else {
    const error = new Error('Gemini editorial writing is not configured.');
    error.code = 'GEMINI_NOT_CONFIGURED';
    geminiErrors.push(error);
  }

  const geminiError = geminiErrors[geminiErrors.length - 1] || null;
  const fallbackReason = geminiError?.code || 'GEMINI_FAILED';
  try {
    return await requestOpenAiEditorial({
      schema,
      schemaName,
      instructions,
      userText,
      maxOutputTokens,
      safetyIdentifier,
      openAiModel,
      fallbackReason,
    });
  } catch (openAiError) {
    if (geminiError && Number(openAiError?.status) === 429) {
      const combined = new Error(geminiError.message || 'The free editorial models failed before the paid fallback was available.');
      combined.status = Number(geminiError?.status) || 502;
      combined.code = geminiError?.code || 'GEMINI_FAILED';
      combined.primaryProvider = 'google';
      combined.primaryError = geminiError?.message || '';
      combined.fallbackUnavailable = true;
      throw combined;
    }
    if (geminiError && !process.env.OPENAI_API_KEY) throw geminiError;
    const combined = new Error(openAiError?.message || geminiError?.message || 'Editorial generation failed.');
    combined.status = openAiError?.status || geminiError?.status || 502;
    combined.code = openAiError?.code || geminiError?.code || 'EDITORIAL_GENERATION_FAILED';
    combined.primaryProvider = 'google';
    combined.primaryError = geminiError?.message || '';
    throw combined;
  }
};
