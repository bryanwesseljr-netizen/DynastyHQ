import OpenAI from 'openai';

export const GEMINI_EDITORIAL_MODEL = process.env.GEMINI_EDITORIAL_MODEL || 'gemini-3.7-flash';
export const GEMINI_EDITORIAL_FALLBACK_MODEL = process.env.GEMINI_EDITORIAL_FALLBACK_MODEL || 'gemini-3.6-flash';
export const GEMINI_EDITORIAL_RESERVE_MODEL = process.env.GEMINI_EDITORIAL_RESERVE_MODEL || 'gemini-3.5-flash';
export const OPENAI_EDITORIAL_FALLBACK_MODEL = process.env.OPENAI_EDITORIAL_FALLBACK_MODEL || 'gpt-5.6-terra';

const PRIMARY_GEMINI_TIMEOUT_MS = Math.max(8000, Number(process.env.GEMINI_EDITORIAL_PRIMARY_TIMEOUT_MS) || 28000);
const FALLBACK_GEMINI_TIMEOUT_MS = Math.max(6000, Number(process.env.GEMINI_EDITORIAL_FALLBACK_TIMEOUT_MS) || 15000);
const RESERVE_GEMINI_TIMEOUT_MS = Math.max(5000, Number(process.env.GEMINI_EDITORIAL_RESERVE_TIMEOUT_MS) || 10000);

const geminiGenerateUrl = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const EDITORIAL_PLAYER_REFERENCE_POLICY = `PLAYER REFERENCE VARIETY — THIS APPLIES TO EVERY NAMED PLAYER, NOT ONLY THE TRACKED PLAYER:
- Write player references like a real college-football beat writer or podcast host. Do not fall into a long repetitive pattern of initial-plus-surname, surname, surname, surname when verified football context allows a more natural reference.
- When a verified full name is supplied, use the full name on the first natural identification in an article or episode, then use the surname as the normal shorthand. Never shorten a known full name to an initial plus surname.
- When the source supplies only an initial plus surname and no verified first name exists, you may use that initial-plus-surname once to establish identity. After that, prefer the surname or a verified team/position/role description. Never invent the missing first name.
- Surname remains the most common repeated reference, but when a player appears several times, naturally mix in a verified contextual reference roughly every two or three surname uses when the sentence benefits from it. Do not mechanically count or rotate phrases.
- Team-affiliated constructions are encouraged when BOTH the team affiliation and the football role/position are verified. Natural patterns include "Cincinnati's quarterback," "Cincinnati's signal-caller," "Hawaii's running back," "the program's wide receiver," or an appositive such as "Cincinnati's signal-caller, Jones." These are style patterns, not permission to invent the underlying team or position.
- For the tracked player, a team-affiliated phrase may wrap an approved playerReference descriptor. If playerReference allows "the signal-caller," then "Cincinnati's signal-caller" is also allowed when Cincinnati is the verified school. If playerReference does not support a role, archetype, height, or position label, do not create it through a team possessive.
- For Cincinnati local coverage and conversational podcast copy, "Cincy" is an approved occasional shorthand, so phrases such as "Cincy's quarterback" or "Cincy's signal-caller, Jones" may be used sparingly. Prefer Cincinnati or the verified team identity in more formal regional/national copy. Do not invent informal shorthand for other schools unless it is explicitly supplied.
- Team nickname constructions such as "the Bearcats' quarterback" are allowed only when that nickname is explicitly present in the supplied packet. Never guess a nickname.
- A phrase such as "playmaker at wide receiver" is an editorial performance description, not a permanent player identity. Use "playmaker" only when supplied current performance facts clearly support that characterization; never use it merely because the player's position is wide receiver.
- Class-year phrases such as "senior running back," "junior quarterback," or "freshman receiver" require an explicit verified class-year/eligibility fact for that player. Never infer senior/junior/sophomore/freshman from season number, age, career stage, or context.
- Do not infer position from a stat category alone. A rushing line does not by itself prove a player is a running back; receiving production does not by itself prove wide receiver; passing production does not by itself prove quarterback. Use a position only when the packet, playerReference, or an explicit fact supplies it.
- Height, archetype, starter/backup status, recruiting pedigree, hometown/native status, awards, class year, previous school, captaincy, and other biographical labels remain evidence-gated exactly as before.
- Avoid repeating the exact same contextual descriptor in adjacent sentences. Also avoid a thesaurus-like carousel where every mention gets a different label. The goal is natural sportswriting rhythm: name, surname, football context, surname.
- This policy expands the existing tracked-player reference rules; it does not weaken any grounding, historical-role, no-invention, or player-mention suppression rule.`;

