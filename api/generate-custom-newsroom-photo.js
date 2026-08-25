import { json, verifyFirebaseUser } from './_auth.js';

const MODEL = process.env.OPENAI_NEWSROOM_IMAGE_MODEL || 'gpt-image-2';
const OPENAI_IMAGE_URL = 'https://api.openai.com/v1/images';
const allowedReferenceHosts = new Set([
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
]);

export const config = { maxDuration: 120 };

const text = (value, maxLength) => String(value || '').trim().slice(0, maxLength);

const validReferenceUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (
      allowedReferenceHosts.has(url.hostname)
      || url.hostname.endsWith('.firebasestorage.app')
      || url.hostname.endsWith('.vercel-storage.com')
      || url.hostname.endsWith('.public.blob.vercel-storage.com')
    );
  } catch {
    return false;
  }
};

const openAiRequest = async (path, body) => {
  const response = await fetch(`${OPENAI_IMAGE_URL}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'OpenAI image generation failed.');
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }
  return payload;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  if (!process.env.OPENAI_API_KEY) return json(res, 503, { error: 'Custom newsroom image generation is not configured yet.' });

  let user;
  try {
    user = await verifyFirebaseUser(req.headers.authorization);
  } catch (error) {
    console.error('Firebase token verification failed', error);
    return json(res, 503, { error: 'Could not verify the signed-in user.' });
  }
  if (!user) return json(res, 401, { error: 'Sign in before generating a custom newsroom photo.' });

  const userPrompt = text(req.body?.prompt, 2200);
  const folderLabel = text(req.body?.folderLabel, 80) || 'Career';
  if (userPrompt.length < 12) return json(res, 400, { error: 'Write a little more detail about the photo you want to create.' });

  const references = (Array.isArray(req.body?.references) ? req.body.references : [])
    .filter((entry) => validReferenceUrl(entry?.imageUrl))
    .slice(0, 4)
    .map((entry) => ({ imageUrl: entry.imageUrl, label: text(entry.label, 120) || 'Approved reference' }));

  const referenceDirection = references.length
    ? `Use the approved reference images only to preserve the subject's facial identity, age, build, jersey number, equipment and other visible identity details when relevant. Do not copy the reference backgrounds. Reference labels: ${references.map((entry) => entry.label).join('; ')}.`
    : 'If the prompt calls for a recognizable player but no approved reference is supplied, keep the subject generic rather than inventing a specific real person.';

  const prompt = [
    `Create one photorealistic 3:2 editorial football photograph for the ${folderLabel} folder of a fictional DynastyHQ career photo library.`,
    `User creative direction: ${userPrompt}`,
    referenceDirection,
    'Make it look like a believable professional sports photograph rather than a poster, illustration, video-game screenshot, or AI collage.',
    'Use realistic anatomy, football equipment, stadium or practice-field details, natural lens behavior, believable lighting and restrained color grading.',
    'Do not add headlines, captions, watermarks, fake broadcast graphics, readable statistics, or unrelated text in the image.',
  ].join('\n');

  try {
    const common = {
      model: MODEL,
      prompt,
      n: 1,
      quality: 'medium',
      size: '1536x1024',
      output_format: 'jpeg',
      output_compression: 88,
      moderation: 'auto',
    };
    const result = references.length
      ? await openAiRequest('edits', {
          ...common,
          images: references.map((entry) => ({ image_url: entry.imageUrl })),
          input_fidelity: 'high',
        })
      : await openAiRequest('generations', common);

    const imageBase64 = result?.data?.[0]?.b64_json;
    if (!imageBase64) return json(res, 502, { error: 'The image model returned no usable image.' });

    return json(res, 200, {
      imageBase64,
      mimeType: 'image/jpeg',
      model: MODEL,
      referenceCount: references.length,
    });
  } catch (error) {
    console.error('OpenAI custom newsroom image generation failed', error);
    if (error?.code === 'moderation_blocked') {
      return json(res, 422, { error: 'That image request was blocked by a safety check. Adjust the prompt or approved references and try again.' });
    }
    return json(res, error?.status === 429 ? 429 : 502, {
      error: error?.status === 429
        ? 'Custom image generation is temporarily busy. Try again shortly.'
        : 'The custom newsroom photo could not be generated. Nothing was added to your library.',
    });
  }
}
