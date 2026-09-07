import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { appId, db } from '../firebase';
import { DEFAULT_CAREER_STATE } from '../domain/defaultCareerState';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './fresh-start.css';

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const deepClone = (value) => JSON.parse(JSON.stringify(value));
const safeEpisodeId = (episodeId) => String(episodeId || '').replaceAll('/', '-').slice(0, 180);

const clearIndexedDbStore = (databaseName, storeName) => new Promise((resolve) => {
  if (typeof indexedDB === 'undefined') {
    resolve();
    return;
  }

  const request = indexedDB.open(databaseName);
  request.onerror = () => resolve();
  request.onupgradeneeded = () => undefined;
  request.onsuccess = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(storeName)) {
      database.close();
      resolve();
      return;
    }

    try {
      const transaction = database.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).clear();
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        resolve();
      };
    } catch {
      database.close();
      resolve();
    }
  };
});

const clearDynastyHqBrowserStorage = async () => {
  [window.localStorage, window.sessionStorage].forEach((storage) => {
    try {
      const keys = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key && key.toLowerCase().startsWith('dynastyhq:')) keys.push(key);
      }
      keys.forEach((key) => storage.removeItem(key));
    } catch {
      // Local cleanup is best-effort and should never block the cloud reset.
    }
  });

  await Promise.all([
    clearIndexedDbStore('DynastyHQPodcastDB', 'episodeAudio'),
    clearIndexedDbStore('DynastyHQAudioDB', 'audioStore'),
  ]);
};

const deleteCollectionDocs = async (collectionRef) => {
  const snapshot = await getDocs(collectionRef);
  for (const entry of snapshot.docs) await deleteDoc(entry.ref);
};

const resetOwnerCareer = async ({ userId, career }) => {
  if (!db || !userId) throw new Error('DynastyHQ cloud save is not available.');

  const episodeIds = [...new Set((Array.isArray(career?.podcastEpisodes) ? career.podcastEpisodes : [])
    .flatMap((episode) => [episode?.id, episode?.episodeId])
    .map(clean)
    .filter(Boolean))];

  for (const episodeId of episodeIds) {
    const safeId = safeEpisodeId(episodeId);
    await deleteCollectionDocs(collection(db, 'artifacts', appId, 'users', userId, 'podcast_audio', safeId, 'segments'));
    await deleteCollectionDocs(collection(db, 'artifacts', appId, 'public', 'data', `shared_podcast_${userId}_${safeId}`));
  }

  await deleteCollectionDocs(collection(db, 'artifacts', appId, 'users', userId, 'hq_audio'));

  const hqData = await getDocs(collection(db, 'artifacts', appId, 'users', userId, 'hq_data'));
  for (const entry of hqData.docs) {
    if (entry.id !== 'main') await deleteDoc(entry.ref);
  }

  await clearDynastyHqBrowserStorage();

  const now = new Date().toISOString();
  const freshState = deepClone(DEFAULT_CAREER_STATE);
  freshState._sync = {
    revision: Math.max(1, Number(career?._sync?.revision) + 1 || 1),
    deviceId: 'fresh-rtg-start',
    updatedAt: now,
  };

  await setDoc(
    doc(db, 'artifacts', appId, 'users', userId, 'hq_data', 'main'),
    freshState,
    { merge: false },
  );
};

const FreshStartPortal = () => {
  const { user, career } = useOwnerCareer();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const canConfirm = useMemo(() => confirmation.trim().toUpperCase() === 'FRESH START', [confirmation]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    const relabelResetButton = () => {
      [...root.querySelectorAll('button')].forEach((button) => {
        if (!/factory reset database|start new rtg career/i.test(clean(button.textContent))) return;
        button.dataset.dhqFreshStart = 'true';
        [...button.childNodes].forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && /factory reset database/i.test(node.textContent || '')) {
            node.textContent = ' Start New RTG Career';
          }
        });
      });
    };

    const capture = (event) => {
      const button = event.target?.closest?.('button');
      if (!button) return;
      if (!button.dataset.dhqFreshStart && !/factory reset database|start new rtg career/i.test(clean(button.textContent))) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      setMessage('');
      setConfirmation('');
      setOpen(true);
    };

    relabelResetButton();
    const observer = new MutationObserver(relabelResetButton);
    observer.observe(root, { childList: true, subtree: true });
    root.addEventListener('click', capture, true);

    return () => {
      observer.disconnect();
      root.removeEventListener('click', capture, true);
    };
  }, []);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setConfirmation('');
    setMessage('');
  };

  const confirm = async () => {
    if (!canConfirm || busy || !user) return;
    setBusy(true);
    setMessage('Clearing the current career and rebuilding a blank High School save…');

    try {
      await resetOwnerCareer({ userId: user.uid, career });
      setMessage('Fresh RTG career created. Reloading DynastyHQ…');
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setMessage(error?.message || 'DynastyHQ could not complete the fresh-start reset.');
      setBusy(false);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="dhq-fresh-start" role="dialog" aria-modal="true" aria-labelledby="dhq-fresh-start-title">
      <div className="dhq-fresh-start__backdrop" onClick={close} />
      <section className="dhq-fresh-start__panel">
        <button className="dhq-fresh-start__close" type="button" onClick={close} disabled={busy} aria-label="Close fresh start dialog">
          <X size={18} />
        </button>

        <div className="dhq-fresh-start__eyebrow"><RotateCcw size={15} /> NEW ROAD TO GLORY</div>
        <h2 id="dhq-fresh-start-title">START LIKE A NEW USER.</h2>
        <p className="dhq-fresh-start__lead">Your DynastyHQ account and the new site design stay. The current career does not.</p>

        <div className="dhq-fresh-start__warning">
          <AlertTriangle size={21} />
          <div>
            <strong>This permanently resets the current RTG save.</strong>
            <span>Games, stats, recruiting, Chronicle entries, Newsroom issues, Game Hubs, milestones, podcast episodes, progression, weekly drafts, and career-linked companion data will be cleared.</span>
          </div>
        </div>

        <div className="dhq-fresh-start__result">
          <ShieldCheck size={19} />
          <div>
            <strong>Where you will land</strong>
            <span>Player career · High School · Season 1 · Week 1 · uncommitted · no prior history.</span>
          </div>
        </div>

        <label className="dhq-fresh-start__confirm">
          <span>Type <b>FRESH START</b> to confirm</span>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="FRESH START"
            autoComplete="off"
            disabled={busy}
          />
        </label>

        {message ? <p className={busy ? 'is-working' : 'is-error'}>{message}</p> : null}

        <div className="dhq-fresh-start__actions">
          <button type="button" className="is-danger" disabled={!canConfirm || busy || !user} onClick={confirm}>
            <RotateCcw size={15} /> {busy ? 'RESETTING…' : 'START FRESH RTG'}
          </button>
          <button type="button" className="is-secondary" disabled={busy} onClick={close}>KEEP CURRENT CAREER</button>
        </div>
      </section>
    </div>,
    document.body,
  );
};

export default FreshStartPortal;
