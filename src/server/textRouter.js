import OpenAI from 'openai';

export const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL
  || process.env.GEMINI_VISION_MODEL
  || 'gemini-3.1-flash-lite';

const modelList = (value = '') => String(value)
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

export const GEMINI_TEXT_FALLBACK_MODELS = modelList(
  process.env.GEMINI_TEXT_FALLBACK_MODELS || 'gemini-3.5-flash,gemini-3.6-flash',
);
export const GEMINI_TEXT_MODELS = [...new Set([GEMINI_TEXT_MODEL, ...GEMINI_TEXT_FALLBACK_MODELS])];

export const OPENAI_TEXT_FALLBACK_MODEL = process.env.OPENAI_TEXT_FALLBACK_MODEL || 'gpt-5.6-terra';

const GEMINI_GENERATE_URL = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

const cleanJsonText = (value) => String(value || '')
  .trim()
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/\s*```$/i, '')
  .trim();

const extractGeminiText = (body = {}) => (body?.candidates || [])
  .flatMap((candidate) => candidate?.content?.parts || [])
  .map((part) => part?.text || '')
  .join('')
  .trim();

export const extractFirstJsonValue = (value) => {
  const text = cleanJsonText(value);
  const objectStart = text.indexOf('{');
  const arrayStart = text.indexOf('[');
  const starts = [objectStart, arrayStart].filter((index) => index >= 0);
  if (!starts.length) return '';

  const start = Math.min(...starts);
  const stack = [];
  let inString = false;
  let escaping = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === '\\') {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{' || char === '[') {
      stack.push(char);
      continue;
    }

    if (char !== '}' && char !== ']') continue;
    const expected = char === '}' ? '{' : '[';
    if (stack[stack.length - 1] !== expected) return '';
    stack.pop();
    if (!stack.length) return text.slice(start, index + 1);
  }

  return '';
};

export const parseJson = (value, provider) => {
  const text = cleanJsonText(value);
  if (!text) {
    const error = new Error(`${provider} returned no text.`);
    error.provider = provider;
    error.status = 502;
    throw error;
  }

  try {
    return JSON.parse(text);
  } catch (cause) {
    const recovered = extractFirstJsonValue(text);
    if (recovered && recovered !== text) {
      try {
        return JSON.parse(recovered);
      } catch {
        // Fall through to the original provider error below.
      }
    }

    const error = new Error(`${provider} returned invalid JSON.`);
    error.provider = provider;
    error.status = 502;
    error.cause = cause;
    throw error;
  }
};

const schemaPrompt = (schemaName, schema) => [
  'Return ONLY valid JSON. Do not wrap it in markdown or add commentary.',
  `The response must follow the ${schemaName || 'requested'} JSON shape below.`,
  JSON.stringify(schema || {}, null, 2),
].join('\n');

const callGeminiText = async ({
  instructions,
  input,
  schema,
  schemaName,
  maxOutputTokens,
  temperature,
  model = GEMINI_TEXT_MODEL,
}) => {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error('Gemini text generation is not configured.');
    error.provider = 'gemini';
    error.code = 'GEMINI_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }

  const response = await fetch(GEMINI_GENERATE_URL(model), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{
          text: `${instructions}\n\n${schemaPrompt(schemaName, schema)}\n\n${input}`,
        }],
      }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: 'application/json',
      },
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Gemini text generation failed (${response.status}).`);
    error.provider = 'gemini';
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return {
    data: parseJson(extractGeminiText(body), 'Gemini'),
    provider: 'gemini',
    model,
  };
};

const retryableGeminiStatus = (status) => {
  const code = Number(status) || 0;
  return code === 404 || code === 408 || code === 425 || code === 429 || code >= 500;
};

const callGeminiTextFreeChain = async (options) => {
  const attempts = [];
  for (const model of GEMINI_TEXT_MODELS) {
    try {
      return await callGeminiText({ ...options, model });
    } catch (error) {
      attempts.push({
        model,
        status: Number(error?.status) || 0,
        code: error?.code || '',
        message: error?.message || 'Gemini request failed.',
      });
      if (!retryableGeminiStatus(error?.status)) {
        error.geminiAttempts = attempts;
        throw error;
      }
    }
  }

  const last = attempts.at(-1) || {};
  const error = new Error('All configured free-tier Gemini text models are temporarily unavailable.');
  error.provider = 'gemini';
  error.code = 'GEMINI_FREE_MODELS_UNAVAILABLE';
  error.status = last.status || 503;
  error.geminiAttempts = attempts;
  throw error;
};

const callOpenAiText = async ({
  instructions,
  input,
  schema,
  schemaName,
  maxOutputTokens,
  safetyIdentifier,
  openAiModel,
}) => {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('OpenAI text fallback is not configured.');
    error.provider = 'openai';
    error.code = 'OPENAI_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: openAiModel || OPENAI_TEXT_FALLBACK_MODEL,
    safety_identifier: safetyIdentifier,
    reasoning: { effort: 'low' },
    max_output_tokens: maxOutputTokens,
    instructions,
    input: [{ role: 'user', content: [{ type: 'input_text', text: input }] }],
    text: {
      format: {
        type: 'json_schema',
        name: schemaName || 'dynastyhq_text_response',
        strict: true,
        schema,
      },
    },
  });

  return {
    data: parseJson(response.output_text, 'OpenAI'),
    provider: 'openai',
    model: openAiModel || OPENAI_TEXT_FALLBACK_MODEL,
  };
};

export const generateTextFreeFirst = async ({
  instructions,
  input,
  schema,
  schemaName,
  maxOutputTokens = 8192,
  temperature = 0.35,
  safetyIdentifier,
  openAiModel = OPENAI_TEXT_FALLBACK_MODEL,
  allowPaidFallback = process.env.ALLOW_PAID_TEXT_FALLBACK === 'true',
}) => {
  let geminiError = null;
  try {
    return await callGeminiTextFreeChain({
      instructions,
      input,
      schema,
      schemaName,
      maxOutputTokens,
      temperature,
    });
  } catch (error) {
    geminiError = error;
  }

  if (allowPaidFallback) {
    try {
      return await callOpenAiText({
        instructions,
        input,
        schema,
        schemaName,
        maxOutputTokens,
        safetyIdentifier,
        openAiModel,
      });
    } catch (openAiError) {
      const error = new Error('DynastyHQ text generation providers are temporarily unavailable.');
      error.code = 'TEXT_GENERATION_UNAVAILABLE';
      error.status = openAiError?.status || geminiError?.status || 502;
      error.primaryError = geminiError;
      error.fallbackError = openAiError;
      throw error;
    }
  }

  const error = new Error('All configured free-tier Gemini text models are temporarily unavailable and paid fallback is disabled.');
  error.code = 'TEXT_GENERATION_UNAVAILABLE';
  error.status = geminiError?.status || 502;
  error.primaryError = geminiError;
  error.paidFallbackBlocked = true;
  throw error;
};
