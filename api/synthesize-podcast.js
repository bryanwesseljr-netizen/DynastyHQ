import OpenAI from 'openai';
import { json, verifyFirebaseUser } from './_auth.js';
import { PODCAST_HOSTS } from '../src/domain/podcastShow.js';

const MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
export const config = { maxDuration: 60 };

const HOSTS = Object.fromEntries(PODCAST_HOSTS.map((host) => [host.id, {
  voice: host.voice,
  instructions: host.speechInstructions,
}]));

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
  if (!host || !input || input.length > 1800) return json(res, 400, { error: 'A valid podcast host and script segment are required.' });

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const speech = await client.audio.speech.create({
      model: MODEL,
      voice: host.voice,
      input,
      instructions: host.instructions,
      response_format: 'mp3',
    });
    const audioBase64 = Buffer.from(await speech.arrayBuffer()).toString('base64');
    return json(res, 200, {
      audioBase64,
      mimeType: 'audio/mpeg',
      model: MODEL,
      voice: host.voice,
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
