import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Sparkles, Volume2, X } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { appId, auth, db } from '../firebase';
import { generateHumanizedPodcastMix } from '../services/podcastClient';
import { savePodcastAudioCloud, savePodcastAudioLocal } from '../services/podcastAudioStorage';
import { PODCAST_SHOW } from '../domain/podcastShow';

const DEVICE_ID = globalThis.crypto?.randomUUID?.() || 'podcast-humanized-audio-v3';
const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const podcastStudioIsVisible = () => [...document.querySelectorAll('h1')]
  .some((heading) => String(heading.textContent || '').trim() === PODCAST_SHOW.name);

const episodeLabel = (episode) => {
  const season = Number(episode?.season) || 1;
  const week = Math.max(0, Number(episode?.week) || 0);
  const title = String(episode?.title || '').trim();
  return `S${season} · W${week}${title ? ` — ${title}` : ''}`;
};

const episodeTimestamp = (episode) => {
  const value = Date.parse(String(episode?.generatedAt || episode?.capturedAt || ''));
  return Number.isFinite(value) ? value : 0;
};

const transcriptFingerprint = (episode) => {
  const source = (episode?.segments || [])
    .map((segment) => `${String(segment?.hostId || '')}\n${String(segment?.text || '').trim()}`)
    .join('\n---\n');
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

const PodcastHumanizedAudioPortal = () => {
  const [user, setUser] = useState(auth.currentUser || null);
  const [career, setCareer] = useState(null);
  const [visible, setVisible] = useState(false);
  const [selectedPublicationId, setSelectedPublicationId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [dismissed, setDismissed] = useState(false);
  const [liveEpisodes, setLiveEpisodes] = useState({});

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    const check = () => setVisible(podcastStudioIsVisible());
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const capture = (event) => {
      const publicationId = String(event?.detail?.publicationId || event?.detail?.episode?.publicationId || '').trim();
      const episode = event?.detail?.episode;
      if (!publicationId || !episode || !Array.isArray(episode.segments)) return;
      const capturedAt = event?.detail?.capturedAt || new Date().toISOString();
      setLiveEpisodes((current) => ({
        ...current,
        [publicationId]: {
          ...episode,
          id: episode.id || `podcast-${publicationId}`,
          publicationId,
          generatedAt: episode.generatedAt || capturedAt,
          capturedAt,
        },
      }));
    };
    window.addEventListener('dynastyhq:podcast-script-generated', capture);
    return () => window.removeEventListener('dynastyhq:podcast-script-generated', capture);
  }, []);

  useEffect(() => {
    if (!user || !db) {
      setCareer(null);
      return undefined;
    }
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    return onSnapshot(ref, (snapshot) => {
      setCareer(snapshot.exists() ? snapshot.data() : null);
    });
  }, [user]);

  const episodes = useMemo(() => (career?.podcastEpisodes || [])
    .filter((episode) => Array.isArray(episode?.segments) && episode.segments.length >= 8), [career?.podcastEpisodes]);

  useEffect(() => {
    if (!episodes.length) {
      setSelectedPublicationId('');
      return;
    }
    if (!episodes.some((episode) => episode.publicationId === selectedPublicationId)) {
      setSelectedPublicationId(episodes[episodes.length - 1].publicationId);
    }
  }, [episodes, selectedPublicationId]);

  const selectedEpisode = episodes.find((episode) => episode.publicationId === selectedPublicationId) || null;

  const waitForLatestCommittedEpisode = async (publicationId) => {
    if (!user || !db) return null;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    const baselineRevision = Number(career?._sync?.revision) || 0;
    let latestEpisode = selectedEpisode;

    // Transcript generation and cloud persistence run on separate UI/state paths. Give
    // a just-finished script save a short window to land before we bind expensive TTS.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        const state = snapshot.data();
        const candidate = (state.podcastEpisodes || []).find((episode) => episode.publicationId === publicationId) || null;
        if (candidate && episodeTimestamp(candidate) >= episodeTimestamp(latestEpisode)) latestEpisode = candidate;
        const revision = Number(state?._sync?.revision) || 0;
        if (revision > baselineRevision) return latestEpisode;
      }
      if (attempt < 4) await sleep(300);
    }
    return latestEpisode;
  };

  const patchEpisodeStatus = async (publicationId, patch) => {
    if (!user || !db) return null;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('Your DynastyHQ career could not be loaded.');
      const state = snapshot.data();
      const episodesNow = state.podcastEpisodes || [];
      const currentEpisode = episodesNow.find((episode) => episode.publicationId === publicationId);
      if (!currentEpisode) throw new Error('That podcast episode is no longer available.');
      const patchedEpisode = { ...currentEpisode, ...patch };
      const revision = (Number(state?._sync?.revision) || 0) + 1;
      transaction.set(ref, {
        ...state,
        podcastEpisodes: episodesNow.map((episode) => episode.publicationId === publicationId
          ? patchedEpisode
          : episode),
        _sync: { revision, deviceId: DEVICE_ID, updatedAt: new Date().toISOString() },
      });
      return patchedEpisode;
    });
  };

  const regenerate = async () => {
    if (!user || !selectedEpisode || busy) return;
    if (user.isAnonymous) {
      setMessageType('error');
      setMessage('Sign in with your normal DynastyHQ account before regenerating cloud podcast audio.');
      return;
    }

    const publicationId = selectedEpisode.publicationId;
    const previousAudioStatus = selectedEpisode.audioStatus || 'not-generated';
    setBusy(true);
    setMessage('Checking the newest saved transcript…');
    try {
      const settledEpisode = await waitForLatestCommittedEpisode(publicationId);
      const committedEpisode = await patchEpisodeStatus(publicationId, {
        audioStatus: 'rendering-v3',
        audioEngine: 'gemini-multispeaker-v3',
      });
      const liveEpisode = liveEpisodes[publicationId] || null;
      const candidates = [settledEpisode, committedEpisode, liveEpisode].filter(Boolean);
      const renderEpisode = candidates.sort((a, b) => episodeTimestamp(b) - episodeTimestamp(a))[0] || null;

      if (!renderEpisode || !Array.isArray(renderEpisode.segments) || renderEpisode.segments.length < 8) {
        throw new Error('The newest saved podcast transcript could not be resolved for audio rendering.');
      }

      const fingerprint = transcriptFingerprint(renderEpisode);
      const idToken = await user.getIdToken();
      setMessage('Rendering the newest transcript with Mark + Sarah…');
      const rendered = await generateHumanizedPodcastMix({ idToken, episode: renderEpisode });
      if (!rendered.pieces?.length) throw new Error('The humanized renderer returned no playable audio.');

      const episodeId = renderEpisode.id || `podcast-${publicationId}`;
      await savePodcastAudioLocal(episodeId, rendered.pieces);
      await savePodcastAudioCloud({
        db,
        appId,
        userId: user.uid,
        episodeId,
        segments: rendered.pieces,
      });

      const generatedAt = new Date().toISOString();
      await patchEpisodeStatus(publicationId, {
        status: 'published',
        audioStatus: 'ready',
        audioModel: rendered.model || 'gemini-3.1-flash-tts-preview',
        audioEngine: rendered.engine || 'gemini-multispeaker-v3',
        audioSegmentCount: rendered.pieces.length,
        audioGeneratedAt: generatedAt,
        audioTranscriptFingerprint: fingerprint,
      });

      setMessageType('success');
      setMessage('Humanized Mark + Sarah mix is ready and bound to the newest transcript. The player will reload the new audio automatically.');
    } catch (error) {
      try {
        await patchEpisodeStatus(publicationId, { audioStatus: previousAudioStatus });
      } catch {
        // Keep the useful generation error below even if restoring the status fails.
      }
      setMessageType('error');
      setMessage(error?.message || 'The humanized podcast audio could not be generated.');
    } finally {
      setBusy(false);
    }
  };

  if (!visible || dismissed || !user || !episodes.length) return null;

  return (
    <aside className="fixed bottom-5 right-5 z-[120] w-[min(390px,calc(100vw-2rem))] rounded-2xl border border-cyan-400/35 bg-slate-950/95 p-4 shadow-2xl shadow-slate-950/70 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
          <Volume2 size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">Podcast v3</p>
              <h3 className="text-sm font-black text-white">Humanized Audio</h3>
            </div>
            <button type="button" aria-label="Hide Humanized Audio control" onClick={() => setDismissed(true)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white">
              <X size={15} />
            </button>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">Re-render the newest saved transcript as one shared Mark + Sarah studio performance using Gemini multi-speaker TTS.</p>
        </div>
      </div>

      {episodes.length > 1 && (
        <select value={selectedPublicationId} onChange={(event) => setSelectedPublicationId(event.target.value)} disabled={busy} className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-cyan-400">
          {[...episodes].reverse().map((episode) => (
            <option key={episode.publicationId} value={episode.publicationId}>{episodeLabel(episode)}</option>
          ))}
        </select>
      )}

      <button type="button" onClick={regenerate} disabled={busy || !selectedEpisode} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
        {busy ? 'Rendering Humanized Mix…' : 'Regenerate Humanized Audio'}
      </button>

      <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
        <Sparkles size={11} /> Gemini two-speaker performance · newest transcript bound
      </div>

      {message && (
        <p className={`mt-3 rounded-xl border p-3 text-[11px] font-semibold leading-5 ${messageType === 'error' ? 'border-red-500/30 bg-red-950/40 text-red-200' : 'border-emerald-500/30 bg-emerald-950/35 text-emerald-200'}`}>{message}</p>
      )}
    </aside>
  );
};

export default PodcastHumanizedAudioPortal;
