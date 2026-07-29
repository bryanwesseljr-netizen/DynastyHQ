import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Newspaper, Map, Trophy, Target, 
  Settings, Play, Save, Activity, Zap, 
  MessageSquare, Star, BarChart2, ShieldCheck,
  Search, Award, UserCircle, User, UploadCloud, Loader2,
  Headphones, Mic, Radio, GraduationCap, Battery,
  HeartPulse, Briefcase, DollarSign, Users, AlertTriangle,
  Camera, CheckCircle, Plus, Trash2, Medal, Check, X,
  Calendar, Megaphone, TrendingUp, GripVertical, FileText, CheckCircle2, Pencil, ScanLine,
  Share2, Mail, Quote, ClipboardSignature, Printer, Copy, BookOpen
} from 'lucide-react';

// Custom replacements for brand icons removed in lucide-react v1
const Twitter = (props) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
);
const Facebook = (props) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);

// --- FIREBASE CLOUD DATABASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, getDocs, deleteDoc } from 'firebase/firestore';

// --- DYNAMIC SCRIPT LOADER FOR OCR ---
const loadTesseract = () => {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) {
      resolve(window.Tesseract);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async = true;
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error("Failed to load Tesseract"));
    document.head.appendChild(script);
  });
};

// --- FIREBASE INITIALIZATION ---
let app, auth, db;
let appId = 'dynasty-hq';

// 👇👇👇 PASTE YOUR FIREBASE CONFIG OBJECT BELOW 👇👇👇
const YOUR_FIREBASE_CONFIG = { 
  apiKey: "AIzaSyDvBnbeXZewEh90gHY6_PPdieg5LQ4M1rs",
  authDomain: "dynastyhq-a380c.firebaseapp.com",
  projectId: "dynastyhq-a380c",
  storageBucket: "dynastyhq-a380c.firebasestorage.app",
  messagingSenderId: "567349041343",
  appId: "1:567349041343:web:31b73897044b148ce64e0a"
};
// Example: 
// const YOUR_FIREBASE_CONFIG = { apiKey: "AIzaSy...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "..." };

try {
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : YOUR_FIREBASE_CONFIG;
  if (typeof __app_id !== 'undefined') appId = __app_id;
  
  if (firebaseConfig && firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    console.warn("Firebase configuration keys are missing.");
  }
} catch (e) {
  console.error("Firebase init error", e);
}

// --- IMAGE COMPRESSION UTILITY ---
const compressImage = (file, maxWidth = 800) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleSize = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};

// --- LOCAL AUDIO STORAGE (IndexedDB) ---
const DB_NAME = "DynastyHQAudioDB";
const STORE_NAME = "audioStore";

const initAudioDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveAudioLocal = async (audioData) => {
  try {
    const db = await initAudioDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(audioData, 'podcastAudio');
  } catch (err) { console.error("Local Audio Save Error", err); }
};

const loadAudioLocal = async () => {
  try {
    const db = await initAudioDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get('podcastAudio');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) { return null; }
};

const clearAudioLocal = async () => {
    try {
        const db = await initAudioDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete('podcastAudio');
    } catch (err) {}
};

// --- FIRESTORE CHUNKING SYSTEM FOR LARGE AUDIO FILES ---
const saveAudioToCloud = async (db, appId, userId, base64Audio) => {
    try {
        const audioCollRef = collection(db, 'artifacts', appId, 'users', userId, 'hq_audio');
        const snapshot = await getDocs(audioCollRef);
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        if (!base64Audio) return;
        
        const chunkSize = 750000; 
        const numChunks = Math.ceil(base64Audio.length / chunkSize);
        const savePromises = [];
        for (let i = 0; i < numChunks; i++) {
            const chunk = base64Audio.substring(i * chunkSize, (i + 1) * chunkSize);
            const chunkRef = doc(db, 'artifacts', appId, 'users', userId, 'hq_audio', `chunk_${i}`);
            savePromises.push(setDoc(chunkRef, { data: chunk, index: i }));
        }
        await Promise.all(savePromises);
    } catch (e) {
        console.error("Audio chunking error:", e);
        throw e;
    }
};

const loadAudioFromCloud = async (db, appId, userId) => {
    try {
        const audioCollRef = collection(db, 'artifacts', appId, 'users', userId, 'hq_audio');
        const snapshot = await getDocs(audioCollRef);
        if (snapshot.empty) return null;
        
        const chunks = snapshot.docs.map(doc => doc.data()).sort((a, b) => a.index - b.index);
        return chunks.map(c => c.data).join('');
    } catch (e) {
        console.error("Audio load error:", e);
        return null;
    }
};

