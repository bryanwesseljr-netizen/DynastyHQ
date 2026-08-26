import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import {
  chunkPodcastAudioForStorage,
  reassemblePodcastAudioFromStorage,
} from '../domain/podcastAudioChunks.js';

const DB_NAME = 'DynastyHQPodcastDB';
const STORE_NAME = 'episodeAudio';
const CLOUD_RETRY_ATTEMPTS = 4;
const CLOUD_RETRY_BASE_MS = 350;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const openAudioDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = (event) => {
    const database = event.target.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export const savePodcastAudioLocal = async (episodeId, segments) => {
  const database = await openAudioDb();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(segments, episodeId);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
};

export const loadPodcastAudioLocal = async (episodeId) => {
  try {
    const database = await openAudioDb();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(episodeId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
};

const safeEpisodeId = (episodeId) => String(episodeId || '').replaceAll('/', '-').slice(0, 180);

const privateCollection = (db, appId, userId, episodeId) => collection(
  db, 'artifacts', appId, 'users', userId, 'podcast_audio', safeEpisodeId(episodeId), 'segments',
);

const publicCollection = (db, appId, ownerId, episodeId) => collection(
  db, 'artifacts', appId, 'public', 'data', `shared_podcast_${ownerId}_${safeEpisodeId(episodeId)}`,
);

const isNonRetryableFirestoreError = (error) => {
  const code = String(error?.code || '').toLowerCase();
  return /permission-denied|unauthenticated|invalid-argument|not-found|failed-precondition/.test(code);
};

export const retryPodcastCloudOperation = async (operation, attempts = CLOUD_RETRY_ATTEMPTS) => {
  let lastError = null;
  const limit = Math.max(1, Number(attempts) || CLOUD_RETRY_ATTEMPTS);
  for (let attempt = 1; attempt <= limit; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (isNonRetryableFirestoreError(error) || attempt === limit) break;
      await sleep(CLOUD_RETRY_BASE_MS * attempt);
    }
  }
  throw lastError || new Error('Podcast cloud storage did not respond.');
};

const replaceCollection = async (collectionRef, segments) => {
  const existing = await retryPodcastCloudOperation(() => getDocs(collectionRef));

  // Keep these requests intentionally sequential. Large parallel Firestore writes
  // are fragile on mobile networks and can surface as a generic browser fetch error.
  for (const entry of existing.docs) {
    await retryPodcastCloudOperation(() => deleteDoc(entry.ref));
  }

  const storedSegments = chunkPodcastAudioForStorage(segments);
  for (const segment of storedSegments) {
    const segmentRef = doc(collectionRef, `segment_${segment.index}`);
    await retryPodcastCloudOperation(() => setDoc(segmentRef, {
      index: segment.index,
      segmentIndex: segment.segmentIndex,
      chunkIndex: segment.chunkIndex,
      chunkCount: segment.chunkCount,
      data: segment.data,
      mimeType: segment.mimeType || 'audio/mpeg',
      hostId: segment.hostId || '',
      continuous: Boolean(segment.continuous),
    }));
  }
};

const loadCollection = async (collectionRef) => {
  const snapshot = await retryPodcastCloudOperation(() => getDocs(collectionRef));
  if (snapshot.empty) return null;
  return reassemblePodcastAudioFromStorage(snapshot.docs.map((entry) => entry.data()));
};

export const savePodcastAudioCloud = ({ db, appId, userId, episodeId, segments }) => (
  replaceCollection(privateCollection(db, appId, userId, episodeId), segments)
);

export const loadPodcastAudioCloud = ({ db, appId, userId, episodeId }) => (
  loadCollection(privateCollection(db, appId, userId, episodeId))
);

export const savePublicPodcastAudio = ({ db, appId, ownerId, episodeId, segments }) => (
  replaceCollection(publicCollection(db, appId, ownerId, episodeId), segments)
);

export const loadPublicPodcastAudio = ({ db, appId, ownerId, episodeId }) => (
  loadCollection(publicCollection(db, appId, ownerId, episodeId))
);

export const audioSegmentDataUrl = (segment) => (
  `data:${segment.mimeType || 'audio/mpeg'};base64,${segment.data}`
);

export const podcastAudioBlob = (segments) => {
  const byteArrays = segments.map((segment) => {
    const binary = atob(segment.data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  });
  return new Blob(byteArrays, { type: 'audio/mpeg' });
};