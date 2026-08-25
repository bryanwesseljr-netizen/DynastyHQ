import { useEffect, useRef } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, db } from '../firebase';
import { addMissingCollegeGameCoverageIssues, missingCollegeGameCoverageUpdates } from '../domain/collegeGameCoverageRepair.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const DEVICE_ID = globalThis.crypto?.randomUUID?.() || 'college-game-coverage-repair-v1';

const CollegeGameCoverageRepairPortal = () => {
  const { user, career } = useOwnerCareer();
  const busyRef = useRef(false);

  useEffect(() => {
    if (!user || !db || !career || busyRef.current) return undefined;
    if (!missingCollegeGameCoverageUpdates(career).length) return undefined;

    let cancelled = false;
    busyRef.current = true;
    const repair = async () => {
      try {
        const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(ref);
          if (!snapshot.exists()) return;
          const remote = snapshot.data();
          if (!missingCollegeGameCoverageUpdates(remote).length) return;
          const repaired = addMissingCollegeGameCoverageIssues(remote);
          transaction.set(ref, {
            ...repaired,
            _sync: {
              revision: (Number(remote?._sync?.revision) || 0) + 1,
              deviceId: DEVICE_ID,
              updatedAt: new Date().toISOString(),
            },
          });
        });
      } catch (error) {
        console.error('DynastyHQ college game coverage repair failed', error);
      } finally {
        if (!cancelled) busyRef.current = false;
      }
    };

    repair();
    return () => {
      cancelled = true;
      busyRef.current = false;
    };
  }, [career, user]);

  return null;
};

export default CollegeGameCoverageRepairPortal;
