import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { appId, auth, db } from '../firebase';
import {
  CAREER_ARCHIVE_COLLECTION,
  hydrateCareerStateFromArchives,
  storageArchiveIds,
} from '../domain/careerStorage.js';

const OwnerCareerContext = createContext({
  user: null,
  career: null,
  ready: false,
});

export const OwnerCareerProvider = ({ children }) => {
  const [user, setUser] = useState(auth.currentUser);
  const [career, setCareer] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    if (!nextUser) {
      setCareer(null);
      setReady(true);
    } else {
      setReady(false);
    }
  }), []);

  useEffect(() => {
    if (!user || !db) {
      if (!user) setCareer(null);
      setReady(true);
      return undefined;
    }

    const careerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    return onSnapshot(
      careerRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          setCareer(null);
          setReady(true);
          return;
        }

        try {
          const raw = snapshot.data();
          const archiveIds = storageArchiveIds(raw);
          if (!archiveIds.length) {
            setCareer(raw);
            setReady(true);
            return;
          }

          const archiveSnapshots = await Promise.all(
            archiveIds.map((archiveId) => getDoc(
              doc(db, 'artifacts', appId, 'users', user.uid, CAREER_ARCHIVE_COLLECTION, archiveId),
            )),
          );
          setCareer(hydrateCareerStateFromArchives(
            raw,
            archiveSnapshots.filter((entry) => entry.exists()).map((entry) => entry.data()),
          ));
        } catch {
          setCareer(snapshot.data());
        }
        setReady(true);
      },
      () => {
        setCareer(null);
        setReady(true);
      },
    );
  }, [user]);

  const value = useMemo(() => ({ user, career, ready }), [career, ready, user]);
  return <OwnerCareerContext.Provider value={value}>{children}</OwnerCareerContext.Provider>;
};

export const useOwnerCareer = () => useContext(OwnerCareerContext);
