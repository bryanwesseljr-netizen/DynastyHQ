import * as lame from '@breezystack/lamejs';
import { json, verifyFirebaseUser } from './_auth.js';
import {
  TARGET_SPEECH_DBFS,
  levelPcmSection,
  limitPcmEpisode,
} from './_podcastAudioLeveling.js';

const MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview';
export const FALLBACK_MODEL = process.env.GEMINI_TTS_FALLBACK_MODEL || 'gemini-2.5-flash-preview-tts';
export const DEFAULT_MARK_VOICE = 'Sadaltager';
export const DEFAULT_SARAH_VOICE = 'Sulafat';
const MARK_VOICE = process.env.GEMINI_TTS_MARK_VOICE || DEFAULT_MARK_VOICE;
const SARAH_VOICE = process.env.GEMINI_TTS_SARAH_VOICE || DEFAULT_SARAH_VOICE;
const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const GEMINI_GENERATE_URL = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
const MAX_SEGMENTS = 20;
const MIN_TOTAL_WORDS = 400;
const MAX_TOTAL_WORDS = 1000;
export const TARGET_PERFORMANCE_WORDS = 420;
export const MAX_PERFORMANCE_WORDS = 560;
export const SINGLE_RENDER_MAX_WORDS = 560;
export const TWO_RENDER_MAX_WORDS = 820;
export const MIN_GEMINI_CALL_SPACING_MS = 6500;
export const MAX_GEMINI_RETRY_WAIT_MS = 75_000;
const MIN_CHUNK_TURNS = 2;
const DEFAULT_SAMPLE_RATE = 24000;
const MP3_KBPS = 56;
const EDGE_PAD_MS = 180;

export const config = { maxDuration: 180 };

const HOSTS = Object.freeze({
  'marcus-grant': { speaker: 'Mark', name: 'Mark Thompson' },
  'tyler-brooks': { speaker: 'Sarah', name: 'Sarah Chen' },
});

const clean = (value, max = 2000) => String(value || '').trim().slice(0, max);
const countWords = (value) => clean(value, 20000).split(/\s+/).filter(Boolean).length;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const parseGeminiRetryDelayMs = ({ response = null, body = null, message = '' } = {}) => {
  const headerSeconds = Number(response?.headers?.get?.('retry-after'));
  if (Number.isFinite(headerSeconds) && headerSeconds > 0) {
    return Math.min(MAX_GEMINI_RETRY_WAIT_MS, Math.ceil(headerSeconds * 1000));
  }

  const retryInfo = Array.isArray(body?.error?.details)
    ? body.error.details.find((detail) => /RetryInfo$/i.test(String(detail?.['@type'] || '')))
    : null;
  const retryDelay = String(retryInfo?.retryDelay || '');
  const retryInfoMatch = retryDelay.match(/^([\d.]+)s$/i);
  if (retryInfoMatch) {
    const retryMs = Number(retryInfoMatch[1]) * 1000;
    if (Number.isFinite(retryMs) && retryMs > 0) return Math.min(MAX_GEMINI_RETRY_WAIT_MS, Math.ceil(retryMs));
  }

  const retryText = String(message || body?.error?.message || '');
  const messageMatch = retryText.match(/retry\s+in\s+([\d.]+)s/i);
  if (messageMatch) {
    const retryMs = Number(messageMatch[1]) * 1000;
    if (Number.isFinite(retryMs) && retryMs > 0) return Math.min(MAX_GEMINI_RETRY_WAIT_MS, Math.ceil(retryMs));
  }

  return null;
};

export const geminiQuotaIds = (body = {}) => {
  const ids = [];
  for (const detail of Array.isArray(body?.error?.details) ? body.error.details : []) {
    for (const violation of Array.isArray(detail?.violations) ? detail.violations : []) {
      const id = String(violation?.quotaId || '').trim();
      if (id) ids.push(id);
    }
  }
  return [...new Set(ids)];
};

export const isDailyGeminiFreeTierQuota = (body = {}) => (
  geminiQuotaIds(body).some((quotaId) => /GenerateRequestsPerDayPerProjectPerModel-FreeTier/i.test(quotaId))
);

export const shouldRetryGeminiStatus = (status) => [500, 502, 503, 504].includes(Number(status));

