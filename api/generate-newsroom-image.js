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
    );
  } catch {
    return false;
  }
};

const createPrompt = ({ issue, article, references }) => {
  const referenceDirection = references.length
    ? `Use the approved reference images only to preserve the subject's facial identity, age, build, uniform, jersey number, equipment, and handedness. Do not copy their backgrounds. Reference labels: ${references.map((entry) => entry.label).join('; ')}.`
    : 'Create an atmospheric football editorial scene without a recognizable real person as the central subject.';

  return [
    'Create one photorealistic 3:2 editorial sports photograph for a fictional DynastyHQ college-football newsroom.',
    `Publication: Season ${issue.season}, Week ${issue.week}. Outlet: ${article.outletName}, ${article.desk}.`,
    `Verified article headline: ${article.headline}`,
    `Verified article summary: ${article.dek}`,
    referenceDirection,
    'Match only what the verified headline and summary support. Do not invent a score, ranking, award, injury, opponent logo, quote, venue, weather condition, or specific play outcome.',
    'Do not render headlines, captions, watermarks, statistics, brand marks, or readable text inside the image.',
    'Natural stadium lighting, authentic sideline detail, believable sports-photo composition, restrained color grading, no poster graphics.',
  ].join('\n');
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
  if (!process.env.OPENAI_API_KEY) return json(res, 503, { error: 'Newsroom image generation is not configured yet.' });

  let user;
  try {
    user = await verifyFirebaseUser(req.headers.authorization);
  } catch (error) {
    console.error('Firebase token verification failed', error);
    return json(res, 503, { error: 'Could not verify the signed-in user.' });
  }
  if (!user) return json(res, 401, { error: 'Sign in before generating a newsroom image.' });

  const issue = req.body?.issue || {};
  const article = req.body?.article || {};
  if (article.groundingStatus !== 'verified' || !(article.citedFactKeys || []).length) {
    return json(res, 400, { error: 'Only a verified article with cited facts can generate an image.' });
  }

  const safeIssue = {
    publicationId: text(issue.publicationId, 120),
    season: Math.max(1, Number(issue.season) || 1),
    week: Math.max(1, Number(issue.week) || 1),
  };
  const safeArticle = {
    id: text(article.id, 120),
    outletName: text(article.outletName, 120),
    desk: text(article.desk, 120),
    headline: text(article.headline, 400),
    dek: text(article.dek, 800),
  };
  if (!safeIssue.publicationId || !safeArticle.id || !safeArticle.headline || !safeArticle.dek) {
    return json(res, 400, { error: 'The verified article packet is incomplete.' });
  }

  const references = (Array.isArray(req.body?.references) ? req.body.references : [])
    .filter((entry) => validReferenceUrl(entry?.imageUrl))
    .slice(0, 4)
    .map((entry) => ({ imageUrl: entry.imageUrl, label: text(entry.label, 120) || 'Approved reference' }));
  const prompt = createPrompt({ issue: safeIssue, article: safeArticle, references });

  try {
    const common = {
      model: MODEL,
      prompt,
      n: 1,
      quality: 'medium',
      size: '1536x1024',
      output_format: 'jpeg',
      output_compression: 86,
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
      referenceAssetIds: references.length
        ? req.body.references.filter((entry) => validReferenceUrl(entry?.imageUrl)).slice(0, 4).map((entry) => text(entry.assetId, 120))
        : [],
      disclosure: 'AI-generated editorial image',
    });
  } catch (error) {
    console.error('OpenAI newsroom image generation failed', error);
    if (error?.code === 'moderation_blocked') {
      return json(res, 422, { error: 'The image request was blocked by a safety check. Try another approved reference photo.' });
    }
    return json(res, error?.status === 429 ? 429 : 502, {
      error: error?.status === 429
        ? 'Image generation is temporarily busy. Try again shortly.'
        : 'The editorial image could not be generated. No newsroom data was changed.',
    });
  }
}
