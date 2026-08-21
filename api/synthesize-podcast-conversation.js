import * as lame from '@breezystack/lamejs';
import { json, verifyFirebaseUser } from './_auth.js';

const MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview';
const MARK_VOICE = process.env.GEMINI_TTS_MARK_VOICE || 'Charon';
const SARAH_VOICE = process.env.GEMINI_TTS_SARAH_VOICE || 'Kore';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MAX_SEGMENTS = 20;
const MIN_TOTAL_WORDS = 400;
const MAX_TOTAL_WORDS = 1000;
const SINGLE_RENDER_MAX_WORDS = 600;
const THREE_RENDER_MIN_WORDS = 851;
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

const partitionSegments = (segments) => {
  const totalWords = segments.reduce((total, segment) => total + countWords(segment.text), 0);
  if (totalWords <= SINGLE_RENDER_MAX_WORDS) return [segments];

  const desiredChunks = totalWords >= THREE_RENDER_MIN_WORDS ? 3 : 2;
  const targetWords = totalWords / desiredChunks;
  const chunks = [];
  let current = [];
  let currentWords = 0;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    current.push(segment);
    currentWords += countWords(segment.text);

    const remainingSegments = segments.length - index - 1;
    const chunksStillNeeded = desiredChunks - chunks.length - 1;
    const enoughTurnsRemain = remainingSegments >= Math.max(2, chunksStillNeeded * 2);
    const reachedNaturalSize = currentWords >= targetWords * 0.86;

    if (chunks.length < desiredChunks - 1 && enoughTurnsRemain && reachedNaturalSize) {
      chunks.push(current);
      current = [];
      currentWords = 0;
    }
  }

  if (current.length) chunks.push(current);
  return chunks;
};

const contextFromSegments = (segments) => segments.slice(-2)
  .map((segment) => `${segment.speaker}: ${clean(segment.text, 420)}`)
  .join('\n');

const buildPerformancePrompt = ({ title, segments, priorContext = '', chunkIndex = 0, chunkCount = 1 }) => {
  const transcript = segments.map((segment) => `${segment.speaker}: ${segment.text}`).join('\n');
  const continuation = priorContext
    ? `\n\nPRIOR CONTEXT — DO NOT SPEAK:\n${priorContext}`
    : '';

  return `Speak only the Mark and Sarah transcript below. Preserve every spoken word exactly. Do not read labels, headings, context or production notes.\n\nEpisode: ${clean(title, 220) || 'The Gridiron Grind'}${chunkCount > 1 ? ` · section ${chunkIndex + 1} of ${chunkCount}` : ''}\n\nVOICE AND DELIVERY:\n- Use the assigned Mark voice for every Mark line and the assigned Sarah voice for every Sarah line. Keep each speaker's identity, pitch range, timbre, loudness and microphone distance consistent throughout this render.\n- Delivery should be plain, calm and conversational, like a knowledgeable sports podcast recorded in a studio.\n- Most sentences should be neutral and matter-of-fact. Use only modest natural inflection required by punctuation and meaning.\n- Do not act, dramatize, perform enthusiasm, manufacture skepticism, add vocal smiles, exaggerate questions, punch ordinary words, or create sing-song sentence endings.\n- Do not add laughter, filler words, breaths for effect, side comments or extra dialogue.\n- Keep the pace steady and comfortable.\n- The transcript wording provides the personality; the voices should not add another layer of performance.\n${continuation}\n\nTRANSCRIPT:\n${transcript}`;
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
      await sleep(700 * (attempt + 1));
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  if (!process.env.GEMINI_API_KEY) {
    return json(res, 503, { error: 'Humanized podcast audio is not configured in this deployment. Add GEMINI_API_KEY to the Vercel Preview environment and redeploy.' });
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
    let sampleRate = DEFAULT_SAMPLE_RATE;
    let priorSegments = [];

    for (let index = 0; index < transcriptChunks.length; index += 1) {
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
      pcmChunks.push(trimmedPcm);
      priorSegments = [...priorSegments, ...chunk].slice(-2);
    }

    const continuousPcm = Buffer.concat(pcmChunks);
    const mp3 = encodePcmToMp3({ pcmBuffer: continuousPcm, sampleRate });
    const audioBase64 = mp3.toString('base64');

    if (Buffer.byteLength(audioBase64, 'utf8') > 4_000_000) {
      throw new Error('The compressed podcast exceeded the safe response size.');
    }

    return json(res, 200, {
      audioBase64,
      mimeType: 'audio/mpeg',
      model: MODEL,
      engine: 'gemini-multispeaker-v3.2-stable',
      voices: { mark: MARK_VOICE, sarah: SARAH_VOICE },
      transcriptTurns: segments.length,
      transcriptWords: totalWords,
      performanceSections: transcriptChunks.length,
      sampleRate,
      mp3Kbps: MP3_KBPS,
    });
  } catch (error) {
    console.error('Gemini multispeaker podcast generation failed', error);
    const status = Number(error?.status) === 429 ? 429 : 502;
    const message = String(error?.message || '');
    return json(res, status, {
      error: status === 429
        ? 'Humanized podcast audio is temporarily busy. Try again shortly.'
        : /response size/i.test(message)
          ? 'The humanized mix rendered but was too large to return safely. Shorten the episode slightly and try again.'
          : 'The humanized two-host audio could not be rendered. Your saved transcript was not changed.',
    });
  }
}
