import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import App from '../App.jsx';
import { auth } from '../firebase';

const AuthAwareApp = () => {
  const [authReady, setAuthReady] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const initialAuthResolvedRef = useRef(false);
  const previousUserIdRef = useRef(auth.currentUser?.uid || null);

  useEffect(() => onAuthStateChanged(auth, (user) => {
    const nextUserId = user?.uid || null;

    // The first auth callback is Firebase restoring the persisted session.
    // Let App handle that normal startup path without forcing a reload.
    if (!initialAuthResolvedRef.current) {
      initialAuthResolvedRef.current = true;
      previousUserIdRef.current = nextUserId;
      setAuthReady(true);
      return;
    }

    const previousUserId = previousUserIdRef.current;
    previousUserIdRef.current = nextUserId;

    // App historically starts correctly when Firebase restores an existing
    // session, but the in-page signed-out -> signed-in transition can render
    // before the owner's Firestore save is ready. Restart that one transition
    // automatically so it follows the proven persisted-session startup path.
    if (!previousUserId && nextUserId) {
      setTransitioning(true);
      window.location.reload();
      return;
    }

    setAuthReady(true);
    setTransitioning(false);
  }), []);

  return (
    <>
      <App />
      {(!authReady || transitioning) ? (
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
