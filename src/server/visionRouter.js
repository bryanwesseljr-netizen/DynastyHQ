import OpenAI from 'openai';

export const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-3.1-flash-lite';
export const OPENAI_VISION_FALLBACK_MODEL = process.env.OPENAI_VISION_FALLBACK_MODEL || 'gpt-5.6-luna';

const GEMINI_GENERATE_URL = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

const parseImageDataUrl = (value = '') => {
  const match = String(value).match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i);
  if (!match) throw new Error('Unsupported image data URL.');
  return { mimeType: match[1].toLowerCase().replace('jpg', 'jpeg'), data: match[2] };
};

const geminiText = (payload = {}) => (
  (payload.candidates?.[0]?.content?.parts || [])
    .map((part) => typeof part?.text === 'string' ? part.text : '')
    .join('')
    .trim()
);

const normalizeUsage = ({ provider, model, usage = {}, fallbackUsed = false, fallbackReason = '', reviewRecommended = false }) => ({
  provider,
  model,
  fallbackUsed,
  fallbackReason,
  reviewRecommended,
  inputTokens: Number(usage.promptTokenCount ?? usage.input_tokens ?? usage.inputTokens ?? 0) || 0,
  outputTokens: Number(usage.candidatesTokenCount ?? usage.output_tokens ?? usage.outputTokens ?? 0) || 0,
  totalTokens: Number(usage.totalTokenCount ?? usage.total_tokens ?? usage.totalTokens ?? 0) || 0,
});

