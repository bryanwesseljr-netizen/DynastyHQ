import { json, verifyFirebaseUser } from './_auth.js';

const MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview';
const MARK_VOICE = process.env.GEMINI_TTS_MARK_VOICE || 'Charon';
const SARAH_VOICE = process.env.GEMINI_TTS_SARAH_VOICE || 'Kore';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MAX_SEGMENTS = 20;
const MAX_TOTAL_WORDS = 1000;

export const config = { maxDuration: 120 };

const HOSTS = Object.freeze({
  'marcus-grant': { speaker: 'Mark', name: 'Mark Thompson' },
  'tyler-brooks': { speaker: 'Sarah', name: 'Sarah Chen' },
});

const DELIVERY_TAGS = Object.freeze({
  curious: '[curious]',
  reflective: '[reflective, slightly slower]',
  skeptical: '[skeptical]',
  emphatic: '[confident and emphatic]',
  amused: '[amused, with a subtle vocal smile]',
  'quick-agreement': '[quickly, like an immediate cohost reaction]',
  analytical: '[analytical and measured]',
  neutral: '',
});

const clean = (value, max = 2000) => String(value || '').trim().slice(0, max);
const countWords = (value) => clean(value, 20000).split(/\s+/).filter(Boolean).length;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeSegments = (rawSegments) => {
  if (!Array.isArray(rawSegments)) return [];
  return rawSegments.slice(0, MAX_SEGMENTS).map((segment, index) => {
    const host = HOSTS[segment?.hostId];
    const text = clean(segment?.text, 1900);
    if (!host || !text) return null;
    const deliveryStyle = Object.hasOwn(DELIVERY_TAGS, segment?.deliveryStyle)
      ? segment.deliveryStyle
      : 'neutral';
    return {
      id: clean(segment?.id, 80) || `turn-${index + 1}`,
      speaker: host.speaker,
      name: host.name,
      text,
      deliveryStyle,
    };
  }).filter(Boolean);
};

const buildPerformancePrompt = ({ title, segments }) => {
  const transcript = segments.map((segment) => {
    const tag = DELIVERY_TAGS[segment.deliveryStyle] || '';
    return `${segment.speaker}: ${tag ? `${tag} ` : ''}${segment.text}`;
  }).join('\n');

  return `SYNTHESIZE THE TWO-SPEAKER PODCAST PERFORMANCE BELOW. Speak only the words in the SPOKEN TRANSCRIPT. Do not read headings, speaker labels, bracketed performance tags, or production notes aloud.\n\n# AUDIO PROFILES\nMark Thompson is an adult male college-football podcast host. He is warm, charismatic, confident, quick on his feet, and sounds like a real football junkie rather than a broadcaster reading copy. He can make a strong take, smile through a line, and toss a question to his cohost naturally. His personality has energy and swagger without becoming a sports-radio caricature.\n\nSarah Chen is an adult female college-football analyst. She is sharp, personable, dryly funny when the moment allows it, and completely comfortable pushing back on Mark. She sounds intelligent without sounding formal. Her best moments feel spontaneous: quick agreement, a skeptical "yeah, but..." turn, or a concise point that makes Mark reconsider his angle.\n\n# THE SCENE\nMark and Sarah are longtime cohosts sitting across from each other in a modern, intimate college-football podcast studio. They know each other's rhythms. The mics are close, the room is relaxed, and this is a real conversation immediately after preparing the week's show. They are engaged with each other, not addressing an auditorium. The listener should feel like they are overhearing two knowledgeable friends talking ball. Episode: ${clean(title, 220) || 'The Gridiron Grind'}.\n\n# DIRECTOR'S NOTES\n- Human, fluid, charismatic and conversational are more important than "perfect" announcer diction.\n- Keep handoffs tight. Avoid dead air and avoid resetting the vocal energy at every speaker change.\n- Let reactions sound like reactions: a quick "right," a skeptical answer, a smile in the voice, or a slightly faster response should feel immediate.\n- Vary pace naturally inside sentences. Use small micro-pauses around important ideas rather than evenly spaced pauses after every clause.\n- Mark should sound warm and confident with an occasional playful edge. Sarah should sound sharp, grounded and comfortable challenging him.\n- Give both hosts personality and character, but never make them cartoonish, shouty, theatrical, or fake.\n- Do not add unscripted facts. Do not add filler words, laughter, coughs, sound effects, or extra dialogue unless an inline performance tag explicitly calls for it.\n- Preserve the exact spoken wording of the transcript.\n- Treat the bracketed tags as acting direction only. Never speak the tags.\n\n# SPOKEN TRANSCRIPT\n${transcript}`;
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
          response_format: {
            type: 'audio',
            mime_type: 'audio/mp3',
            bit_rate: 64000,
            delivery: 'inline',
          },
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
        const error = new Error('Gemini returned no playable audio for this episode.');
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  if (!process.env.GEMINI_API_KEY) {
    return json(res, 503, { error: 'Humanized podcast audio is not configured yet. Add GEMINI_API_KEY to the Vercel environment first.' });
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
  if (segments.length < 8 || totalWords < 500 || totalWords > MAX_TOTAL_WORDS) {
    return json(res, 400, { error: 'A complete two-host podcast transcript is required for humanized audio.' });
  }

  try {
    const prompt = buildPerformancePrompt({ title: req.body?.title, segments });
    const { audio } = await callGemini(prompt);
    const mimeType = audio.mime_type || audio.mimeType || 'audio/mpeg';
    return json(res, 200, {
      audioBase64: audio.data,
      mimeType,
      model: MODEL,
      engine: 'gemini-multispeaker-v3',
      voices: { mark: MARK_VOICE, sarah: SARAH_VOICE },
      transcriptTurns: segments.length,
      transcriptWords: totalWords,
    });
  } catch (error) {
    console.error('Gemini multispeaker podcast generation failed', error);
    const status = Number(error?.status) === 429 ? 429 : 502;
    return json(res, status, {
      error: status === 429
        ? 'Humanized podcast audio is temporarily busy. Try again shortly.'
        : 'The humanized two-host audio could not be rendered. Your saved transcript was not changed.',
    });
  }
}
