import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Read from Vite environment variables (Vercel) or fall back to your config object
const firebaseConfig = {
  apiKey: "AIzaSyDvBnbeXZewEh90gHY6_PPdieg5LQ4M1rs",
  authDomain: "dynastyhq-a380c.firebaseapp.com",
  projectId: "dynastyhq-a380c",
  storageBucket: "dynastyhq-a380c.firebasestorage.app",
  messagingSenderId: "567349041343",
  appId: "1:567349041343:web:31b73897044b148ce64e0a"
};

console.log("Vercel Env Check:", {
  hasApiKey: Boolean(firebaseConfig.apiKey),
  projectId: firebaseConfig.projectId
});

export const auth = getAuth(app);