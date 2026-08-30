import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { CheckCircle2, Copy, ExternalLink, Loader2, Settings2, Share2, ShieldCheck, Trash2 } from 'lucide-react';
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
const LEGACY_REVOKE_LABEL = 'Revoke Public Link';

const PublicMediaProfileSharePortal = () => {
  const { user, career, ready } = useOwnerCareer();
  const [shareMounts, setShareMounts] = useState([]);
  const [manageMounts, setManageMounts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState({ open: false, url: '', status: '' });

  useEffect(() => {
    const ensureMount = (button, kind) => {
      button.dataset.dhqLegacyWholeShare = 'true';
      button.style.setProperty('display', 'none', 'important');
      const selector = `:scope > [data-dhq-media-share-mount="${kind}"]`;
      let mount = button.parentElement?.querySelector(selector);
      if (!mount && button.parentElement) {
        mount = document.createElement('span');
        mount.dataset.dhqMediaShareMount = kind;
        mount.className = 'contents';
        button.insertAdjacentElement('afterend', mount);
      }
    };

    const refresh = () => {
      document.querySelectorAll('button').forEach((button) => {
        const label = normalize(button.textContent);
        if (label === LEGACY_SHARE_LABEL) ensureMount(button, 'share');
        if (label === LEGACY_REVOKE_LABEL) ensureMount(button, 'manage');
      });
      const nextShare = [...document.querySelectorAll('[data-dhq-media-share-mount="share"]')];
      const nextManage = [...document.querySelectorAll('[data-dhq-media-share-mount="manage"]')];
      setShareMounts((current) => current.length === nextShare.length && current.every((node, index) => node === nextShare[index]) ? current : nextShare);
      setManageMounts((current) => current.length === nextManage.length && current.every((node, index) => node === nextManage[index]) ? current : nextManage);
    };

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.querySelectorAll('[data-dhq-media-share-mount]').forEach((node) => node.remove());
      document.querySelectorAll('[data-dhq-legacy-whole-share="true"]').forEach((button) => {
        button.style.removeProperty('display');
        delete button.dataset.dhqLegacyWholeShare;
      });
    };
  }, []);

  const publicUrl = useMemo(() => {
    if (!user?.uid) return '';
    const url = new URL(window.location.href);
    const previewShareToken = url.searchParams.get('_vercel_share');
    url.search = '';
    url.hash = '';
    url.searchParams.set('media', user.uid);
    if (previewShareToken) url.searchParams.set('_vercel_share', previewShareToken);
    return url.toString();
  }, [user?.uid]);

  const deleteCollectionDocs = async (collectionRef) => {
    const snapshot = await getDocs(collectionRef).catch(() => null);
    if (!snapshot) return;
    for (const entry of snapshot.docs) await deleteDoc(entry.ref).catch(() => {});
  };

  const retireLegacyWholeCareerShare = async () => {
    if (!db || !user?.uid) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_dynasties', user.uid)).catch(() => {});
    await deleteCollectionDocs(collection(db, 'artifacts', appId, 'public', 'data', `shared_audio_${user.uid}`));
  };

  const syncPublicPodcastAudio = async () => {
    if (!db || !user?.uid) return;
    for (const episode of (career?.podcastEpisodes || []).filter((entry) => entry?.audioStatus === 'ready' && entry?.id)) {
      const segments = await loadPodcastAudioLocal(episode.id)
        || await loadPodcastAudioCloud({ db, appId, userId: user.uid, episodeId: episode.id });
      if (segments?.length) {
        await savePublicPodcastAudio({ db, appId, ownerId: user.uid, episodeId: episode.id, segments });
      }
    }
  };

  const deletePublicPodcastAudio = async () => {
    if (!db || !user?.uid) return;
    for (const episode of (career?.podcastEpisodes || []).filter((entry) => entry?.id)) {
      const episodeId = String(episode.id).replaceAll('/', '-').slice(0, 180);
      await deleteCollectionDocs(collection(db, 'artifacts', appId, 'public', 'data', `shared_podcast_${user.uid}_${episodeId}`));
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

      // The profile itself is ready as soon as the scoped Firestore snapshot lands.
      // Do not make the owner wait for every podcast audio chunk or legacy cleanup
      // before exposing the link; those can safely finish after the page is usable.
      setModal({
        open: true,
        url: publicUrl,
        status: 'Media Profile ready. Podcast audio is finishing its public sync in the background.',
      });
      setBusy(false);

      void Promise.all([
        syncPublicPodcastAudio(),
        retireLegacyWholeCareerShare(),
      ]).then(() => {
        setModal((current) => current.open && current.url === publicUrl
          ? { ...current, status: 'Media Profile ready — only Player Stats, Newsroom, and Podcast are public.' }
          : current);
      }).catch(() => {
        setModal((current) => current.open && current.url === publicUrl
          ? { ...current, status: 'Media Profile is live. One or more podcast audio files are still unavailable; publishing again will retry them.' }
          : current);
      });
    } catch (error) {
      setModal({ open: true, url: '', status: error?.message || 'The Media Profile link could not be created. Try again.' });
      setBusy(false);
    }
  };

  const openManager = () => {
    setModal({
      open: true,
      url: publicUrl,
      status: 'Manage your scoped Media Profile. Publishing again refreshes it from your current DynastyHQ data.',
    });
  };

  const revoke = async () => {
    if (!db || !user?.uid || busy) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_media_profiles', user.uid));
      await deletePublicPodcastAudio();
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

  const manageButton = (key) => (
    <button
      key={key}
      type="button"
      onClick={openManager}
      disabled={!ready || !career || busy}
      className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600"
    >
      <Settings2 size={14} /> Manage Media Profile
    </button>
  );

  return (
    <>
      {shareMounts.map((mount, index) => createPortal(shareButton(`media-share-${index}`), mount))}
      {manageMounts.map((mount, index) => createPortal(manageButton(`media-manage-${index}`), mount))}
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
                  <button type="button" onClick={revoke} disabled={busy} className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-red-300"><Trash2 size={14} /> Revoke Profile</button>
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
