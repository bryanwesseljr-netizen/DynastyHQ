import { json, verifyFirebaseUser } from './_auth.js';
import {
  fetchUserImageContextState,
  findStoredNewsroomPacket,
} from './_userImageContext.js';
import { buildNewsroomImageGenerationContext } from '../src/domain/newsroomImageGenerationContext.js';
import { buildGroundedNewsroomImagePrompt } from '../src/domain/newsroomImagePrompt.js';
import { NEWSROOM_IMAGE_SCENE_OVERRIDES } from '../src/domain/newsroomImageDirector.js';

const text = (value, maxLength) => String(value || '').trim().slice(0, maxLength);
const VALID_OVERRIDES = new Set(Object.values(NEWSROOM_IMAGE_SCENE_OVERRIDES));

const normalizeSceneOverride = (value) => {
  const requested = text(value, 60).toLowerCase() || NEWSROOM_IMAGE_SCENE_OVERRIDES.AUTO;
  return VALID_OVERRIDES.has(requested) ? requested : NEWSROOM_IMAGE_SCENE_OVERRIDES.AUTO;
};

const safePacket = ({ issue = {}, article = {} }) => ({
  issue: {
    publicationId: text(issue.publicationId || issue.id, 120),
    season: Math.max(1, Number(issue.season) || 1),
    week: Math.max(1, Number(issue.week) || 1),
  },
  article: {
    id: text(article.id, 120),
    outletName: text(article.outletName, 120),
    desk: text(article.desk, 120),
    headline: text(article.headline, 400),
    dek: text(article.dek, 800),
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }

  let user;
  try {
    user = await verifyFirebaseUser(req.headers.authorization);
  } catch (error) {
    console.error('Firebase token verification failed', error);
    return json(res, 503, { error: 'Could not verify the signed-in user.' });
  }
  if (!user) return json(res, 401, { error: 'Sign in before building an editorial photo prompt.' });

  const requestedIssue = req.body?.issue || {};
  const requestedArticle = req.body?.article || {};
  const publicationId = text(requestedIssue.publicationId || requestedIssue.id, 120);
  const articleId = text(requestedArticle.id, 120);
  if (!publicationId || !articleId) return json(res, 400, { error: 'The verified article packet is incomplete.' });

  try {
    const ownerState = await fetchUserImageContextState({
      authorization: req.headers.authorization,
      uid: user.localId,
    });
    const stored = findStoredNewsroomPacket({ state: ownerState, publicationId, articleId });
    if (!stored.issue || !stored.article) return json(res, 404, { error: 'That saved Newsroom article could not be found.' });
    if (stored.article.groundingStatus !== 'verified' || !(stored.article.citedFactKeys || []).length) {
      return json(res, 400, { error: 'Only a verified article with cited facts can build an editorial photo prompt.' });
    }

    const sceneOverride = normalizeSceneOverride(req.body?.sceneOverride);
    const generationContext = buildNewsroomImageGenerationContext({
      state: ownerState,
      issue: stored.issue,
      article: stored.article,
      sceneOverride,
    });
    const safe = safePacket({ issue: stored.issue, article: stored.article });
    if (!safe.issue.publicationId || !safe.article.id || !safe.article.headline || !safe.article.dek) {
      return json(res, 400, { error: 'The verified article packet is incomplete.' });
    }

    const prompt = buildGroundedNewsroomImagePrompt({
      issue: safe.issue,
      article: safe.article,
      generationContext,
      references: generationContext.references || [],
    });
    const chatGptPrompt = [
      'Generate 4 distinct photorealistic editorial-photo variations from the exact brief below.',
      'Treat every factual and visual constraint as binding. Vary camera angle, crop, timing, and natural body language while keeping the same grounded story context. Do not add readable statistics, score graphics, headlines, watermarks, or invented game events.',
      '',
      prompt,
      '',
      'If I attach reference photos in this ChatGPT conversation, use them only for the identity, uniform, helmet, equipment, or team-style role described by the brief. Do not copy their pose or background.',
    ].join('\n');

    return json(res, 200, {
      prompt,
      chatGptPrompt,
      sceneOverride,
      director: {
        preset: generationContext.director?.preset || '',
        presetLabel: generationContext.director?.presetLabel || '',
        subject: generationContext.director?.subject || '',
        position: generationContext.director?.position || '',
        scene: generationContext.director?.scene || '',
        emotionalTone: generationContext.director?.emotionalTone || '',
        reason: generationContext.director?.reason || '',
        priorityFacts: generationContext.director?.priorityFacts || [],
      },
      referenceRoles: (generationContext.references || []).map((entry) => entry.role),
      visualProfileApplied: Boolean(generationContext.visualProfileDirectives?.length),
      contextSource: 'owner-save',
    });
  } catch (error) {
    console.error('Editorial Photo Director prompt build failed', error);
    return json(res, 400, {
      error: error?.message || 'The Editorial Photo Director could not build a grounded prompt.',
    });
  }
}
