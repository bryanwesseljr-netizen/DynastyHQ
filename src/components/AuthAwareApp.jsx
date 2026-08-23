import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import App from '../App.jsx';
import { appId, auth, db } from '../firebase';

const AuthAwareApp = () => {
  const [authReady, setAuthReady] = useState(false);
  const [ownerReady, setOwnerReady] = useState(false);

  useEffect(() => {
    let unsubscribeOwner = () => {};
    let revealFrameOne = null;
    let revealFrameTwo = null;

    const revealApp = () => {
      if (revealFrameOne) cancelAnimationFrame(revealFrameOne);
      if (revealFrameTwo) cancelAnimationFrame(revealFrameTwo);
      // Let App's own Firestore listener process the same snapshot before the
      // transition overlay is removed. Two frames keeps the UI stable without
      // remounting the app or requiring a browser refresh.
      revealFrameOne = requestAnimationFrame(() => {
        revealFrameTwo = requestAnimationFrame(() => setOwnerReady(true));
      });
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeOwner();
      unsubscribeOwner = () => {};
      setAuthReady(true);

      if (!user || !db) {
        setOwnerReady(true);
        return;
      }

      setOwnerReady(false);
      const ownerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
      let firstSnapshotHandled = false;
      unsubscribeOwner = onSnapshot(
        ownerRef,
        () => {
          if (firstSnapshotHandled) return;
          firstSnapshotHandled = true;
          revealApp();
        },
        () => {
          if (firstSnapshotHandled) return;
          firstSnapshotHandled = true;
          revealApp();
        },
      );
    });

    return () => {
      unsubscribeOwner();
      unsubscribeAuth();
      if (revealFrameOne) cancelAnimationFrame(revealFrameOne);
      if (revealFrameTwo) cancelAnimationFrame(revealFrameTwo);
    };
  }, []);

  const transitionPending = !authReady || !ownerReady;

  return (
    <>
      <App />
      {transitionPending ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 text-white" aria-live="polite">
          <div
            className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-amber-500"
            role="status"
            aria-label="Loading DynastyHQ"
          />
        </div>
      ) : null}
    </>
  );
};

export default AuthAwareApp;
