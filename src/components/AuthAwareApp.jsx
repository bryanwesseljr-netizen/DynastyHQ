import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import App from '../App.jsx';
import { auth } from '../firebase';

const AuthAwareApp = () => {
  const [authSnapshot, setAuthSnapshot] = useState(() => ({
    ready: false,
    key: auth.currentUser?.uid || 'signed-out',
  }));

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setAuthSnapshot({
      ready: true,
      key: user?.uid || 'signed-out',
    });
  }), []);

  if (!authSnapshot.ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div
          className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-amber-500"
          role="status"
          aria-label="Loading DynastyHQ"
        />
      </div>
    );
  }

  // A successful login changes the key and remounts App from a clean signed-in
  // state. That makes App wait for the owner's Firestore snapshot just like a
  // normal authenticated page load instead of briefly rendering signed-out data.
  return <App key={authSnapshot.key} />;
};

export default AuthAwareApp;