const normalizeSegments = (rawSegments) => {
  if (!Array.isArray(rawSegments)) return [];
  return rawSegments.slice(0, MAX_SEGMENTS).map((segment, index) => {
    const host = HOSTS[segment?.hostId];
    const segmentText = clean(segment?.text, 1900);
    if (!host || !segmentText) return null;
    return {
      id: clean(segment?.id, 80) || `turn-${index + 1}`,
      speaker: host.speaker,
      name: host.name,
      text: segmentText,
    };
  }).filter(Boolean);
};

const chunkWordCount = (segments) => segments.reduce((total, segment) => total + countWords(segment?.text), 0);
const hasBothSpeakers = (segments) => new Set(segments.map((segment) => segment?.speaker).filter(Boolean)).size >= 2;

export const partitionSegments = (segments) => {
  const source = Array.isArray(segments) ? segments.filter(Boolean) : [];
  if (!source.length) return [];

  const totalWords = chunkWordCount(source);
  const desiredChunkCount = totalWords <= SINGLE_RENDER_MAX_WORDS
    ? 1
    : totalWords <= TWO_RENDER_MAX_WORDS
      ? 2
      : 3;

  if (desiredChunkCount === 1) return [source];

  const chunks = [];
  let current = [];
  let currentWords = 0;
  let assignedWords = 0;

  for (let index = 0; index < source.length; index += 1) {
    const segment = source[index];
    current.push(segment);
    currentWords += countWords(segment?.text);

    const chunksStillNeeded = desiredChunkCount - chunks.length;
    const futureChunks = chunksStillNeeded - 1;
    if (futureChunks <= 0 || index >= source.length - 1) continue;

    const turnsRemaining = source.length - index - 1;
    const enoughTurnsRemain = turnsRemaining >= futureChunks * MIN_CHUNK_TURNS;
    const wordsRemainingIncludingCurrent = totalWords - assignedWords;
    const balancedTarget = wordsRemainingIncludingCurrent / chunksStillNeeded;
    const canBreakNaturally = current.length >= MIN_CHUNK_TURNS && hasBothSpeakers(current);

    if (enoughTurnsRemain && canBreakNaturally && currentWords >= balancedTarget) {
      chunks.push(current);
      assignedWords += currentWords;
      current = [];
      currentWords = 0;
    }
  }

  if (current.length) chunks.push(current);

  while (chunks.length > desiredChunkCount) {
    const tail = chunks.pop();
    chunks[chunks.length - 1] = [...(chunks[chunks.length - 1] || []), ...tail];
  }

  return chunks;
};

const contextFromSegments = (segments) => segments.slice(-2)
  .map((segment) => `${segment.speaker}: ${clean(segment.text, 420)}`)
  .join('\n');

export const buildPerformancePrompt = ({ title, segments, priorContext = '', chunkIndex = 0, chunkCount = 1 }) => {
  const transcript = segments.map((segment) => `${segment.speaker}: ${segment.text}`).join('\n');
  const continuation = priorContext
    ? `\n\nPRIOR CONTEXT — continuity reference only; do not speak it:\n${priorContext}`
    : '';

  return `Read only the Mark and Sarah transcript below as one relaxed, continuous college-football studio conversation. Preserve every spoken word exactly. Do not read speaker labels, headings, context or production notes.\n\nEpisode: ${clean(title, 220) || 'The Gridiron Grind'}${chunkCount > 1 ? ` · section ${chunkIndex + 1} of ${chunkCount}` : ''}\n\nVOICE ANCHORS:\n- Speaker labels are absolute. Mark always uses Mark's assigned voice. Sarah always uses Sarah's assigned voice. Switch immediately at each label and never let one voice take the other speaker's line.\n- Lock each host's identity from the first sentence: keep the same apparent age, pitch range, accent, timbre and vocal weight for that host for the entire section. Do not morph, drift, become gravelly, metallic, nasal, unusually deep or unusually high as the conversation continues.\n- Keep both hosts at a consistent conversational microphone distance and perceived loudness. Neither host should suddenly become louder, softer, breathier or more compressed than before.\n\nCONVERSATION FEEL:\n- Sound like two colleagues sitting across from each other talking through a football game, not announcers performing a script. Keep the energy easy and believable.\n- Let the actual wording and punctuation create the inflection. A surprising result, a question or a strong football point can naturally lift the delivery; ordinary analysis should stay relaxed. Do not force emotion onto every sentence.\n- Use natural phrase breaks and tight handoffs. Avoid long dramatic pauses between speakers.\n- Small human texture is good when it happens naturally: a quiet breath, a tiny hesitation or a brief thinking pause. Do not force these quirks, repeat them on a pattern, or add new spoken words that are not in the transcript.\n- A sentence fragment or self-correction already written into the transcript should sound spontaneous rather than over-enunciated.\n- Do not add laughter, ad-libs, new filler words or commentary.\n- Start and finish at normal studio volume. Do not fade in or fade out.\n${continuation}\n\nTRANSCRIPT:\n${transcript}`;
};