const App = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const viewId = urlParams.get('view');
  const isReadOnly = !!viewId;

  const [activeTab, setActiveTab] = useState(isReadOnly ? 'dashboard' : 'dataEntry');
  const [newsTheme, setNewsTheme] = useState('scouting');
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [isHouseRulesModalOpen, setIsHouseRulesModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [advanceConfirmModal, setAdvanceConfirmModal] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, index: null });
  const [shareLinkModal, setShareLinkModal] = useState({ isOpen: false, url: '' });
  const [pressConference, setPressConference] = useState(null); // Added for Interactive Presser
  
  // OCR & Upload States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const fileInputRef = useRef(null);
  const audioLoadedRef = useRef(false);
  const [messageModal, setMessageModal] = useState({ isOpen: false, text: '', type: 'success' });
  const [userState, setUserState] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const valOrEmpty = (v) => (v === null || v === undefined || Number.isNaN(v)) ? '' : v;

  // --- DEFAULT STATE ---
  const defaultState = {
    careerPhase: 'Player', // 'Player', 'OC', 'HC'
    player: { 
      name: 'Bryan Wessel', pos: 'QB', number: '#2', school: 'Edsel Ford High', 
      height: "6'1\"", weight: '198 lbs',
      stars: 3, overall: 70, archetype: 'Dual-Threat', nationalQbRank: 87,
      headshot: 'https://i.imgur.com/GUsMIVs.jpeg',
      isCommitted: false, college: ''
    },
    coach: {
      prestige: 'C+', security: 85, contractRemaining: 3, contractYear: 1, budget: 1500, almaMaterStatus: 'Stable'
    },
    currentSeason: 1, currentWeek: 1, playoffPicture: "", gameLogs: [],
    recruiting: [
      { id: 1, name: 'Michigan', level: 'None', interest: 0, offered: false, customOrder: 1 },
      { id: 2, name: 'Eastern Michigan', level: 'None', interest: 0, offered: false, customOrder: 2 },
      { id: 3, name: 'Cincinnati', level: 'None', interest: 0, offered: false, customOrder: 3 },
      { id: 4, name: 'Iowa State', level: 'None', interest: 0, offered: false, customOrder: 4 },
      { id: 5, name: 'Central Michigan', level: 'None', interest: 0, offered: false, customOrder: 5 }
    ],
    rtg: {
      gpa: 0, energy: 0, coachTrust: 0, trustToNext: 0, rank: '',
      skillPoints: 0, followers: 0, valuation: 0, sponsorships: '',
      wear: { arm: 'Green', legs: 'Green', chest: 'Green', head: 'Green' }
    },
    latestQuote: "We executed our script when it counted most. Just trying to stack wins.",
    outletImages: {
      broadsheet: 'https://i.imgur.com/OrmuBb1.jpeg', 
      on3: 'https://i.imgur.com/03AsLq6.jpeg',       
      local: 'https://i.imgur.com/uDOaqfM.jpeg',      
      filmroom: 'https://i.imgur.com/7n4Pd1F.jpeg',   
      podcast: 'https://i.imgur.com/hkKAzZC.jpeg'     
    }, 
    trophies: [], rumors: [], podcastAudio: '', hasCloudAudio: false
  };
  const [appState, setAppState] = useState(defaultState);
  const [newGame, setNewGame] = useState({ opponent: '', result: 'W', homeScore: '', awayScore: '', passYds: '', passTD: '', rushYds: '', rushTD: '', int: '' });
  const [rtgUpdate, setRtgUpdate] = useState(defaultState.rtg);
  const [coachUpdate, setCoachUpdate] = useState(defaultState.coach);
  const [newRumor, setNewRumor] = useState("");
  const [newTrophy, setNewTrophy] = useState({ name: '', year: 'Senior Year', type: 'Award' });
  const [editingGameIndex, setEditingGameIndex] = useState(null);
  const [dragEnabledId, setDragEnabledId] = useState(null);
  const [bulkAddText, setBulkAddText] = useState("");
  const [tempInterests, setTempInterests] = useState({});
  const [tempUrls, setTempUrls] = useState({});

  // --- FIREBASE CLOUD SYNC LOGIC ---
  useEffect(() => {
    if (!auth) {
      console.warn("Firebase Auth not initialized. Loading local/default state.");
      setAppState(defaultState);
      setIsLoaded(true);
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error", err);
        setIsLoaded(true);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserState(user);
      } else {
        setUserState(null);
        setAppState(defaultState);
        setIsLoaded(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db || !userState) return;
    
    // --- VIEWER MODE READ-ONLY FETCH ---
    if (isReadOnly && viewId) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'shared_dynasties', viewId);
        const unsubscribe = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                if (!cloudData.careerPhase) cloudData.careerPhase = 'Player';
                if (!cloudData.coach) cloudData.coach = defaultState.coach;
                if (!cloudData.player.stars) cloudData.player.stars = 3;
                if (!cloudData.player.overall) cloudData.player.overall = 70;
                
                if (cloudData.recruiting) {
                    cloudData.recruiting = cloudData.recruiting.map((s, idx) => ({ ...s, customOrder: s.customOrder || idx + 1 }));
                }

                if (cloudData.hasCloudAudio && !audioLoadedRef.current) {
                    audioLoadedRef.current = true;
                    try {
                        const audioCollRef = collection(db, 'artifacts', appId, 'public', 'data', `shared_audio_${viewId}`);
                        const snapshot = await getDocs(audioCollRef);
                        if (!snapshot.empty) {
                            const chunks = snapshot.docs.map(doc => doc.data()).sort((a, b) => a.index - b.index);
                            const base64 = chunks.map(c => c.data).join('');
                            setAppState(prev => ({ ...prev, podcastAudio: base64 }));
                        }
                    } catch (e) { console.error("Shared audio load error", e); }
                }

                setAppState(prev => {
                    let audioToKeep = prev.podcastAudio;
                    if (cloudData.podcastAudio && cloudData.podcastAudio.startsWith('http')) audioToKeep = cloudData.podcastAudio;
                    return { ...cloudData, podcastAudio: audioToKeep };
                });
                setRtgUpdate(cloudData.rtg || defaultState.rtg);
                setCoachUpdate(cloudData.coach || defaultState.coach);
            } else {
                setMessageModal({ isOpen: true, text: "Shared dynasty not found.", type: 'error' });
            }
            setIsLoaded(true);
        }, (error) => { setIsLoaded(true); });
        return () => unsubscribe();
    }

    // --- OWNER PRIVATE FETCH ---
    const docRef = doc(db, 'artifacts', appId, 'users', userState.uid, 'hq_data', 'main');
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        if (!cloudData.careerPhase) cloudData.careerPhase = 'Player';
        if (!cloudData.coach) cloudData.coach = defaultState.coach;
        if (!cloudData.player.stars) cloudData.player.stars = 3;
        if (!cloudData.player.overall) cloudData.player.overall = 70;
        
        if (cloudData.recruiting) {
            cloudData.recruiting = cloudData.recruiting.map((s, idx) => ({ ...s, customOrder: s.customOrder || idx + 1 }));
        }

        if (cloudData.hasCloudAudio && !audioLoadedRef.current) {
            audioLoadedRef.current = true;
            loadAudioFromCloud(db, appId, userState.uid).then(base64 => {
                if (base64) setAppState(prev => ({ ...prev, podcastAudio: base64 }));
            });
        }

        setAppState(prev => {
            let audioToKeep = prev.podcastAudio;
            if (cloudData.podcastAudio && cloudData.podcastAudio.startsWith('http')) audioToKeep = cloudData.podcastAudio;
            return { ...cloudData, podcastAudio: audioToKeep };
        });
        
        setRtgUpdate(cloudData.rtg || defaultState.rtg);
        setCoachUpdate(cloudData.coach || defaultState.coach);
      } else {
        const localAudio = await loadAudioLocal();
        const freshState = { ...defaultState, podcastAudio: localAudio || '' };
        setDoc(docRef, freshState).catch(console.error);
        setAppState(freshState);
        setRtgUpdate(freshState.rtg);
        setCoachUpdate(freshState.coach);
      }
      setIsLoaded(true);
    }, (error) => { setIsLoaded(true); });
    
    return () => unsubscribe();
  }, [userState]);

  const updateAppState = (newStateOrUpdater, successMessage = null) => {
    setAppState((prev) => {
      const newState = typeof newStateOrUpdater === 'function' ? newStateOrUpdater(prev) : newStateOrUpdater;
      if (userState && db) {
        const cloudState = { ...newState };
        if (cloudState.podcastAudio && cloudState.podcastAudio.startsWith('data:audio')) {
            cloudState.podcastAudio = ''; 
            cloudState.hasCloudAudio = true;
        } else if (!cloudState.podcastAudio) {
            cloudState.hasCloudAudio = false;
        }

        const docRef = doc(db, 'artifacts', appId, 'users', userState.uid, 'hq_data', 'main');
        setDoc(docRef, cloudState)
          .then(() => {
            if (successMessage) {
               setMessageModal({ isOpen: true, text: successMessage, type: 'success' });
               setTimeout(() => setMessageModal({ isOpen: false, text: '', type: 'success' }), 3000);
            }
          }).catch(err => {
             setMessageModal({ isOpen: true, text: "Error syncing to cloud.", type: 'error' });
             setTimeout(() => setMessageModal({ isOpen: false, text: '', type: 'success' }), 3000);
          });
      }
      return newState;
    });
  };

  // --- DERIVED STATS ---
  const isCoach = appState.careerPhase === 'OC' || appState.careerPhase === 'HC';
  const totals = appState.gameLogs.reduce((acc, game) => {
    acc.passYds += Number(game.passYds || 0);
    acc.passTD += Number(game.passTD || 0);
    acc.rushYds += Number(game.rushYds || 0);
    acc.rushTD += Number(game.rushTD || 0);
    acc.ints += Number(game.int || 0);
    return acc;
  }, { passYds: 0, passTD: 0, rushYds: 0, rushTD: 0, ints: 0 });
  
  const wins = appState.gameLogs.filter(g => g.result === 'W' && (g.season || 1) === (appState.currentSeason || 1)).length;
  const losses = appState.gameLogs.filter(g => g.result === 'L' && (g.season || 1) === (appState.currentSeason || 1)).length;
  const totalOffers = appState.recruiting.filter(s => s.offered).length;
  
  const activeSchools = appState.recruiting.filter(s => s.interest > 0 && s.level !== 'None');
  const hasActiveRecruiting = activeSchools.length > 0;
  const topSchool = [...activeSchools].sort((a, b) => (Number(b.interest) || 0) - (Number(a.interest) || 0))[0] || { name: 'Unknown', interest: 0 };
  
  const gamesPlayed = appState.gameLogs.length;
  const currentSeason = appState.currentSeason || 1;
  const currentSeasonGames = appState.gameLogs.filter(g => (g.season || 1) === currentSeason);
  const priorGames = appState.gameLogs.filter(g => (g.season || 1) < currentSeason);
  const isPreseason = currentSeasonGames.length === 0;
  const hasPriorHistory = priorGames.length > 0;
  const priorPassYds = priorGames.reduce((acc, g) => acc + Number(g.passYds || 0), 0);
  const priorTDs = priorGames.reduce((acc, g) => acc + Number(g.passTD || 0) + Number(g.rushTD || 0), 0);

  // --- BACKGROUND ENGINE ---
  const getBgImage = () => {
    switch(activeTab) {
      case 'dashboard': return 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1920&q=80'; 
      case 'recruiting': return 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=1920&q=80'; 
      case 'newsroom': return 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1920&q=80'; 
      case 'trophies': return 'https://images.unsplash.com/photo-1587280590050-1d99ce697928?auto=format&fit=crop&w=1920&q=80'; 
      case 'dataEntry': return 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1920&q=80'; 
      case 'settings': return 'https://images.unsplash.com/photo-1518063319808-88e89f8d16d0?auto=format&fit=crop&w=1920&q=80'; 
      default: return 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1920&q=80';
    }
  };

  // --- OCR / AUTO-SCAN ENGINE ---
  const handleUniversalScan = async (e) => {
    const targetInput = e.target;
    const file = targetInput.files[0];
    if (!file) return;
    setIsScanning(true);
    setScanProgress(0);
    try {
      const TesseractAPI = await loadTesseract();
      const compressedImage = await compressImage(file, 1200); 
      
      TesseractAPI.recognize(
        compressedImage, 'eng',
        { logger: m => { if (m.status === 'recognizing text') setScanProgress(Math.round(m.progress * 100)); } }
      ).then(({ data: { text } }) => {
        
        let parsedGame = { ...newGame };
        let parsedRtg = { ...rtgUpdate };
        let parsedRecruiting = [...appState.recruiting];
        
        let detectedTypes = [];
        let doRecruitingUpdate = false;
        
        const textLower = text.toLowerCase();
        if (/pass[ing]?\s*y[ar]*ds?/i.test(text) || /rush[ing]?\s*y[ar]*ds?/i.test(text) || /int[erceptions]?/i.test(text)) {
           detectedTypes.push("Box Score");
           const extractNumber = (regexString) => { const regex = new RegExp(regexString, 'i'); const match = text.match(regex); return match ? parseInt(match[1]) : ''; };
           parsedGame.passYds = extractNumber(/pass[ing]?\s*y[ar]*ds?[\s:]*(\d+)/i) || parsedGame.passYds;
           parsedGame.passTD = extractNumber(/pass[ing]?\s*tds?[\s:]*(\d+)/i) || parsedGame.passTD;
           parsedGame.rushYds = extractNumber(/rush[ing]?\s*y[ar]*ds?[\s:]*(\d+)/i) || parsedGame.rushYds;
           parsedGame.rushTD = extractNumber(/rush[ing]?\s*tds?[\s:]*(\d+)/i) || parsedGame.rushTD;
           parsedGame.int = extractNumber(/int[erceptions]*[\s:]*(\d+)/i) || parsedGame.int;
           setNewGame(parsedGame);
        }
        if (!isCoach && (/gpa/i.test(text) || /energy/i.test(text) || /trust/i.test(text) || /wear/i.test(text))) {
           detectedTypes.push("Player Mechanics");
           const extractFloat = (regexString) => { const regex = new RegExp(regexString, 'i'); const match = text.match(regex); return match ? parseFloat(match[1]) : ''; };
           const extractInt = (regexString) => { const regex = new RegExp(regexString, 'i'); const match = text.match(regex); return match ? parseInt(match[1].replace(/,/g, '')) : ''; };
           const extractWear = (part) => {
              const regex = new RegExp(`${part}[\\s:]*(green|yellow|red)`, 'i');
              const match = text.match(regex);
              if (match) { const status = match[1].toLowerCase(); return status.charAt(0).toUpperCase() + status.slice(1); }
              return parsedRtg.wear?.[part] || 'Green';
           };
           parsedRtg.gpa = extractFloat(/gpa[\s:]*(\d+\.\d+)/i) || parsedRtg.gpa;
           parsedRtg.energy = extractInt(/energy[\s:]*(\d+)/i) || parsedRtg.energy;
           parsedRtg.coachTrust = extractInt(/coach\s*trust[\s:]*(\d+)/i) || parsedRtg.coachTrust;
           parsedRtg.skillPoints = extractInt(/skill\s*points?[\s:]*(\d+)/i) || parsedRtg.skillPoints;
           parsedRtg.wear = { ...(parsedRtg.wear || {}), head: extractWear('head'), chest: extractWear('chest'), arm: extractWear('arm'), legs: extractWear('legs') };
           if(/followers?/i.test(text)) parsedRtg.followers = extractInt(/followers?[\s:]*(\d+)/i) || parsedRtg.followers;
           if(/valuation|\$/i.test(text)) parsedRtg.valuation = extractInt(/(?:valuation|\$)[\s:]*(\d+)/i) || parsedRtg.valuation;
           setRtgUpdate(parsedRtg);
        }
        
        const existingNames = parsedRecruiting.map(s => s.name.toLowerCase()).filter(n => n.length > 2);
        const hasExistingSchool = existingNames.some(n => textLower.includes(n));
        const isRecruitingBoard = /(interest|%|school|top|pipeline|offer|scout|target|board|commit|michigan|state|tech|university|college|ovr)/i.test(text) || /^(?:[1-9]|10|11|12|13|14|15)[\.\)\-\s]+[A-Z]/m.test(text);
        
        if (hasExistingSchool || isRecruitingBoard) {
            detectedTypes.push("Recruiting Board");
            doRecruitingUpdate = true;
            parsedRecruiting = parsedRecruiting.map(school => {
                const escapeRegex = (s) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(`${escapeRegex(school.name)}[^0-9]*(\\d{1,3})`, 'i');
                const match = text.match(regex);
                if (match) {
                    let val = parseInt(match[1]);
                    if (val <= 100) {
                        let newLevel = school.level;
                        if (val >= 75) newLevel = 'High'; else if (val >= 50) newLevel = 'Medium'; else if (val >= 25) newLevel = 'Low'; else newLevel = 'None';
                        return { ...school, interest: val, level: newLevel };
                    }
                }
                return school;
            });
            const lines = text.split('\n');
            lines.forEach(line => {
                let cleanLine = line.trim().replace(/^[^a-zA-Z0-9]+/, ''); 
                const match = cleanLine.match(/^(?:(?:[1-9]|10|11|12|13|14|15)[\.\)\-\s]+)?([A-Za-z][A-Za-z\s&]{2,25})(?:[^0-9a-zA-Z]*(\d{1,3})\s*%?)?/);
                if (match) {
                    const name = match[1].trim();
                    const interest = match[2] ? parseInt(match[2]) : null;
                    const invalidWords = ['pass', 'rush', 'energy', 'gpa', 'trust', 'wear', 'followers', 'commit', 'target', 'board', 'pipeline', 'total', 'season', 'interest', 'schools', 'ovr', 'pos', 'menu', 'options', 'defense', 'offense', 'overall'];
                    const isInvalid = invalidWords.some(w => name.toLowerCase().includes(w));
                    if (name.length > 3 && !isInvalid) {
                        const exists = parsedRecruiting.some(s => s.name.toLowerCase() === name.toLowerCase());
                        if (!exists) {
                            let newLevel = 'None'; let finalInt = 10;
                            if (interest && interest <= 100) {
                                finalInt = interest;
                                if (interest >= 75) newLevel = 'High'; else if (interest >= 50) newLevel = 'Medium'; else if (interest >= 25) newLevel = 'Low';
                            }
                            parsedRecruiting.push({ id: Date.now() + Math.random(), name: name, level: newLevel, interest: finalInt, offered: false });
                        }
                    }
                }
            });
        }
        if (doRecruitingUpdate) updateAppState(prev => ({ ...prev, recruiting: parsedRecruiting }));
        
        if (detectedTypes.length > 0) {
            setMessageModal({ isOpen: true, text: `Scanned Data: ${detectedTypes.join(', ')}. Review inputs.`, type: 'success' });
        } else {
            setMessageModal({ isOpen: true, text: `No recognizable data found in image.`, type: 'error' });
        }
        setTimeout(() => setMessageModal({ isOpen: false, text: '', type: 'success' }), 4000);
      }).catch(err => {
        setMessageModal({ isOpen: true, text: "Error scanning image. Please input manually.", type: 'error' });
        setTimeout(() => setMessageModal({ isOpen: false, text: '', type: 'error' }), 3000);
      }).finally(() => {
        setIsScanning(false);
        targetInput.value = ''; 
      });
    } catch (err) { setIsScanning(false); targetInput.value = ''; }
  };

  // --- HANDLERS ---
  const handleGlobalSave = () => {
    updateAppState(prev => ({
      ...prev, rtg: rtgUpdate, coach: coachUpdate
    }), "Progress saved to cloud!");
  };

  const handlePublishToPublic = async () => {
    if (!userState || !db) {
        setMessageModal({ isOpen: true, text: "Cloud Database Not Connected! Add your Firebase config to App.jsx to enable public sharing.", type: 'error' });
        setTimeout(() => setMessageModal({ isOpen: false, text: '', type: 'error' }), 6000);
        return;
    }
    setMessageModal({ isOpen: true, text: "Generating share link...", type: 'success' });
    try {
        if (window.location.href.includes('usercontent.goog')) {
             setMessageModal({ isOpen: true, text: "Cannot generate link in sandbox. Please push to Vercel first!", type: 'error' });
             setTimeout(() => setMessageModal({ isOpen: false, text: '', type: 'error' }), 6000);
             return;
        }

        const publicDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'shared_dynasties', userState.uid);
        const safeState = { ...appState };
        if (safeState.podcastAudio && safeState.podcastAudio.startsWith('data:audio')) {
            safeState.podcastAudio = ''; 
            safeState.hasCloudAudio = true;
        }
        await setDoc(publicDocRef, safeState);

        if (appState.podcastAudio && appState.podcastAudio.startsWith('data:audio')) {
            const chunkRef = collection(db, 'artifacts', appId, 'public', 'data', `shared_audio_${userState.uid}`);
            const oldChunks = await getDocs(chunkRef);
            await Promise.all(oldChunks.docs.map(d => deleteDoc(d.ref)));
            const chunkSize = 750000;
            const numChunks = Math.ceil(appState.podcastAudio.length / chunkSize);
            const promises = [];
            for (let i = 0; i < numChunks; i++) {
                const chunk = appState.podcastAudio.substring(i * chunkSize, (i + 1) * chunkSize);
                promises.push(setDoc(doc(chunkRef, `chunk_${i}`), { data: chunk, index: i }));
            }
            await Promise.all(promises);
        }

        const baseUrl = window.location.href.split('?')[0];
        setShareLinkModal({ isOpen: true, url: `${baseUrl}?view=${userState.uid}` });
        setMessageModal({ isOpen: false, text: '', type: 'success' });
    } catch (err) { setMessageModal({ isOpen: true, text: "Error generating link.", type: 'error' }); }
  };

  // --- INTERACTIVE PRESS CONFERENCE AI ---
  const generatePresserQuestions = (game) => {
    const isWin = game.result === 'W';
    const passYds = Number(game.passYds || 0);
    const rushYds = Number(game.rushYds || 0);
    const ints = Number(game.int || 0);
    
    let question = `Coach, tough battle out there today. What did you see from your sideline?`;
    let answers = [
        { tone: 'Humble', text: `"Our guys played hard, but we need to clean up our execution on early downs."` },
        { tone: 'Aggressive', text: `"We left points on the board. Period. We need to be more ruthless."` },
        { tone: 'Coach-Speak', text: `"It comes down to pad level and gap discipline. We'll watch the tape."` }
    ];

    if (isWin && passYds > 300) {
        question = `The aerial attack was practically unstoppable today with over 300 passing yards. Was exploiting their secondary part of the gameplan?`;
        answers = [
            { tone: 'Humble', text: `"Credit to the offensive line for giving us time, and the receivers for making plays."` },
            { tone: 'Aggressive', text: `"We knew their DBs couldn't hang with our speed. We wanted to attack them early and often."` },
            { tone: 'Coach-Speak', text: `"We just took what the defense gave us and executed the script we practiced all week."` }
        ];
    } else if (isWin && rushYds > 150) {
        question = `You dominated the trenches today, leaning heavily on the ground game. Talk about the physicality of this team.`;
        answers = [
            { tone: 'Humble', text: `"It starts up front. The big guys paved the way and made it easy on the backfield."` },
            { tone: 'Aggressive', text: `"We wanted to run the ball down their throats and impose our will. I think we did that."` },
            { tone: 'Coach-Speak', text: `"Establishing the run opens up the playbook. It's fundamental to our offensive identity."` }
        ];
    } else if (!isWin && ints >= 2) {
        question = `Multiple turnovers really derailed momentum today. How concerning is the ball security right now?`;
        answers = [
            { tone: 'Humble', text: `"That's on me. I have to put our guys in better positions to succeed and protect the football."` },
            { tone: 'Aggressive', text: `"You can't win in this league giving the ball away. It's unacceptable and it will be fixed."` },
            { tone: 'Coach-Speak', text: `"Turnovers are momentum killers. We'll evaluate the decision-making process in the film room."` }
        ];
    } else if (!isWin) {
        question = `A tough loss today. What do you tell the locker room after coming up short?`;
        answers = [
            { tone: 'Humble', text: `"We tip our caps to them. They played a great game. We have to learn from this and get better."` },
            { tone: 'Aggressive', text: `"This feeling should sting. We beat ourselves today and we need to channel this frustration."` },
            { tone: 'Coach-Speak', text: `"It's a 24-hour rule. We flush this, make our corrections tomorrow, and move on to the next opponent."` }
        ];
    }

    if (isCoach) {
        question = question.replace('Coach', 'Coach');
    } else {
        question = question.replace('Coach', appState.player.name);
    }

    return { question, answers };
  };

  const handleSaveGameClick = () => {
    let updatedRumors = [...appState.rumors];
    if (newRumor.trim() !== "") {
      updatedRumors = [newRumor, ...updatedRumors];
      setNewRumor("");
    }
    
    // Check if we are logging a valid new game
    if (newGame.opponent && newGame.opponent.trim() !== "" && editingGameIndex === null) {
        const presserData = generatePresserQuestions(newGame);
        setPressConference({ game: { ...newGame }, rumors: updatedRumors, presserData });
        return; // Pause save, wait for presser
    }

    // Standard Save / Edit without Presser
    if (editingGameIndex !== null) {
      updateAppState(prev => {
        const updatedLogs = [...prev.gameLogs];
        updatedLogs[editingGameIndex] = { ...newGame, week: updatedLogs[editingGameIndex].week, season: updatedLogs[editingGameIndex].season || 1 };
        return { ...prev, gameLogs: updatedLogs, rtg: rtgUpdate, coach: coachUpdate, rumors: updatedRumors };
      }, "Game log successfully updated!");
      setEditingGameIndex(null);
      setNewGame({ opponent: '', result: 'W', homeScore: '', awayScore: '', passYds: '', passTD: '', rushYds: '', rushTD: '', int: '' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      updateAppState(prev => ({
        ...prev, rtg: rtgUpdate, coach: coachUpdate, rumors: updatedRumors
      }), "Agenda updates synced to the cloud!");
      setActiveTab('dashboard'); 
    }
  };

  const finalizeGameSaveWithQuote = (selectedQuote) => {
      const { game, rumors } = pressConference;
      updateAppState(prev => ({
        ...prev,
        currentWeek: prev.currentWeek + 1,
        latestQuote: selectedQuote,
        gameLogs: [...prev.gameLogs, { ...game, week: prev.currentWeek, season: prev.currentSeason || 1 }],
        rtg: rtgUpdate,
        coach: coachUpdate,
        rumors: rumors
      }), "Weekly Agenda, Press Quote & Game Log synced to the cloud!");
      
      setNewGame({ opponent: '', result: 'W', homeScore: '', awayScore: '', passYds: '', passTD: '', rushYds: '', rushTD: '', int: '' });
      setPressConference(null);
      setActiveTab('newsroom'); 
  };

  const handleEditGame = (index) => {
    setNewGame(appState.gameLogs[index]);
    setEditingGameIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const requestDeleteGame = (index) => setDeleteConfirmModal({ isOpen: true, index });
  const confirmDeleteGame = () => {
    const index = deleteConfirmModal.index;
    updateAppState(prev => {
      const newLogs = prev.gameLogs.filter((_, i) => i !== index);
      const currSeasonCount = newLogs.filter(g => (g.season || 1) === (prev.currentSeason || 1)).length;
      return { ...prev, gameLogs: newLogs, currentWeek: currSeasonCount + 1 };
    }, "Game log deleted successfully.");
    if (editingGameIndex === index) {
      setEditingGameIndex(null);
      setNewGame({ opponent: '', result: 'W', homeScore: '', awayScore: '', passYds: '', passTD: '', rushYds: '', rushTD: '', int: '' });
    }
    setDeleteConfirmModal({ isOpen: false, index: null });
  };

  const cancelEdit = () => {
    setEditingGameIndex(null);
    setNewGame({ opponent: '', result: 'W', homeScore: '', awayScore: '', passYds: '', passTD: '', rushYds: '', rushTD: '', int: '' });
  };

  const requestAdvanceSeason = () => setAdvanceConfirmModal(true);
  const confirmAdvanceSeason = () => {
    updateAppState(prev => ({
      ...prev,
      currentSeason: (prev.currentSeason || 1) + 1,
      currentWeek: 1,
      coach: { ...prev.coach, contractYear: (prev.coach?.contractYear || 1) + 1 }
    }), `Welcome to Season ${(appState.currentSeason || 1) + 1}!`);
    setAdvanceConfirmModal(false);
  };

  const handleCommitment = (school) => {
    updateAppState(prev => ({
      ...prev,
      player: { ...prev.player, isCommitted: true, college: school.name },
      latestQuote: `I am incredibly blessed to announce my commitment to ${school.name}. Let's get to work!`,
      rumors: [`BREAKING: ${prev.player.stars}-Star ${prev.player.pos} ${prev.player.name} commits to ${school.name}!`, ...prev.rumors]
    }));
    setIsCommitModalOpen(false);
    setNewsTheme('on3');
    setActiveTab('newsroom');
  };

  const handleAddTrophy = () => {
    if(!newTrophy.name) return;
    updateAppState(prev => ({ ...prev, trophies: [{ ...newTrophy, id: Date.now() }, ...prev.trophies] }), "Milestone added to Legacy Case!");
    setNewTrophy({ name: '', year: `Season ${appState.currentSeason || 1}`, type: 'Award' });
  };

  const handleResetRequest = () => setIsResetModalOpen(true);
  const confirmReset = () => {
      clearAudioLocal();
      if (db && userState) saveAudioToCloud(db, appId, userState.uid, ''); 
      updateAppState(defaultState, "Cloud Database formatted. Starting fresh.");
      setIsResetModalOpen(false);
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 12000000) {
        setMessageModal({ isOpen: true, text: "File too large (Max 12MB). Please compress the audio.", type: 'error' });
        setTimeout(() => setMessageModal({ isOpen: false, text: '', type: 'error' }), 5000);
        return;
    }
    setMessageModal({ isOpen: true, text: "Encoding audio... please wait.", type: 'success' });
    const reader = new FileReader();
    reader.onload = async (event) => {
        const base64Audio = event.target.result;
        if (db && userState) {
            setMessageModal({ isOpen: true, text: "Uploading chunks to cloud...", type: 'success' });
            try {
                await saveAudioToCloud(db, appId, userState.uid, base64Audio);
                updateAppState(prev => ({ ...prev, podcastAudio: base64Audio, hasCloudAudio: true }), "Audio saved securely to the Cloud Database!");
            } catch (err) {
                setMessageModal({ isOpen: true, text: "Error uploading to cloud.", type: 'error' });
                setTimeout(() => setMessageModal({ isOpen: false, text: '', type: 'error' }), 4000);
            }
        } else {
           await saveAudioLocal(base64Audio);
           updateAppState(prev => ({ ...prev, podcastAudio: base64Audio }), "Audio saved to local device (Login required for cloud).");
        }
    };
    reader.readAsDataURL(file);
  };

  const handlePrint = () => {
    try {
        const printContent = document.querySelector('.print-full');
        if (!printContent) return;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html class="dark">
                    <head>
                        <title>Print Article - Dynasty HQ</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <script>
                            tailwind.config = { darkMode: 'class' };
                        </script>
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cinzel:wght@700;900&family=Fira+Code:wght@500;700&family=Inter:wght@300;400;600;700;800;900&family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&family=Teko:wght@600;700&display=swap');
                            body { padding: 20px; background: white; color: black; font-family: 'Inter', sans-serif; }
                            .font-serif { font-family: 'Playfair Display', serif; }
                            .font-display { font-family: 'Bebas Neue', sans-serif; }
                            .font-header { font-family: 'Teko', sans-serif; }
                            .font-cinzel { font-family: 'Cinzel', serif; }
                            .font-mono { font-family: 'Fira Code', monospace; }
                            .drop-cap::first-letter { font-size: 3.75rem; line-height: 0.8; float: left; margin-right: 0.6rem; font-weight: 900; }
                            .print-full { border: none !important; box-shadow: none !important; border-radius: 0 !important; }
                            @media print { body { padding: 0; } }
                        </style>
                    </head>
                    <body>
                        ${printContent.outerHTML}
                        <script>setTimeout(() => { window.print(); }, 1000);</script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        } else {
            setMessageModal({ isOpen: true, text: "Print blocked! Please allow pop-ups for this site, or press Ctrl+P / Cmd+P.", type: 'error' });
            setTimeout(() => setMessageModal({ isOpen: false, text: '', type: 'error' }), 6000);
        }
    } catch (e) {
        setMessageModal({ isOpen: true, text: "Print failed. Try using your browser's print function (Ctrl+P / Cmd+P).", type: 'error' });
        setTimeout(() => setMessageModal({ isOpen: false, text: '', type: 'error' }), 5000);
    }
  };

  const handleUrlBlur = (field, subfield) => {
      const key = `${field}-${subfield}`;
      if (tempUrls[key] !== undefined) {
          let formatted = tempUrls[key].trim();
          if (formatted.match(/^https?:\/\/imgur\.com\/[a-zA-Z0-9]+$/)) {
              formatted = formatted.replace('imgur.com', 'i.imgur.com') + '.jpeg';
          }
          updateAppState(prev => {
              if (field === 'player') return { ...prev, player: { ...prev.player, [subfield]: formatted } };
              else if (field === 'outletImages') return { ...prev, outletImages: { ...(prev.outletImages || {}), [subfield]: formatted } };
              return prev;
          });
          setTempUrls(prev => { const n = {...prev}; delete n[key]; return n; });
      }
  };

  // --- UNIVERSAL SORTING ENGINE ---
  const sortSchools = (schools) => {
    const levelWeights = { 'High': 4, 'Medium': 3, 'Low': 2, 'None': 1 };
    return [...schools].sort((a, b) => {
        if (levelWeights[b.level] !== levelWeights[a.level]) return levelWeights[b.level] - levelWeights[a.level];
        if ((Number(b.interest) || 0) !== (Number(a.interest) || 0)) return (Number(b.interest) || 0) - (Number(a.interest) || 0);
        return (Number(a.customOrder) || 999) - (Number(b.customOrder) || 999);
    });
  };

  const updateSchool = (id, field, value) => {
    updateAppState(prev => ({ ...prev, recruiting: prev.recruiting.map(s => s.id === id ? { ...s, [field]: value } : s) }));
  };

  const deleteSchool = (id) => {
    updateAppState(prev => ({ ...prev, recruiting: prev.recruiting.filter(s => s.id !== id) }));
  };

  const addSchool = (level) => {
    updateAppState(prev => ({ ...prev, recruiting: [...prev.recruiting, { id: Date.now(), name: 'New Prospect', level: level, interest: 10, offered: false, customOrder: prev.recruiting.length + 1 }] }));
  };

  const autoCategorizeSchool = (id) => {
    updateAppState(prev => {
      const newRecruiting = prev.recruiting.map(s => {
        if (s.id === id) {
          const val = Number(s.interest) || 0;
          let newLevel = s.level;
          if (val >= 75) newLevel = 'High'; else if (val >= 50) newLevel = 'Medium'; else if (val >= 25) newLevel = 'Low'; else newLevel = 'None';
          return { ...s, level: newLevel };
        }
        return s;
      });
      return { ...prev, recruiting: newRecruiting };
    });
  };

  const commitInterestChange = (id, newInterest) => {
    updateAppState(prev => {
        const newRecruiting = prev.recruiting.map(s => {
            if (s.id === id) {
                const val = newInterest;
                let newLevel = s.level;
                if (val >= 75) newLevel = 'High'; else if (val >= 50) newLevel = 'Medium'; else if (val >= 25) newLevel = 'Low'; else newLevel = 'None';
                return { ...s, interest: val, level: newLevel };
            }
            return s;
        });
        return { ...prev, recruiting: newRecruiting };
    });
  };

  const getInterestColor = (val) => {
    const num = Number(val) || 0;
    if (num >= 75) return 'text-emerald-400';
    if (num >= 50) return 'text-blue-400';
    if (num >= 25) return 'text-amber-400';
    return 'text-slate-400';
  };

  const getSliderAccent = (val) => {
    const num = Number(val) || 0;
    if (num >= 75) return 'accent-emerald-500';
    if (num >= 50) return 'accent-blue-500';
    if (num >= 25) return 'accent-amber-500';
    return 'accent-slate-500';
  };

  const handleDragStart = (e, id) => { e.dataTransfer.setData('schoolId', id); };
  const handleDrop = (e, targetLevel) => {
    e.preventDefault();
    const schoolId = parseInt(e.dataTransfer.getData('schoolId'));
    if (!schoolId) return;
    updateSchool(schoolId, 'level', targetLevel);
    setDragEnabledId(null);
  };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleSchoolDrop = (e, targetSchool) => {
    e.preventDefault(); e.stopPropagation();
    const schoolId = parseInt(e.dataTransfer.getData('schoolId'));
    if (!schoolId || schoolId === targetSchool.id) return;
    updateAppState(prev => {
      let sorted = sortSchools(prev.recruiting);
      const currentIndex = sorted.findIndex(s => s.id === schoolId);
      const targetIndex = sorted.findIndex(s => s.id === targetSchool.id);
      const movedItem = sorted.splice(currentIndex, 1)[0];
      movedItem.level = targetSchool.level; 
      sorted.splice(targetIndex, 0, movedItem);
      const newRecruiting = sorted.map((s, idx) => ({ ...s, customOrder: idx + 1 }));
      return { ...prev, recruiting: newRecruiting };
    });
    setDragEnabledId(null);
  };

  const handleBulkAddSchools = (e) => {
    e.preventDefault();
    if (!bulkAddText.trim()) return;
    const newSchools = bulkAddText.split(',').map(s => s.trim()).filter(s => s.length > 1);
    let updatedRecruiting = [...appState.recruiting];
    const startIndex = updatedRecruiting.length;
    newSchools.forEach((name, index) => {
        const exists = updatedRecruiting.some(s => s.name.toLowerCase() === name.toLowerCase());
        if (!exists) {
            updatedRecruiting.push({
                id: Date.now() + index, name: name, level: 'None', interest: 0, offered: false, customOrder: startIndex + index + 1
            });
        }
    });
    updateAppState(prev => ({ ...prev, recruiting: updatedRecruiting }), `Added ${newSchools.length} prospects to the board!`);
    setBulkAddText("");
  };

  const handleManualRankChange = (schoolId, newRank) => {
    if (!newRank || isNaN(newRank)) return;
    updateAppState(prev => {
        let sorted = sortSchools(prev.recruiting);
        const currentIndex = sorted.findIndex(s => s.id === schoolId);
        let targetIndex = newRank - 1;
        if (targetIndex < 0) targetIndex = 0;
        if (targetIndex >= sorted.length) targetIndex = sorted.length - 1;
        if (currentIndex === targetIndex) return prev;
        const movedItem = sorted.splice(currentIndex, 1)[0];
        sorted.splice(targetIndex, 0, movedItem);
        const newRecruiting = sorted.map((s, idx) => ({ ...s, customOrder: idx + 1 }));
        return { ...prev, recruiting: newRecruiting };
    });
  };

  // --- AI COACH LOGIC ---
  const getCoachAdvice = () => {
    const advice = [];
    const { rtg, coach, currentWeek } = appState;
    const gpa = Number(rtg.gpa) || 0;
    const valuation = Number(rtg.valuation) || 0;
    const coachTrust = Number(rtg.coachTrust) || 0;
    const trustToNext = Number(rtg.trustToNext) || 1;

    if (!isCoach) {
        if (gpa <= 2.5) advice.push({ type: 'danger', icon: AlertTriangle, text: `Academic Warning (GPA ${gpa.toFixed(1)}): Your GPA is dropping dangerously. Spend energy on studying.`});
        else if (gpa >= 3.5) advice.push({ type: 'success', icon: GraduationCap, text: `Academics (GPA ${gpa.toFixed(1)}): Excellent work. You have a buffer to spend energy on training.`});
        if (valuation >= 2000 && gpa <= 2.9) advice.push({ type: 'danger', icon: DollarSign, text: `NIL Distraction: Your valuation is soaring, but your GPA is slipping (${gpa.toFixed(1)}). Don't let brand deals ruin your eligibility.`});
        
        if (!appState.player.isCommitted) {
          if (currentWeek < 5 && totalOffers === 0) advice.push({ type: 'info', icon: Map, text: "Recruiting: Keep playing well to get on the map. Build your tape and the offers will come."});
          else if (currentWeek >= 5 && totalOffers === 0) advice.push({ type: 'warning', icon: AlertTriangle, text: "Recruiting Panic: Week 5 and ZERO offers. You need a massive breakout game immediately to grab scouts' attention."});
          else if (totalOffers > 0) advice.push({ type: 'success', icon: Award, text: `Offers Received (${totalOffers}): You have official offers! Decide whether to commit early or wait for a 'Reach' school.`});
        }
        
        const wornParts = Object.entries(rtg.wear || {}).filter(([k,v]) => v !== 'Green');
        if (wornParts.length > 0) {
          const partsText = wornParts.map(p => p[0].charAt(0).toUpperCase() + p[0].slice(1)).join(' and ');
          advice.push({ type: 'warning', icon: HeartPulse, text: `Wear & Tear Alert: Your ${partsText} condition has dropped. Limit extra hits outside the pocket.`});
        }
        
        if (coachTrust < trustToNext) advice.push({ type: 'info', icon: ShieldCheck, text: `Position Battle (${rtg.rank || 'Unranked'}): You need ${trustToNext - coachTrust} more Coach Trust points to steal the starting job.`});
        else advice.push({ type: 'success', icon: Target, text: `Position Secured (${rtg.rank || 'Starter'}): You have the starting job. Keep your trust high to prevent being subbed out.`});
    } else {
        // Coach Advice
        if (coach.security < 40) advice.push({ type: 'danger', icon: AlertTriangle, text: `Hot Seat Alert (Security: ${coach.security}%): You need wins immediately or you will be fired at the end of the year.`});
        else if (coach.security > 80) advice.push({ type: 'success', icon: Award, text: `Job Secured (Security: ${coach.security}%): The AD loves what you are building. Keep stacking wins.`});
        
        if (totalOffers < 3 && currentWeek > 5) advice.push({ type: 'warning', icon: Users, text: `Recruiting Crisis: Week ${currentWeek} and only ${totalOffers} scholarships offered. You need to fill out your board before early signing day.`});
        if (Number(coach.contractYear) >= Number(coach.contractRemaining)) advice.push({ type: 'info', icon: FileText, text: `Contract Year: This is the final year of your current contract. Prepare for the Coaching Carousel.`});
    }

    if (gamesPlayed > 0 && totals.ints >= gamesPlayed) advice.push({ type: 'warning', icon: AlertTriangle, text: `Turnover Alert: You are averaging an interception a game. Protect the football.`});
    if (gamesPlayed > 0 && (totals.passTD + totals.rushTD) >= (gamesPlayed * 3)) advice.push({ type: 'success', icon: Zap, text: `Juggernaut: You are dominating the stat sheet. Keep scoring at this pace.`});

    return advice.slice(0, 5); 
  };

  const getAdviceColor = (type) => {
    switch(type) {
      case 'danger': return 'bg-red-900/40 border-red-500 text-red-200';
      case 'warning': return 'bg-amber-900/40 border-amber-500 text-amber-200';
      case 'success': return 'bg-emerald-900/40 border-emerald-500 text-emerald-200';
      case 'info': default: return 'bg-slate-900/80 border-blue-500 text-slate-300';
    }
  };

  const formatNum = (num) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
  };

  if (!isLoaded) {
    return <div className="flex h-screen bg-slate-950 items-center justify-center text-white"><Loader2 className="animate-spin w-12 h-12 text-amber-500" /></div>
  }

  // --- RENDERERS ---
  const renderNav = () => {
    const navItems = isReadOnly ? [
      { id: 'dashboard', icon: Home, label: isCoach ? 'Coach Office' : 'Command Center' },
      { id: 'recruiting', icon: Map, label: isCoach ? "Coach's Prospect Board" : 'Recruiting Board' },
      { id: 'newsroom', icon: Newspaper, label: 'The Newsroom' },
      { id: 'trophies', icon: Trophy, label: 'Legacy Trophy Case' }
    ] : [
      { id: 'dashboard', icon: Home, label: isCoach ? 'Coach Office' : 'Command Center' },
      { id: 'recruiting', icon: Map, label: isCoach ? "Coach's Prospect Board" : 'Recruiting Board' },
      { id: 'newsroom', icon: Newspaper, label: 'The Newsroom' },
      { id: 'trophies', icon: Trophy, label: 'Legacy Trophy Case' },
      { id: 'dataEntry', icon: Activity, label: 'Log Weekly Agenda' },
      { id: 'settings', icon: Settings, label: 'Hub Settings' },
      { id: 'rules', icon: FileText, label: 'House Rules' }
    ];

    const player = appState.player;
    const stars = Number(player.stars) || 3;
    const starString = '★'.repeat(stars) + '☆'.repeat(5 - stars);

    return (
      <div className="w-72 bg-slate-950/90 backdrop-blur-xl border-r border-slate-800 flex flex-col no-print shrink-0 z-50 shadow-2xl relative">
        <div className="p-6 border-b border-slate-800/50 relative">
          <h1 className="text-[22px] font-black tracking-wider flex items-center gap-2 drop-shadow-md text-white font-sans">
            <Trophy size={20} /> DYNASTY <span className="text-amber-500">HQ</span>
          </h1>
          <div className="mt-4">
            <p className="text-sm text-white font-bold tracking-wide drop-shadow flex items-center gap-2">
                {isCoach ? `Coach ${player.name.split(' ')[1] || player.name}` : player.name}
                {isReadOnly && <span className="bg-blue-600 text-[9px] px-1.5 py-0.5 rounded text-white font-black tracking-widest shadow-lg">VIEWER</span>}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Wk {appState.currentWeek} • Season {appState.currentSeason || 1}</p>
            
            <div className="mt-2 space-y-1.5">
               <div className="flex items-center gap-2 text-xs font-black">
                 {isCoach ? (
                    <span className="text-emerald-400 tracking-widest drop-shadow-md">{appState.careerPhase === 'OC' ? 'Offensive Coordinator' : 'Head Coach'}</span>
                 ) : (
                    <span className="text-amber-400 tracking-widest drop-shadow-md">{starString}</span>
                 )}
                 <span className="bg-slate-800 text-white px-2 py-0.5 rounded border border-slate-700 shadow-inner">{isCoach ? appState.coach?.prestige : `${player.overall} OVR`}</span>
               </div>
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
                 <span className="text-blue-400">{isCoach ? player.school : player.archetype}</span>
                 {!isCoach && (
                   <>
                    <span>•</span><span>{player.height}</span><span>•</span><span>{player.weight}</span>
                   </>
                 )}
               </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} 
                onClick={() => {
                  if (item.id === 'rules') { setIsHouseRulesModalOpen(true); } else { setActiveTab(item.id); }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-bold ${
                  activeTab === item.id && item.id !== 'rules' ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}>
                <Icon size={18} /> {item.label}
              </button>
            );
          })}
        </nav>
        
        {/* QUICK SAVE SIDEBAR BUTTON */}
        {!isReadOnly && (
            <div className="p-4 border-t border-slate-800/50 space-y-2">
                <button onClick={handleGlobalSave} className="w-full bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white px-4 py-3 rounded-lg font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-emerald-500 shadow-md">
                    <Save size={16} /> Quick Save
                </button>
                <button onClick={handlePublishToPublic} className="w-full bg-slate-900 hover:bg-blue-600 text-slate-400 hover:text-white px-4 py-3 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-slate-800 hover:border-blue-500 shadow-md">
                    <Share2 size={14} /> Get Share Link
                </button>
            </div>
        )}
      </div>
    );
  };

  const renderDashboard = () => {
    const hasRedWear = Object.values(appState.rtg.wear || {}).includes('Red');
    const hasYellowWear = Object.values(appState.rtg.wear || {}).includes('Yellow');
    const gameDayStatus = hasRedWear ? { text: 'QUESTIONABLE', color: 'text-red-400 bg-red-950/40 border-red-500/30', Icon: AlertTriangle } : 
                          hasYellowWear ? { text: 'PROBABLE', color: 'text-amber-400 bg-amber-950/40 border-amber-500/30', Icon: Activity } : 
                          { text: 'ACTIVE', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30', Icon: CheckCircle2 };
    
    const StatusIcon = gameDayStatus.Icon;

    return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in pb-20 relative z-10">
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 bg-slate-900/85 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-2xl">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-md">{isCoach ? 'Coach Office' : 'RTG Command Center'}</h2>
          <p className="text-slate-300 font-bold uppercase tracking-widest text-xs mt-1 drop-shadow">Season {appState.currentSeason || 1} • Week {appState.currentWeek} • {appState.player.school}</p>
        </div>
        <div className="flex gap-6 items-center">
          <div className="text-center px-6 border-r border-slate-600/50">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Season Record</div>
            <div className="text-3xl font-black text-white drop-shadow-md">{wins} - {losses}</div>
          </div>
          <div className="flex gap-4">
            {!isCoach ? (
                <>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Gameday Status</div>
                  <div className={`text-sm font-bold px-3 py-1.5 rounded border flex items-center gap-2 backdrop-blur-sm shadow-inner uppercase tracking-wider ${gameDayStatus.color}`}>
                    <StatusIcon size={14}/> {gameDayStatus.text}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Season Roadmap</div>
                  <div className="text-sm font-bold text-amber-400 bg-amber-950/40 px-3 py-1.5 rounded border border-amber-500/30 flex items-center gap-2 backdrop-blur-sm shadow-inner min-h-[34px]">
                    <TrendingUp size={14}/> {appState.playoffPicture || "TBD"}
                  </div>
                </div>
                </>
            ) : (
                <>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Job Security</div>
                  <div className={`text-sm font-bold px-3 py-1.5 rounded border flex items-center gap-2 backdrop-blur-sm shadow-inner uppercase tracking-wider ${appState.coach?.security < 40 ? 'text-red-400 bg-red-950/40 border-red-500/30' : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'}`}>
                    <ShieldCheck size={14}/> {appState.coach?.security}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Program Outlook</div>
                  <div className="text-sm font-bold text-amber-400 bg-amber-950/40 px-3 py-1.5 rounded border border-amber-500/30 flex items-center gap-2 backdrop-blur-sm shadow-inner min-h-[34px]">
                    <TrendingUp size={14}/> {appState.playoffPicture || "Rebuilding"}
                  </div>
                </div>
                </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/85 backdrop-blur-md p-5 rounded-xl border border-slate-700/50 shadow-2xl">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest drop-shadow">{isCoach ? 'Career Off. Pass Yds' : 'Career Pass Yds'}</p>
          <p className="text-3xl font-black text-white drop-shadow-md">{totals.passYds}</p>
        </div>
        <div className="bg-slate-900/85 backdrop-blur-md p-5 rounded-xl border border-slate-700/50 shadow-2xl">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest drop-shadow">{isCoach ? 'Career Off. Pass TD' : 'Career Pass TD'}</p>
          <p className="text-3xl font-black text-white drop-shadow-md">{totals.passTD}</p>
        </div>
        <div className="bg-slate-900/85 backdrop-blur-md p-5 rounded-xl border border-slate-700/50 shadow-2xl">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest drop-shadow">{isCoach ? 'Career Off. Rush Yds' : 'Career Rush Yds'}</p>
          <p className="text-3xl font-black text-amber-400 drop-shadow-md">{totals.rushYds}</p>
        </div>
        <div className="bg-slate-900/85 backdrop-blur-md p-5 rounded-xl border border-slate-700/50 shadow-2xl">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest drop-shadow">{isCoach ? 'Career Off. Rush TD' : 'Career Rush TD'}</p>
          <p className="text-3xl font-black text-amber-400 drop-shadow-md">{totals.rushTD}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {!isCoach ? (
            <>
            <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-5 shadow-2xl space-y-4 flex flex-col justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-700/50 pb-2 drop-shadow"><Activity size={16} className="text-blue-400"/> Player Mechanics</h3>
              <div className="space-y-3 mt-2">
                <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 shadow-inner">
                  <div className="flex items-center gap-2"><GraduationCap size={16} className="text-blue-400"/> <span className="text-xs font-bold text-slate-300">GPA</span></div>
                  <span className={`text-sm font-black ${Number(appState.rtg.gpa || 0) < 2.5 ? 'text-red-400' : 'text-white'}`}>{Number(appState.rtg.gpa || 0).toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 shadow-inner">
                  <div className="flex items-center gap-2"><Battery size={16} className="text-emerald-400"/> <span className="text-xs font-bold text-slate-300">Weekly Energy</span></div>
                  <span className={`text-sm font-black ${Number(appState.rtg.energy || 0) < 30 ? 'text-red-400' : 'text-white'}`}>{appState.rtg.energy}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 shadow-inner">
                  <div className="flex items-center gap-2"><Target size={16} className="text-amber-500"/> <span className="text-xs font-bold text-slate-300">Skill Pts</span></div>
                  <span className="text-sm font-black text-white">{appState.rtg.skillPoints}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-5 shadow-2xl space-y-4 flex flex-col justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-700/50 pb-2 drop-shadow">
                <ShieldCheck size={16} className="text-amber-500"/> Position Battle
              </h3>
              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50 shadow-inner text-center mt-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Depth Chart Rank</p>
                <h4 className="text-3xl font-black text-white drop-shadow-md">{appState.rtg.rank || 'N/A'}</h4>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50 shadow-inner mt-3">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Coach Trust</span>
                    <span className="text-lg font-black text-amber-500">{appState.rtg.coachTrust} <span className="text-xs text-slate-500">/ {appState.rtg.trustToNext}</span></span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">To Steal Job</span>
                    <span className="text-sm font-black text-white">{Math.max(0, Number(appState.rtg.trustToNext || 0) - Number(appState.rtg.coachTrust || 0))} pts</span>
                  </div>
                </div>
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-700">
                  <div className="bg-amber-500 h-full shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-500" style={{width: `${Math.min(100, ((Number(appState.rtg.coachTrust) || 0) / (Number(appState.rtg.trustToNext) || 1)) * 100)}%`}}></div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-5 shadow-2xl space-y-4 flex flex-col justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-700/50 pb-2 drop-shadow"><HeartPulse size={16} className="text-red-500"/> Wear & Tear Monitor</h3>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {['head', 'chest', 'arm', 'legs'].map((part) => (
                  <div key={part} className="flex flex-col items-center bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 shadow-inner">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{part}</span>
                    <span className={`px-3 py-1.5 w-full text-center rounded text-xs font-black uppercase tracking-wider ${appState.rtg.wear?.[part] === 'Red' ? 'bg-red-500/90 text-white border border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : appState.rtg.wear?.[part] === 'Yellow' ? 'bg-amber-500/90 text-black border border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-emerald-500/90 text-black border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'}`}>
                      {appState.rtg.wear?.[part] || 'Green'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-5 shadow-2xl space-y-4 flex flex-col justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-700/50 pb-2 drop-shadow"><Briefcase size={16} className="text-emerald-500"/> Brand Portfolio</h3>
              <div className="space-y-3 mt-2">
                <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 shadow-inner">
                  <div className="flex items-center gap-2"><Users size={16} className="text-blue-400"/> <span className="text-xs font-bold text-slate-300">Followers</span></div>
                  <span className="text-sm font-black text-white">{formatNum(Number(appState.rtg.followers) || 0)}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 shadow-inner">
                  <div className="flex items-center gap-2"><DollarSign size={16} className="text-emerald-400"/> <span className="text-xs font-bold text-slate-300">Valuation</span></div>
                  <span className="text-sm font-black text-emerald-400">${(Number(appState.rtg.valuation) || 0).toLocaleString()}</span>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 shadow-inner">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Sponsorships</div>
                  <div className="text-xs font-bold text-white truncate">{appState.rtg.sponsorships || "None"}</div>
                </div>
              </div>
            </div>
            </>
        ) : (
            <>
            {/* COACH VIEW PORTLETS */}
            <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-5 shadow-2xl space-y-4 flex flex-col justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-700/50 pb-2 drop-shadow"><Award size={16} className="text-amber-500"/> Coach Profile</h3>
              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50 shadow-inner text-center mt-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Coach Prestige Grade</p>
                <h4 className="text-3xl font-black text-white drop-shadow-md">{appState.coach?.prestige || 'C'}</h4>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 shadow-inner flex justify-between items-center">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Alma Mater Status</span>
                 <span className="text-xs font-black text-emerald-400">{appState.coach?.almaMaterStatus || 'Stable'}</span>
              </div>
            </div>

            <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-5 shadow-2xl space-y-4 flex flex-col justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-700/50 pb-2 drop-shadow"><FileText size={16} className="text-blue-400"/> Contract Tracker</h3>
              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50 shadow-inner text-center mt-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Current Deal</p>
                <h4 className="text-2xl font-black text-white drop-shadow-md">Year {appState.coach?.contractYear || 1} <span className="text-sm text-slate-500">/ {appState.coach?.contractRemaining || 3}</span></h4>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-700 mt-2">
                  <div className="bg-blue-500 h-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-500" style={{width: `${Math.min(100, ((Number(appState.coach?.contractYear) || 1) / (Number(appState.coach?.contractRemaining) || 3)) * 100)}%`}}></div>
              </div>
            </div>

            <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-5 shadow-2xl space-y-4 flex flex-col justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-700/50 pb-2 drop-shadow"><Users size={16} className="text-emerald-500"/> Recruiting Power</h3>
              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50 shadow-inner text-center mt-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Weekly Recruiting Hours</p>
                <h4 className="text-3xl font-black text-emerald-400 drop-shadow-md">{appState.coach?.budget || 1000}</h4>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 shadow-inner flex justify-between items-center">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Targets</span>
                 <span className="text-xs font-black text-white">{activeSchools.length} Recruits</span>
              </div>
            </div>

            <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-5 shadow-2xl space-y-4 flex flex-col justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-700/50 pb-2 drop-shadow"><Briefcase size={16} className="text-amber-500"/> Carousel Watch</h3>
              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50 shadow-inner mt-2 flex flex-col justify-center h-full">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 text-center">Recent Job Offers</p>
                <div className="text-xs font-bold text-white italic text-center text-slate-500">
                    No off-season offers currently on the table. Keep winning.
                </div>
              </div>
            </div>
            </>
        )}

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-6 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wide drop-shadow"><BarChart2 size={18} className="text-amber-500"/> Career Game Logs</h3>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-sm relative">
              <thead className="text-slate-400 border-b border-slate-700 sticky top-0 bg-slate-900">
                <tr><th className="pb-2">Season</th><th className="pb-2">Wk</th><th className="pb-2">Opponent</th><th className="pb-2">Res</th><th className="pb-2">Score</th><th className="pb-2">Pass</th><th className="pb-2">Rush</th></tr>
              </thead>
              <tbody className="text-slate-200 divide-y divide-slate-700/50">
                {appState.gameLogs.length === 0 && (<tr><td colSpan="7" className="py-4 text-center text-slate-500 italic">No games logged yet. Play Week 1!</td></tr>)}
                {appState.gameLogs.map((game, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-mono text-slate-400 border-r border-slate-700/30 pr-2">S{game.season || 1}</td>
                    <td className="py-3 font-mono text-slate-400 pl-2">{game.week}</td>
                    <td className="py-3 font-bold">{game.opponent}</td>
                    <td className={`py-3 font-black ${game.result === 'W' ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'text-red-400'}`}>{game.result}</td>
                    <td className="py-3 font-mono text-slate-300">{game.homeScore}-{game.awayScore}</td>
                    <td className="py-3 font-medium text-slate-300">{game.passYds}/{game.passTD}</td>
                    <td className="py-3 text-amber-400 font-bold">{game.rushYds}/{game.rushTD}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-6 shadow-2xl space-y-3">
          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2 uppercase tracking-wide drop-shadow"><Target size={18} className="text-emerald-500"/> The AI Advisor</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-700/50 mb-3">Hyper-Specific Weekly Agenda</p>
          
          {getCoachAdvice().map((adv, i) => {
             const Icon = adv.icon;
             return (
              <div key={i} className={`p-3.5 rounded-lg text-xs font-medium border-l-4 leading-relaxed backdrop-blur-sm ${getAdviceColor(adv.type)}`}>
                <div className="flex gap-2 items-start">
                  <Icon size={16} className="mt-0.5 shrink-0" />
                  <span>{adv.text}</span>
                </div>
              </div>
             )
          })}
        </div>
      </div>

    </div>
    );
  };

  const renderTrophies = () => {
    // Generate H2H Record
    const h2h = appState.gameLogs.reduce((acc, log) => {
        const opp = log.opponent.trim();
        if (!acc[opp]) acc[opp] = { W: 0, L: 0, lastPlayed: log.season };
        if (log.result === 'W') acc[opp].W++; else acc[opp].L++;
        if (log.season > acc[opp].lastPlayed) acc[opp].lastPlayed = log.season;
        return acc;
    }, {});

    const sortedH2H = Object.entries(h2h).sort((a, b) => (b[1].W + b[1].L) - (a[1].W + a[1].L));

    return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-20 relative z-10">
      <div className="flex justify-between items-end mb-6 bg-slate-900/85 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-xl">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-md">Legacy Trophy Case</h2>
          <p className="text-slate-300 text-sm font-bold mt-1 drop-shadow">A permanent record of your milestones, awards, and championships.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {appState.trophies.map(trophy => (
          <div key={trophy.id} className="bg-slate-900/85 backdrop-blur-md border border-amber-500/30 rounded-2xl p-6 text-center shadow-2xl flex flex-col items-center justify-center space-y-3 group hover:border-amber-500 hover:bg-slate-900/95 transition-all">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border-2 border-amber-500/50 group-hover:bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all">
              <Medal size={32} className="text-amber-400 drop-shadow-md" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider leading-tight drop-shadow-sm">{trophy.name}</h4>
              <p className="text-xs text-amber-400 font-bold mt-1 uppercase">{trophy.year}</p>
            </div>
            <span className="text-[9px] bg-slate-950/50 px-2 py-1 rounded text-slate-300 uppercase tracking-widest border border-slate-700">{trophy.type}</span>
          </div>
        ))}
        {appState.trophies.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-2xl italic">No milestones recorded yet. Head to Data Entry to add your first!</div>
        )}
      </div>

      {/* LORE LEDGER */}
      <div className="mt-12 bg-slate-900/85 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-xl">
        <h3 className="text-2xl font-black text-white uppercase tracking-tight drop-shadow-md flex items-center gap-2 mb-2"><BookOpen className="text-blue-400"/> Rivalry & Lore Ledger</h3>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6 border-b border-slate-700/50 pb-3">All-Time Head-to-Head Records</p>
        
        {sortedH2H.length === 0 ? (
             <div className="text-center text-slate-500 italic py-6">Play your first game to generate rivalries.</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedH2H.map(([opp, record], i) => (
                    <div key={i} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 flex justify-between items-center shadow-inner hover:border-slate-600 transition-colors">
                        <div>
                            <h4 className="font-bold text-white text-sm">{opp}</h4>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Last Played: Season {record.lastPlayed}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-0.5">Record</div>
                            <div className={`text-xl font-black drop-shadow-sm ${record.W > record.L ? 'text-emerald-400' : record.W < record.L ? 'text-red-400' : 'text-slate-300'}`}>
                                {record.W} - {record.L}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
    );
  };

  const renderRecruiting = () => {
    const offeredSchools = appState.recruiting.filter(s => s.offered);
    
    const levels = isCoach ? [
      { id: 'High', title: 'Committed / High Interest', color: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-500' },
      { id: 'Medium', title: 'Top 3 / Medium', color: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-500' },
      { id: 'Low', title: 'Top 5 / Low', color: 'text-amber-400', border: 'border-amber-500', bg: 'bg-amber-500' },
      { id: 'None', title: 'Scouting Phase', color: 'text-slate-400', border: 'border-slate-500', bg: 'bg-slate-500' }
    ] : [
      { id: 'High', title: 'High Interest', color: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-500' },
      { id: 'Medium', title: 'Medium Interest', color: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-500' },
      { id: 'Low', title: 'Low Interest', color: 'text-amber-400', border: 'border-amber-500', bg: 'bg-amber-500' },
      { id: 'None', title: 'Scouting / No Interest', color: 'text-slate-400', border: 'border-slate-500', bg: 'bg-slate-500' }
    ];

    const globalSortedSchools = sortSchools(appState.recruiting);
    const getGlobalRank = (id) => globalSortedSchools.findIndex(s => s.id === id) + 1;

    return (
      <div className="max-w-[90rem] mx-auto space-y-6 animate-in fade-in pb-20 relative z-10">
        
        {!isCoach && appState.player.isCommitted ? (
          <div className="bg-gradient-to-r from-amber-600/90 to-amber-500/90 backdrop-blur-md rounded-2xl p-8 border-2 border-amber-300 shadow-2xl text-center shadow-amber-500/40">
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight mb-2 drop-shadow-sm">COMMITTED TO {appState.player.college.toUpperCase()}</h2>
            <p className="text-amber-950 font-bold uppercase tracking-widest text-sm">Recruitment is officially closed.</p>
          </div>
        ) : (
          <div className="flex flex-col xl:flex-row justify-between items-end mb-4 gap-4 bg-slate-900/85 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-2xl">
            <div className="flex-1 w-full">
              <h2 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-md">
                 {isCoach ? "Coach's Prospect Board" : "Recruiting War Room"}
              </h2>
              <p className="text-slate-300 text-sm font-bold mt-1 drop-shadow">
                 {isCoach ? "Track your High School and Transfer Portal targets. Drag to organize." : "Drag and drop schools to organize your active board. Or quick-add schools below."}
              </p>
              
              {(!appState.player.isCommitted && !isReadOnly) && (
                  <form onSubmit={handleBulkAddSchools} className="mt-4 flex gap-2 w-full max-w-xl">
                      <input 
                          type="text" 
                          value={bulkAddText}
                          onChange={(e) => setBulkAddText(e.target.value)}
                          placeholder={isCoach ? "Add Recruits: J. Smith (4★), T. Williams (Transfer)..." : "Quick add: Toledo, EMU, Ball State..." }
                          className="flex-1 bg-slate-950/80 border border-slate-600 rounded-lg p-2 text-white shadow-inner text-sm outline-none focus:border-blue-500 transition-colors"
                      />
                      <button type="submit" className="bg-slate-800 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors border border-slate-600 hover:border-blue-500 flex items-center gap-2">
                          <Plus size={16}/> Bulk Add
                      </button>
                  </form>
              )}
            </div>
            
            <div className="flex gap-6 items-center shrink-0">
              <div className="text-center px-6 border-r border-slate-600/50">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{isCoach ? "Scholarships Sent" : "Total Offers"}</div>
                <div className="text-3xl font-black text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]">{totalOffers}</div>
              </div>
              {(!isCoach && totalOffers > 0 && !isReadOnly) && (
                <button onClick={() => setIsCommitModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all">
                  <Megaphone size={18}/> Commit to School
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start opacity-100 transition-opacity">
          {levels.map((lvl) => {
            const schools = globalSortedSchools.filter(s => s.level === lvl.id);
            return (
              <div 
                key={lvl.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, lvl.id)}
                className="bg-slate-900/85 backdrop-blur-md rounded-xl p-5 border border-slate-700/50 shadow-2xl space-y-4 flex-1 min-h-[300px]"
              >
                <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
                  <h3 className="font-black text-white uppercase tracking-wider flex items-center gap-2 text-sm drop-shadow">
                    <div className={`w-3 h-3 rounded-full shadow-[0_0_8px_currentColor] ${lvl.bg}`}></div> {lvl.title}
                  </h3>
                  {((isCoach || !appState.player.isCommitted) && !isReadOnly) && (
                    <button onClick={() => addSchool(lvl.id)} className="text-slate-300 hover:text-white bg-slate-950/50 p-1.5 rounded border border-slate-700 transition-colors"><Plus size={14}/></button>
                  )}
                </div>
                
                {schools.length === 0 && <p className="text-xs text-slate-400 italic text-center py-8 border-2 border-dashed border-slate-700/50 rounded-lg">Drop {isCoach ? "prospects" : "schools"} here</p>}
                
                {schools.map(school => {
                  const currentInterest = tempInterests[school.id] !== undefined ? tempInterests[school.id] : valOrEmpty(school.interest);
                  const isLocked = !isCoach && appState.player.isCommitted;
                  return (
                  <div 
                    key={school.id} 
                    draggable={!isLocked && !isReadOnly && dragEnabledId === school.id}
                    onDragStart={(e) => handleDragStart(e, school.id)}
                    onDragEnd={() => setDragEnabledId(null)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleSchoolDrop(e, school)}
                    className={`bg-slate-950/60 p-4 rounded-lg border-l-4 ${lvl.border} shadow-md space-y-3 relative group transition-all ${!isLocked && !isReadOnly && dragEnabledId === school.id ? 'ring-1 ring-amber-500/50 bg-slate-900/80 scale-[1.02] z-10' : 'hover:bg-slate-800/80'}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1 w-full pt-1">
                        
                        <div className="flex items-center font-black text-lg text-slate-500/70 w-8 shrink-0 relative group/rank">
                          <span className="absolute left-0 text-sm pointer-events-none">#</span>
                          <input
                            type="number"
                            key={`rank-${school.id}-${getGlobalRank(school.id)}`}
                            defaultValue={getGlobalRank(school.id)}
                            disabled={isLocked || isReadOnly}
                            onBlur={(e) => handleManualRankChange(school.id, parseInt(e.target.value))}
                            onKeyDown={(e) => { if(e.key === 'Enter') { e.target.blur(); } }}
                            className="w-full bg-transparent outline-none pl-3 text-center hide-arrows hover:text-white focus:text-amber-400 focus:bg-slate-900 rounded transition-all cursor-text"
                          />
                        </div>
                        
                        {(!isLocked && !isReadOnly) && (
                          <div 
                            onMouseEnter={() => setDragEnabledId(school.id)}
                            onMouseLeave={() => setDragEnabledId(null)}
                            onTouchStart={() => setDragEnabledId(school.id)}
                            onTouchEnd={() => setDragEnabledId(null)}
                            className="cursor-grab active:cursor-grabbing p-1 opacity-50 group-hover:opacity-100 flex-shrink-0 hover:bg-slate-800 rounded transition-colors"
                          >
                            <GripVertical size={16} className="text-slate-400 hover:text-white" />
                          </div>
                        )}
                        <input 
                          type="text" 
                          value={school.name} 
                          disabled={isLocked || isReadOnly}
                          onChange={(e) => updateSchool(school.id, 'name', e.target.value)}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          className={`bg-transparent font-black ${!isCoach && appState.player.isCommitted && appState.player.college === school.name ? 'text-amber-400 drop-shadow-md' : 'text-white'} text-base outline-none border-b border-transparent focus:border-slate-600 w-full ml-1`}
                        />
                      </div>
                      {(!isLocked && !isReadOnly) && (
                        <button 
                          onClick={() => deleteSchool(school.id)} 
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          className="text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1.5"
                        >
                          <Trash2 size={16}/>
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 pb-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                        <span>{isCoach ? "Commit Prob." : "Interest Lvl"}</span>
                        <div className="flex items-center">
                          <input 
                            type="number" 
                            min="0" max="100" 
                            value={currentInterest} 
                            disabled={isLocked || isReadOnly}
                            onChange={(e) => setTempInterests(prev => ({...prev, [school.id]: e.target.value === '' ? '' : parseInt(e.target.value)}))}
                            onBlur={(e) => {
                               if (tempInterests[school.id] !== undefined) {
                                   commitInterestChange(school.id, tempInterests[school.id] === '' ? 0 : parseInt(tempInterests[school.id]));
                                   setTempInterests(prev => { const n = {...prev}; delete n[school.id]; return n; });
                               }
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className={`w-7 bg-transparent text-right text-[10px] font-bold ${getInterestColor(currentInterest)} border-b border-transparent focus:border-slate-500 outline-none p-0 hide-arrows drop-shadow-sm transition-colors`}
                          />
                          <span className={`${getInterestColor(currentInterest)} font-bold drop-shadow-sm transition-colors`}>%</span>
                        </div>
                      </div>
                      
                      <div className="relative pt-1 pb-4">
                        <input 
                          type="range" 
                          min="0" max="100" 
                          value={currentInterest === '' ? 0 : currentInterest} 
                          disabled={isLocked || isReadOnly}
                          onChange={(e) => setTempInterests(prev => ({...prev, [school.id]: parseInt(e.target.value)}))}
                          onMouseUp={() => {
                              if (tempInterests[school.id] !== undefined) {
                                  commitInterestChange(school.id, parseInt(tempInterests[school.id]));
                                  setTempInterests(prev => { const n = {...prev}; delete n[school.id]; return n; });
                              }
                          }}
                          onTouchEnd={(e) => {
                              e.stopPropagation();
                              if (tempInterests[school.id] !== undefined) {
                                  commitInterestChange(school.id, parseInt(tempInterests[school.id]));
                                  setTempInterests(prev => { const n = {...prev}; delete n[school.id]; return n; });
                              }
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer relative z-10 ${getSliderAccent(currentInterest)}`}
                        />
                        <div className="absolute top-[18px] left-1.5 right-1.5 pointer-events-none">
                          <div className="absolute left-[0%] -translate-x-1/2 flex flex-col items-center">
                            <div className="w-[2px] h-1.5 bg-slate-600 mb-0.5 rounded-full"></div>
                            <span className="text-[7px] font-black text-slate-500">0</span>
                          </div>
                          <div className="absolute left-[25%] -translate-x-1/2 flex flex-col items-center">
                            <div className="w-[2px] h-1.5 bg-amber-600/50 mb-0.5 rounded-full"></div>
                            <span className="text-[7px] font-black text-amber-500">LOW</span>
                          </div>
                          <div className="absolute left-[50%] -translate-x-1/2 flex flex-col items-center">
                            <div className="w-[2px] h-1.5 bg-blue-600/50 mb-0.5 rounded-full"></div>
                            <span className="text-[7px] font-black text-blue-500">MED</span>
                          </div>
                          <div className="absolute left-[75%] -translate-x-1/2 flex flex-col items-center">
                            <div className="w-[2px] h-1.5 bg-emerald-600/50 mb-0.5 rounded-full"></div>
                            <span className="text-[7px] font-black text-emerald-500">HIGH</span>
                          </div>
                          <div className="absolute left-[100%] -translate-x-1/2 flex flex-col items-center">
                            <div className="w-[2px] h-1.5 bg-emerald-600/50 mb-0.5 rounded-full"></div>
                            <span className="text-[7px] font-black text-emerald-500">MAX</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-800/50 flex justify-between items-center">
                      <button 
                        onClick={() => updateSchool(school.id, 'offered', !school.offered)}
                        disabled={isLocked || isReadOnly}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded transition-colors ${school.offered ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/50 shadow-inner' : 'bg-slate-900 text-slate-400 border border-slate-700'} ${!isLocked && !school.offered && !isReadOnly ? 'hover:text-white cursor-pointer' : 'cursor-default'}`}
                      >
                        {school.offered ? <CheckCircle size={12}/> : <div className="w-3 h-3 rounded-full border border-slate-500"/>}
                        {school.offered ? (isCoach ? 'Scholarship Sent' : 'Official Offer') : (isCoach ? 'Send Offer' : 'No Offer Yet')}
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {!isCoach && isCommitModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-8 shadow-2xl text-center space-y-6">
              <h2 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-md">National Signing Day</h2>
              <p className="text-slate-400 text-sm mb-6">You are about to make your official commitment. Select from your official offers below:</p>
              
              <div className="grid grid-cols-1 gap-3">
                {offeredSchools.map(school => (
                  <button key={school.id} onClick={() => handleCommitment(school)} className="w-full bg-slate-800 hover:bg-amber-500 hover:text-slate-900 hover:shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-slate-600 p-4 rounded-xl font-black text-lg transition-all">
                    {school.name}
                  </button>
                ))}
              </div>
              
              <button onClick={() => setIsCommitModalOpen(false)} className="mt-4 text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors">Cancel</button>
            </div>
          </div>
        )}

      </div>
    );
  };

  const renderNewsroom = () => {
    const currentSeasonStr = appState.currentSeason || 1;
    const currentSeasonGames = appState.gameLogs.filter(g => (g.season || 1) === currentSeasonStr);
    const priorGames = appState.gameLogs.filter(g => (g.season || 1) < currentSeasonStr);
    const isPreseason = currentSeasonGames.length === 0;
    const hasPriorHistory = priorGames.length > 0;
    
    const priorPassYds = priorGames.reduce((acc, g) => acc + Number(g.passYds || 0), 0);
    const priorTDs = priorGames.reduce((acc, g) => acc + Number(g.passTD || 0) + Number(g.rushTD || 0), 0);
    const lastGame = isPreseason ? null : currentSeasonGames[currentSeasonGames.length - 1];
    
    const home = appState.player.school;
    const away = lastGame ? lastGame.opponent : 'Upcoming Opponents';
    const score = lastGame ? `${lastGame.homeScore}-${lastGame.awayScore}` : '- / -';
    const homeScore = lastGame ? lastGame.homeScore : '-';
    const awayScore = lastGame ? lastGame.awayScore : '-';
    const combinedStats = lastGame 
      ? `${lastGame.passYds} PASS YDS • ${Number(lastGame.passTD) + Number(lastGame.rushTD)} TOT TD • ${lastGame.rushYds} RUSH YDS` 
      : (hasPriorHistory ? `RETURNING LEADER` : `PRESEASON PROSPECT`);
    
    const offName = appState.player.name;
    const offPos = `${appState.player.pos} • ${appState.player.number}`;
    const headshotImg = appState.player.headshot;
    const offStats = lastGame ? combinedStats : (hasPriorHistory ? `${priorPassYds} YDS LAST YEAR` : `AWAITING DEBUT`);
    const archetypeLower = appState.player.archetype ? appState.player.archetype.toLowerCase() : 'dual-threat';
    const starString = '★'.repeat(Number(appState.player.stars) || 3) + '☆'.repeat(5 - (Number(appState.player.stars) || 3));
    
    const defName = "Javion Butts";
    const defPos = "DB • #7";
    const defStats = isPreseason ? "DEFENSIVE ANCHOR" : "8 TKL • 1 INT • 2 PASS BREAKUPS";
    const defHeadshot = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80';
    
    const quote = appState.latestQuote;
    const nextOpp = "Conference Rival";
    const dateLoc = `Week ${appState.currentWeek} | ${home} Stadium`;
    const writer = "Matt Bowers | Senior Analyst";
    const outcome = lastGame ? lastGame.result : 'W';
    
    const currentImage = appState.outletImages?.[newsTheme === 'scouting' ? 'on3' : newsTheme] || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80";
    const podcastImage = appState.outletImages?.podcast;
    
    const activeSchools = appState.recruiting.filter(s => s.interest > 0 && s.level !== 'None');
    const hasActiveRecruiting = activeSchools.length > 0;
    const topSchool = [...activeSchools].sort((a, b) => (Number(b.interest) || 0) - (Number(a.interest) || 0))[0] || { name: 'Unknown', interest: 0 };
    const crystalBallText = !hasActiveRecruiting ? 'Evaluating Options' : `${topSchool.name} (${Math.max(51, Number(topSchool.interest) || 50)}%)`;
    const totalOffers = appState.recruiting.filter(s => s.offered).length;

    // --- DYNAMIC SCOUTING REPORT LOGIC ---
    let playerComparison = "";
    let strengthDetails = "";
    let areaForDevDetails = "";
    let visualsDetails = "";
    
    if (archetypeLower.includes("dual")) {
        playerComparison = "A scaled-down, gritty Josh Allen or a right-handed Jalen Hurts.";
        strengthDetails = `${offName.split(' ')[1] || offName} is a field general built for a modern spread RPO system. While he lacks the towering 6'5" frame of a prototypical pocket passer, he compensates with elite short-to-intermediate accuracy and a phenomenal feel for the pocket. His standout trait is his escapability. He isn't going to run a 4.3-second 40-yard dash and burn secondaries on designed QB draws, but he possesses the functional strength and lateral quickness to break arm tackles, extend plays outside the hashes, and throw off-platform.`;
    } else if (archetypeLower.includes("pocket") || archetypeLower.includes("field")) {
        playerComparison = "A young Jared Goff or Mac Jones type with high-end processor speed.";
        strengthDetails = `${offName.split(' ')[1] || offName} thrives within the structure of the offense. Operating primarily from the pocket, he displays advanced pre-snap recognition and the ability to work through his progressions at an elite level. His footwork is clean, allowing him to deliver the ball with consistent mechanics and timing on standard dropbacks.`;
    } else if (archetypeLower.includes("scrambler")) {
        playerComparison = "A young Lamar Jackson or Kyler Murray type—pure electricity in open space.";
        strengthDetails = `${offName.split(' ')[1] || offName} is a nightmare for opposing defensive coordinators. He possesses elite burst and top-end speed, making him a constant threat on designed runs or when the pocket breaks down. His ability to manipulate defensive pursuit angles and outrun secondary defenders makes him one of the most dangerous playmakers in the region.`;
    } else {
        playerComparison = "A versatile offensive weapon with room to grow.";
        strengthDetails = `${offName.split(' ')[1] || offName} shows a balanced skill set capable of adapting to multiple offensive schemes. Displays good situational awareness and fundamental traits that will translate well to the collegiate level.`;
    }

    const weightNum = parseInt(appState.player.weight) || 200;
    if (weightNum < 210) {
        areaForDevDetails = `The deep ball has enough velocity to keep safeties honest, but his accuracy tends to drop off on vertical shots. At ${appState.player.weight}, taking consistent hits at the collegiate level while extending plays could be a long-term durability concern, meaning his progression in a college weight room will be critical.`;
    } else {
        areaForDevDetails = `While he possesses a solid frame at ${appState.player.weight}, maintaining mobility while shedding secondary defenders will be key. Needs to continue refining his throwing mechanics when forced to roll out to his weak side to avoid unnecessary turnovers.`;
    }

    const currentSchoolOrCollege = appState.player.isCommitted && appState.currentSeason > 1 ? appState.player.college : appState.player.school;
    
    visualsDetails = `Reviewing the uploaded media, ${offName.split(' ')[1] || offName} clearly looks the part of a Friday night field general. The dark smoked visor, the asymmetric sleeve setup (compression on the left, bare/glove on the right), and the wrist coach indicate a player who is locked in and taking the mental side of the game seriously.`;

    const crowdReaction = isPreseason ? "Anticipation is building" : (outcome === 'W' ? "The crowd erupted in cheers" : "A stunned silence fell over the stands");
    const trenchesTalk = isPreseason ? "The offensive line has been grinding in camp" : "The battle in the trenches dictated the pace of the game";
    const coachingNote = isPreseason ? "The coaching staff is keeping the playbook close to the vest" : "The coaching adjustments at halftime were the difference-maker";

    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-20 relative z-10">
        <div className="flex justify-between items-center bg-slate-950/90 backdrop-blur-md p-2 rounded-xl border border-slate-700/50 shadow-2xl">
          <div className="flex items-center text-xs font-bold overflow-x-auto w-full gap-2">
            <button onClick={() => setNewsTheme('scouting')} className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0 ${newsTheme === 'scouting' ? 'bg-zinc-100 text-slate-900 font-black' : 'text-slate-400 hover:text-white'}`}>
                <ClipboardSignature size={14} className={newsTheme === 'scouting' ? "text-amber-600" : ""} />
                <span>247 Scouting Dossier</span>
            </button>
            <button onClick={() => setNewsTheme('broadsheet')} className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0 ${newsTheme === 'broadsheet' ? 'bg-stone-100 text-slate-900 font-black' : 'text-slate-400 hover:text-white'}`}>
                <Zap size={14} className={newsTheme === 'broadsheet' ? "text-amber-600" : ""} />
                <span>The Bolt</span>
            </button>
            <button onClick={() => setNewsTheme('on3')} className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0 ${newsTheme === 'on3' ? 'bg-amber-500 text-slate-900 font-black' : 'text-slate-400 hover:text-white'}`}>
                <Star size={14} className={newsTheme === 'on3' ? "fill-slate-950" : ""} />
                <span>On3 / Gridiron</span>
            </button>
            <button onClick={() => setNewsTheme('local')} className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0 ${newsTheme === 'local' ? 'bg-slate-300 text-slate-900 font-black' : 'text-slate-400 hover:text-white'}`}>
                <Newspaper size={14} />
                <span>The News-Herald</span>
            </button>
            <button onClick={() => setNewsTheme('filmroom')} className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0 ${newsTheme === 'filmroom' ? 'bg-emerald-500 text-slate-900 font-black' : 'text-slate-400 hover:text-white'}`}>
                <Activity size={14} />
                <span>X's & O's Film Room</span>
            </button>
            <button onClick={() => setNewsTheme('podcast')} className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0 ${newsTheme === 'podcast' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                <Headphones size={14} />
                <span>Podcast</span>
            </button>
          </div>
          <button onClick={handlePrint} className="ml-4 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-colors border border-slate-600 shadow-md">
             <Printer size={14} /> Print
          </button>
        </div>

        {/* Render selected theme */}
        <div className="print-full">
          {newsTheme === 'scouting' && (
              <div className="bg-[#0f0f11] text-zinc-100 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden">
                <div className="bg-zinc-950 p-4 px-6 border-b border-zinc-800 flex justify-between items-center text-xs font-mono uppercase tracking-widest">
                    <span className="flex items-center gap-2 text-amber-500"><ClipboardSignature size={16} /> ELITE SCOUTING NETWORK</span>
                    <span className="text-zinc-500 font-bold">PRE-SEASON DOSSIER • SECURE DB</span>
                </div>
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-1/3 flex flex-col items-center space-y-4 shrink-0">
                        <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden border-2 border-zinc-800 shadow-2xl">
                            <img src={headshotImg} className="w-full h-full object-cover" alt="Prospect Profile" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                                <span className="bg-amber-500 text-black text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest shadow-lg">{starString}</span>
                            </div>
                        </div>
                        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3 font-sans">
                            <div className="text-center pb-3 border-b border-zinc-800">
                                <h2 className="text-xl font-black uppercase tracking-tight text-white">{offName}</h2>
                                <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mt-0.5">{currentSchoolOrCollege}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-zinc-950 p-2 rounded text-center"><span className="block text-[9px] text-zinc-500 uppercase font-bold">Position</span><span className="font-bold text-zinc-200">{appState.player.pos}</span></div>
                                <div className="bg-zinc-950 p-2 rounded text-center"><span className="block text-[9px] text-zinc-500 uppercase font-bold">Archetype</span><span className="font-bold text-zinc-200">{appState.player.archetype}</span></div>
                                <div className="bg-zinc-950 p-2 rounded text-center"><span className="block text-[9px] text-zinc-500 uppercase font-bold">Height</span><span className="font-bold text-zinc-200">{appState.player.height}</span></div>
                                <div className="bg-zinc-950 p-2 rounded text-center"><span className="block text-[9px] text-zinc-500 uppercase font-bold">Weight</span><span className="font-bold text-zinc-200">{appState.player.weight}</span></div>
                            </div>
                            <div className="bg-zinc-950 p-2 rounded border border-zinc-800 text-center">
                                <span className="block text-[9px] text-zinc-500 uppercase font-bold">Recruiting Status</span>
                                <span className={`text-xs font-black uppercase ${appState.player.isCommitted ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {appState.player.isCommitted ? `COMMITTED: ${appState.player.college}` : `${totalOffers} OFFICIAL OFFERS`}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 space-y-6">
                        <div>
                            <div className="inline-block bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded mb-2">
                                Eval Date: {isPreseason ? `Pre-Season (Year ${appState.currentSeason})` : `Mid-Season Evaluation`}
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-none mb-1 text-white">THE SCOUTING REPORT</h1>
                            <p className="text-sm text-zinc-400 font-medium">Evaluation by National Recruiting Analysts • Midwest Region</p>
                        </div>
                        <div className="space-y-6 font-sans text-sm leading-relaxed text-zinc-300">
                            {hasPriorHistory && (
                                <div className="bg-amber-900/10 border-l-2 border-amber-500 pl-4 py-2">
                                    <p><strong className="text-amber-500 uppercase tracking-widest text-[10px] block mb-1">Career Context</strong> Entering the {appState.currentSeason} campaign, {offName.split(' ')[1] || offName} is coming off a highly productive year where he accounted for {priorTDs} total touchdowns and {priorPassYds} passing yards.</p>
                                </div>
                            )}
                            <div><h3 className="text-white font-bold uppercase tracking-wider text-sm mb-2 border-b border-zinc-800 pb-1 flex items-center gap-2"><Users size={16} className="text-zinc-500"/> Player Comparison</h3><p className="font-semibold text-zinc-100">{playerComparison}</p></div>
                            <div><h3 className="text-emerald-400 font-bold uppercase tracking-wider text-sm mb-2 border-b border-zinc-800 pb-1 flex items-center gap-2"><Activity size={16} /> Strengths</h3><p>{strengthDetails} {coachingNote}.</p></div>
                            <div><h3 className="text-amber-500 font-bold uppercase tracking-wider text-sm mb-2 border-b border-zinc-800 pb-1 flex items-center gap-2"><AlertTriangle size={16} /> Areas for Development</h3><p>{areaForDevDetails}</p></div>
                            <div><h3 className="text-blue-400 font-bold uppercase tracking-wider text-sm mb-2 border-b border-zinc-800 pb-1 flex items-center gap-2"><Camera size={16} /> Visuals & Intangibles</h3><p className="italic">{visualsDetails}</p></div>
                        </div>
                    </div>
                </div>
              </div>
          )}

          {newsTheme === 'broadsheet' && (
              <div className="bg-[#ffffff] text-slate-900 rounded-2xl shadow-2xl border-2 border-slate-900 overflow-hidden">
                <div className="bg-stone-100 text-slate-900 border-b-2 border-slate-950 px-6 py-4">
                    <div className="flex justify-between items-center text-xs font-bold tracking-widest text-slate-700 border-b border-slate-400 pb-2 mb-2">
                        <span className="flex items-center gap-1"><Zap className="w-4 h-4 text-slate-900" /> VOL. LV • NO. 4</span>
                        <span className="text-slate-900 font-black uppercase tracking-wider">EDSEL FORD HIGH SCHOOL STUDENT PRESS</span>
                        <div className="flex gap-3 text-slate-800"><Share2 className="w-4 h-4" /><Search className="w-4 h-4" /></div>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 font-header text-center uppercase py-1">THE BOLT • EFHS</h1>
                </div>
                <div className="px-6 md:px-10 pt-6">
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-900 font-header leading-tight mb-2">
                        {isPreseason ? `${home.toUpperCase()} PREPARES FOR HIGHLY ANTICIPATED SEASON OPENER` : (outcome === 'W' ? `${home.toUpperCase()} DEFEATS ${away.toUpperCase()} ${score} IN HOMECOMING VICTORY` : `${away.toUpperCase()} TOPS ${home.toUpperCase()} ${score} IN HARD-FOUGHT BATTLE`)}
                    </h1>
                    <h2 className="text-slate-800 text-base md:text-xl font-bold leading-snug mb-3 italic">
                        {isPreseason ? `Thunderbirds varsity offensive attack looks to surge behind ${offName}'s ${archetypeLower} leadership as a new era begins.` : `Thunderbirds varsity offensive attack surges behind ${offName}'s ${archetypeLower} leadership at EFHS Field.`}
                    </h2>
                    <div className="flex flex-wrap items-center justify-between border-y border-slate-400 py-2.5 my-3 text-xs text-slate-800 font-medium">
                        <div><span className="font-bold text-slate-900">By {writer}</span></div>
                        <div className="flex items-center gap-4 text-slate-700"><span>{dateLoc}</span><div className="flex gap-2 text-slate-900"><Facebook className="w-4 h-4" /><Twitter className="w-4 h-4" /><Mail className="w-4 h-4" /></div></div>
                    </div>
                </div>
                <div className="px-6 md:px-10 my-4">
                    <div className="bg-stone-900 rounded-xl overflow-hidden border-2 border-slate-950 shadow-md flex flex-col">
                        <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center bg-stone-950 overflow-hidden">
                            <img src={currentImage} className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 scale-125 pointer-events-none" alt="" />
                            <img src={currentImage} className="relative z-10 w-full h-full object-contain drop-shadow-2xl" alt="Action" />
                        </div>
                        <div className="p-2.5 text-xs text-slate-900 bg-stone-100 border-t border-slate-400 flex justify-between items-center italic">
                            <span>{offName} ({offPos}) executes a key play in front of a packed Edsel Ford High student section.</span>
                            <span className="text-slate-700 not-italic font-semibold ml-2 flex-shrink-0">(Photo: The Bolt Photo Staff)</span>
                        </div>
                    </div>
                </div>
                <div className="px-6 md:px-10 pb-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-5 text-slate-900 font-serif leading-relaxed text-base">
                        <p className="drop-cap">
                            {isPreseason ? `DEARBORN, Mich. — Anticipation is bubbling over for ${home} as the team runs through final preparations ahead of their season opener. After months of grueling off-season conditioning, the roster is primed to hit the turf. ${crowdReaction}.` : `DEARBORN, Mich. — Under a crisp Friday night sky at Edsel Ford High School Field, ${home} delivered an electrifying performance in front of a standing-room-only homecoming crowd. Facing off against rival ${away}, the Thunderbirds asserted complete control at the line of scrimmage, securing a hard-earned ${score} victory that generated resounding cheers across the student section. ${crowdReaction}.`}
                        </p>
                        <p>
                            {isPreseason ? `The offense will lean heavily on their star quarterback. ${offName} steps into the campaign with an impressive physical profile and a commanding presence. ${hasPriorHistory ? `Building upon his ${priorPassYds} passing yards from last season, expectations have never been higher.` : ``}` : `Following a defensive first quarter, the momentum tilted permanently midway through the second period when EFHS head coaching staff elected to go for a bold 4th-and-2 near midfield. Calling an option keeper, ${offName} read the defensive end cleanly before accelerating 28 yards down the sideline to set up the opening touchdown, igniting an explosive second-quarter scoring run. ${trenchesTalk}.`}
                        </p>
                        <p>
                            {isPreseason ? `Defensively, ${defName} anchors a resolute unit, showing elite ball skills in camp. College coaches in attendance reaffirmed that the ${home} athletic ceiling makes them a dangerous contender this year.` : `${offName} spearheaded the Thunderbird offense with an impressive statutory display of ${offStats}, calmly converting key third-down possessions. On defense, ${defName} anchored a resolute unit with ${defStats}, highlighted by a fourth-quarter interception that shut down ${away}'s final attempt at a late game drive.`}
                        </p>
                        {!isPreseason && (
                            <>
                                <p>With the win officially sealed, ${offName} reflected on the victory during post-game student press interviews: <em>"{quote}"</em> The Thunderbirds look to build on this momentum as they prepare for next week's away test against <strong>{nextOpp}</strong>.</p>
                                <div className="bg-stone-100 border-l-4 border-slate-950 p-5 rounded-r-xl my-6">
                                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> Post-Game Presser</div>
                                    <p className="text-base md:text-lg font-serif italic text-slate-900 font-medium leading-snug mb-2">"{quote}"</p>
                                    <div className="text-xs font-bold text-slate-700 uppercase">— {offName}, EFHS Varsity Signal-Caller</div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="space-y-6">
                        <div className="bg-stone-50 rounded-xl p-4 border border-slate-400 shadow-sm space-y-3 text-slate-900">
                            <div className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-2 flex justify-between items-center">
                                <span>PLAYERS OF THE GAME</span><span className="bg-stone-200 text-slate-900 text-[10px] px-2 py-0.5 rounded font-black">OFF & DEF MVP</span>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-slate-300 flex items-center gap-2.5">
                                <img src={headshotImg} className="w-9 h-9 rounded-full object-cover border-2 border-slate-900 shadow-sm flex-shrink-0" alt={offName} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between text-[10px] font-bold"><span className="text-slate-900 uppercase">OFFENSE</span><span className="text-slate-600 font-semibold">{offPos}</span></div>
                                    <div className="font-bold text-slate-900 text-xs truncate leading-tight">{offName}</div>
                                    <div className="text-[11px] text-slate-900 font-black truncate">{offStats}</div>
                                </div>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-slate-300 flex items-center gap-2.5">
                                <img src={defHeadshot} className="w-9 h-9 rounded-full object-cover border-2 border-slate-800 shadow-sm flex-shrink-0" alt={defName} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between text-[10px] font-bold"><span className="text-slate-800 uppercase">DEFENSE</span><span className="text-slate-600 font-semibold">{defPos}</span></div>
                                    <div className="font-bold text-slate-900 text-xs truncate leading-tight">{defName}</div>
                                    <div className="text-[11px] text-slate-900 font-black truncate">{defStats}</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-stone-900 text-white rounded-xl p-5 shadow-md space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-wider border-b border-stone-800 pb-2 flex items-center gap-2 text-stone-200 font-header text-base"><BarChart2 className="w-4 h-4 text-amber-400" /> THUNDERBIRDS BY THE NUMBERS</h3>
                            <div className="flex items-start gap-3 bg-stone-950 p-3 rounded-lg border border-stone-800">
                                <Trophy className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div><p className="text-xs font-bold text-white leading-snug">Homecoming Rivalry Win</p><p className="text-[10px] text-stone-400 font-semibold mt-0.5">(EFHS Varsity Record)</p></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-slate-400 shadow-sm space-y-3 text-slate-900">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-300 pb-2 flex justify-between"><span>Matchup Final</span> <span className="text-slate-900 font-mono font-bold">FINAL</span></div>
                            <div className="flex justify-between items-center p-2 bg-stone-100 rounded border border-slate-300"><span className="font-black text-slate-900 text-sm">{home}</span><span className="font-black text-2xl text-slate-900">{homeScore}</span></div>
                            <div className="flex justify-between items-center p-2 bg-stone-100 rounded border border-slate-300 opacity-75"><span className="font-bold text-slate-700 text-sm">{away}</span><span className="font-black text-2xl text-slate-700">{awayScore}</span></div>
                        </div>
                    </div>
                </div>
              </div>
          )}

          {newsTheme === 'on3' && (
              <div className="bg-[#e4e4e7] text-zinc-950 rounded-2xl shadow-2xl border border-zinc-400 overflow-hidden">
                <div className="bg-zinc-900 text-white p-4 px-6 border-b border-zinc-700 flex justify-between items-center text-xs font-mono">
                    <span className="bg-amber-500 text-black font-black px-2.5 py-0.5 rounded tracking-widest uppercase">ON3 RECRUITING // EVALUATION</span>
                    <span className="text-amber-400 font-bold uppercase flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400" /> HS SCOUTING SCOOP</span>
                </div>
                <div className="relative bg-black border-b border-zinc-400">
                    <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center bg-zinc-950 overflow-hidden">
                        <img src={currentImage} className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-125 pointer-events-none" alt="" />
                        <img src={currentImage} className="relative z-10 w-full h-full object-contain opacity-90 drop-shadow-2xl" alt="Action" />
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center z-30 pointer-events-none">
                            <span className="bg-emerald-500 text-black text-xs font-black uppercase px-2.5 py-1 rounded shadow-lg flex items-center gap-1.5">
                                <img src={headshotImg} className="w-5 h-5 rounded-full object-cover border border-black flex-shrink-0" alt="" />
                                <span>{starString} {appState.player.stars}-STAR PROSPECT • {offName}</span>
                            </span>
                            <div className="flex gap-2">
                                <span className="bg-zinc-900/90 border border-zinc-700 text-emerald-400 text-xs font-black px-2.5 py-1 rounded shadow">OFFERS: {totalOffers} DIVISION I</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 md:p-8 pt-4 bg-zinc-200">
                        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-zinc-950 font-display leading-none mb-3">
                            {isPreseason ? `PRESEASON SCOUTING REPORT: ALL EYES ON ${offName.toUpperCase()} THIS SEASON` : `ON3 SCOUTING REPORT: ${offName.toUpperCase()} DOMINATES WITH ${offStats}`}
                        </h1>
                        <p className="text-zinc-700 text-base md:text-lg font-medium border-l-4 border-amber-500 pl-4 py-0.5">Recruiting Buzz: College evaluators attend {home}'s {isPreseason ? 'camp' : 'game'} as top programs push for commitment.</p>
                    </div>
                </div>
                <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-4 rounded-xl border border-zinc-300 space-y-2 shadow-sm">
                            <div className="text-xs font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5"><Target className="w-4 h-4" /> ON3 PROSPECT EVALUATION & CRYSTAL BALL</div>
                            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                                <div className="bg-zinc-100 p-2.5 rounded border border-zinc-300 text-center"><div className="text-[9px] text-zinc-600 uppercase font-bold">On3 Rating</div><div className="text-sm font-black text-amber-600">{valOrEmpty(appState.player.overall) + 14} ({appState.player.stars}-Star Gem)</div></div>
                                <div className="bg-zinc-100 p-2.5 rounded border border-zinc-300 text-center"><div className="text-[9px] text-zinc-600 uppercase font-bold">Crystal Ball Leader</div><div className={`text-sm font-black ${!hasActiveRecruiting ? 'text-zinc-500' : 'text-blue-700'}`}>{crystalBallText}</div></div>
                                <div className="bg-zinc-100 p-2.5 rounded border border-zinc-300 text-center"><div className="text-[9px] text-zinc-600 uppercase font-bold">Offers Count</div><div className="text-sm font-black text-emerald-700">{totalOffers} D-I Offers</div></div>
                            </div>
                        </div>
                        <div className="space-y-5 text-zinc-800 font-sans leading-relaxed text-base">
                            <p className="drop-cap">{isPreseason ? `RECRUITING TRAIL — As the new season approaches, all eyes are squarely fixed on quarterback prospect ${offName}.` : `RECRUITING TRAIL — High school senior and standout quarterback prospect ${offName} put on an absolute show on Friday night, leading ${home} to a ${score} victory over rival ${away}.`}</p>
                            <p><strong>On3 National Prospect Evaluation:</strong> Exhibiting poise under pressure and {archetypeLower} playmaking instincts, {offName} {isPreseason ? `is poised to take a massive leap this year` : `compiled ${offStats}`}.</p>
                            <p><strong>Commitment Timeline & What's Next:</strong> Speaking with On3 reporters, {offName} shared his thoughts on his recruiting timeline: <em>"{quote}"</em></p>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-white text-zinc-950 rounded-xl p-4 border border-zinc-300 shadow-sm space-y-3">
                            <div className="text-xs font-black uppercase text-amber-600 border-b border-zinc-200 pb-2 flex items-center justify-between"><span>RECRUITING BATTLE (TOP 3)</span><span className="text-[9px] text-emerald-700 font-bold">CRYSTAL BALL</span></div>
                            <div className="space-y-2 text-xs">
                                {!hasActiveRecruiting ? (
                                    <div className="bg-zinc-100 p-4 rounded border border-zinc-300 text-center text-zinc-500 font-bold italic shadow-inner">Awaiting initial school interest. No leaders currently projected.</div>
                                ) : (
                                    activeSchools.sort((a,b)=> (Number(b.interest) || 0) - (Number(a.interest) || 0)).slice(0,3).map((school, i) => (
                                        <div key={i} className="bg-zinc-100 p-2.5 rounded border border-zinc-300 space-y-1">
                                            <div className="flex justify-between font-bold"><span>{i+1}. {school.name}</span> <span className={i === 0 ? "text-blue-700" : "text-amber-600"}>{Number(school.interest) || 0}% {i === 0 ? "(Warm)" : ""}</span></div>
                                            <div className="w-full bg-zinc-300 h-1.5 rounded-full overflow-hidden"><div className={`h-full ${i === 0 ? 'bg-blue-600' : 'bg-amber-500'}`} style={{width: `${Number(school.interest) || 0}%`}}></div></div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
              </div>
          )}

          {newsTheme === 'local' && (
              <div className="bg-[#f4f1ea] text-slate-900 rounded-2xl shadow-2xl border border-amber-900/30 overflow-hidden">
                <div className="bg-[#fcfbf7] p-6 border-b-2 border-slate-900 text-center">
                  <div className="flex justify-between text-[10px] text-slate-600 font-mono uppercase border-b border-slate-300 pb-1 mb-2">
                    <span>VOL. XLVIII • NO. 12</span><span className="font-bold text-amber-900">HOMETOWN GRIDIRON EDITION</span><span>{dateLoc.split('|')[0] || 'SEPT'}</span>
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 font-cinzel uppercase py-1">THE NEWS-HERALD</h1>
                  <p className="text-xs text-slate-600 italic">The Official Voice of Local High School & Regional Gridiron Athletics</p>
                </div>
                <div className="p-6 md:p-10 space-y-6">
                  <div className="border-b border-slate-400 pb-4">
                    <h1 className="text-3xl md:text-5xl font-serif font-black uppercase text-slate-900 leading-tight mb-2">
                      {isPreseason ? `HOMETOWN HOPEFUL: ${offName.toUpperCase()} READY TO LEAD ${home.toUpperCase()} INTO NEW SEASON` : `HOMETOWN HERO ${offName.toUpperCase()} SPEARHEADS ${home.toUpperCase()} TO ${score} VICTORY`}
                    </h1>
                    <p className="text-slate-700 text-sm md:text-lg font-medium italic border-l-2 border-slate-900 pl-3">
                      {isPreseason ? `From offseason grind to Friday Night Lights: Expectations are soaring for the local ${archetypeLower} standout.` : `From Friday Night Lights to Weekend Stardom: ${offName} drops ${offStats} in front of packed bleachers.`}
                    </p>
                  </div>
                  <div className="bg-[#fcfbf7] p-2 border border-slate-400 rounded flex flex-col">
                    <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center bg-slate-900 rounded-sm overflow-hidden">
                      <img src={currentImage} className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 scale-125 pointer-events-none" alt="" />
                      <img src={currentImage} className="relative z-10 w-full h-full object-contain drop-shadow-2xl" alt="Action Shot" />
                    </div>
                    <p className="text-[11px] text-slate-600 italic mt-2 text-center">Press Capture: Hometown star {offName} {isPreseason ? 'preparing for the season.' : `powering through the defense in the ${score} victory over ${away}.`}</p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
                    <div className="lg:col-span-2 space-y-5 font-serif text-slate-900 leading-relaxed text-base">
                      <p><span className="font-bold text-4xl float-left mr-2 leading-none">L</span>
                        {isPreseason ? `OCAL NATIVE SPOTLIGHT — Local gridiron fans who spent Friday nights gathering on the bleachers are gearing up for another historic year. The local standout, ${offName}, is prepared to spearhead the offensive attack for ${home}.` : `OCAL NATIVE SPOTLIGHT — Local gridiron fans who spent Friday nights gathering on the bleachers to watch ${offName} dominate high school football witnessed a remarkably familiar sight. The local standout spearheaded a memorable ${score} victory for ${home} over rival ${away}.`}
                      </p>
                      <p>
                        {isPreseason ? `Those who have tracked ${offName}'s prep career know the grit and instincts that earned him local player of the year honors. ${hasPriorHistory ? `With ${priorPassYds} passing yards to his name last season, the sky is the limit.` : `This season promises to be a spectacular display of his ${archetypeLower} abilities.`}` : `Those who tracked ${offName}'s prep career will remember the grit and instincts that earned him local player of the year honors. In this matchup, those exact traits yielded an eye-popping ${offStats}, supported by a lights-out defensive performance from ${defName} (${defStats}), who stopped ${away}'s late fourth-quarter drive cold to seal the win.`}
                      </p>
                      {!isPreseason && <div className="bg-[#fcfbf7] p-4 border-l-4 border-amber-800 my-4 text-sm italic">"{quote}" — {offName}, Local Quarterback</div>}
                      <p>{isPreseason ? `With ${home} surging in preseason polls, our local hero has put his hometown firmly in the spotlight.` : `With ${home} surging, our local hero has put his hometown firmly in the spotlight. The team now prepares for another tough test next week against ${nextOpp}, hoping to keep this historic momentum rolling through the regional playoffs.`}</p>
                    </div>
                    <div className="space-y-5">
                      <div className="bg-[#fcfbf7] p-2.5 border border-slate-400 rounded flex items-center gap-2.5">
                        <img src={headshotImg} className="w-9 h-9 rounded border border-slate-400 object-cover flex-shrink-0" alt={offName} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[9px] font-bold text-slate-900 uppercase tracking-wide">LOCAL ALUM SPOTLIGHT</div>
                          <div className="font-bold text-amber-900 text-xs truncate leading-tight">{offName} ({offPos})</div>
                          <div className="text-[11px] text-slate-700 font-bold truncate">{offStats.split('•')[0] || "RETURNING STAR"}</div>
                        </div>
                      </div>
                      <div className="bg-[#fcfbf7] p-4 border border-slate-400 rounded space-y-2">
                        <div className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">THE OLD-TIMER'S COLUMN</div>
                        <p className="text-xs italic text-slate-700 leading-relaxed">"I've been covering local gridiron sports for thirty-four years. Watching our local boys carry that Friday night toughness into major battles is as good as it gets. {offName} isn't just winning games—he's putting our region on the map."</p>
                        <p className="text-[10px] font-bold text-slate-900 text-right">— Artie Miller, Senior Sports Columnist</p>
                      </div>
                      {!isPreseason && (
                        <div className="bg-[#fcfbf7] p-4 border border-slate-400 rounded space-y-2 text-xs">
                          <div className="font-bold text-slate-900 uppercase">FINAL SCORE BOX</div>
                          <div className="flex justify-between border-b border-slate-200 py-1"><span>{home}</span> <strong>{homeScore}</strong></div>
                          <div className="flex justify-between py-1"><span>{away}</span> <strong>{awayScore}</strong></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          )}

          {newsTheme === 'filmroom' && (
              <div className="bg-[#0b1329] text-emerald-100 rounded-2xl shadow-2xl border border-emerald-500/40 overflow-hidden font-mono">
                <div className="bg-slate-950 p-5 border-b border-emerald-500/30 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs"><Activity className="w-4 h-4" /><span>THE X'S & O'S FILM ROOM // SCHEME ANALYSIS</span></div>
                    <span className="text-xs text-slate-400">TACTICAL GAME TAPE BREAKDOWN</span>
                </div>
                <div className="p-6 md:p-8 space-y-6">
                    <div className="border-b border-emerald-500/30 pb-4">
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/40">FILM ROOM REPORT</span>
                        <h1 className="text-2xl md:text-4xl font-black uppercase text-white font-header tracking-wide mt-2">
                            {isPreseason ? `PRESEASON SCHEME ANALYSIS: HOW ${home.toUpperCase()} PLANS TO UTILIZE ${offName.toUpperCase()}` : `TACTICAL FILM ANALYSIS: HOW ${home.toUpperCase()} SCHEMED AROUND ${away.toUpperCase()} DEFENSIVE FRONTS IN ${score} VICTORY`}
                        </h1>
                        <p className="text-slate-300 text-xs font-sans mt-1">Film Breakdown by {writer} • Scheme Execution, Gap Discipline & Playcalling Efficiency</p>
                    </div>
                    <div className="relative bg-slate-950 p-2 rounded-xl border border-emerald-500/30 flex flex-col">
                        <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center bg-black rounded overflow-hidden">
                            <img src={currentImage} className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 scale-125 pointer-events-none" alt="" />
                            <img src={currentImage} className="relative z-10 w-full h-full object-contain drop-shadow-2xl" alt="Film Tape" />
                        </div>
                        <div className="p-2 text-[11px] text-emerald-400 bg-slate-900 mt-2 rounded border border-emerald-500/20 flex items-center gap-2"><Search className="w-4 h-4 flex-shrink-0" /><span>FILM FRAME: Key execution by {offName} ({offPos}) exploiting 3-deep coverage shell.</span></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-xs">
                        <div className="lg:col-span-2 space-y-4 text-slate-300 leading-relaxed text-sm">
                            <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                                <h3 className="text-xs font-bold text-emerald-400 font-mono uppercase">1. Run-Game Blocking Schemes & Gap Exploitation</h3>
                                <p className="text-xs text-slate-300">
                                    {isPreseason ? `${home}'s offensive staff is preparing brilliant adjustments, using heavy motion concepts to isolate defensive ends and create front-side lanes for ${offName}.` : `${home}'s offensive staff made a brilliant second-quarter adjustment, pivoting from standard Inside Zone to heavy Duo and Counter Trey concepts. By pulling the backside guard and tight end, they isolated ${away}'s defensive end, creating front-side B-gap lanes for ${offName} (${offStats}).`}
                                </p>
                            </div>
                            <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                                <h3 className="text-xs font-bold text-emerald-400 font-mono uppercase">2. Defensive Alignment & Nickel Hybrid Usage</h3>
                                <p className="text-xs text-slate-300">
                                    {isPreseason ? `Defensively, coordinator adjustments will likely feature ${defName} dropping into a hybrid STAR position to cap explosive plays.` : `Defensively, coordinator adjustments saw ${defName} (${defStats}) drop into a hybrid STAR position. This alignment capped explosive plays over the top and effectively wiped out quick seam passes on 3rd down.`}
                                </p>
                            </div>
                            <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                                <h3 className="text-xs font-bold text-emerald-400 font-mono uppercase">3. Situational Clock Bleed & 4th Quarter Execution</h3>
                                <p className="text-xs text-slate-300">
                                    {isPreseason ? `Holding a lead late in the game will be crucial for ${home} this year, forcing the offense to execute a drive featuring successful run plays before contact.` : `Holding a single-digit lead in the final 6 minutes, ${home} executed a 12-play drive featuring 100% successful run plays before contact, keeping the clock running and neutralizing ${away}'s pass rush.`}
                                </p>
                            </div>
                            {!isPreseason && (
                              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/20 space-y-1 text-slate-200">
                                  <div className="text-[10px] font-bold text-emerald-400 font-mono uppercase">4. TACTICAL SUMMARY & QUOTE</div>
                                  <p className="text-xs italic text-slate-300">"{quote}" — {offName}</p>
                              </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div className="bg-slate-900 p-2.5 rounded-xl border border-emerald-500/30 flex items-center gap-2.5 font-mono">
                                <img src={headshotImg} className="w-8 h-8 rounded-md object-cover border border-emerald-400 flex-shrink-0" alt={offName} />
                                <div className="min-w-0 flex-1">
                                    <div className="text-[8px] font-bold text-emerald-400">SCHEME EXECUTION LEADER</div>
                                    <div className="font-bold text-white text-xs truncate">{offName} ({offPos})</div>
                                    <div className="text-[10px] text-slate-300 truncate">{offStats.split('•')[0] || "134 YDS"}</div>
                                </div>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-xl border border-emerald-500/30 space-y-3 font-mono">
                                <div className="text-xs font-bold text-emerald-400 uppercase">POSITION UNIT GRADES</div>
                                <div className="flex justify-between border-b border-slate-800 pb-1 text-xs"><span>Offensive Line</span> <strong className="text-emerald-400">A (0 Sacks Allowed)</strong></div>
                                <div className="flex justify-between border-b border-slate-800 pb-1 text-xs"><span>Backfield Efficiency</span> <strong className="text-emerald-400">A+ ({offName})</strong></div>
                                <div className="flex justify-between border-b border-slate-800 pb-1 text-xs"><span>Secondary Coverage</span> <strong className="text-emerald-400">A- ({defName})</strong></div>
                                <div className="flex justify-between text-xs"><span>3rd Down Playcalling</span> <strong className="text-amber-400">B+ (7/12 Conv)</strong></div>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-xl border border-emerald-500/30 font-mono text-xs space-y-1">
                                <div className="text-emerald-400 font-bold">NEXT TACTICAL TEST</div>
                                <div className="text-slate-300">{nextOpp}</div>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
          )}

          {newsTheme === 'podcast' && (
              <div className="bg-gradient-to-br from-slate-900 to-black text-white rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
                <div className="bg-blue-900/40 text-blue-100 p-4 px-6 border-b border-blue-800/50 flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-2"><Radio size={16} className="text-blue-400 animate-pulse" /> DYNASTY AUDIO NETWORK</span>
                  <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded text-[10px]">NOTEBOOK LM INTEGRATION</span>
                </div>
                <div className="p-8 md:p-12 flex flex-col lg:flex-row gap-10">
                  <div className="w-full lg:w-1/3 flex flex-col items-center space-y-6">
                    <div className="relative w-64 h-64 rounded-xl shadow-2xl overflow-hidden border border-slate-700 group flex items-center justify-center bg-slate-950 shrink-0">
                      {podcastImage ? (
                        <>
                          <img src={podcastImage} className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-125 pointer-events-none" alt="" />
                          <img src={podcastImage} className="relative z-10 w-full h-full object-contain filter brightness-90 group-hover:scale-105 transition-transform duration-700 drop-shadow-2xl" alt="Podcast Cover" />
                        </>
                      ) : (
                        <div className="w-full h-full bg-slate-950 relative overflow-hidden group-hover:scale-105 transition-transform duration-700">
                          <img src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80" className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" alt="Stadium Backdrop" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-blue-950/60 to-transparent"></div>
                          <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-center z-10 pb-14">
                            <div className="relative flex flex-col items-center translate-x-3">
                               <div className="relative z-10"><Headphones size={28} className="absolute -top-1 -left-2 text-slate-400 transform -rotate-12 z-20" /><User size={64} className="text-slate-300 drop-shadow-md" fill="currentColor" strokeWidth={1} /></div>
                               <div className="w-24 h-16 bg-slate-800 rounded-t-3xl border-t-2 border-blue-500/50 shadow-lg -mt-2 flex items-center justify-center"><div className="w-8 h-8 opacity-20 border-2 border-blue-500 rounded-full"></div></div>
                            </div>
                            <div className="flex flex-col items-center z-20 relative translate-y-1">
                               <div className="flex gap-4 mb-0">
                                 <div className="flex flex-col items-center"><Mic size={24} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)] transform rotate-12" fill="currentColor" strokeWidth={1} /><div className="w-1 h-6 bg-slate-600"></div></div>
                                 <div className="flex flex-col items-center"><Mic size={24} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)] transform -rotate-12" fill="currentColor" strokeWidth={1} /><div className="w-1 h-6 bg-slate-600"></div></div>
                               </div>
                               <div className="w-28 h-6 bg-slate-900 rounded-t-lg border-t-2 border-slate-700 shadow-2xl flex justify-center pt-1"><div className="w-16 h-1 bg-slate-800 rounded-full"></div></div>
                            </div>
                            <div className="relative flex flex-col items-center -translate-x-3">
                               <div className="relative z-10"><Headphones size={28} className="absolute -top-1 -right-2 text-slate-400 transform rotate-12 z-20" /><User size={64} className="text-slate-300 drop-shadow-md" fill="currentColor" strokeWidth={1} /></div>
                               <div className="w-24 h-16 bg-slate-800 rounded-t-3xl border-t-2 border-emerald-500/50 shadow-lg -mt-2 flex items-center justify-center"><div className="w-8 h-8 opacity-20 border-2 border-emerald-500 rounded-full"></div></div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none z-20"></div>
                      <div className="absolute bottom-4 left-4 right-4 pointer-events-none z-30">
                        <h2 className="font-black text-xl leading-tight drop-shadow-md text-white">THE GRIDIRON GRIND</h2>
                        <p className="text-blue-400 text-xs font-bold tracking-widest mt-1 drop-shadow-md">HS & College Insiders</p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-800/80 p-5 rounded-xl border border-slate-700 shadow-inner">
                      {appState.podcastAudio ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs text-slate-400 font-bold mb-2">
                            <span>NOW PLAYING</span><span className="text-emerald-400 flex items-center gap-1"><Mic size={12}/> Studio Audio</span>
                          </div>
                          <audio controls className="w-full h-10" src={appState.podcastAudio}></audio>
                        </div>
                      ) : (
                        <div className="text-center space-y-3 py-4">
                          <Headphones className="w-10 h-10 mx-auto text-slate-500" />
                          <p className="text-sm font-bold text-slate-300">No Audio Loaded</p>
                          {!isReadOnly && (
                            <label className="block w-full cursor-pointer bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded transition-colors text-center">
                              Upload NotebookLM Audio
                              <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-6">
                    <div>
                      <div className="inline-block bg-blue-900/50 text-blue-300 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded mb-3">Episode Notes</div>
                      <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-none mb-4">
                        {isPreseason ? `SEASON PREVIEW: EXPECTATIONS BUILDING FOR ${offName.split(' ')[1] || offName}` : `BREAKING DOWN ${offName.split(' ')[1] || offName}'S ${combinedStats.split('•')[0]} MASTERCLASS`}
                      </h1>
                    </div>
                    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50 space-y-4 text-slate-300 leading-relaxed font-sans">
                      <p>
                        <span className="text-white font-bold">In today's episode:</span> 
                        {isPreseason 
                          ? (hasPriorHistory 
                              ? ` The hosts step into the studio to preview the upcoming season. After an explosive campaign where he accounted for ${priorTDs} total touchdowns, ${offName} returns to lead ${home}.` 
                              : ` We look ahead to the season opener. The hype surrounding ${home}'s new ${archetypeLower} prospect is palpable across the state.`)
                          : ` The AI hosts step into the studio to break down an electric Friday night performance. ${home} secured a massive ${lastGame?.result === 'W' ? 'victory' : 'result'} over ${away}, and ${offName} was the undisputed star of the show.`}
                      </p>
                      {!isPreseason && (
                        <div className="border-l-2 border-blue-500 pl-4 py-2 my-4 bg-slate-800/30">
                          <p className="text-sm"><strong className="text-white">Stat of the Week:</strong> The {archetypeLower} engine generated {combinedStats}, proving once again why national scouts are flooding the bleachers.</p>
                        </div>
                      )}
                      <p>
                        {isPreseason 
                          ? `The hosts debate how the ${appState.player.height}, ${appState.player.weight} frame of ${offName} will hold up against tougher defensive fronts this year, and what ${home} needs to do schematically to protect their signal-caller.` 
                          : `The hosts discuss ${offName}'s elite pocket presence, analyzing how the ${appState.player.height}, ${appState.player.weight} prospect managed to compile ${lastGame?.passTD} passing touchdowns while still doing damage on the ground. This recent performance pushes his career passing yards to ${totals.passYds}, cementing his legacy. Plus, they dive into the defensive clinic put on by ${defName}.`}
                      </p>
                      {appState.player.isCommitted ? (
                         <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-lg mt-4">
                          <p className="text-sm text-blue-100"><strong className="text-blue-400">Commitment Locked:</strong> Now officially committed to <span className="font-bold text-white">{appState.player.college}</span>, the pressure is off the recruiting trail, and the focus is solely on chasing a ring.</p>
                        </div>
                      ) : !hasActiveRecruiting ? (
                        <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-lg mt-4">
                          <p className="text-sm text-slate-300"><strong className="text-slate-400">Recruiting Rumor Mill:</strong> Playing it incredibly close to the vest, {offName} has a personal wishlist, but no official program interest has formalized yet. National scouts are waiting eagerly to see who makes the first move.</p>
                        </div>
                      ) : (
                        <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-lg mt-4">
                          <p className="text-sm text-blue-100"><strong className="text-blue-400">Recruiting Rumor Mill:</strong> With {totalOffers} official offers now on the table, the race for {offName} is heating up. Insiders are hearing that <span className="font-bold text-white">{topSchool.name}</span> is currently sitting in the driver's seat.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          )}
        </div>

      </div>
    );
  };

  const renderDataEntry = () => (
    <div className="max-w-7xl mx-auto animate-in fade-in pb-20 relative z-10">
      
      <div className="bg-slate-900/85 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-2xl mb-6 text-center">
        <h2 className="text-3xl font-black text-white uppercase mb-1 drop-shadow-md">The Universal Scanner</h2>
        <p className="text-slate-300 text-sm font-bold drop-shadow">Upload a screenshot of your Box Score, Player Hub, or Recruiting Board. The AI will extract the data automatically.</p>
        
        <div className="mt-6 p-8 border-2 border-dashed border-amber-500/50 rounded-xl bg-slate-950/60 hover:bg-slate-900/80 transition-colors shadow-inner relative overflow-hidden group">
          {isScanning ? (
            <div className="flex flex-col items-center gap-3 text-amber-500 py-4 relative z-10">
              <ScanLine className="w-10 h-10 animate-bounce" />
              <span className="text-sm font-bold animate-pulse uppercase tracking-wider">Tesseract AI Scanning: {scanProgress}%</span>
              <div className="w-64 bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                <div className="bg-amber-500 h-full transition-all duration-300" style={{width: `${scanProgress}%`}}></div>
              </div>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center gap-2 text-slate-300 hover:text-white relative z-10">
              <UploadCloud className="w-10 h-10 text-amber-500 mb-1 drop-shadow-md group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold uppercase tracking-wider text-amber-400">Drop Any Screenshot Here</span>
              <span className="text-[11px] font-medium text-slate-400">Supported: Box Scores, RTG Mechanics, Target Boards</span>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleUniversalScan} />
            </label>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        <div className={`bg-slate-900/85 backdrop-blur-md rounded-xl border ${editingGameIndex !== null ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-slate-700/50 shadow-2xl'} p-6 space-y-6 flex flex-col transition-all`}>
          <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
            <h3 className={`font-bold uppercase tracking-wider text-sm flex items-center gap-2 drop-shadow ${editingGameIndex !== null ? 'text-amber-400' : 'text-white'}`}>
              <Trophy size={16} className="text-amber-500"/> 1. {editingGameIndex !== null ? `Edit Box Score (Week ${appState.gameLogs[editingGameIndex].week})` : 'Game Box Score'}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Opponent Name</label>
              <input type="text" value={newGame.opponent} onChange={e => setNewGame({...newGame, opponent: e.target.value})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm" placeholder="e.g. Fordson Tractors" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Result</label>
              <select value={newGame.result} onChange={e => setNewGame({...newGame, result: e.target.value})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white font-bold text-sm">
                <option value="W" className="bg-slate-900">Win</option>
                <option value="L" className="bg-slate-900">Loss</option>
              </select>
            </div>
            <div className="flex gap-2">
              <div className="w-1/2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Home</label>
                <input type="number" value={valOrEmpty(newGame.homeScore)} onChange={e => setNewGame({...newGame, homeScore: e.target.value})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white font-mono text-sm" placeholder="28" />
              </div>
              <div className="w-1/2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Away</label>
                <input type="number" value={valOrEmpty(newGame.awayScore)} onChange={e => setNewGame({...newGame, awayScore: e.target.value})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white font-mono text-sm" placeholder="14" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pass Yds</label>
              <input type="number" value={valOrEmpty(newGame.passYds)} onChange={e => setNewGame({...newGame, passYds: e.target.value})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pass TD</label>
              <input type="number" value={valOrEmpty(newGame.passTD)} onChange={e => setNewGame({...newGame, passTD: e.target.value})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">INTs</label>
              <input type="number" value={valOrEmpty(newGame.int)} onChange={e => setNewGame({...newGame, int: e.target.value})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rush Yds</label>
              <input type="number" value={valOrEmpty(newGame.rushYds)} onChange={e => setNewGame({...newGame, rushYds: e.target.value})} className="w-full bg-slate-950/50 border border-amber-600/50 rounded p-2 text-amber-400 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rush TD</label>
              <input type="number" value={valOrEmpty(newGame.rushTD)} onChange={e => setNewGame({...newGame, rushTD: e.target.value})} className="w-full bg-slate-950/50 border border-amber-600/50 rounded p-2 text-amber-400 text-sm" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-6 space-y-6 flex flex-col justify-start">
          <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2 drop-shadow"><Settings size={16} className="text-emerald-500"/> {isCoach ? '2. Coach Dashboard Updates' : '2. RTG Mechanics & NIL'}</h3>
          </div>
          
          {!isCoach ? (
              <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Current GPA</label>
                  <input type="number" step="0.1" value={valOrEmpty(rtgUpdate.gpa)} onChange={e => setRtgUpdate({...rtgUpdate, gpa: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Energy Lvl</label>
                  <input type="number" value={valOrEmpty(rtgUpdate.energy)} onChange={e => setRtgUpdate({...rtgUpdate, energy: e.target.value === '' ? '' : parseInt(e.target.value)})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><ShieldCheck size={12} className="text-amber-500"/> Coach Trust Pts</label>
                  <input type="number" value={valOrEmpty(rtgUpdate.coachTrust)} onChange={e => setRtgUpdate({...rtgUpdate, coachTrust: e.target.value === '' ? '' : parseInt(e.target.value)})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">Trust to Next Rank</label>
                  <input type="number" value={valOrEmpty(rtgUpdate.trustToNext)} onChange={e => setRtgUpdate({...rtgUpdate, trustToNext: e.target.value === '' ? '' : parseInt(e.target.value)})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">Depth Chart Rank</label>
                  <select value={rtgUpdate.rank} onChange={e => setRtgUpdate({...rtgUpdate, rank: e.target.value})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white font-bold text-sm">
                    <option value="" className="bg-slate-900">Unranked / None</option>
                    <option value="QB1" className="bg-slate-900">QB1 (Starter)</option>
                    <option value="QB2" className="bg-slate-900">QB2 (Backup)</option>
                    <option value="QB3" className="bg-slate-900">QB3</option>
                    <option value="Redshirt" className="bg-slate-900">Redshirt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">Available Skill Pts</label>
                  <input type="number" value={valOrEmpty(rtgUpdate.skillPoints)} onChange={e => setRtgUpdate({...rtgUpdate, skillPoints: e.target.value === '' ? '' : parseInt(e.target.value)})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Users size={12} className="text-blue-400"/> Followers Count</label>
                  <input type="number" value={valOrEmpty(rtgUpdate.followers)} onChange={e => setRtgUpdate({...rtgUpdate, followers: e.target.value === '' ? '' : parseInt(e.target.value)})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-blue-400 text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><DollarSign size={12} className="text-emerald-400"/> Brand Valuation</label>
                  <input type="number" value={valOrEmpty(rtgUpdate.valuation)} onChange={e => setRtgUpdate({...rtgUpdate, valuation: e.target.value === '' ? '' : parseInt(e.target.value)})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-emerald-400 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><TrendingUp size={12} className="text-blue-400"/> Playoff / Bowl Projection</label>
                  <input type="text" value={appState.playoffPicture} onChange={e => updateAppState(prev => ({...prev, playoffPicture: e.target.value}))} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm" placeholder="e.g. State Playoffs - In The Hunt" />
                </div>
              </div>
              
              <div className="border-t border-slate-700/50 pt-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><HeartPulse size={12} className="text-red-500"/> Wear & Tear Monitor</label>
                <div className="grid grid-cols-2 gap-2">
                  {['head', 'chest', 'arm', 'legs'].map((part) => (
                    <div key={part} className="flex justify-between items-center bg-slate-950/50 p-2 rounded border border-slate-800/50">
                      <span className="text-[9px] text-slate-400 uppercase">{part}</span>
                      <select value={rtgUpdate.wear?.[part] || 'Green'} onChange={e => setRtgUpdate({...rtgUpdate, wear: {...(rtgUpdate.wear || {}), [part]: e.target.value}})} 
                        className={`bg-transparent outline-none text-xs font-bold ${rtgUpdate.wear?.[part] === 'Red' ? 'text-red-500' : rtgUpdate.wear?.[part] === 'Yellow' ? 'text-amber-500' : 'text-emerald-500'}`}>
                        <option value="Green" className="bg-slate-900">Green</option>
                        <option value="Yellow" className="bg-slate-900">Yellow</option>
                        <option value="Red" className="bg-slate-900">Red</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              </>
          ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Coach Prestige</label>
                  <select value={coachUpdate.prestige || 'C'} onChange={e => setCoachUpdate({...coachUpdate, prestige: e.target.value})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white font-bold text-sm">
                    {['A+','A','A-','B+','B','B-','C+','C','C-','D+','D','D-','F'].map(g => <option key={g} value={g} className="bg-slate-900">{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Job Security %</label>
                  <input type="number" value={valOrEmpty(coachUpdate.security)} onChange={e => setCoachUpdate({...coachUpdate, security: e.target.value === '' ? '' : parseInt(e.target.value)})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Recruiting Budget</label>
                  <input type="number" value={valOrEmpty(coachUpdate.budget)} onChange={e => setCoachUpdate({...coachUpdate, budget: e.target.value === '' ? '' : parseInt(e.target.value)})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Alma Mater Status</label>
                  <select value={coachUpdate.almaMaterStatus || 'Stable'} onChange={e => setCoachUpdate({...coachUpdate, almaMaterStatus: e.target.value})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm font-bold">
                    <option value="Stable" className="bg-slate-900">Stable</option>
                    <option value="Hot Seat" className="bg-slate-900">OC on Hot Seat</option>
                    <option value="Vacancy" className="bg-slate-900">Job Vacancy</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><TrendingUp size={12} className="text-blue-400"/> Playoff / Bowl Projection</label>
                  <input type="text" value={appState.playoffPicture} onChange={e => updateAppState(prev => ({...prev, playoffPicture: e.target.value}))} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm" placeholder="e.g. National Championship Bubble" />
                </div>
              </div>
          )}
        </div>

        <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-6 space-y-4 flex flex-col justify-start">
          <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2 drop-shadow"><Map size={16} className="text-blue-500"/> 3. Manual Recruiting Updates</h3>
          </div>
          <p className="text-xs text-slate-400">If the scanner missed a prospect's interest level, you can manually override the sliders here.</p>
          
          <div className="pt-2">
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2">
              {appState.recruiting.length === 0 ? (
                <div className="text-xs text-slate-500 italic text-center py-4">No prospects on board.</div>
              ) : (
                appState.recruiting.sort((a,b)=> (Number(b.interest) || 0) - (Number(a.interest) || 0)).map(school => (
                  <div key={school.id} className="flex flex-col gap-2 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                    <div className="flex justify-between items-center">
                      <div className="text-xs font-bold text-white truncate w-1/2">{school.name}</div>
                      <button 
                        onClick={() => updateSchool(school.id, 'offered', !school.offered)}
                        className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors ${school.offered ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}
                      >
                        {school.offered ? (isCoach ? 'Scholarship' : 'Offered') : 'No Offer'}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" min="0" max="100" value={valOrEmpty(school.interest)} 
                        onChange={(e) => updateSchool(school.id, 'interest', parseInt(e.target.value))}
                        onMouseUp={() => autoCategorizeSchool(school.id)}
                        onTouchEnd={() => autoCategorizeSchool(school.id)}
                        onKeyUp={() => autoCategorizeSchool(school.id)}
                        className={`w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer ${getSliderAccent(school.interest)}`}
                      />
                      <div className="flex items-center">
                        <input 
                          type="number" 
                          min="0" max="100" 
                          value={valOrEmpty(school.interest)} 
                          onChange={(e) => updateSchool(school.id, 'interest', e.target.value === '' ? '' : parseInt(e.target.value))}
                          onBlur={() => autoCategorizeSchool(school.id)}
                          onKeyDown={(e) => e.key === 'Enter' && autoCategorizeSchool(school.id)}
                          className={`w-7 bg-transparent text-right text-[10px] font-bold ${getInterestColor(school.interest)} border-b border-transparent focus:border-blue-400 outline-none p-0 hide-arrows transition-colors`}
                        />
                        <span className={`text-[10px] font-bold ${getInterestColor(school.interest)} transition-colors`}>%</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-6 shadow-2xl space-y-6 flex flex-col justify-start">
          <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2 drop-shadow"><Medal size={16} className="text-amber-500"/> 4. Media & Milestones</h3>
          </div>
          
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 shadow-inner">
             <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3">Manage Outlet Imagery (Paste URLs)</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest block mb-1">The Bolt</span>
                  <input 
                    type="text" 
                    value={tempUrls['outletImages-broadsheet'] !== undefined ? tempUrls['outletImages-broadsheet'] : (appState.outletImages?.broadsheet || '')} 
                    onChange={(e) => setTempUrls(prev => ({...prev, 'outletImages-broadsheet': e.target.value}))}
                    onBlur={() => handleUrlBlur('outletImages', 'broadsheet')}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs outline-none focus:border-slate-400 transition-colors" 
                    placeholder="Paste Imgur link..." 
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest block mb-1">On3 / Gridiron</span>
                  <input 
                    type="text" 
                    value={tempUrls['outletImages-on3'] !== undefined ? tempUrls['outletImages-on3'] : (appState.outletImages?.on3 || '')} 
                    onChange={(e) => setTempUrls(prev => ({...prev, 'outletImages-on3': e.target.value}))}
                    onBlur={() => handleUrlBlur('outletImages', 'on3')}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs outline-none focus:border-amber-500 transition-colors" 
                    placeholder="Paste Imgur link..." 
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest block mb-1">News-Herald</span>
                  <input 
                    type="text" 
                    value={tempUrls['outletImages-local'] !== undefined ? tempUrls['outletImages-local'] : (appState.outletImages?.local || '')} 
                    onChange={(e) => setTempUrls(prev => ({...prev, 'outletImages-local': e.target.value}))}
                    onBlur={() => handleUrlBlur('outletImages', 'local')}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs outline-none focus:border-amber-900 transition-colors" 
                    placeholder="Paste Imgur link..." 
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Film Room Tape</span>
                  <input 
                    type="text" 
                    value={tempUrls['outletImages-filmroom'] !== undefined ? tempUrls['outletImages-filmroom'] : (appState.outletImages?.filmroom || '')} 
                    onChange={(e) => setTempUrls(prev => ({...prev, 'outletImages-filmroom': e.target.value}))}
                    onBlur={() => handleUrlBlur('outletImages', 'filmroom')}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs outline-none focus:border-emerald-500 transition-colors" 
                    placeholder="Paste Imgur link..." 
                  />
                </div>
                <div className="md:col-span-2 pt-2 border-t border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Podcast Cover Art URL</span>
                  <input 
                    type="text" 
                    value={tempUrls['outletImages-podcast'] !== undefined ? tempUrls['outletImages-podcast'] : (appState.outletImages?.podcast || '')} 
                    onChange={(e) => setTempUrls(prev => ({...prev, 'outletImages-podcast': e.target.value}))}
                    onBlur={() => handleUrlBlur('outletImages', 'podcast')}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs outline-none focus:border-blue-500 transition-colors" 
                    placeholder="Paste Imgur link (leave empty for default graphic)..." 
                  />
                </div>
             </div>
          </div>
          
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 shadow-inner">
             <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Add to Rumor Mill Ticker</h4>
             <input type="text" value={newRumor} onChange={e => setNewRumor(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs italic" placeholder="e.g. Rival coach on the hot seat..." />
          </div>
          
          <div className="border-t border-slate-700/50 pt-4 space-y-4">
             <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Record New Legacy Milestone</h4>
             <div>
               <input type="text" placeholder="Award / Milestone (e.g. State Champ)" value={newTrophy.name} onChange={e => setNewTrophy({...newTrophy, name: e.target.value})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm mb-3" />
             </div>
             <div className="grid grid-cols-2 gap-3">
               <input type="text" placeholder="Year / Season" value={newTrophy.year} onChange={e => setNewTrophy({...newTrophy, year: e.target.value})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm" />
               <select value={newTrophy.type} onChange={e => setNewTrophy({...newTrophy, type: e.target.value})} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-white text-sm font-bold">
                 <option value="Award" className="bg-slate-900">Individual Award</option>
                 <option value="Championship" className="bg-slate-900">Championship</option>
                 <option value="Milestone" className="bg-slate-900">Record / Milestone</option>
               </select>
             </div>
             <button onClick={handleAddTrophy} className="w-full bg-amber-600 hover:bg-amber-500 text-slate-900 px-4 py-3 rounded font-black text-xs uppercase tracking-wider transition-colors mt-2 shadow-[0_0_10px_rgba(217,119,6,0.3)]">Add to Legacy Case</button>
          </div>
        </div>

      </div>

      {editingGameIndex !== null ? (
        <div className="flex gap-4 relative z-10 mb-8">
          <button onClick={handleSaveGameClick} className="flex-1 bg-amber-600 hover:bg-amber-500 text-slate-900 font-black py-4 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)]">
            <Save size={18} /> Update Game Log
          </button>
          <button onClick={cancelEdit} className="px-8 bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md text-white font-black py-4 rounded-xl uppercase tracking-wider transition-all border border-slate-600">
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={handleSaveGameClick} className="w-full mb-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(52,211,153,0.4)] relative z-10">
          <Save size={18} /> Save & Process Weekly Agenda
        </button>
      )}

      {/* --- PRESS CONFERENCE MODAL --- */}
      {pressConference && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] animate-in fade-in p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                      <div className="bg-blue-600 p-2 rounded-full"><Mic className="text-white w-6 h-6"/></div>
                      <div>
                          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Post-Game Presser</h2>
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Local Media Availability</p>
                      </div>
                  </div>
                  
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-inner">
                      <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-2">Reporter Question:</p>
                      <p className="text-lg text-slate-200 italic font-serif leading-relaxed">"{pressConference.presserData.question}"</p>
                  </div>
                  
                  <div className="space-y-3">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Select your response:</p>
                      {pressConference.presserData.answers.map((ans, idx) => (
                          <button key={idx} onClick={() => finalizeGameSaveWithQuote(ans.text)} className="w-full text-left bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-amber-500 p-4 rounded-xl transition-all group relative overflow-hidden">
                              <span className={`absolute left-0 top-0 bottom-0 w-1 ${ans.tone === 'Humble' ? 'bg-blue-500' : ans.tone === 'Aggressive' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 pl-2">{ans.tone}</div>
                              <div className="text-white font-medium pl-2">{ans.text}</div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-6 shadow-2xl relative z-10 mt-8">
        <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2 drop-shadow mb-4"><Settings size={16} className="text-blue-400"/> Manage Past Game Logs</h3>
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <table className="w-full text-left text-sm relative">
            <thead className="text-slate-400 border-b border-slate-700 sticky top-0 bg-slate-900">
              <tr><th className="pb-2">Season</th><th className="pb-2">Wk</th><th className="pb-2">Opponent</th><th className="pb-2">Res</th><th className="pb-2">Score</th><th className="pb-2">Pass</th><th className="pb-2">Rush</th><th className="pb-2 text-right">Actions</th></tr>
            </thead>
            <tbody className="text-slate-200 divide-y divide-slate-700/50">
              {appState.gameLogs.length === 0 && (<tr><td colSpan="8" className="py-4 text-center text-slate-500 italic">No games logged yet.</td></tr>)}
              {appState.gameLogs.map((game, i) => (
                <tr key={i} className={`transition-colors ${editingGameIndex === i ? 'bg-amber-900/20' : 'hover:bg-slate-800/30'}`}>
                  <td className="py-3 font-mono text-slate-400 border-r border-slate-700/30 pr-2">S{game.season || 1}</td>
                  <td className="py-3 font-mono text-slate-400 pl-2">{game.week}</td>
                  <td className="py-3 font-bold">{game.opponent}</td>
                  <td className={`py-3 font-black ${game.result === 'W' ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'text-red-400'}`}>{game.result}</td>
                  <td className="py-3 font-mono text-slate-300">{game.homeScore}-{game.awayScore}</td>
                  <td className="py-3 font-medium text-slate-300">{game.passYds}/{game.passTD}</td>
                  <td className="py-3 text-amber-400 font-bold">{game.rushYds}/{game.rushTD}</td>
                  <td className="py-3 text-right">
                    <button onClick={() => handleEditGame(i)} className="p-1.5 bg-slate-800 hover:bg-blue-600 text-blue-400 hover:text-white rounded transition-colors mr-2 border border-slate-700"><Pencil size={14}/></button>
                    <button onClick={() => requestDeleteGame(i)} className="p-1.5 bg-slate-800 hover:bg-red-600 text-red-400 hover:text-white rounded transition-colors border border-slate-700"><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-2xl mx-auto text-left animate-in fade-in pb-20 relative z-10">
      <div className="bg-slate-900/85 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-xl mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white uppercase drop-shadow-md">Hub Settings & Profile</h2>
          <p className="text-slate-300 text-sm font-bold mt-1 drop-shadow">Manage your RTG data and custom imagery.</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Era</div>
          <div className="text-2xl font-black text-amber-500 drop-shadow-md">Season {appState.currentSeason || 1}</div>
        </div>
      </div>

      <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-6 mb-8 shadow-2xl space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 drop-shadow">
          <Settings className="text-amber-500" /> Career Phase Transition
        </h3>
        <p className="text-xs text-slate-400 mb-4">Advance your career from a player to a coordinator, or a coordinator to a Head Coach. The app will automatically adapt the dashboard and recruiting tools to your new job title.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={() => updateAppState(prev => ({...prev, careerPhase: 'Player'}))} className={`p-4 rounded-xl border transition-all text-center flex flex-col items-center gap-2 ${appState.careerPhase === 'Player' ? 'bg-amber-500/20 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-slate-950/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}>
                <User size={24} className={appState.careerPhase === 'Player' ? 'text-amber-400' : 'text-slate-400'} />
                <span className={`font-black text-sm uppercase tracking-wider ${appState.careerPhase === 'Player' ? 'text-white' : 'text-slate-400'}`}>Player Era</span>
            </button>
            <button onClick={() => updateAppState(prev => ({...prev, careerPhase: 'OC'}))} className={`p-4 rounded-xl border transition-all text-center flex flex-col items-center gap-2 ${appState.careerPhase === 'OC' ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-950/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}>
                <ClipboardSignature size={24} className={appState.careerPhase === 'OC' ? 'text-blue-400' : 'text-slate-400'} />
                <span className={`font-black text-sm uppercase tracking-wider ${appState.careerPhase === 'OC' ? 'text-white' : 'text-slate-400'}`}>Coordinator</span>
            </button>
            <button onClick={() => updateAppState(prev => ({...prev, careerPhase: 'HC'}))} className={`p-4 rounded-xl border transition-all text-center flex flex-col items-center gap-2 ${appState.careerPhase === 'HC' ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-950/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}>
                <ShieldCheck size={24} className={appState.careerPhase === 'HC' ? 'text-emerald-400' : 'text-slate-400'} />
                <span className={`font-black text-sm uppercase tracking-wider ${appState.careerPhase === 'HC' ? 'text-white' : 'text-slate-400'}`}>Head Coach</span>
            </button>
        </div>
      </div>
      
      <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-6 mb-8 shadow-2xl space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 drop-shadow">
          <UserCircle className="text-amber-500" /> {isCoach ? 'Coach Profile Identity' : 'Player Profile Identity'}
        </h3>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 pb-6 border-b border-slate-700/50">
          <img src={appState.player.headshot} className="w-24 h-24 rounded-full object-cover border-4 border-slate-600 shadow-[0_0_15px_rgba(255,255,255,0.1)] shrink-0" alt="Profile" />
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-300 uppercase mb-2 drop-shadow-sm">Custom Headshot URL</label>
            <input 
              type="text" 
              value={tempUrls['player-headshot'] !== undefined ? tempUrls['player-headshot'] : (appState.player.headshot || '')}
              onChange={e => setTempUrls(prev => ({...prev, 'player-headshot': e.target.value}))}
              onBlur={() => handleUrlBlur('player', 'headshot')}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
              className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white shadow-inner text-sm outline-none focus:border-amber-500 transition-colors" 
              placeholder="Paste direct Imgur link here..."
            />
            <p className="text-[10px] text-slate-400 mt-2">Paste a web link. (Standard Imgur links will auto-convert to images).</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={isCoach ? 'col-span-2' : ''}>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1 drop-shadow-sm">{isCoach ? "Coach Name" : "Player Name"}</label>
            <input type="text" value={appState.player.name} onChange={e => updateAppState(prev => ({...prev, player: {...prev.player, name: e.target.value}}))} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white shadow-inner" />
          </div>
          
          {!isCoach && (
              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1 drop-shadow-sm">Position</label>
                  <input type="text" value={appState.player.pos} onChange={e => updateAppState(prev => ({...prev, player: {...prev.player, pos: e.target.value}}))} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white shadow-inner" placeholder="e.g. QB" />
                </div>
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1 drop-shadow-sm">Jersey #</label>
                  <input type="text" value={appState.player.number} onChange={e => updateAppState(prev => ({...prev, player: {...prev.player, number: e.target.value}}))} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white shadow-inner" placeholder="e.g. #2" />
                </div>
              </div>
          )}
          
          <div className={isCoach ? 'col-span-2' : ''}>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1 drop-shadow-sm">{isCoach ? "Program / School" : "School / Team"}</label>
            <input type="text" value={appState.player.school} onChange={e => updateAppState(prev => ({...prev, player: {...prev.player, school: e.target.value}}))} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white shadow-inner" />
          </div>
          
          {!isCoach && (
              <>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 drop-shadow-sm">Star Rating</label>
                <select value={appState.player.stars} onChange={e => updateAppState(prev => ({...prev, player: {...prev.player, stars: parseInt(e.target.value)}}))} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white shadow-inner font-bold outline-none">
                   {[1,2,3,4,5].map(n => <option key={n} value={n} className="bg-slate-900">{n} Star Prospect</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 drop-shadow-sm">Overall Rating</label>
                <input type="number" value={valOrEmpty(appState.player.overall)} onChange={e => updateAppState(prev => ({...prev, player: {...prev.player, overall: e.target.value === '' ? '' : parseInt(e.target.value)}}))} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white shadow-inner" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 drop-shadow-sm">National QB Rank</label>
                <input type="number" value={valOrEmpty(appState.player.nationalQbRank)} onChange={e => updateAppState(prev => ({...prev, player: {...prev.player, nationalQbRank: e.target.value === '' ? '' : parseInt(e.target.value)}}))} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white shadow-inner" placeholder="e.g. 14" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 drop-shadow-sm">Archetype</label>
                <input type="text" value={appState.player.archetype} onChange={e => updateAppState(prev => ({...prev, player: {...prev.player, archetype: e.target.value}}))} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white shadow-inner" placeholder="e.g. Dual-Threat" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 drop-shadow-sm">Height</label>
                <input type="text" value={appState.player.height} onChange={e => updateAppState(prev => ({...prev, player: {...prev.player, height: e.target.value}}))} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white shadow-inner" placeholder="e.g. 6'2&quot;" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 drop-shadow-sm">Weight</label>
                <input type="text" value={appState.player.weight} onChange={e => updateAppState(prev => ({...prev, player: {...prev.player, weight: e.target.value}}))} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white shadow-inner" placeholder="e.g. 205 LBS" />
              </div>

              <div className="col-span-2 mt-2">
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 drop-shadow-sm">NIL & Sponsorships</label>
                <input type="text" value={appState.rtg.sponsorships} onChange={e => updateAppState(prev => ({...prev, rtg: {...prev.rtg, sponsorships: e.target.value}}))} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-emerald-400 shadow-inner" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 drop-shadow-sm">Followers Count</label>
                <input type="number" value={valOrEmpty(appState.rtg.followers)} onChange={e => updateAppState(prev => ({...prev, rtg: {...prev.rtg, followers: e.target.value === '' ? '' : parseInt(e.target.value)}}))} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-blue-400 shadow-inner" />
              </div>
              </>
          )}
        </div>
      </div>

      <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/50 p-6 text-center shadow-xl">
        <h3 className="text-lg font-bold text-white mb-6 drop-shadow">Data Management & Progression</h3>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <button onClick={requestAdvanceSeason} className="px-6 py-3 bg-blue-900/60 text-blue-300 border border-blue-500 hover:bg-blue-600 hover:text-white rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            Advance to Next Season
          </button>
          <button onClick={handleResetRequest} className="px-6 py-3 bg-red-900/60 text-red-300 border border-red-500 hover:bg-red-600 hover:text-white rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            Factory Reset Database
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden relative">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cinzel:wght@700;900&family=Fira+Code:wght@500;700&family=Inter:wght@300;400;600;700;800;900&family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&family=Teko:wght@600;700&display=swap');
        
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-display { font-family: 'Bebas Neue', sans-serif; }
        .font-header { font-family: 'Teko', sans-serif; }
        .font-cinzel { font-family: 'Cinzel', serif; }
        .font-mono { font-family: 'Fira Code', monospace; }

        .drop-cap::first-letter {
            font-size: 3.75rem;
            line-height: 0.8;
            float: left;
            margin-right: 0.6rem;
            font-weight: 900;
        }

        @keyframes ticker { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
        .animate-ticker { display: inline-block; white-space: nowrap; animation: ticker 35s linear infinite; padding-right: 50px; }
        
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
        
        .hide-arrows::-webkit-inner-spin-button, .hide-arrows::-webkit-outer-spin-button {
            -webkit-appearance: none; margin: 0;
        }
        .hide-arrows[type=number] { -moz-appearance: textfield; }

        @media print {
            body { background: white !important; margin: 0; padding: 0; color: black; }
            .no-print { display: none !important; }
            .w-72 { display: none !important; }
            .absolute.inset-0 { display: none !important; }
            .flex-1.overflow-y-auto { overflow: visible !important; height: auto !important; padding: 0 !important; }
            .max-w-5xl { max-width: 100% !important; margin: 0 auto !important; }
            .print-full { box-shadow: none !important; border: 1px solid #ccc !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            ::-webkit-scrollbar { display: none; }
        }
      `}} />
      
      {messageModal.isOpen && (
         <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4">
             <div className={`px-6 py-3 rounded-full shadow-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 ${messageModal.type === 'error' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]'}`}>
                 <CheckCircle2 size={18} /> {messageModal.text}
             </div>
         </div>
      )}

      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] animate-in fade-in p-4">
          <div className="bg-slate-900 border border-red-500/50 rounded-2xl max-w-md w-full p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight drop-shadow-md">Factory Reset</h2>
            <p className="text-slate-400 text-sm mb-6">Are you sure you want to COMPLETELY WIPE the database? This cannot be undone and will delete all game logs, recruiting data, and custom settings.</p>
            <div className="flex gap-4">
              <button onClick={confirmReset} className="flex-1 bg-red-600 hover:bg-red-500 text-white p-3 rounded-xl font-black transition-all">Yes, Wipe Data</button>
              <button onClick={() => setIsResetModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl font-bold transition-all border border-slate-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] animate-in fade-in p-4">
          <div className="bg-slate-900 border border-red-500/50 rounded-2xl max-w-md w-full p-8 shadow-2xl text-center space-y-6">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight drop-shadow-md">Delete Game Log?</h2>
            <p className="text-slate-400 text-sm mb-6">Are you sure you want to delete this game log? Season totals will be recalculated.</p>
            <div className="flex gap-4">
              <button onClick={confirmDeleteGame} className="flex-1 bg-red-600 hover:bg-red-500 text-white p-3 rounded-xl font-black transition-all">Yes, Delete</button>
              <button onClick={() => setDeleteConfirmModal({ isOpen: false, index: null })} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl font-bold transition-all border border-slate-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {advanceConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] animate-in fade-in p-4">
          <div className="bg-slate-900 border border-blue-500/50 rounded-2xl max-w-md w-full p-8 shadow-2xl text-center space-y-6">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight drop-shadow-md">Advance to Next Season?</h2>
            <p className="text-slate-400 text-sm mb-6">This will reset your current week to 1 and update your season counter, but preserve all past game logs. Ready to move forward?</p>
            <div className="flex gap-4">
              <button onClick={confirmAdvanceSeason} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl font-black transition-all">Yes, Advance</button>
              <button onClick={() => setAdvanceConfirmModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl font-bold transition-all border border-slate-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {renderNav()}
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out"
          style={{ backgroundImage: `url(${getBgImage()})` }}
        />
        
        <div className="absolute inset-0 bg-slate-500/30 backdrop-blur-md z-0 transition-all duration-700"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-slate-900/50 z-0 pointer-events-none transition-all duration-700"></div>

        <div className="flex-1 overflow-y-auto p-8 relative z-10 pb-16">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'recruiting' && renderRecruiting()}
          {activeTab === 'newsroom' && renderNewsroom()}
          {activeTab === 'trophies' && renderTrophies()}
          {activeTab === 'dataEntry' && renderDataEntry()}
          {activeTab === 'settings' && renderSettings()}
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-black text-amber-500 border-t border-slate-800 flex items-center overflow-hidden z-50">
          <div className="bg-amber-500 text-black h-full flex items-center px-4 font-black uppercase tracking-widest text-xs z-20 flex-shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
            RUMOR MILL
          </div>
          <div className="flex-1 overflow-hidden relative flex items-center h-full bg-slate-950/90 backdrop-blur-md">
             <div className="animate-ticker text-xs font-bold uppercase tracking-wider flex gap-16">
               {appState.rumors.map((rumor, i) => (
                 <span key={i}>••• {rumor} </span>
               ))}
               <span>•••</span>
             </div>
          </div>
        </div>

        {shareLinkModal.isOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[300] animate-in fade-in p-4">
              <div className="bg-slate-900 border border-blue-500/50 rounded-2xl max-w-lg w-full p-8 shadow-2xl text-center space-y-6">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Share2 size={32} className="text-blue-500" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight drop-shadow-md">Your Hub is Live!</h2>
                
                {shareLinkModal.url.includes('usercontent.goog') ? (
                    <p className="text-amber-400 text-sm mb-4 font-bold bg-amber-950/40 p-3 rounded border border-amber-500/50">
                        ⚠️ Notice: You are testing this inside the preview sandbox! The link below won't work for friends. Please deploy this to Vercel and click "Get Share Link" there to get your real Vercel URL.
                    </p>
                ) : (
                    <p className="text-slate-400 text-sm mb-4">Share this link with friends. They can view your stats, newsroom, and podcast on any device, but cannot make edits.</p>
                )}
                
                <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-lg border border-slate-700">
                    <input type="text" readOnly value={shareLinkModal.url} className="bg-transparent text-slate-300 w-full outline-none text-xs font-mono" />
                    <button onClick={() => { navigator.clipboard.writeText(shareLinkModal.url); setMessageModal({ isOpen: true, text: "Copied to clipboard!", type: 'success' }); setTimeout(() => setMessageModal({ isOpen: false, text: '', type: 'success' }), 3000); }} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded transition-colors" title="Copy to clipboard"><Copy size={16} /></button>
                </div>

                <button onClick={() => setShareLinkModal({ isOpen: false, url: '' })} className="w-full bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl font-bold transition-all border border-slate-600 shadow-md">Close</button>
              </div>
            </div>
        )}

        {isHouseRulesModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in p-4">
            <div className="bg-slate-900/95 border border-slate-700 rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto relative">
              
              <div className="sticky top-0 bg-slate-900/95 pt-2 pb-4 border-b border-slate-700/50 flex justify-between items-center z-10">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight drop-shadow-md flex items-center gap-2">
                  <ShieldCheck className="text-amber-500"/> Official House Rules
                </h2>
                <button onClick={() => setIsHouseRulesModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="space-y-6 text-sm text-slate-300">
                
                <div className="bg-slate-950/50 p-2 rounded border-l-4 border-emerald-500 mt-2">
                  <span className="text-emerald-400 font-black uppercase tracking-widest text-xs">Phase I: High School & Recruiting</span>
                </div>

                <div className="space-y-1.5 pl-2">
                  <h3 className="text-white font-black uppercase tracking-widest text-xs">1. The Authentic Target Board</h3>
                  <p className="text-slate-400">You must commit to a school from our pre-established 10-school target board (e.g., Toledo, Eastern Michigan, Ball State). If Alabama or Georgia offers your 3-star recruit, you must decline. Stick to the Midwest pipeline.</p>
                </div>
                
                <div className="space-y-1.5 pl-2">
                  <h3 className="text-white font-black uppercase tracking-widest text-xs">2. Authentic Skill Growth</h3>
                  <p className="text-slate-400">In High School, you cannot pump skill points into Throw Power. You must prioritize awareness, short accuracy, and break sack to reflect a scrappy, high-IQ senior. Do not upgrade Throw Power past an 83 overall until your sophomore year of college.</p>
                </div>

                <div className="bg-slate-950/50 p-2 rounded border-l-4 border-amber-500 mt-6">
                  <span className="text-amber-500 font-black uppercase tracking-widest text-xs">Phase II: Campus Life & The Grind</span>
                </div>

                <div className="space-y-1.5 pl-2">
                  <h3 className="text-white font-black uppercase tracking-widest text-xs">3. Practice Makes Permanent</h3>
                  <p className="text-slate-400">Never restart position battles or weekly practice drills. You get one shot per week to impress the coaching staff. If you throw two picks in a position battle and lose the starting job, you ride the bench.</p>
                </div>

                <div className="space-y-1.5 pl-2">
                  <h3 className="text-white font-black uppercase tracking-widest text-xs">4. Student-Athlete Priority</h3>
                  <p className="text-slate-400">As a future coach, academics and leadership come first. Balance NIL opportunities with your Academic GPA. If your GPA drops below a 2.0 due to chasing brand deals, you must bench yourself for the entire first quarter of your next game.</p>
                </div>

                <div className="space-y-1.5 pl-2">
                  <h3 className="text-white font-black uppercase tracking-widest text-xs">5. Wear & Tear Reality</h3>
                  <p className="text-slate-400">If any body part hits the "Red" zone on your Wear & Tear monitor, you MUST sub yourself out for the remainder of the half, or sit the next game. Respect college injuries.</p>
                </div>

                <div className="bg-slate-950/50 p-2 rounded border-l-4 border-blue-500 mt-6">
                  <span className="text-blue-400 font-black uppercase tracking-widest text-xs">Phase III: Dynasty Bridge</span>
                </div>

                <div className="space-y-1.5 pl-2">
                  <h3 className="text-white font-black uppercase tracking-widest text-xs">6. Recruiting & Pipeline Restrictions</h3>
                  <p className="text-slate-400">As a 1–2★ program coordinator, you may only recruit players within your home state and primary pipeline states. You cannot target 5-star recruits until your program reaches at least 4-star prestige.</p>
                </div>

                <div className="space-y-1.5 pl-2">
                  <h3 className="text-white font-black uppercase tracking-widest text-xs">7. The Fog of War</h3>
                  <p className="text-slate-400">Limit your scouting to exactly 50% per recruit prior to extending a scholarship offer. You must commit scholarships based on raw potential rather than knowing every attribute up front.</p>
                </div>

                <div className="space-y-1.5 pl-2">
                  <h3 className="text-white font-black uppercase tracking-widest text-xs">8. The Alma Mater OC</h3>
                  <p className="text-slate-400">You must create a custom Offensive Coordinator in Dynasty Mode matching your RTG player's name and hometown. You must replace the current OC at your graduating alma mater. Do not start as a Head Coach.</p>
                </div>

                <div className="space-y-1.5 pl-2">
                  <h3 className="text-white font-black uppercase tracking-widest text-xs">9. Scheme Inheritance</h3>
                  <p className="text-slate-400">When transitioning to OC, you must adopt the offensive playbook of the coach you played under in RTG. You cannot drastically overhaul the scheme until you become a Head Coach.</p>
                </div>

                <div className="space-y-1.5 pl-2">
                  <h3 className="text-white font-black uppercase tracking-widest text-xs">10. Narrative Acceptance</h3>
                  <p className="text-slate-400">If you have a 4-interception game that costs your team a bowl bid, accept it. It becomes part of your backstory—a gritty player who learned hard lessons that ultimately made him a smarter Offensive Coordinator.</p>
                </div>
              </div>
              
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center mt-6">
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Enforce these rules manually in your gameplay to maintain absolute immersion.</p>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;

