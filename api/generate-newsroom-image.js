import { json, verifyFirebaseUser } from './_auth.js';
import {
  fetchUserImageContextState,
  findStoredNewsroomPacket,
} from './_userImageContext.js';
import { buildNewsroomImageGenerationContext } from '../src/domain/newsroomImageGenerationContext.js';
import { buildGroundedNewsroomImagePrompt } from '../src/domain/newsroomImagePrompt.js';

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

const sanitizeReference = (entry = {}) => ({
  assetId: text(entry.assetId, 120),
  imageUrl: text(entry.imageUrl, 2400),
  label: text(entry.label, 120) || 'Approved reference',
  role: text(entry.role, 40) || 'general',
  roleLabel: text(entry.roleLabel, 80) || 'General reference',
  instruction: text(entry.instruction, 520) || 'Use only as a general visual reference without copying the original pose or background.',
});

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

  const requestedIssue = req.body?.issue || {};
  const requestedArticle = req.body?.article || {};
  const requestedPublicationId = text(requestedIssue.publicationId || requestedIssue.id, 120);
  const requestedArticleId = text(requestedArticle.id, 120);
  if (!requestedPublicationId || !requestedArticleId) {
    return json(res, 400, { error: 'The verified article packet is incomplete.' });
  }

  let ownerState = null;
  let sourceIssue = requestedIssue;
  let sourceArticle = requestedArticle;
  let generationContext = {};
  try {
    ownerState = await fetchUserImageContextState({
      authorization: req.headers.authorization,
      uid: user.localId,
    });
    const stored = findStoredNewsroomPacket({
      state: ownerState,
      publicationId: requestedPublicationId,
      articleId: requestedArticleId,
    });
    if (stored.issue) sourceIssue = stored.issue;
    if (stored.article) sourceArticle = stored.article;
    generationContext = buildNewsroomImageGenerationContext({
      state: ownerState,
      issue: sourceIssue,
      article: sourceArticle,
    });
  } catch (error) {
    console.warn('Photo Director owner context could not be loaded; using verified request fallback.', error?.message || error);
    ownerState = null;
    generationContext = {};
  }

  if (sourceArticle.groundingStatus !== 'verified' || !(sourceArticle.citedFactKeys || []).length) {
    return json(res, 400, { error: 'Only a verified article with cited facts can generate an image.' });
  }

  const safeIssue = {
    publicationId: text(sourceIssue.publicationId || sourceIssue.id || requestedPublicationId, 120),
    season: Math.max(1, Number(sourceIssue.season) || Number(requestedIssue.season) || 1),
    week: Math.max(1, Number(sourceIssue.week) || Number(requestedIssue.week) || 1),
  };
  const safeArticle = {
    id: text(sourceArticle.id || requestedArticleId, 120),
    outletName: text(sourceArticle.outletName, 120),
    desk: text(sourceArticle.desk, 120),
    headline: text(sourceArticle.headline, 400),
    dek: text(sourceArticle.dek, 800),
  };
  if (!safeIssue.publicationId || !safeArticle.id || !safeArticle.headline || !safeArticle.dek) {
    return json(res, 400, { error: 'The verified article packet is incomplete.' });
  }

  const referenceSource = ownerState
    ? generationContext.references || []
    : (Array.isArray(req.body?.references) ? req.body.references : []);
  const references = referenceSource
    .filter((entry) => validReferenceUrl(entry?.imageUrl))
    .slice(0, 4)
    .map(sanitizeReference);
  const prompt = buildGroundedNewsroomImagePrompt({
    issue: safeIssue,
    article: safeArticle,
    generationContext,
    references,
  });

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
      referenceAssetIds: references.map((entry) => entry.assetId).filter(Boolean),
      disclosure: 'AI-generated editorial image',
      directorPreset: generationContext.director?.preset || '',
      directorSubject: generationContext.director?.subject || '',
      visualProfileApplied: Boolean(generationContext.visualProfileDirectives?.length),
      referenceRoles: references.map((entry) => entry.role),
      contextSource: ownerState ? 'owner-save' : 'request-fallback',
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
