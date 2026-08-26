import legacyHandler from './synthesize-podcast-conversation.js';
import { json } from './_auth.js';

export const config = { maxDuration: 180 };

const parseJson = (value) => {
  try {
    return JSON.parse(String(value || ''));
  } catch {
    return {};
  }
};

export default async function handler(req, res) {
  let statusCode = 200;
  let capturedBody = '';
  const capturedHeaders = new Map();

  const captureRes = {
    status(code) {
      statusCode = Number(code) || 200;
      return this;
    },
    setHeader(name, value) {
      capturedHeaders.set(String(name || '').toLowerCase(), value);
      return this;
    },
    end(body = '') {
      capturedBody = body;
      return body;
    },
  };

  await legacyHandler(req, captureRes);

  const payload = parseJson(capturedBody);
  if (statusCode < 200 || statusCode >= 300) {
    return json(res, statusCode, payload?.error ? payload : { error: 'Humanized podcast audio could not be rendered.' });
  }

  const audioBase64 = String(payload?.audioBase64 || '');
  if (!audioBase64) return json(res, 502, { error: 'The humanized audio renderer returned no playable MP3.' });

  const audio = Buffer.from(audioBase64, 'base64');
  if (!audio.length) return json(res, 502, { error: 'The humanized audio renderer returned an empty MP3.' });

  console.info('Humanized podcast binary transport', {
    transcriptWords: payload?.transcriptWords || 0,
    transcriptTurns: payload?.transcriptTurns || 0,
    performanceSections: payload?.performanceSections || 0,
    mp3Bytes: audio.length,
    base64Bytes: Buffer.byteLength(audioBase64, 'utf8'),
  });

  res.status(200);
  res.setHeader('Content-Type', payload?.mimeType || 'audio/mpeg');
  res.setHeader('Content-Length', String(audio.length));
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-DynastyHQ-Model', String(payload?.model || 'gemini-multispeaker'));
  res.setHeader('X-DynastyHQ-Engine', String(payload?.engine || 'gemini-multispeaker-v3'));
  res.setHeader('X-DynastyHQ-Transcript-Words', String(payload?.transcriptWords || 0));
  res.setHeader('X-DynastyHQ-Performance-Sections', String(payload?.performanceSections || 0));
  return res.end(audio);
}
