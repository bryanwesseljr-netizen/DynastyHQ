import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';

const DB_NAME = 'DynastyHQAudioDB';
const STORE_NAME = 'audioStore';

const openAudioDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = (event) => {
    const database = event.target.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export const saveLegacyPodcastAudioLocal = async (audioData) => {
  try {
    const database = await openAudioDb();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(audioData, 'podcastAudio');
  } catch (error) {
    console.error('Local audio save failed', error);
  }
};

export const loadLegacyPodcastAudioLocal = async () => {
  try {
    const database = await openAudioDb();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get('podcastAudio');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
};

export const clearLegacyPodcastAudioLocal = async () => {
  try {
    const database = await openAudioDb();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete('podcastAudio');
  } catch (error) {
    console.error('Local audio reset failed', error);
  }
};

export const saveLegacyPodcastAudioCloud = async ({ db, appId, userId, base64Audio }) => {
  const audioCollection = collection(db, 'artifacts', appId, 'users', userId, 'hq_audio');
  const snapshot = await getDocs(audioCollection);
  await Promise.all(snapshot.docs.map((entry) => deleteDoc(entry.ref)));
  if (!base64Audio) return;

  const chunkSize = 750000;
  const chunkCount = Math.ceil(base64Audio.length / chunkSize);
  await Promise.all(Array.from({ length: chunkCount }, (_, index) => {
    const data = base64Audio.substring(index * chunkSize, (index + 1) * chunkSize);
    return setDoc(doc(audioCollection, `chunk_${index}`), { data, index });
  }));
};

export const loadLegacyPodcastAudioCloud = async ({ db, appId, userId }) => {
  try {
    const audioCollection = collection(db, 'artifacts', appId, 'users', userId, 'hq_audio');
    const snapshot = await getDocs(audioCollection);
    if (snapshot.empty) return null;
    return snapshot.docs
      .map((entry) => entry.data())
      .sort((a, b) => a.index - b.index)
      .map((entry) => entry.data)
      .join('');
  } catch (error) {
    console.error('Cloud audio load failed', error);
    return null;
  }
};
