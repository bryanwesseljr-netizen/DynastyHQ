import { onAuthStateChanged } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db, isPreviewDeployment, productionAppId } from '../firebase';
import {
  PREVIEW_DATA_APP_ID,
  PREVIEW_PROMOTION_ID,
  buildPromotedProductionState,
  hasAppliedPreviewPromotion,
  previewPromotionBackupId,
  safePreviewPodcastEpisodeId,
} from '../domain/previewPromotion';

const SESSION_RELOAD_KEY = `dhq:preview-promotion:${PREVIEW_PROMOTION_ID}`;
let started = false;

const replaceCollectionFromPreview = async (sourceRef, destinationRef) => {
  const sourceSnapshot = await getDocs(sourceRef);
  if (sourceSnapshot.empty) return false;

  const destinationSnapshot = await getDocs(destinationRef);
  for (const entry of destinationSnapshot.docs) {
    await deleteDoc(entry.ref);
  }
  for (const entry of sourceSnapshot.docs) {
    await setDoc(doc(destinationRef, entry.id), entry.data());
  }
  return true;
};

const copyPrivateAudio = async (userId, previewState) => {
  const previewLegacy = collection(db, 'artifacts', PREVIEW_DATA_APP_ID, 'users', userId, 'hq_audio');
  const productionLegacy = collection(db, 'artifacts', productionAppId, 'users', userId, 'hq_audio');
  await replaceCollectionFromPreview(previewLegacy, productionLegacy);

  const episodeIds = new Set(
    (previewState?.podcastEpisodes || [])
      .map((episode) => safePreviewPodcastEpisodeId(episode?.id || episode?.publicationId))
      .filter(Boolean),
  );

  for (const episodeId of episodeIds) {
    const previewSegments = collection(
      db,
      'artifacts',
      PREVIEW_DATA_APP_ID,
      'users',
      userId,
      'podcast_audio',
      episodeId,
      'segments',
    );
    const productionSegments = collection(
      db,
      'artifacts',
      productionAppId,
      'users',
      userId,
      'podcast_audio',
      episodeId,
      'segments',
    );
    await replaceCollectionFromPreview(previewSegments, productionSegments);
  }
};

const copyPublicSnapshots = async (userId, previewState) => {
  try {
    const previewShareRef = doc(
      db,
      'artifacts',
      PREVIEW_DATA_APP_ID,
      'public',
      'data',
      'shared_dynasties',
      userId,
    );
    const productionShareRef = doc(
      db,
      'artifacts',
      productionAppId,
      'public',
      'data',
      'shared_dynasties',
      userId,
    );
    const previewShare = await getDoc(previewShareRef);
    if (previewShare.exists()) await setDoc(productionShareRef, previewShare.data());

    const previewLegacy = collection(db, 'artifacts', PREVIEW_DATA_APP_ID, 'public', 'data', `shared_audio_${userId}`);
    const productionLegacy = collection(db, 'artifacts', productionAppId, 'public', 'data', `shared_audio_${userId}`);
    await replaceCollectionFromPreview(previewLegacy, productionLegacy);

    const episodeIds = new Set(
      (previewState?.podcastEpisodes || [])
        .map((episode) => safePreviewPodcastEpisodeId(episode?.id || episode?.publicationId))
        .filter(Boolean),
    );
    for (const episodeId of episodeIds) {
      const previewPublicAudio = collection(
        db,
        'artifacts',
        PREVIEW_DATA_APP_ID,
        'public',
        'data',
        `shared_podcast_${userId}_${episodeId}`,
      );
      const productionPublicAudio = collection(
        db,
        'artifacts',
        productionAppId,
        'public',
        'data',
        `shared_podcast_${userId}_${episodeId}`,
      );
      await replaceCollectionFromPreview(previewPublicAudio, productionPublicAudio);
    }
  } catch (error) {
    console.warn('Preview public snapshots could not be fully promoted.', error);
  }
};

const promotePreviewForOwner = async (user) => {
  if (!user || user.isAnonymous || isPreviewDeployment || !db) return false;

  const previewRef = doc(db, 'artifacts', PREVIEW_DATA_APP_ID, 'users', user.uid, 'hq_data', 'main');
  const productionRef = doc(db, 'artifacts', productionAppId, 'users', user.uid, 'hq_data', 'main');
  const [previewSnapshot, productionSnapshot] = await Promise.all([
    getDoc(previewRef),
    getDoc(productionRef),
  ]);

  if (!previewSnapshot.exists()) return false;
  const previewState = previewSnapshot.data();
  const productionState = productionSnapshot.exists() ? productionSnapshot.data() : {};
  if (hasAppliedPreviewPromotion(productionState)) return false;

  if (productionSnapshot.exists()) {
    const backupRef = doc(
      db,
      'artifacts',
      productionAppId,
      'users',
      user.uid,
      'hq_data',
      previewPromotionBackupId(),
    );
    const existingBackup = await getDoc(backupRef);
    if (!existingBackup.exists()) {
      await setDoc(backupRef, {
        ...productionState,
        _promotionBackup: {
          promotionId: PREVIEW_PROMOTION_ID,
          createdAt: new Date().toISOString(),
          reason: 'Automatic backup before promoting the approved preview save to production.',
        },
      });
    }
  }

  await copyPrivateAudio(user.uid, previewState);
  await copyPublicSnapshots(user.uid, previewState);

  const promotedState = buildPromotedProductionState({
    previewState,
    productionState,
    now: new Date().toISOString(),
  });
  await setDoc(productionRef, promotedState);
  return true;
};

export const startPreviewToProductionPromotion = () => {
  if (started || isPreviewDeployment || typeof window === 'undefined') return;
  started = true;

  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user || user.isAnonymous) return;
    unsubscribe();
    try {
      const promoted = await promotePreviewForOwner(user);
      if (!promoted) return;
      try {
        window.sessionStorage.setItem(SESSION_RELOAD_KEY, 'done');
      } catch {
        // Session storage is only a convenience; the Firestore marker prevents repeats.
      }
      window.location.reload();
    } catch (error) {
      console.error('Preview-to-production data promotion failed.', error);
    }
  });
};

export const __test__ = {
  replaceCollectionFromPreview,
  promotePreviewForOwner,
};
