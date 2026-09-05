import { decodeFirestoreDocument } from '../src/domain/firestoreRest.js';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID
  || process.env.VITE_FIREBASE_PROJECT_ID
  || 'dynastyhq-a380c';
const APP_NAMESPACE = process.env.VERCEL_ENV === 'production' ? 'dynasty-hq' : 'dynasty-hq-preview';

const CONTEXT_FIELDS = Object.freeze([
  'careerPhase',
  'player',
  'factLedger',
  'weeklyUpdates',
  'newsroomIssues',
  'newsroomMediaLibrary',
]);

const clean = (value, max = 240) => String(value ?? '').trim().slice(0, max);

export const findStoredNewsroomPacket = ({ state = {}, publicationId = '', articleId = '' } = {}) => {
  const safePublicationId = clean(publicationId, 120);
  const safeArticleId = clean(articleId, 120);
  const issue = (state.newsroomIssues || []).find((entry) => (
    entry?.publicationId === safePublicationId || entry?.id === safePublicationId
  ));
  const article = issue?.articles?.find((entry) => entry?.id === safeArticleId);
  return { issue: issue || null, article: article || null };
};

export const fetchUserImageContextState = async ({ authorization = '', uid = '' } = {}) => {
  const safeUid = clean(uid, 180);
  if (!authorization || !safeUid) throw new Error('Owner authentication is required to load image context.');

  const mask = new URLSearchParams();
  CONTEXT_FIELDS.forEach((fieldPath) => mask.append('mask.fieldPaths', fieldPath));
  const documentPath = `artifacts/${APP_NAMESPACE}/users/${encodeURIComponent(safeUid)}/hq_data/main`;
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(PROJECT_ID)}/databases/(default)/documents/${documentPath}?${mask.toString()}`;
  const response = await fetch(url, {
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body?.error?.message || 'Could not load the DynastyHQ owner save for image generation.');
    error.status = response.status;
    throw error;
  }

  return decodeFirestoreDocument(await response.json());
};
