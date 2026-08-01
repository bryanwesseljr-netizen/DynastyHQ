import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';

const DB_NAME = 'DynastyHQPodcastDB';
const STORE_NAME = 'episodeAudio';

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

const replaceCollection = async (collectionRef, segments) => {
  const existing = await getDocs(collectionRef);
  await Promise.all(existing.docs.map((entry) => deleteDoc(entry.ref)));
  await Promise.all(segments.map((segment, index) => setDoc(doc(collectionRef, `segment_${index}`), {
    index,
    data: segment.data,
    mimeType: segment.mimeType || 'audio/mpeg',
    hostId: segment.hostId || '',
  })));
};

const loadCollection = async (collectionRef) => {
  const snapshot = await getDocs(collectionRef);
  if (snapshot.empty) return null;
  return snapshot.docs
    .map((entry) => entry.data())
    .sort((a, b) => a.index - b.index);
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

