import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { CheckCircle2, Copy, ExternalLink, Loader2, Share2, ShieldCheck, Trash2 } from 'lucide-react';
import { appId, db } from '../firebase';
import { buildPublicNewsroomMediaLibrary } from '../domain/newsroomMedia';
import { buildPublicMediaProfileSnapshot } from '../domain/publicMediaProfile';
import {
  loadPodcastAudioCloud,
  loadPodcastAudioLocal,
  savePublicPodcastAudio,
} from '../services/podcastAudioStorage';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const LEGACY_SHARE_LABEL = 'Get Share Link';

const PublicMediaProfileSharePortal = () => {
  const { user, career, ready } = useOwnerCareer();
  const [mounts, setMounts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState({ open: false, url: '', status: '' });

  useEffect(() => {
    const refresh = () => {
      document.querySelectorAll('button').forEach((button) => {
        if (normalize(button.textContent) !== LEGACY_SHARE_LABEL) return;
        button.dataset.dhqLegacyWholeShare = 'true';
        button.style.setProperty('display', 'none', 'important');
        let mount = button.parentElement?.querySelector(':scope > [data-dhq-media-share-mount="true"]');
        if (!mount && button.parentElement) {
          mount = document.createElement('span');
          mount.dataset.dhqMediaShareMount = 'true';
          mount.className = 'contents';
          button.insertAdjacentElement('afterend', mount);
        }
      });
      const next = [...document.querySelectorAll('[data-dhq-media-share-mount="true"]')];
      setMounts((current) => current.length === next.length && current.every((node, index) => node === next[index]) ? current : next);
    };

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.querySelectorAll('[data-dhq-media-share-mount="true"]').forEach((node) => node.remove());
      document.querySelectorAll('[data-dhq-legacy-whole-share="true"]').forEach((button) => {
        button.style.removeProperty('display');
        delete button.dataset.dhqLegacyWholeShare;
      });
    };
  }, []);

  const publicUrl = useMemo(() => {
    if (!user?.uid) return '';
    const base = window.location.href.split('?')[0];
    return `${base}?media=${encodeURIComponent(user.uid)}`;
  }, [user?.uid]);

  const retireLegacyWholeCareerShare = async () => {
    if (!db || !user?.uid) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_dynasties', user.uid)).catch(() => {});
    const legacyAudio = collection(db, 'artifacts', appId, 'public', 'data', `shared_audio_${user.uid}`);
    const snapshot = await getDocs(legacyAudio).catch(() => null);
    if (snapshot) {
      for (const entry of snapshot.docs) await deleteDoc(entry.ref).catch(() => {});
    }
  };

  const publish = async () => {
    if (!db || !user || !career || busy) return;
    setBusy(true);
    setModal({ open: true, url: '', status: 'Preparing your public Media Profile…' });
    try {
      const publicMediaLibrary = buildPublicNewsroomMediaLibrary({
        issues: career.newsroomIssues || [],
        frontPages: career.postgameFrontPages || [],
        mediaLibrary: career.newsroomMediaLibrary || [],
      });
      const snapshot = buildPublicMediaProfileSnapshot({ state: career, mediaLibrary: publicMediaLibrary });
      const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'shared_media_profiles', user.uid);
      await setDoc(profileRef, snapshot);

      for (const episode of (career.podcastEpisodes || []).filter((entry) => entry?.audioStatus === 'ready' && entry?.id)) {
        const segments = await loadPodcastAudioLocal(episode.id)
          || await loadPodcastAudioCloud({ db, appId, userId: user.uid, episodeId: episode.id });
        if (segments?.length) {
          await savePublicPodcastAudio({ db, appId, ownerId: user.uid, episodeId: episode.id, segments });
        }
      }

      await retireLegacyWholeCareerShare();
      setModal({ open: true, url: publicUrl, status: 'Media Profile ready — only Player Stats, Newsroom, and Podcast are public.' });
    } catch (error) {
      setModal({ open: true, url: '', status: error?.message || 'The Media Profile link could not be created. Try again.' });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!db || !user?.uid || busy) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_media_profiles', user.uid));
      setModal({ open: true, url: '', status: 'Media Profile revoked. Your private DynastyHQ save was not changed.' });
    } catch {
      setModal((current) => ({ ...current, status: 'The Media Profile could not be revoked. Try again.' }));
    } finally {
      setBusy(false);
    }
  };

  const shareButton = (key) => (
    <button
      key={key}
      type="button"
      onClick={publish}
      disabled={!ready || !career || busy}
      className="flex items-center gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-600"
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
      {busy ? 'Publishing…' : 'Share Media Profile'}
    </button>
  );

  return (
    <>
      {mounts.map((mount, index) => createPortal(shareButton(`media-share-${index}`), mount))}
      {modal.open ? createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-950 p-7 shadow-2xl">
            <div className="text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-300"><ShieldCheck size={24} /></span>
              <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-white">Public Media Profile</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{modal.status}</p>
            </div>

            {modal.url ? (
              <>
                <div className="mt-6 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <input value={modal.url} readOnly className="min-w-0 flex-1 bg-transparent text-xs font-mono text-emerald-300 outline-none" />
                  <button type="button" onClick={() => navigator.clipboard.writeText(modal.url)} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white hover:bg-slate-700" aria-label="Copy Media Profile link"><Copy size={15} /></button>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => window.open(modal.url, '_blank', 'noopener,noreferrer')} className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-950"><ExternalLink size={14} /> Open Public Profile</button>
                  <button type="button" onClick={revoke} disabled={busy} className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-red-300"><Trash2 size={14} /> Revoke Link</button>
                </div>
              </>
            ) : busy ? <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-slate-400"><Loader2 size={16} className="animate-spin" /> Publishing shared media…</div> : <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-slate-400"><CheckCircle2 size={16} /> No public link is active.</div>}

            <button type="button" onClick={() => setModal({ open: false, url: '', status: '' })} className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:bg-slate-800">Close</button>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
};

export default PublicMediaProfileSharePortal;
