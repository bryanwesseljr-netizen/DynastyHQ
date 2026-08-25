import { json, verifyFirebaseUser } from './_auth.js';
import {
  fetchUserImageContextState,
  findStoredNewsroomPacket,
} from './_userImageContext.js';
import { buildNewsroomImageGenerationContext } from '../src/domain/newsroomImageGenerationContext.js';
import { buildGroundedNewsroomImagePrompt } from '../src/domain/newsroomImagePrompt.js';
import {
  buildChatGptNewsroomPhotoPrompt,
  normalizeNewsroomEditorialScene,
} from '../src/domain/newsroomEditorialPhoto.js';

const text = (value, maxLength) => String(value || '').trim().slice(0, maxLength);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }

  let user;
  try {
    user = await verifyFirebaseUser(req.headers.authorization);
  } catch (error) {
    console.error('Firebase token verification failed for Photo Director prompt', error);
    return json(res, 503, { error: 'Could not verify the signed-in user.' });
  }
  if (!user) return json(res, 401, { error: 'Sign in before building an editorial photo prompt.' });

  const requestedIssue = req.body?.issue || {};
  const requestedArticle = req.body?.article || {};
  const publicationId = text(requestedIssue.publicationId || requestedIssue.id, 120);
  const articleId = text(requestedArticle.id, 120);
  if (!publicationId || !articleId) {
    return json(res, 400, { error: 'The verified article packet is incomplete.' });
  }

  try {
    const ownerState = await fetchUserImageContextState({
      authorization: req.headers.authorization,
      uid: user.localId,
    });
    const stored = findStoredNewsroomPacket({ state: ownerState, publicationId, articleId });
    if (!stored.issue || !stored.article) {
      return json(res, 404, { error: 'The saved newsroom article could not be found.' });
    }
    if (stored.article.groundingStatus !== 'verified' || !(stored.article.citedFactKeys || []).length) {
      return json(res, 400, { error: 'Only a verified article with cited facts can build an editorial photo prompt.' });
    }

    const sceneOverride = normalizeNewsroomEditorialScene(
      req.body?.sceneOverride || stored.article.imageSceneOverride || 'auto',
    );
    const generationContext = buildNewsroomImageGenerationContext({
      state: ownerState,
      issue: stored.issue,
      article: stored.article,
      sceneOverride,
    });
    const safeIssue = {
      publicationId: text(stored.issue.publicationId || stored.issue.id, 120),
      season: Math.max(1, Number(stored.issue.season) || 1),
      week: Math.max(1, Number(stored.issue.week) || 1),
    };
    const safeArticle = {
      id: text(stored.article.id, 120),
      outletName: text(stored.article.outletName, 120),
      desk: text(stored.article.desk, 120),
      headline: text(stored.article.headline, 400),
      dek: text(stored.article.dek, 800),
    };
    const references = generationContext.references || [];
    const prompt = buildGroundedNewsroomImagePrompt({
      issue: safeIssue,
      article: safeArticle,
      generationContext,
      references,
    });
    const chatGptPrompt = buildChatGptNewsroomPhotoPrompt({
      groundedPrompt: prompt,
      director: generationContext.director,
      references,
    });
    const director = generationContext.director || {};

    return json(res, 200, {
      prompt,
      chatGptPrompt,
      director: {
        preset: text(director.preset, 100),
        presetLabel: text(director.presetLabel, 160),
        subject: text(director.subject, 60),
        position: text(director.position, 40),
        positionModule: text(director.positionModule, 40),
        scene: text(director.scene, 600),
        emotionalTone: text(director.emotionalTone, 240),
        reason: text(director.reason, 700),
        sceneOverride: text(director.sceneOverride, 40),
        overrideApplied: Boolean(director.overrideApplied),
        overrideRejectedReason: text(director.overrideRejectedReason, 500),
        priorityFacts: (director.priorityFacts || []).map((entry) => text(entry, 180)).filter(Boolean).slice(0, 8),
      },
      references: references.map((entry) => ({
        assetId: text(entry.assetId, 120),
        label: text(entry.label, 120),
        role: text(entry.role, 40),
        roleLabel: text(entry.roleLabel, 80),
      })),
      visualProfileApplied: Boolean(generationContext.visualProfileDirectives?.length),
      disclosure: 'Photo Director prompt only — no AI image was generated.',
    });
  } catch (error) {
    console.error('Photo Director prompt build failed', error);
    return json(res, error?.status && Number(error.status) < 500 ? error.status : 502, {
      error: error?.message || 'The editorial photo prompt could not be built. No newsroom data was changed.',
    });
  }
}
