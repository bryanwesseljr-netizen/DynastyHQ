import {
  normalizeCollegeFootballConference,
  normalizeTeamKey,
} from './collegeFootballTeamIdentity.js';
import { resolveNewsroomTeamIdentity } from './newsroomConferenceContext.js';
import {
  getNewsroomArticlePhotoPreferences,
  getNewsroomPhotoType,
  normalizeNewsroomSceneTag,
} from './newsroomMedia.js';
import {
  getNewsroomIssueFolder,
  getNewsroomMediaFolder,
} from './newsroomMediaFolders.js';

export const NEWSROOM_PHOTO_QA_STATUSES = Object.freeze({
  UNREVIEWED: 'unreviewed',
  NEEDS_REVIEW: 'needs-review',
  APPROVED: 'approved',
});

export const NEWSROOM_PHOTO_VISUAL_CHECKS = Object.freeze([
  Object.freeze({ id: 'team-uniform', label: 'Team colors, wordmark, and uniform identity look correct' }),
  Object.freeze({ id: 'conference-patch', label: 'Conference patch is correct wherever visible' }),
  Object.freeze({ id: 'story-fit', label: 'Photo moment and emotion fit the article' }),
  Object.freeze({ id: 'photo-quality', label: 'No obvious AI anatomy, text, equipment, or rendering mistakes' }),
]);

const check = (id, level, label, detail = '') => ({ id, level, label, detail });

const expectedTeamForState = (state = {}) => String(state.player?.college || state.player?.school || '').trim();

