import { useEffect, useRef } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, db } from '../firebase';
import { buildCareerEventPublication } from '../domain/careerEventPublication.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const DEVICE_ID = globalThis.crypto?.randomUUID?.() || `career-editorial-${Date.now()}`;

const CareerEditorialEventPortal = () => {
  const { user, career, ready } = useOwnerCareer();
  const inFlightRef = useRef(false);
  const attemptedRef = useRef('');

  useEffect(() => {
    const tracking = career?.careerTracking || {};
    const activationReason = String(tracking.activationReason || '').trim().toLowerCase();
    const activatedAt = String(tracking.activatedAt || '').trim();
    const eligible = tracking.mode === 'active'
      && activatedAt
      && ['starter', 'appearance'].includes(activationReason)
      && !tracking.editorialPublicationId;
    if (!ready || !user || !db || !eligible || inFlightRef.current) return undefined;

    const attemptKey = `${activatedAt}:${activationReason}`;
    if (attemptedRef.current === attemptKey) return undefined;
    attemptedRef.current = attemptKey;
    inFlightRef.current = true;
    let cancelled = false;

    const publish = async () => {
      try {
        const careerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(careerRef);
          if (!snapshot.exists()) return;
          const remote = snapshot.data();
          const next = buildCareerEventPublication(remote);
          if (next === remote) return;
          transaction.set(careerRef, {
            ...next,
            _sync: {
              ...(remote._sync || {}),
              revision: (Number(remote?._sync?.revision) || 0) + 1,
              deviceId: DEVICE_ID,
              updatedAt: new Date().toISOString(),
            },
          });
        });
      } catch (error) {
        if (!cancelled) {
          console.warn('DynastyHQ could not queue automatic career-event coverage.', error);
          attemptedRef.current = '';
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    publish();
    return () => {
      cancelled = true;
    };
  }, [career, ready, user]);

  return null;
};

export default CareerEditorialEventPortal;
