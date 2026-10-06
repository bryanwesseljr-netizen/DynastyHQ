import OpenAI from 'openai';

export const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-3.1-flash-lite';

const modelList = (value = '') => String(value)
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

export const GEMINI_VISION_FALLBACK_MODELS = modelList(
  process.env.GEMINI_VISION_FALLBACK_MODELS || 'gemini-3.5-flash-lite,gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash',
);
export const GEMINI_VISION_MODELS = [...new Set([GEMINI_VISION_MODEL, ...GEMINI_VISION_FALLBACK_MODELS])];

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

const normalizeUsage = ({ provider, model, usage = {}, fallbackUsed = false, fallbackReason = '', reviewRecommended = false, paidFallbackBlocked = false }) => ({
  provider,
  model,
  fallbackUsed,
  fallbackReason,
  reviewRecommended,
  paidFallbackBlocked,
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
  const entries = Array.isArray(analysis.entries) ? analysis.entries : [];
  const screenTypes = Array.isArray(analysis.screenTypes) ? analysis.screenTypes : [];
  const screenType = String(analysis.screenType || '');
  const isUnknown = screenType === 'unknown' || screenTypes.includes('unknown');

  // Season-schedule scans use entries[] instead of the generic facts[] ledger.
  // Treat a clearly recognized schedule with confident visible rows as a valid
  // first-pass result so the router does not burn through every fallback model.
  if (screenType === 'season_schedule') {
    if (!entries.length) return true;
    const scheduleConfidence = entries
      .map((entry) => Number(entry?.confidence))
      .filter((value) => Number.isFinite(value));
    if (!scheduleConfidence.length) return true;
    const average = scheduleConfidence.reduce((sum, value) => sum + value, 0) / scheduleConfidence.length;
    const lowCount = scheduleConfidence.filter((value) => value < 0.72).length;
    return average < 0.76 || lowCount > Math.ceil(scheduleConfidence.length / 2);
  }

  if (!facts.length) return !isUnknown;

  const confidenceValues = facts
    .map((entry) => Number(entry?.confidence))
    .filter((value) => Number.isFinite(value));
  if (!confidenceValues.length) return true;
  const average = confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length;
  const lowCount = confidenceValues.filter((value) => value < 0.72).length;
  return average < 0.76 || lowCount > Math.ceil(confidenceValues.length / 2);
};

const requestGemini = async ({ schema, instructions, userText, imageDataUrl, maxOutputTokens, model = GEMINI_VISION_MODEL }) => {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error('Gemini vision is not configured.');
    error.code = 'GEMINI_NOT_CONFIGURED';
    throw error;
  }

  const image = parseImageDataUrl(imageDataUrl);
  const schemaGuide = JSON.stringify(schema);
  const response = await fetch(GEMINI_GENERATE_URL(model), {
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
      model,
      usage: payload.usageMetadata || {},
    }),
  };
};

const retryableGeminiVisionError = (error = {}) => {
  const status = Number(error?.status) || 0;
  if (status === 404 || status === 408 || status === 425 || status === 429 || status >= 500) return true;
  return ['GEMINI_EMPTY_OUTPUT', 'GEMINI_INVALID_JSON', 'GEMINI_SCHEMA_MISMATCH'].includes(String(error?.code || ''));
};

const confidenceAverage = (analysis = {}) => {
  const values = (analysis.facts || [])
    .map((entry) => Number(entry?.confidence))
    .filter((value) => Number.isFinite(value));
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
};

const requestGeminiFreeChain = async ({ schema, instructions, userText, imageDataUrl, maxOutputTokens }) => {
  const attempts = [];
  let bestCandidate = null;

  for (const model of GEMINI_VISION_MODELS) {
    try {
      const result = await requestGemini({
        schema,
        instructions,
        userText,
        imageDataUrl,
        maxOutputTokens,
        model,
      });

      if (!visionAnalysisNeedsFallback(result.analysis)) {
        return {
          ...result,
          usage: {
            ...result.usage,
            freeModelAttempts: attempts.length + 1,
          },
        };
      }

      const candidate = {
        ...result,
        usage: {
          ...result.usage,
          reviewRecommended: true,
          fallbackReason: 'LOW_CONFIDENCE',
          freeModelAttempts: attempts.length + 1,
        },
      };
      if (!bestCandidate || confidenceAverage(candidate.analysis) > confidenceAverage(bestCandidate.analysis)) {
        bestCandidate = candidate;
      }
      attempts.push({
        model,
        status: 200,
        code: 'LOW_CONFIDENCE',
        message: 'Gemini extraction was too uncertain for automatic acceptance.',
      });
    } catch (error) {
      const attempt = {
        model,
        status: Number(error?.status) || 0,
        code: String(error?.code || ''),
        message: String(error?.message || 'Gemini vision request failed.').slice(0, 240),
      };
      attempts.push(attempt);
      console.warn('Gemini vision model attempt failed', attempt);

      if (!retryableGeminiVisionError(error)) {
        error.geminiAttempts = attempts;
        throw error;
      }
    }
  }

  if (bestCandidate) {
    return {
      ...bestCandidate,
      usage: {
        ...bestCandidate.usage,
        fallbackReason: 'FREE_MODELS_LOW_CONFIDENCE',
        freeModelAttempts: attempts.length,
      },
    };
  }

  const last = attempts.at(-1) || {};
  const error = new Error('All configured free-tier Gemini vision models are temporarily unavailable.');
  error.status = 503;
  error.code = 'GEMINI_FREE_MODELS_UNAVAILABLE';
  error.geminiAttempts = attempts;
  error.lastProviderStatus = last.status || 0;
  throw error;
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
  allowPaidFallback = false,
}) => {
  let geminiError = null;
  let geminiCandidate = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      const gemini = await requestGeminiFreeChain({ schema, instructions, userText, imageDataUrl, maxOutputTokens });
      if (!visionAnalysisNeedsFallback(gemini.analysis)) return gemini;
      geminiCandidate = {
        ...gemini,
        usage: {
          ...gemini.usage,
          reviewRecommended: true,
          fallbackReason: gemini.usage?.fallbackReason || 'FREE_MODELS_LOW_CONFIDENCE',
        },
      };
      geminiError = new Error('All free Gemini vision models returned an extraction that still needs review.');
      geminiError.code = 'LOW_CONFIDENCE';
    } catch (error) {
      geminiError = error;
    }
  }

  const fallbackReason = geminiError?.code || (process.env.GEMINI_API_KEY ? 'GEMINI_FAILED' : 'GEMINI_NOT_CONFIGURED');

  if (!allowPaidFallback) {
    if (geminiCandidate) {
      return {
        ...geminiCandidate,
        usage: {
          ...geminiCandidate.usage,
          paidFallbackBlocked: true,
          fallbackReason: 'PAID_FALLBACK_DISABLED',
          reviewRecommended: true,
        },
      };
    }

    const blocked = new Error(geminiError?.message || 'Gemini primary scan failed and paid fallback is disabled.');
    blocked.status = Number(geminiError?.status) || 502;
    blocked.code = geminiError?.code || 'GEMINI_FAILED';
    blocked.geminiError = geminiError?.message || '';
    blocked.geminiDetails = geminiError?.details || null;
    blocked.paidFallbackBlocked = true;
    throw blocked;
  }

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