export const buildNewsroomPhotoQaReport = ({ state = {}, issue = {}, article = {}, asset = null } = {}) => {
  const checks = [];
  const dynastySeason = Math.max(1, Number(issue.season || state.currentSeason) || 1);
  const expectedTeam = expectedTeamForState(state);
  const expectedIdentity = expectedTeam
    ? resolveNewsroomTeamIdentity({ state, teamName: expectedTeam, dynastySeason })
    : null;

  if (!asset?.id || !article?.mediaAssetId) {
    checks.push(check('photo-assigned', 'fail', 'No article photo is assigned', 'Choose or generate a photo before approval.'));
    return {
      status: NEWSROOM_PHOTO_QA_STATUSES.NEEDS_REVIEW,
      canApprove: false,
      expectedTeam,
      expectedConference: expectedIdentity?.primaryConference || '',
      checks,
      failures: checks,
      warnings: [],
      passes: [],
    };
  }

  checks.push(check('photo-assigned', 'pass', 'Article photo is assigned', asset.fileName || asset.id));

  const issueFolder = getNewsroomIssueFolder(issue);
  const assetFolder = getNewsroomMediaFolder(asset);
  checks.push(assetFolder === issueFolder
    ? check('career-folder', 'pass', 'Career-stage folder matches the article', issueFolder)
    : check('career-folder', 'warn', 'Career-stage folder differs from the article', `Article: ${issueFolder}; photo: ${assetFolder}. Manual overrides are allowed, so confirm this reuse is intentional.`));

  if (expectedTeam) {
    if (asset.teamTag) {
      checks.push(normalizeTeamKey(asset.teamTag) === normalizeTeamKey(expectedTeam)
        ? check('team-tag', 'pass', 'Photo team tag matches the active program', asset.teamTag)
        : check('team-tag', 'fail', 'Photo team tag conflicts with the active program', `Expected ${expectedTeam}; photo tagged ${asset.teamTag}.`));
    } else {
      checks.push(check('team-tag', 'warn', 'Photo has no structured team tag', `Visually verify that this is ${expectedTeam}.`));
    }
  }

  const expectedConference = expectedIdentity?.primaryConference || '';
  if (expectedConference) {
    const taggedConference = normalizeCollegeFootballConference(asset.conferenceTag || asset.generatedFrom?.conference || '');
    if (taggedConference) {
      checks.push(taggedConference === expectedConference
        ? check('conference-tag', 'pass', 'Photo conference tag matches the Dynasty save', taggedConference)
        : check('conference-tag', 'fail', 'Photo conference tag conflicts with the Dynasty save', `Expected ${expectedConference}; photo tagged ${taggedConference}.`));
    } else {
      checks.push(check('conference-tag', 'warn', 'Photo has no structured conference tag', `Visually verify the ${expectedConference} patch/branding wherever visible.`));
    }
  }

  const publicationId = issue.publicationId || issue.id || '';
  const sameArticle = asset.generatedFrom?.articleId && asset.generatedFrom.articleId === article.id;
  const sameEdition = asset.generatedFrom?.publicationId && asset.generatedFrom.publicationId === publicationId;
  if (sameArticle) checks.push(check('provenance', 'pass', 'Photo was generated for this exact article'));
  else if (sameEdition) checks.push(check('provenance', 'pass', 'Photo was generated for this Newsroom edition'));
  else checks.push(check('provenance', 'warn', 'Photo was not generated for this exact article', 'That is fine for a reusable library photo, but story fit needs visual confirmation.'));

  const preferences = getNewsroomArticlePhotoPreferences(article);
  const photoType = getNewsroomPhotoType(asset);
  const preferenceIndex = preferences.indexOf(photoType);
  if (preferenceIndex >= 0 && preferenceIndex <= 1) {
    checks.push(check('photo-type', 'pass', 'Photo type strongly fits the article', photoType));
  } else if (preferenceIndex >= 0) {
    checks.push(check('photo-type', 'warn', 'Photo type is usable but not a top recommendation', photoType));
  } else {
    checks.push(check('photo-type', 'warn', 'Photo type has weak article fit', photoType));
  }

  const requestedScene = normalizeNewsroomSceneTag(article.imageSceneOverride || article.sceneOverride || '');
  const assetScene = normalizeNewsroomSceneTag(asset.sceneTag || asset.generatedFrom?.scene || '');
  if (requestedScene && requestedScene !== 'auto') {
    if (!assetScene) checks.push(check('scene-tag', 'warn', 'Photo has no scene tag for the selected Director scene', requestedScene));
    else if (assetScene === requestedScene) checks.push(check('scene-tag', 'pass', 'Photo scene matches the selected Director scene', requestedScene));
    else checks.push(check('scene-tag', 'warn', 'Photo scene differs from the selected Director scene', `Requested ${requestedScene}; photo tagged ${assetScene}. This can be approved if the visual still fits the story.`));
  }

  const failures = checks.filter((entry) => entry.level === 'fail');
  const warnings = checks.filter((entry) => entry.level === 'warn');
  const passes = checks.filter((entry) => entry.level === 'pass');
  const existingApproved = article.mediaQaStatus === NEWSROOM_PHOTO_QA_STATUSES.APPROVED
    && article.mediaQaAssetId === asset.id
    && failures.length === 0;

  return {
    status: existingApproved ? NEWSROOM_PHOTO_QA_STATUSES.APPROVED : (failures.length ? NEWSROOM_PHOTO_QA_STATUSES.NEEDS_REVIEW : NEWSROOM_PHOTO_QA_STATUSES.UNREVIEWED),
    canApprove: failures.length === 0,
    expectedTeam,
    expectedConference,
    checks,
    failures,
    warnings,
    passes,
  };
};

export const setNewsroomPhotoQaDecision = ({
  issues = [],
  publicationId,
  articleId,
  assetId,
  status = NEWSROOM_PHOTO_QA_STATUSES.NEEDS_REVIEW,
  checklist = [],
  approvedAt = new Date().toISOString(),
} = {}) => {
  const normalizedStatus = status === NEWSROOM_PHOTO_QA_STATUSES.APPROVED
    ? NEWSROOM_PHOTO_QA_STATUSES.APPROVED
    : NEWSROOM_PHOTO_QA_STATUSES.NEEDS_REVIEW;
  const safeChecklist = [...new Set((checklist || []).map(String).filter(Boolean))].slice(0, NEWSROOM_PHOTO_VISUAL_CHECKS.length);

  return (issues || []).map((issue) => (
    issue.publicationId !== publicationId && issue.id !== publicationId
      ? issue
      : {
        ...issue,
        articles: (issue.articles || []).map((article) => article.id !== articleId ? article : {
          ...article,
          mediaQaStatus: normalizedStatus,
          mediaQaAssetId: String(assetId || article.mediaAssetId || ''),
          mediaQaApprovedAt: normalizedStatus === NEWSROOM_PHOTO_QA_STATUSES.APPROVED ? String(approvedAt || '') : '',
          mediaQaChecklist: normalizedStatus === NEWSROOM_PHOTO_QA_STATUSES.APPROVED ? safeChecklist : [],
        }),
      }
  ));
};