const audioFromInteraction = (interaction) => {
  if (interaction?.output_audio?.data) return interaction.output_audio;
  for (const step of interaction?.steps || []) {
    if (step?.type !== 'model_output') continue;
    const audio = (step.content || []).find((entry) => entry?.type === 'audio' && entry?.data);
    if (audio) return audio;
  }
  return null;
};

const quotaAwareError = ({ response, body, model }) => {
  const message = body?.error?.message || body?.error || `Gemini TTS request failed (${response.status}).`;
  const error = new Error(message);
  error.status = response.status;
  error.model = model;
  error.retryAfterMs = parseGeminiRetryDelayMs({ response, body, message });
  error.quotaIds = geminiQuotaIds(body);
  error.dailyQuotaExceeded = isDailyGeminiFreeTierQuota(body);
  return error;
};

const withTransientRetries = async (request) => {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (!shouldRetryGeminiStatus(error?.status) || attempt === 2) break;
      await sleep(700 * (attempt + 1));
    }
  }
  throw lastError || new Error('Gemini TTS did not return audio.');
};

const callGemini31 = (prompt) => withTransientRetries(async () => {
  const response = await fetch(GEMINI_INTERACTIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY,
      'Api-Revision': '2026-05-20',
    },
    body: JSON.stringify({
      model: MODEL,
      input: prompt,
      response_format: { type: 'audio' },
      generation_config: {
        speech_config: [
          { speaker: 'Mark', voice: MARK_VOICE },
          { speaker: 'Sarah', voice: SARAH_VOICE },
        ],
      },
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw quotaAwareError({ response, body, model: MODEL });

  const audio = audioFromInteraction(body);
  if (!audio?.data) {
    const error = new Error('Gemini 3.1 returned no playable audio for this episode section.');
    error.status = 502;
    error.model = MODEL;
    throw error;
  }
  return { audio, model: MODEL };
});

const callGemini25 = (prompt) => withTransientRetries(async () => {
  const response = await fetch(GEMINI_GENERATE_URL(FALLBACK_MODEL), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Mark',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: MARK_VOICE } },
              },
              {
                speaker: 'Sarah',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: SARAH_VOICE } },
              },
            ],
          },
        },
      },
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw quotaAwareError({ response, body, model: FALLBACK_MODEL });

  const part = body?.candidates?.[0]?.content?.parts?.find((entry) => entry?.inlineData?.data);
  if (!part?.inlineData?.data) {
    const error = new Error('Gemini 2.5 returned no playable audio for this episode section.');
    error.status = 502;
    error.model = FALLBACK_MODEL;
    throw error;
  }

  return {
    audio: {
      data: part.inlineData.data,
      sample_rate: DEFAULT_SAMPLE_RATE,
      mimeType: part.inlineData.mimeType || 'audio/L16;codec=pcm;rate=24000',
    },
    model: FALLBACK_MODEL,
  };
});

const trimPcmEdges = (pcmBuffer, sampleRate) => {
  const evenLength = pcmBuffer.length - (pcmBuffer.length % 2);
  if (evenLength < 4) return pcmBuffer.subarray(0, evenLength);

  const sampleCount = evenLength / 2;
  const threshold = 220;
  let firstSound = 0;
  let lastSound = sampleCount - 1;

  while (firstSound < sampleCount && Math.abs(pcmBuffer.readInt16LE(firstSound * 2)) <= threshold) firstSound += 1;
  while (lastSound > firstSound && Math.abs(pcmBuffer.readInt16LE(lastSound * 2)) <= threshold) lastSound -= 1;
  if (firstSound >= sampleCount) return pcmBuffer.subarray(0, evenLength);

  const padSamples = Math.max(1, Math.round((Number(sampleRate) || DEFAULT_SAMPLE_RATE) * EDGE_PAD_MS / 1000));
  const startSample = Math.max(0, firstSound - padSamples);
  const endSample = Math.min(sampleCount, lastSound + padSamples + 1);
  return pcmBuffer.subarray(startSample * 2, endSample * 2);
};