const withPlayerReferencePolicy = (instructions = '') => `${instructions}\n\n${EDITORIAL_PLAYER_REFERENCE_POLICY}`;

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

const isTransientGeminiError = (error) => {
  const status = Number(error?.status) || 0;
  const code = String(error?.code || '').toUpperCase();
  return [429, 500, 502, 503, 504].includes(status)
    || ['UNAVAILABLE', 'RESOURCE_EXHAUSTED', 'INTERNAL', 'DEADLINE_EXCEEDED'].includes(code);
};

const isSameModelRetryable = (error) => (
  isTransientGeminiError(error) && String(error?.code || '').toUpperCase() !== 'DEADLINE_EXCEEDED'
);

const requestGeminiEditorial = async ({
  model,
  schema,
  instructions,
  userText,
  maxOutputTokens,
  temperature,
  timeoutMs = PRIMARY_GEMINI_TIMEOUT_MS,
}) => {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error('Gemini editorial writing is not configured.');
    error.code = 'GEMINI_NOT_CONFIGURED';
    throw error;
  }

  const controller = new AbortController();
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
            text: `${userText}\n\nReturn ONLY valid JSON. Do not wrap it in Markdown or commentary. Match the output shape below exactly and do not invent keys.\nOUTPUT SHAPE:\n${JSON.stringify(schema)}`,
          }],
        }],
        generationConfig: {
          maxOutputTokens,
          temperature,
          responseMimeType: 'application/json',
        },
      }),
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error(`Gemini editorial request exceeded ${timeoutMs}ms and was failed over.`);
      timeoutError.status = 504;
      timeoutError.code = 'DEADLINE_EXCEEDED';
      timeoutError.model = model;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
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

  const data = sanitizeToSchema(parsed, schema);
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

const requestGeminiWithRetry = async ({ model, retries = 0, ...options }) => {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requestGeminiEditorial({ model, ...options });
    } catch (error) {
      lastError = error;
      if (!isSameModelRetryable(error) || attempt >= retries) throw error;
      await wait(650 * (attempt + 1));
    }
  }
  throw lastError;
};

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
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model,
    store: false,
    ...(safetyIdentifier ? { safety_identifier: safetyIdentifier } : {}),
    reasoning: { effort: 'low' },
    max_output_tokens: maxOutputTokens,
    instructions: withPlayerReferencePolicy(instructions),
    input: [{
      role: 'user',
      content: [{ type: 'input_text', text: userText }],
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

  return {
    data: JSON.parse(response.output_text),
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
  temperature = 0.65,
  safetyIdentifier = '',
  openAiModel = '',
}) => {
  const geminiErrors = [];

  if (process.env.GEMINI_API_KEY) {
    const models = [...new Set([
      GEMINI_EDITORIAL_MODEL,
      GEMINI_EDITORIAL_FALLBACK_MODEL,
      GEMINI_EDITORIAL_RESERVE_MODEL,
    ].filter(Boolean))];
    const timeoutByIndex = [
      PRIMARY_GEMINI_TIMEOUT_MS,
      FALLBACK_GEMINI_TIMEOUT_MS,
      RESERVE_GEMINI_TIMEOUT_MS,
    ];

    for (let index = 0; index < models.length; index += 1) {
      const model = models[index];
      try {
        const result = await requestGeminiWithRetry({
          model,
          retries: index === 0 ? 1 : 0,
          schema,
          instructions,
          userText,
          maxOutputTokens,
          temperature,
          timeoutMs: timeoutByIndex[index] || RESERVE_GEMINI_TIMEOUT_MS,
        });
        if (index > 0) {
          result.usage = {
            ...result.usage,
            freeFallbackUsed: true,
            freeFallbackReason: geminiErrors[0]?.code || 'PRIMARY_GEMINI_FAILED',
          };
        }
        return result;
      } catch (error) {
        geminiErrors.push(error);
      }
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
