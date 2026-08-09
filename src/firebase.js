import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const appId = 'dynasty-hq';

const envFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Vercel Preview previously inherited these public Firebase web settings from
// the project environment. If Preview env vars are absent, use the same public
// client configuration already shipped to browsers by the production build.
// Production continues to prefer its configured VITE_FIREBASE_* values.
const previewFirebaseFallback = {
  apiKey: 'AIzaSyDvBnbeXZewEh90gHY6_PPdieg5LQ4M1rs',
  authDomain: 'dynastyhq-a380c.firebaseapp.com',
  projectId: 'dynastyhq-a380c',
  storageBucket: 'dynastyhq-a380c.firebasestorage.app',
  messagingSenderId: '567349041343',
  appId: '1:567349041343:web:31b73897044b148ce64e0a',
};

const isVercelPreview = typeof window !== 'undefined'
  && /\.vercel\.app$/i.test(window.location.hostname)
  && window.location.hostname !== 'cfbdynastyhq.vercel.app';

const firebaseConfig = Object.fromEntries(
  Object.entries(envFirebaseConfig).map(([key, value]) => [
    key,
    value || (isVercelPreview ? previewFirebaseFallback[key] : value),
  ]),
);

const missingFirebaseConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseConfig.length) {
  throw new Error(`Missing Firebase configuration: ${missingFirebaseConfig.join(', ')}`);
}

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
