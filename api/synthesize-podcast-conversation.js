import * as lame from '@breezystack/lamejs';
import { json, verifyFirebaseUser } from './_auth.js';
import {
  TARGET_SPEECH_DBFS,
  levelPcmSection,
  limitPcmEpisode,
} from './_podcastAudioLeveling.js';

const MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview';
export const DEFAULT_MARK_VOICE = 'Sadaltager';
export const DEFAULT_SARAH_VOICE = 'Sulafat';
const MARK_VOICE = process.env.GEMINI_TTS_MARK_VOICE || DEFAULT_MARK_VOICE;
const SARAH_VOICE = process.env.GEMINI_TTS_SARAH_VOICE || DEFAULT_SARAH_VOICE;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MAX_SEGMENTS = 20;
const MIN_TOTAL_WORDS = 400;
const MAX_TOTAL_WORDS = 1000;
export const TARGET_PERFORMANCE_WORDS = 170;
export const MAX_PERFORMANCE_WORDS = 220;
export const MIN_GEMINI_CALL_SPACING_MS = 6500;
const MAX_GEMINI_RETRY_WAIT_MS = 30_000;
const MIN_CHUNK_TURNS = 2;
const DEFAULT_SAMPLE_RATE = 24000;
const MP3_KBPS = 56;
const EDGE_PAD_MS = 70;

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

  const text = String(message || body?.error?.message || '');
  const messageMatch = text.match(/retry\s+in\s+([\d.]+)s/i);
  if (messageMatch) {
    const retryMs = Number(messageMatch[1]) * 1000;
    if (Number.isFinite(retryMs) && retryMs > 0) return Math.min(MAX_GEMINI_RETRY_WAIT_MS, Math.ceil(retryMs));
  }

  return null;
};

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

  const chunks = [];
  let current = [];
  let currentWords = 0;

  for (let index = 0; index < source.length; index += 1) {
    const segment = source[index];
    const segmentWords = countWords(segment?.text);

    if (
      current.length >= MIN_CHUNK_TURNS
      && hasBothSpeakers(current)
      && currentWords + segmentWords > MAX_PERFORMANCE_WORDS
    ) {
      chunks.push(current);
      current = [];
      currentWords = 0;
    }

    current.push(segment);
    currentWords += segmentWords;

    const next = source[index + 1];
    const nextWords = next ? countWords(next?.text) : 0;
    const reachedTarget = currentWords >= TARGET_PERFORMANCE_WORDS;
    const nextWouldRunLong = Boolean(next) && currentWords + nextWords > MAX_PERFORMANCE_WORDS;
    const canBreakNaturally = current.length >= MIN_CHUNK_TURNS && hasBothSpeakers(current);

    if (index < source.length - 1 && canBreakNaturally && (reachedTarget || nextWouldRunLong)) {
      chunks.push(current);
      current = [];
      currentWords = 0;
    }
  }

  if (current.length) {
    const previous = chunks[chunks.length - 1];
    const mergedWords = previous ? chunkWordCount(previous) + chunkWordCount(current) : Infinity;
    if (current.length === 1 && previous && mergedWords <= MAX_PERFORMANCE_WORDS + 40) {
      chunks[chunks.length - 1] = [...previous, ...current];
    } else {
      chunks.push(current);
    }
  }

  return chunks;
};

const contextFromSegments = (segments) => segments.slice(-2)
  .map((segment) => `${segment.speaker}: ${clean(segment.text, 420)}`)
  .join('\n');