const pcmBufferToInt16 = (pcmBuffer) => {
  const byteLength = pcmBuffer.byteLength - (pcmBuffer.byteLength % 2);
  return new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, byteLength / 2);
};

const encodePcmToMp3 = ({ pcmBuffer, sampleRate = DEFAULT_SAMPLE_RATE }) => {
  if (!pcmBuffer?.length || pcmBuffer.length < 2) throw new Error('Gemini returned an empty PCM audio payload.');
  const samples = pcmBufferToInt16(pcmBuffer);
  const encoder = new lame.Mp3Encoder(1, Number(sampleRate) || DEFAULT_SAMPLE_RATE, MP3_KBPS);
  const chunks = [];
  const blockSize = 1152;

  for (let index = 0; index < samples.length; index += blockSize) {
    const encoded = encoder.encodeBuffer(samples.subarray(index, Math.min(index + blockSize, samples.length)));
    if (encoded?.length) chunks.push(Buffer.from(encoded));
  }

  const tail = encoder.flush();
  if (tail?.length) chunks.push(Buffer.from(tail));
  if (!chunks.length) throw new Error('The PCM-to-MP3 encoder returned no audio.');
  return Buffer.concat(chunks);
};

const roundedLevel = (value) => Number.isFinite(value) ? Number(value.toFixed(1)) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  if (!process.env.GEMINI_API_KEY) {
    return json(res, 503, { error: 'Humanized podcast audio is not configured in this deployment. Add GEMINI_API_KEY to this Vercel environment and redeploy.' });
  }

  let user;
  try {
    user = await verifyFirebaseUser(req.headers.authorization);
  } catch (error) {
    console.error('Firebase token verification failed', error);
    return json(res, 503, { error: 'Could not verify the signed-in user.' });
  }
  if (!user) return json(res, 401, { error: 'Sign in before generating podcast audio.' });

  const segments = normalizeSegments(req.body?.segments);
  const totalWords = segments.reduce((total, segment) => total + countWords(segment.text), 0);
  if (segments.length < 10 || totalWords < MIN_TOTAL_WORDS || totalWords > MAX_TOTAL_WORDS) {
    return json(res, 400, { error: 'A complete two-host podcast transcript is required for humanized audio.' });
  }

  let activeModel = MODEL;
  let usedFallback = false;

  try {
    const transcriptChunks = partitionSegments(segments);
    console.info('Humanized podcast render plan', {
      transcriptTurns: segments.length,
      transcriptWords: totalWords,
      performanceSections: transcriptChunks.length,
      performanceSectionWords: transcriptChunks.map(chunkWordCount),
      primaryModel: MODEL,
      fallbackModel: FALLBACK_MODEL,
    });

    const pcmChunks = [];
    const loudnessAdjustments = [];
    let sampleRate = DEFAULT_SAMPLE_RATE;
    let priorSegments = [];

    for (let index = 0; index < transcriptChunks.length; index += 1) {
      if (index > 0) await sleep(MIN_GEMINI_CALL_SPACING_MS);

      const chunk = transcriptChunks[index];
      const prompt = buildPerformancePrompt({
        title: req.body?.title,
        segments: chunk,
        priorContext: contextFromSegments(priorSegments),
        chunkIndex: index,
        chunkCount: transcriptChunks.length,
      });

      let rendered;
      if (activeModel === FALLBACK_MODEL) {
        rendered = await callGemini25(prompt);
      } else {
        try {
          rendered = await callGemini31(prompt);
        } catch (error) {
          if (Number(error?.status) !== 429 || !FALLBACK_MODEL || FALLBACK_MODEL === MODEL) throw error;
          activeModel = FALLBACK_MODEL;
          usedFallback = true;
          console.warn('Primary Gemini TTS quota unavailable; switching this episode to the fallback model', {
            primaryModel: MODEL,
            fallbackModel: FALLBACK_MODEL,
            dailyQuotaExceeded: Boolean(error?.dailyQuotaExceeded),
            quotaIds: error?.quotaIds || [],
          });
          rendered = await callGemini25(prompt);
        }
      }

      activeModel = rendered.model || activeModel;
      const audio = rendered.audio;
      const chunkSampleRate = Number(audio.sample_rate || audio.sampleRate) || DEFAULT_SAMPLE_RATE;
      if (index === 0) sampleRate = chunkSampleRate;
      if (chunkSampleRate !== sampleRate) throw new Error('Gemini returned inconsistent sample rates across podcast sections.');

      const rawPcm = Buffer.from(audio.data, 'base64');
      const trimmedPcm = transcriptChunks.length === 1 ? rawPcm : trimPcmEdges(rawPcm, sampleRate);
      if (trimmedPcm.length < sampleRate) throw new Error('Gemini returned an incomplete podcast audio section.');

      const leveled = levelPcmSection(trimmedPcm, sampleRate);
      pcmChunks.push(leveled.pcmBuffer);
      loudnessAdjustments.push({
        section: index + 1,
        beforeDbfs: roundedLevel(leveled.beforeDbfs),
        afterDbfs: roundedLevel(leveled.afterDbfs),
        gainDb: roundedLevel(leveled.gainDb),
        peakDbfs: roundedLevel(leveled.peakDbfs),
      });
      priorSegments = [...priorSegments, ...chunk].slice(-2);
    }

    const limitedEpisode = limitPcmEpisode(Buffer.concat(pcmChunks));
    const continuousPcm = limitedEpisode.pcmBuffer;
    const mp3 = encodePcmToMp3({ pcmBuffer: continuousPcm, sampleRate });
    const engine = usedFallback
      ? 'gemini-multispeaker-v3.8-fallback-reference-cadence'
      : 'gemini-multispeaker-v3.8-reference-cadence';

    console.info('Humanized podcast render completed', {
      transcriptWords: totalWords,
      performanceSections: transcriptChunks.length,
      responseBytes: mp3.length,
      model: activeModel,
      usedFallback,
      loudnessTargetDbfs: TARGET_SPEECH_DBFS,
      loudnessAdjustments,
      episodePeakGainDb: roundedLevel(limitedEpisode.gainDb),
      sampleRate,
      mp3Kbps: MP3_KBPS,
      voices: { mark: MARK_VOICE, sarah: SARAH_VOICE },
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(mp3.length));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-DynastyHQ-Model', activeModel);
    res.setHeader('X-DynastyHQ-Engine', engine);
    res.setHeader('X-DynastyHQ-Transcript-Words', String(totalWords));
    res.setHeader('X-DynastyHQ-Performance-Sections', String(transcriptChunks.length));
    res.setHeader('X-DynastyHQ-TTS-Fallback', usedFallback ? '1' : '0');
    return res.end(mp3);
  } catch (error) {
    console.error('Gemini multispeaker podcast generation failed', error);
    const status = Number(error?.status) === 429 ? 429 : 502;

    if (status === 429) {
      if (error?.dailyQuotaExceeded) {
        return json(res, 429, {
          error: usedFallback
            ? 'Both available Gemini TTS free-tier daily quotas are exhausted for this project. Daily Gemini quotas reset at midnight Pacific time. Your saved transcript was not changed.'
            : 'Gemini TTS has reached its free-tier daily request limit for this project. Daily Gemini quotas reset at midnight Pacific time. Your saved transcript was not changed.',
          quotaType: 'daily',
          model: error?.model || activeModel,
        });
      }

      const retrySeconds = Math.max(1, Math.ceil((Number(error?.retryAfterMs) || 60_000) / 1000));
      res.setHeader('Retry-After', String(retrySeconds));
      return json(res, 429, {
        error: `Gemini's humanized-audio rate limit is temporarily busy. Try again in about ${retrySeconds} seconds.`,
        retryAfterSeconds: retrySeconds,
        quotaType: 'temporary',
        model: error?.model || activeModel,
      });
    }

    return json(res, status, {
      error: 'The humanized two-host audio could not be rendered. Your saved transcript was not changed.',
    });
  }
}
