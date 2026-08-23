import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, FileText, Loader2, RefreshCw, Sparkles, Volume2 } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { appId, auth, db } from '../firebase';
import { generateHumanizedPodcastMix, generatePodcastScript } from '../services/podcastClient';
import { savePodcastAudioCloud, savePodcastAudioLocal } from '../services/podcastAudioStorage';
import { buildPodcastGenerationPayload, normalizeGeneratedPodcast } from '../domain/podcastEngine';
import { PODCAST_SHOW } from '../domain/podcastShow';

const DEVICE_ID = globalThis.crypto?.randomUUID?.() || 'podcast-humanized-audio-v3';
const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const matchesPublication = (entry, publicationId) => entry?.publicationId === publicationId || entry?.id === publicationId;
const publicationIdFor = (entry) => String(entry?.publicationId || entry?.id || '').trim();

const podcastStudioIsVisible = () => [...document.querySelectorAll('h1')]
  .some((heading) => String(heading.textContent || '').trim() === PODCAST_SHOW.name);

const weekLabel = (issue, episode = null) => {
  const season = Number(issue?.season || episode?.season) || 1;
  const week = Math.max(0, Number(issue?.week ?? episode?.week) || 0);
  const title = String(episode?.title || issue?.label || issue?.weekLabel || '').trim();
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
  const [expanded, setExpanded] = useState(false);
  const [selectedPublicationId, setSelectedPublicationId] = useState('');
  const [operation, setOperation] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [liveEpisodes, setLiveEpisodes] = useState({});

  const busy = Boolean(operation);
  const transcriptBusy = operation === 'transcript';
  const audioBusy = operation === 'audio';

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    const check = () => {
      const nextVisible = podcastStudioIsVisible();
      setVisible(nextVisible);
      if (!nextVisible) setExpanded(false);
    };
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
    return onSnapshot(ref, (snapshot) => setCareer(snapshot.exists() ? snapshot.data() : null));
  }, [user]);

  const issues = useMemo(() => (career?.newsroomIssues || [])
    .filter((issue) => publicationIdFor(issue) && issue?.podcastBrief), [career?.newsroomIssues]);
  const episodes = useMemo(() => (career?.podcastEpisodes || [])
    .filter((episode) => publicationIdFor(episode) && Array.isArray(episode?.segments) && episode.segments.length >= 8), [career?.podcastEpisodes]);
  const episodeByPublication = useMemo(() => new Map(episodes.map((episode) => [episode.publicationId, episode])), [episodes]);

  useEffect(() => {
    if (!issues.length) {
      setSelectedPublicationId('');
      return;
    }
    if (!issues.some((issue) => publicationIdFor(issue) === selectedPublicationId)) {
      setSelectedPublicationId(publicationIdFor(issues[issues.length - 1]));
    }
  }, [issues, selectedPublicationId]);

  const selectedIssue = issues.find((issue) => publicationIdFor(issue) === selectedPublicationId) || null;
  const selectedEpisode = episodeByPublication.get(selectedPublicationId) || liveEpisodes[selectedPublicationId] || null;
  const selectedNoEpisode = selectedIssue?.podcastCoverageStatus === 'no-episode';

  const waitForLatestCommittedEpisode = async (publicationId) => {
    if (!user || !db) return null;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    const baselineRevision = Number(career?._sync?.revision) || 0;
    let latestEpisode = selectedEpisode;
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
        podcastEpisodes: episodesNow.map((episode) => episode.publicationId === publicationId ? patchedEpisode : episode),
        _sync: { revision, deviceId: DEVICE_ID, updatedAt: new Date().toISOString() },
      });
      return patchedEpisode;
    });
  };

  const replaceEpisodeTranscript = async (publicationId, nextEpisode) => {
    if (!user || !db) return null;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('Your DynastyHQ career could not be loaded.');
      const state = snapshot.data();
      const episodesNow = state.podcastEpisodes || [];
      const existingIndex = episodesNow.findIndex((episode) => episode.publicationId === publicationId);
      const nextEpisodes = existingIndex >= 0
        ? episodesNow.map((episode, index) => index === existingIndex ? nextEpisode : episode)
        : [...episodesNow, nextEpisode];
      const now = new Date().toISOString();
      const revision = (Number(state?._sync?.revision) || 0) + 1;
      transaction.set(ref, {
        ...state,
        podcastEpisodes: nextEpisodes,
        newsroomIssues: (state.newsroomIssues || []).map((issue) => matchesPublication(issue, publicationId)
          ? { ...issue, podcastCoverageStatus: 'scripted', podcastCoverageReason: '', podcastCoverageAt: now }
          : issue),
        _sync: { revision, deviceId: DEVICE_ID, updatedAt: now },
      });
      return nextEpisode;
    });
  };

  const markNoEpisode = async (publicationId, reason) => {
    if (!user || !db) return;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('Your DynastyHQ career could not be loaded.');
      const state = snapshot.data();
      const revision = (Number(state?._sync?.revision) || 0) + 1;
      const now = new Date().toISOString();
      transaction.set(ref, {
        ...state,
        podcastEpisodes: (state.podcastEpisodes || []).filter((episode) => episode.publicationId !== publicationId),
        newsroomIssues: (state.newsroomIssues || []).map((issue) => matchesPublication(issue, publicationId)
          ? { ...issue, podcastCoverageStatus: 'no-episode', podcastCoverageReason: reason, podcastCoverageAt: now }
          : issue),
        _sync: { revision, deviceId: DEVICE_ID, updatedAt: now },
      });
    });
  };

  const regenerateTranscript = async () => {
    if (!user || !selectedIssue || !selectedPublicationId || busy) return;
    if (user.isAnonymous) {
      setMessageType('error');
      setMessage('Sign in with your normal DynastyHQ account before generating the podcast transcript.');
      return;
    }

    const publicationId = selectedPublicationId;
    setOperation('transcript');
    setMessageType('success');
    setMessage('Checking whether this week deserves a show…');
    try {
      const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
      const snapshot = await getDoc(ref);
      if (!snapshot.exists()) throw new Error('Your DynastyHQ career could not be loaded.');
      const latestState = snapshot.data();
      const payload = buildPodcastGenerationPayload(latestState, publicationId);
      setMessage('Writing a fresh grounded transcript…');
      const idToken = await user.getIdToken();
      const generated = await generatePodcastScript({ idToken, payload, prepareAudio: false });
      const normalized = normalizeGeneratedPodcast({ generated: generated.episode, payload, model: generated.model });
      const nextEpisode = {
        ...normalized,
        status: 'scripted',
        audioStatus: 'not-generated',
        audioModel: '',
        audioEngine: '',
        audioContinuous: false,
        audioSegmentCount: 0,
        audioGeneratedAt: '',
        audioTranscriptFingerprint: '',
      };

      await replaceEpisodeTranscript(publicationId, nextEpisode);
      const capturedAt = new Date().toISOString();
      setLiveEpisodes((current) => ({ ...current, [publicationId]: { ...nextEpisode, capturedAt } }));
      window.dispatchEvent(new CustomEvent('dynastyhq:podcast-script-generated', {
        detail: { publicationId, episode: nextEpisode, capturedAt },
      }));
      setMessageType('success');
      setMessage('Fresh transcript saved. Review it first; audio will not be generated until you separately click Humanized Audio.');
    } catch (error) {
      if (error?.code === 'NO_NEWSWORTHY_PODCAST') {
        await markNoEpisode(publicationId, error.message);
        setLiveEpisodes((current) => {
          const next = { ...current };
          delete next[publicationId];
          return next;
        });
        setMessageType('success');
        setMessage(error.message);
      } else {
        setMessageType('error');
        setMessage(error?.message || 'The podcast transcript could not be generated. Any existing transcript was preserved.');
      }
    } finally {
      setOperation('');
    }
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
    setOperation('audio');
    setMessageType('success');
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
      setMessage('Rendering one continuous Mark + Sarah conversation…');
      const rendered = await generateHumanizedPodcastMix({ idToken, episode: renderEpisode });
      if (!rendered.pieces?.length) throw new Error('The humanized renderer returned no playable audio.');

      const episodeId = renderEpisode.id || `podcast-${publicationId}`;
      await savePodcastAudioLocal(episodeId, rendered.pieces);
      await savePodcastAudioCloud({ db, appId, userId: user.uid, episodeId, segments: rendered.pieces });

      const generatedAt = new Date().toISOString();
      const readyEpisode = await patchEpisodeStatus(publicationId, {
        status: 'published',
        audioStatus: 'ready',
        audioModel: rendered.model || 'gemini-3.1-flash-tts-preview',
        audioEngine: rendered.engine || 'gemini-multispeaker-v3',
        audioContinuous: Boolean(rendered.continuous),
        audioSegmentCount: rendered.pieces.length,
        audioGeneratedAt: generatedAt,
        audioTranscriptFingerprint: fingerprint,
      });
      setLiveEpisodes((current) => ({ ...current, [publicationId]: readyEpisode }));

      setMessageType('success');
      setMessage('Humanized Mark + Sarah mix is ready as one continuous episode and is bound to this exact transcript.');
    } catch (error) {
      try {
        await patchEpisodeStatus(publicationId, { audioStatus: previousAudioStatus });
      } catch {
        // Keep the useful generation error below even if restoring the status fails.
      }
      setMessageType('error');
      setMessage(error?.message || 'The humanized podcast audio could not be generated.');
    } finally {
      setOperation('');
    }
  };

  if (!visible || !user || !issues.length) return null;

  if (!expanded) {
    const minimizedLabel = busy
      ? (audioBusy ? 'Rendering audio…' : 'Writing transcript…')
      : (selectedEpisode?.audioStatus === 'ready' ? 'Podcast tools' : 'Script + audio');

    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="Open Script + Humanized Audio controls"
        className="fixed bottom-3 right-3 z-[120] flex max-w-[calc(100vw-1.5rem)] items-center gap-2.5 rounded-full border border-cyan-400/35 bg-slate-950/95 px-3 py-2.5 text-left shadow-2xl shadow-slate-950/70 backdrop-blur-xl transition hover:border-cyan-300 hover:bg-slate-900 sm:bottom-4 sm:right-4"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Volume2 size={15} />}
        </span>
        <span className="min-w-0">
          <span className="block text-[8px] font-black uppercase tracking-[0.18em] text-cyan-400">Podcast v3</span>
          <span className="block truncate text-[10px] font-black text-white sm:text-[11px]">{minimizedLabel}</span>
        </span>
        <span className="ml-1 hidden rounded-full border border-slate-700 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-slate-400 sm:inline">Open</span>
      </button>
    );
  }

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
              <h3 className="text-sm font-black text-white">Script + Humanized Audio</h3>
            </div>
            <button type="button" aria-label="Minimize Podcast v3 controls" onClick={() => setExpanded(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white"><ChevronDown size={16} /></button>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">Choose a newsroom week. DynastyHQ decides whether it deserves a show, then keeps transcript writing and audio rendering separate.</p>
        </div>
      </div>

      {issues.length > 1 && (
        <select value={selectedPublicationId} onChange={(event) => { setSelectedPublicationId(event.target.value); setMessage(''); }} disabled={busy} className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-cyan-400">
          {[...issues].reverse().map((issue) => {
            const id = publicationIdFor(issue);
            return <option key={id} value={id}>{weekLabel(issue, episodeByPublication.get(id))}</option>;
          })}
        </select>
      )}

      {selectedNoEpisode && !selectedEpisode && (
        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/80 p-3">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Quiet week</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">No episode was produced because the football week did not clear the editorial threshold. You can re-check the week later if its verified facts change.</p>
        </div>
      )}

      <button type="button" onClick={regenerateTranscript} disabled={busy || !selectedIssue} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-100 transition hover:border-blue-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500">
        {transcriptBusy ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
        {transcriptBusy ? 'Generating Transcript…' : (selectedEpisode ? 'Regenerate Transcript' : 'Create Transcript')}
      </button>

      <button type="button" onClick={regenerate} disabled={busy || !selectedEpisode} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
        {audioBusy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
        {audioBusy ? 'Rendering Humanized Audio…' : (selectedEpisode?.audioStatus === 'ready' ? 'Regenerate Humanized Audio' : 'Generate Humanized Audio')}
      </button>

      <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
        <Sparkles size={11} /> Editorial gate · transcript review · continuous audio
      </div>

      {message && (
        <p className={`mt-3 rounded-xl border p-3 text-[11px] font-semibold leading-5 ${messageType === 'error' ? 'border-red-500/30 bg-red-950/40 text-red-200' : 'border-emerald-500/30 bg-emerald-950/35 text-emerald-200'}`}>{message}</p>
      )}
    </aside>
  );
};

export default PodcastHumanizedAudioPortal;