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

const normalizeUsage = ({ provider, model, usage = {}, fallbackUsed = false, fallbackReason = '' }) => ({
  provider,
  model,
  fallbackUsed,
  fallbackReason,
  inputTokens: Number(usage.promptTokenCount ?? usage.input_tokens ?? usage.inputTokens ?? 0) || 0,
  outputTokens: Number(usage.candidatesTokenCount ?? usage.output_tokens ?? usage.outputTokens ?? 0) || 0,
  totalTokens: Number(usage.totalTokenCount ?? usage.total_tokens ?? usage.totalTokens ?? 0) || 0,
});

const lowConfidenceAnalysis = (analysis) => {
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
          { text: `${instructions}\n\nTASK:\n${userText}` },
          { inlineData: { mimeType: image.mimeType, data: image.data } },
        ],
      }],
      generationConfig: {
        maxOutputTokens,
        temperature: 0,
        responseFormat: {
          text: {
            mimeType: 'application/json',
            schema,
          },
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Gemini vision request failed (${response.status}).`);
    error.status = response.status;
    error.code = payload?.error?.status || payload?.error?.code || 'GEMINI_REQUEST_FAILED';
    throw error;
  }

  const outputText = geminiText(payload);
  if (!outputText) {
    const error = new Error('Gemini returned no structured analysis.');
    error.code = 'GEMINI_EMPTY_OUTPUT';
    throw error;
  }

  return {
    analysis: JSON.parse(outputText),
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
  if (process.env.GEMINI_API_KEY) {
    try {
      const gemini = await requestGemini({ schema, instructions, userText, imageDataUrl, maxOutputTokens });
      if (!lowConfidenceAnalysis(gemini.analysis)) return gemini;
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
    if (geminiError && !process.env.OPENAI_API_KEY) throw geminiError;
    const combined = new Error(openAiError?.message || geminiError?.message || 'Vision analysis failed.');
    combined.status = openAiError?.status || geminiError?.status || 502;
    combined.code = openAiError?.code || geminiError?.code || 'VISION_ANALYSIS_FAILED';
    combined.geminiError = geminiError?.message || '';
    throw combined;
  }
};
