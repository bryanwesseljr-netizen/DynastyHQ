import { useEffect, useRef } from 'react';
import { runTransaction } from 'firebase/firestore';
import { appId, db } from '../firebase';
import {
  addMissingCollegeGameCoverageIssues,
  hasCollegeGameCoverageRepairWork,
  removeNoAppearanceCoverageIssues,
} from '../domain/collegeGameCoverageRepair.js';
import {
  readHydratedCareerInTransaction,
  writeHydratedCareerInTransaction,
} from '../services/careerStorageFirestore.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const DEVICE_ID = globalThis.crypto?.randomUUID?.() || 'college-game-coverage-repair-v1';

const CollegeGameCoverageRepairPortal = () => {
  const { user, career } = useOwnerCareer();
  const busyRef = useRef(false);

  useEffect(() => {
    if (!user || !db || !career || busyRef.current) return undefined;
    if (!hasCollegeGameCoverageRepairWork(career)) return undefined;

    let cancelled = false;
    busyRef.current = true;
    const repair = async () => {
      try {
        await runTransaction(db, async (transaction) => {
          const loaded = await readHydratedCareerInTransaction({
            transaction,
            db,
            appId,
            userId: user.uid,
          });
          if (!loaded) return;
          const remote = loaded.state;
          if (!hasCollegeGameCoverageRepairWork(remote)) return;
          const cleaned = removeNoAppearanceCoverageIssues(remote);
          const repaired = addMissingCollegeGameCoverageIssues(cleaned);
          const revision = (Number(loaded.rawMain?._sync?.revision) || 0) + 1;
          writeHydratedCareerInTransaction({
            transaction,
            db,
            appId,
            userId: user.uid,
            state: {
              ...repaired,
              _sync: {
                revision,
                deviceId: DEVICE_ID,
                updatedAt: new Date().toISOString(),
              },
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