export const buildPerformancePrompt = ({ title, segments, priorContext = '', chunkIndex = 0, chunkCount = 1 }) => {
  const transcript = segments.map((segment) => `${segment.speaker}: ${segment.text}`).join('\n');
  const continuation = priorContext
    ? `\n\nPRIOR CONTEXT — FOR CONTINUITY ONLY, DO NOT SPEAK:\n${priorContext}`
    : '';

  return `Perform only the Mark and Sarah transcript below as a polished, natural college-football podcast conversation. Preserve every spoken word exactly. Do not read speaker labels, headings, context or production notes.\n\nEpisode: ${clean(title, 220) || 'The Gridiron Grind'}${chunkCount > 1 ? ` · performance section ${chunkIndex + 1} of ${chunkCount}` : ''}\n\nVOICE AND PERFORMANCE:\n- Speaker labels are authoritative. Every Mark line must use Mark's assigned voice and every Sarah line must use Sarah's assigned voice. Switch speakers immediately at every label. Never merge the two voices or let one speaker take over the other speaker's lines.\n- Mark is the experienced lead host: warm, confident, curious and conversational. He should sound like a real sports-radio host talking with a colleague, with natural low-key enthusiasm, thoughtful reactions and varied cadence. He is not a stadium announcer and must never sound monotone or robotic.\n- Sarah is the sharp co-host and analyst: warm, articulate, engaged and comfortable challenging or building on a point. Give her natural energy, intelligent emphasis and conversational rhythm without making her overly bubbly or theatrical.\n- Let the meaning of the words drive realistic inflection. Scores, surprises, momentum swings, strong statistics, disagreement and questions should receive subtle human emphasis. Ordinary setup lines should stay relaxed.\n- Use natural phrase breaks, punctuation-driven pauses and small changes in pace so consecutive sentences do not all have the same melody. Sound like two people reacting to each other in a studio, not two narrators reading copy.\n- Keep both voices clear and full-range from the first word through the last. Maintain stable loudness, microphone distance and timbre. Do not gradually fade, whisper, muffle, lose energy, become metallic, or drift into a synthetic cadence as the section continues.\n- Match the perceived studio loudness of every performance section. Do not make a later section noticeably louder or quieter than an earlier section.\n- Start and finish this section at normal studio volume. Do not create a fade-in or fade-out.\n- Do not add new words, filler phrases, laughter, side comments or dialogue that is not in the transcript. Natural breathing and punctuation pauses are fine.\n${continuation}\n\nTRANSCRIPT:\n${transcript}`;
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

const callGemini = async (prompt) => {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(GEMINI_URL, {
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
      if (!response.ok) {
        const message = body?.error?.message || body?.error || `Gemini TTS request failed (${response.status}).`;
        const error = new Error(message);
        error.status = response.status;
        error.retryAfterMs = parseGeminiRetryDelayMs({ response, body, message });
        throw error;
      }

      const audio = audioFromInteraction(body);
      if (!audio?.data) {
        const error = new Error('Gemini returned no playable audio for this episode section.');
        error.status = 502;
        throw error;
      }
      return { audio, interaction: body };
    } catch (error) {
      lastError = error;
      const retryable = [429, 500, 502, 503, 504].includes(Number(error?.status));
      if (!retryable || attempt === 2) break;

      const waitMs = Number(error?.status) === 429
        ? Math.max(MIN_GEMINI_CALL_SPACING_MS, Number(error?.retryAfterMs) || 0) + 500
        : 700 * (attempt + 1);
      await sleep(Math.min(MAX_GEMINI_RETRY_WAIT_MS, waitMs));
    }
  }
  throw lastError || new Error('Gemini TTS did not return audio.');
};

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

  try {
    const transcriptChunks = partitionSegments(segments);
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
      const { audio } = await callGemini(prompt);
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
    const audioBase64 = mp3.toString('base64');

    if (Buffer.byteLength(audioBase64, 'utf8') > 4_000_000) {
      throw new Error('The compressed podcast exceeded the safe response size.');
    }

    return json(res, 200, {
      audioBase64,
      mimeType: 'audio/mpeg',
      model: MODEL,
      engine: 'gemini-multispeaker-v3.5-leveled-paced',
      voices: { mark: MARK_VOICE, sarah: SARAH_VOICE },
      transcriptTurns: segments.length,
      transcriptWords: totalWords,
      performanceSections: transcriptChunks.length,
      performanceSectionWords: transcriptChunks.map(chunkWordCount),
      loudnessTargetDbfs: TARGET_SPEECH_DBFS,
      loudnessAdjustments,
      episodePeakGainDb: roundedLevel(limitedEpisode.gainDb),
      sampleRate,
      mp3Kbps: MP3_KBPS,
    });
  } catch (error) {
    console.error('Gemini multispeaker podcast generation failed', error);
    const status = Number(error?.status) === 429 ? 429 : 502;
    const message = String(error?.message || '');
    return json(res, status, {
      error: status === 429
        ? 'Humanized podcast audio hit the current Gemini quota window. DynastyHQ waited and retried, but the quota is still busy. Wait about a minute and try again.'
        : /response size/i.test(message)
          ? 'The humanized mix rendered but was too large to return safely. Shorten the episode slightly and try again.'
          : 'The humanized two-host audio could not be rendered. Your saved transcript was not changed.',
    });
  }
}
