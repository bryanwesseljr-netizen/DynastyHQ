import * as lame from '@breezystack/lamejs';
import { json, verifyFirebaseUser } from './_auth.js';

const MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview';
const MARK_VOICE = process.env.GEMINI_TTS_MARK_VOICE || 'Charon';
const SARAH_VOICE = process.env.GEMINI_TTS_SARAH_VOICE || 'Kore';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MAX_SEGMENTS = 20;
const MIN_TOTAL_WORDS = 450;
const MAX_TOTAL_WORDS = 1000;
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
  const desiredChunks = totalWords >= 720 ? 3 : 2;
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
    const reachedNaturalSize = currentWords >= targetWords * 0.82;

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
    ? `\n\n# PRIOR CONVERSATION CONTEXT — DO NOT SPEAK THIS\nThese are the final lines immediately before this section. Use them only to understand the conversational handoff and maintain the same calm studio tone. Do not repeat or paraphrase them.\n${priorContext}`
    : '';

  return `SYNTHESIZE ONLY THE TWO-SPEAKER SPOKEN TRANSCRIPT BELOW. This is section ${chunkIndex + 1} of ${chunkCount} of one continuous podcast episode. Speak only the transcript words. Never read headings, speaker labels, context text, or production notes aloud.\n\n# VOICE CHARACTER\nMark Thompson is an adult male college-football host: relaxed, knowledgeable, confident, and conversational. He sounds comfortable behind a microphone, not like an announcer and not like an actor trying to sound casual.\n\nSarah Chen is an adult female college-football analyst: clear, grounded, intelligent, and conversational. She can disagree naturally, but she does not perform skepticism, humor, or enthusiasm unless the actual sentence clearly calls for it.\n\n# STUDIO TONE\nMark and Sarah are longtime cohosts having an ordinary, informed conversation in a close-mic podcast studio. The default delivery is understated and natural. Most sentences should sound pleasantly neutral. Personality should come from wording and timing, not exaggerated pitch movement or vocal acting. Episode: ${clean(title, 220) || 'The Gridiron Grind'}.\n\n# DIRECTOR'S NOTES\n- Underplay the performance. Do less, not more.\n- Use normal human sentence melody. Do not add dramatic pitch swoops, sing-song cadence, artificial vocal smiles, or emphasized endings to ordinary sentences.\n- Do not force every question to sound highly curious or every disagreement to sound skeptical. Let punctuation and meaning create only the amount of inflection a real person would naturally use.\n- Keep volume, microphone distance, vocal weight, clarity, and timbre stable from the first line through the final line of this section.\n- Do not gradually become breathier, darker, softer, muffled, compressed, strained, metallic, or more theatrical as the section continues.\n- Keep a comfortable conversational pace. Small natural pace changes are fine, but avoid constantly speeding up and slowing down for effect.\n- Handoffs should feel responsive without sounding rushed. A short reply may be quicker; a longer analytical point may be slightly more measured.\n- Preserve exact wording. Add no filler words, laughter, side comments, sound effects, facts, or extra dialogue.\n- Both speakers should sound like the same people at the end of the section as they did at the beginning.\n${continuation}\n\n# SPOKEN TRANSCRIPT\n${transcript}`;
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
      const trimmedPcm = trimPcmEdges(rawPcm, sampleRate);
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
      engine: 'gemini-multispeaker-v3.1-restrained',
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