const sanitizeToSchema = (value, schema = {}) => {
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
    return value;
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

export const visionAnalysisNeedsFallback = (analysis) => {
  if (!analysis || typeof analysis !== 'object') return true;
  const facts = Array.isArray(analysis.facts) ? analysis.facts : [];
  const screenTypes = Array.isArray(analysis.screenTypes) ? analysis.screenTypes : [];
  const screenType = String(analysis.screenType || '');
  const isUnknown = screenType === 'unknown' || screenTypes.includes('unknown');
  if (!facts.length) return !isUnknown;

  const confidenceValues = facts
    .map((entry) => Number(entry?.confidence))
    .filter((value) => Number.isFinite(value));
  if (!confidenceValues.length) return true;
  const average = confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length;
  const lowCount = confidenceValues.filter((value) => value < 0.72).length;
  return average < 0.76 || lowCount > Math.ceil(confidenceValues.length / 2);
};

const requestGemini = async ({ schema, instructions, userText, imageDataUrl, maxOutputTokens }) => {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error('Gemini vision is not configured.');
    error.code = 'GEMINI_NOT_CONFIGURED';
    throw error;
  }

  const image = parseImageDataUrl(imageDataUrl);
  const schemaGuide = JSON.stringify(schema);
  const response = await fetch(GEMINI_GENERATE_URL(GEMINI_VISION_MODEL), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          {
            text: `${instructions}\n\nTASK:\n${userText}\n\nReturn ONLY valid JSON. Follow this output shape exactly. Do not add keys not listed here. If a screenshot value is unclear, omit that fact rather than guessing.\nOUTPUT SHAPE:\n${schemaGuide}`,
          },
          { inlineData: { mimeType: image.mimeType, data: image.data } },
        ],
      }],
      generationConfig: {
        maxOutputTokens,
        temperature: 0,
        responseMimeType: 'application/json',
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Gemini vision request failed (${response.status}).`);
    error.status = response.status;
    error.code = payload?.error?.status || payload?.error?.code || 'GEMINI_REQUEST_FAILED';
    error.details = payload?.error?.details || null;
    throw error;
  }

  const outputText = geminiText(payload);
  if (!outputText) {
    const error = new Error('Gemini returned no JSON analysis.');
    error.code = 'GEMINI_EMPTY_OUTPUT';
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    const error = new Error('Gemini returned malformed JSON analysis.');
    error.code = 'GEMINI_INVALID_JSON';
    throw error;
  }

  const analysis = sanitizeToSchema(parsed, schema);
  if (!analysis || typeof analysis !== 'object') {
    const error = new Error('Gemini returned an analysis outside the allowed DynastyHQ shape.');
    error.code = 'GEMINI_SCHEMA_MISMATCH';
    throw error;
  }

  return {
    analysis,
    usage: normalizeUsage({
      provider: 'google',
      model: GEMINI_VISION_MODEL,
      usage: payload.usageMetadata || {},
    }),
  };
};

const requestOpenAiLuna = async ({ schema, schemaName, instructions, userText, imageDataUrl, maxOutputTokens, fallbackReason }) => {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('OpenAI fallback vision is not configured.');
    error.code = 'OPENAI_FALLBACK_NOT_CONFIGURED';
    throw error;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: OPENAI_VISION_FALLBACK_MODEL,
    store: false,
    reasoning: { effort: 'low' },
    max_output_tokens: maxOutputTokens,
    instructions,
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: userText },
        { type: 'input_image', image_url: imageDataUrl, detail: 'original' },
      ],
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
    const error = new Error('OpenAI Luna returned no structured analysis.');
    error.code = 'OPENAI_EMPTY_OUTPUT';
    throw error;
  }

  return {
    analysis: JSON.parse(response.output_text),
    usage: normalizeUsage({
      provider: 'openai',
      model: OPENAI_VISION_FALLBACK_MODEL,
      usage: response.usage || {},
      fallbackUsed: true,
      fallbackReason,
    }),
  };
};

export const analyzeVisionFreeFirst = async ({
  schema,
  schemaName,
  instructions,
  userText,
  imageDataUrl,
  maxOutputTokens = 3000,
}) => {
  let geminiError = null;
  let geminiCandidate = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      const gemini = await requestGemini({ schema, instructions, userText, imageDataUrl, maxOutputTokens });
      if (!visionAnalysisNeedsFallback(gemini.analysis)) return gemini;
      geminiCandidate = {
        ...gemini,
        usage: { ...gemini.usage, reviewRecommended: true, fallbackReason: 'LOW_CONFIDENCE' },
      };
      geminiError = new Error('Gemini extraction was too uncertain for automatic acceptance.');
      geminiError.code = 'LOW_CONFIDENCE';
    } catch (error) {
      geminiError = error;
    }
  }

  const fallbackReason = geminiError?.code || (process.env.GEMINI_API_KEY ? 'GEMINI_FAILED' : 'GEMINI_NOT_CONFIGURED');
  try {
    return await requestOpenAiLuna({
      schema,
      schemaName,
      instructions,
      userText,
      imageDataUrl,
      maxOutputTokens,
      fallbackReason,
    });
  } catch (openAiError) {
    if (geminiCandidate && (Number(openAiError?.status) === 429 || openAiError?.code === 'OPENAI_FALLBACK_NOT_CONFIGURED')) {
      return {
        ...geminiCandidate,
        usage: {
          ...geminiCandidate.usage,
          fallbackUnavailable: true,
          fallbackFailureCode: openAiError?.code || String(openAiError?.status || ''),
        },
      };
    }
    if (geminiError && Number(openAiError?.status) === 429) {
      const combined = new Error(geminiError.message || 'Gemini primary scan failed before the paid fallback was available.');
      combined.status = Number(geminiError?.status) || 502;
      combined.code = geminiError?.code || 'GEMINI_FAILED';
      combined.geminiError = geminiError?.message || '';
      combined.geminiDetails = geminiError?.details || null;
      combined.fallbackUnavailable = true;
      throw combined;
    }
    if (geminiError && !process.env.OPENAI_API_KEY) throw geminiError;
    const combined = new Error(openAiError?.message || geminiError?.message || 'Vision analysis failed.');
    combined.status = openAiError?.status || geminiError?.status || 502;
    combined.code = openAiError?.code || geminiError?.code || 'VISION_ANALYSIS_FAILED';
    combined.geminiError = geminiError?.message || '';
    combined.geminiDetails = geminiError?.details || null;
    throw combined;
  }
};
