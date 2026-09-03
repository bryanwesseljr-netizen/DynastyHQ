import OpenAI from 'openai';

export const GEMINI_EDITORIAL_MODEL = process.env.GEMINI_EDITORIAL_MODEL || 'gemini-3.7-flash';
export const OPENAI_EDITORIAL_FALLBACK_MODEL = process.env.OPENAI_EDITORIAL_FALLBACK_MODEL || 'gpt-5.6-terra';

const geminiGenerateUrl = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

const geminiText = (payload = {}) => (
  (payload.candidates?.[0]?.content?.parts || [])
    .map((part) => typeof part?.text === 'string' ? part.text : '')
    .join('')
    .trim()
);

const normalizeUsage = ({ provider, model, usage = {}, fallbackUsed = false, fallbackReason = '' }) => ({
  provider,
  model,
  fallbackUsed,
  fallbackReason,
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

const requestGeminiEditorial = async ({
  schema,
  instructions,
  userText,
  maxOutputTokens,
  temperature,
}) => {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error('Gemini editorial writing is not configured.');
    error.code = 'GEMINI_NOT_CONFIGURED';
    throw error;
  }

  const response = await fetch(geminiGenerateUrl(GEMINI_EDITORIAL_MODEL), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: instructions }],
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

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Gemini editorial request failed (${response.status}).`);
    error.status = response.status;
    error.code = payload?.error?.status || payload?.error?.code || 'GEMINI_REQUEST_FAILED';
    error.details = payload?.error?.details || null;
    throw error;
  }

  const outputText = geminiText(payload);
  if (!outputText) {
    const error = new Error('Gemini returned no editorial JSON.');
    error.code = 'GEMINI_EMPTY_OUTPUT';
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    const error = new Error('Gemini returned malformed editorial JSON.');
    error.code = 'GEMINI_INVALID_JSON';
    throw error;
  }

  const data = sanitizeToSchema(parsed, schema);
  if (!satisfiesSchemaShape(data, schema)) {
    const error = new Error('Gemini returned an editorial draft outside the allowed DynastyHQ structure.');
    error.code = 'GEMINI_SCHEMA_MISMATCH';
    throw error;
  }

  return {
    data,
    usage: normalizeUsage({
      provider: 'google',
      model: GEMINI_EDITORIAL_MODEL,
      usage: payload.usageMetadata || {},
    }),
  };
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
    instructions,
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
  let geminiError = null;

  if (process.env.GEMINI_API_KEY) {
    try {
      return await requestGeminiEditorial({
        schema,
        instructions,
        userText,
        maxOutputTokens,
        temperature,
      });
    } catch (error) {
      geminiError = error;
    }
  } else {
    geminiError = new Error('Gemini editorial writing is not configured.');
    geminiError.code = 'GEMINI_NOT_CONFIGURED';
  }

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
      const combined = new Error(geminiError.message || 'Gemini editorial writing failed before the paid fallback was available.');
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
