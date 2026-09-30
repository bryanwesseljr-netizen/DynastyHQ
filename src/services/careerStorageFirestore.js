import { doc, getDoc } from 'firebase/firestore';
import {
  CAREER_ARCHIVE_COLLECTION,
  hydrateCareerStateFromArchives,
  splitCareerStateForStorage,
  storageArchiveIds,
} from '../domain/careerStorage.js';

export const careerMainRef = ({ db, appId, userId }) => (
  doc(db, 'artifacts', appId, 'users', userId, 'hq_data', 'main')
);

export const careerArchiveRef = ({ db, appId, userId, archiveId }) => (
  doc(db, 'artifacts', appId, 'users', userId, CAREER_ARCHIVE_COLLECTION, archiveId)
);

export const loadHydratedCareer = async ({ db, appId, userId }) => {
  const mainRef = careerMainRef({ db, appId, userId });
  const mainSnapshot = await getDoc(mainRef);
  if (!mainSnapshot.exists()) return null;

  const rawMain = mainSnapshot.data();
  const archiveIds = storageArchiveIds(rawMain);
  const archiveSnapshots = archiveIds.length
    ? await Promise.all(archiveIds.map((archiveId) => getDoc(
        careerArchiveRef({ db, appId, userId, archiveId }),
      )))
    : [];

  return {
    rawMain,
    state: hydrateCareerStateFromArchives(
      rawMain,
      archiveSnapshots.filter((snapshot) => snapshot.exists()).map((snapshot) => snapshot.data()),
    ),
  };
};

export const readHydratedCareerInTransaction = async ({
  transaction,
  db,
  appId,
  userId,
}) => {
  const mainRef = careerMainRef({ db, appId, userId });
  const mainSnapshot = await transaction.get(mainRef);
  if (!mainSnapshot.exists()) return null;

  const rawMain = mainSnapshot.data();
  const archiveIds = storageArchiveIds(rawMain);
  const archives = [];
  for (const archiveId of archiveIds) {
    const ref = careerArchiveRef({ db, appId, userId, archiveId });
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) archives.push(snapshot.data());
  }

  return {
    mainRef,
    rawMain,
    state: hydrateCareerStateFromArchives(rawMain, archives),
  };
};

export const writeHydratedCareerInTransaction = ({
  transaction,
  db,
  appId,
  userId,
  state,
}) => {
  const { mainState, archives } = splitCareerStateForStorage(state);
  const mainRef = careerMainRef({ db, appId, userId });
  transaction.set(mainRef, mainState);
  archives.forEach((archive) => {
    transaction.set(
      careerArchiveRef({ db, appId, userId, archiveId: archive.archiveId }),
      archive,
    );
  });
  return { mainState, archives };
};
