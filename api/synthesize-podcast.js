import OpenAI from 'openai';
import { json, verifyFirebaseUser } from './_auth.js';
import { PODCAST_HOSTS } from '../src/domain/podcastShow.js';

const MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
export const config = { maxDuration: 60 };

const HOSTS = Object.fromEntries(PODCAST_HOSTS.map((host) => [host.id, {
  voice: host.voice,
  instructions: host.speechInstructions,
}]));

const DELIVERY = Object.freeze({
  neutral: 'Use a relaxed conversational baseline. Vary sentence rhythm naturally and do not make every phrase land with equal emphasis.',
  curious: 'Sound genuinely curious, as if asking your cohost a real question. Let the question rise naturally without sounding like a scripted interviewer.',
  reflective: 'Slow slightly and sound thoughtful. Use small natural pauses around the key idea, as if considering it while speaking.',
  skeptical: 'Use respectful conversational pushback. Add subtle emphasis to the disagreement, but stay collegial and avoid debate-show aggression.',
  emphatic: 'Give the central football point extra conviction and energy while remaining controlled and conversational rather than announcer-like.',
  amused: 'Let a subtle smile come through in the voice. Keep it understated and natural; do not perform a laugh unless the text actually calls for one.',
  'quick-agreement': 'Deliver this a little quicker and lighter, like an immediate cohost reaction before the conversation moves forward.',
  analytical: 'Use a measured analytical cadence. Make numbers and comparisons easy to follow, with selective emphasis on the conclusion rather than every statistic.',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  if (!process.env.OPENAI_API_KEY) return json(res, 503, { error: 'Podcast audio is not configured yet.' });

  let user;
  try {
    user = await verifyFirebaseUser(req.headers.authorization);
  } catch (error) {
    console.error('Firebase token verification failed', error);
    return json(res, 503, { error: 'Could not verify the signed-in user.' });
  }
  if (!user) return json(res, 401, { error: 'Sign in before generating podcast audio.' });

  const host = HOSTS[req.body?.hostId];
  const input = String(req.body?.text || '').trim();
  const delivery = DELIVERY[String(req.body?.delivery || '').trim()] || DELIVERY.neutral;
  if (!host || !input || input.length > 1800) return json(res, 400, { error: 'A valid podcast host and script segment are required.' });

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const speech = await client.audio.speech.create({
      model: MODEL,
      voice: host.voice,
      input,
      instructions: `${host.instructions} ${delivery} Treat this as a response inside an ongoing two-person conversation, not isolated narration. Avoid a perfectly even cadence. Use natural micro-pauses, sentence-level pace changes, and selective conversational emphasis. Do not add words, filler, laughter, or sound effects that are not in the script.`,
      response_format: 'mp3',
    });
    const audioBase64 = Buffer.from(await speech.arrayBuffer()).toString('base64');
    return json(res, 200, {
      audioBase64,
      mimeType: 'audio/mpeg',
      model: MODEL,
      voice: host.voice,
      delivery: Object.keys(DELIVERY).find((key) => DELIVERY[key] === delivery) || 'neutral',
    });
  } catch (error) {
    console.error('OpenAI podcast speech generation failed', error);
    const status = error?.status === 429 ? 429 : 502;
    return json(res, status, {
      error: status === 429
        ? 'Podcast audio generation is temporarily busy. Try again shortly.'
        : 'That podcast segment could not be rendered.',
    });
  }
}
