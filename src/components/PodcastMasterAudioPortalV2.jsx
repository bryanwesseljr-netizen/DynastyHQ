import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Download, FileAudio2, Loader2, UploadCloud } from 'lucide-react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, db } from '../firebase';
import { buildPodcastGenerationPayload } from '../domain/podcastEngine';
import { savePodcastAudioCloud, savePodcastAudioLocal } from '../services/podcastAudioStorage';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import '../podcast-master-audio.css';

const DEVICE_ID = globalThis.crypto?.randomUUID?.() || 'podcast-master-audio-v2';
const MAX_AUDIO_BYTES = 30_000_000;
const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'wav', 'aac', 'ogg']);

const clean = (value) => String(value ?? '').trim();
const publicationIdFor = (entry) => clean(entry?.publicationId || entry?.id);

const episodeTimestamp = (episode) => {
  const value = Date.parse(clean(episode?.audioGeneratedAt || episode?.generatedAt || episode?.capturedAt));
  return Number.isFinite(value) ? value : 0;
};

const audioMimeFor = (file) => {
  const supplied = clean(file?.type).toLowerCase();
  if (supplied.startsWith('audio/')) return supplied;
  const extension = clean(file?.name).toLowerCase().split('.').pop();
  if (extension === 'm4a') return 'audio/mp4';
  if (extension === 'wav') return 'audio/wav';
  if (extension === 'aac') return 'audio/aac';
  if (extension === 'ogg') return 'audio/ogg';
  return 'audio/mpeg';
};

const audioFileAllowed = (file) => {
  const extension = clean(file?.name).toLowerCase().split('.').pop();
  return clean(file?.type).toLowerCase().startsWith('audio/') || AUDIO_EXTENSIONS.has(extension);
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(reader.error || new Error('DynastyHQ could not read that audio file.'));
  reader.onload = () => {
    const value = String(reader.result || '');
    const commaIndex = value.indexOf(',');
    if (commaIndex < 0) reject(new Error('DynastyHQ could not prepare that audio file.'));
    else resolve(value.slice(commaIndex + 1));
  };
  reader.readAsDataURL(file);
});

const downloadText = (text, fileName) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const factValue = (value) => {
  if (value === null || value === undefined || value === '') return 'Not supplied';
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return String(value);
};

export const buildNotebookLmSourcePack = (state, publicationId) => {
  const payload = buildPodcastGenerationPayload(state, publicationId);
  const showName = payload.show?.name || 'DynastyHQ Football Podcast';
  const school = payload.show?.school || payload.episodeContext?.school || 'Current Program';
  const facts = (payload.facts || []).filter((fact) => fact.editorialUse !== 'background-only');
  const backgroundFacts = (payload.facts || []).filter((fact) => fact.editorialUse === 'background-only');
  const threads = payload.storylineThreads || [];

  const lines = [
    `# ${showName} — NotebookLM Audio Overview Source Pack`,
    '',
    `Program: ${school}`,
    `Season: ${payload.season}`,
    `Week: ${payload.week}`,
    payload.label ? `Week label: ${payload.label}` : '',
    payload.episodeContext?.opponent ? `Opponent: ${payload.episodeContext.opponent}` : '',
    payload.episodeContext?.result ? `Result: ${payload.episodeContext.result}` : '',
    '',
    '## Audio Overview direction',
    `Create a natural two-host local college-football conversation centered on ${school}. The show identity is ${showName}. Sound like knowledgeable local hosts who cover this program every week, not announcers reading a script or analysts reciting a box score.`,
    'Let the hosts react to each other, ask natural follow-up questions, occasionally agree or disagree, and move fluidly between the biggest football takeaways.',
    'Use statistics as evidence for football conclusions rather than reading complete stat lines. Exact numbers should be used only when one is genuinely important to the story.',
    '',
    'IMPORTANT: Treat the verified facts below as authoritative. Do not invent scores, statistics, injuries, rankings, roster moves, quotes, awards, recruiting developments, player participation, future opponents, or game details that are not supplied.',
    'Do not read this source pack verbatim. It is reporting material for the conversation, not a finished script.',
    '',
    '## Episode focus',
    `Working title: ${payload.brief?.title || `${school} Week ${payload.week}`}`,
    `Editorial brief: ${payload.brief?.summary || 'Cover the most meaningful verified football developments from this week.'}`,
    payload.coveragePlan?.editorialPrinciple ? `Editorial principle: ${payload.coveragePlan.editorialPrinciple}` : '',
    payload.coveragePlan?.playerMentionPolicy ? `Tracked-player mention policy: ${payload.coveragePlan.playerMentionPolicy}` : '',
    '',
    '## Verified facts',
    ...facts.map((fact) => `- ${fact.label || fact.key}: ${factValue(fact.value)}${fact.editorialUse ? ` [${fact.editorialUse}]` : ''}`),
  ].filter(Boolean);

  if (threads.length) {
    lines.push('', '## Active storylines');
    threads.forEach((thread) => {
      const label = clean(thread?.label || thread?.title || thread?.key || thread);
      if (label) lines.push(`- ${label}`);
    });
  }

  if (backgroundFacts.length) {
    lines.push('', '## Background only — use sparingly');
    backgroundFacts.forEach((fact) => lines.push(`- ${fact.label || fact.key}: ${factValue(fact.value)}`));
  }

  lines.push(
    '',
    '## Closing guidance',
    'Prioritize what changed, why the game took the shape it did, which players or units actually influenced the outcome, and what the program should learn from the week. Avoid box-score dumping and do not force every available player statistic into the conversation.',
    '',
    'Generated by DynastyHQ from the verified career record.',
  );

  return lines.join('\n');
};

const PodcastMasterAudioPortalV2 = () => {
  const { user, career } = useOwnerCareer();
  const [mount, setMount] = useState(null);
  const [selectedPublicationId, setSelectedPublicationId] = useState('');
  const [operation, setOperation] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  // Master-audio availability is episode-first. A valid saved podcast episode is
  // enough to attach audio; a matching Newsroom issue is only required when the
  // user wants DynastyHQ to export a NotebookLM source pack.
  const episodes = useMemo(() => (career?.podcastEpisodes || [])
    .filter((episode) => publicationIdFor(episode) && Array.isArray(episode?.segments) && episode.segments.length)
    .sort((a, b) => episodeTimestamp(a) - episodeTimestamp(b)), [career?.podcastEpisodes]);

  const issues = useMemo(() => (career?.newsroomIssues || [])
    .filter((issue) => publicationIdFor(issue)), [career?.newsroomIssues]);
  const issueByPublication = useMemo(() => new Map(issues.map((issue) => [publicationIdFor(issue), issue])), [issues]);

  useEffect(() => {
    if (!episodes.length) {
      setSelectedPublicationId('');
      return;
    }
    if (!episodes.some((episode) => publicationIdFor(episode) === selectedPublicationId)) {
      setSelectedPublicationId(publicationIdFor(episodes[episodes.length - 1]));
    }
  }, [episodes, selectedPublicationId]);

  // The local Podcast hero is rendered through its own React portal. Observe the
  // document, not just #root, and attach to the explicit Studio Controls container
  // whenever it exists. The mount disappears automatically when Studio Controls
  // are collapsed, keeping these owner tools completely out of the listener view.
  useEffect(() => {
    let ownedMount = null;
    let scheduled = false;

    const sync = () => {
      scheduled = false;
      const studio = document.querySelector('.dhq-local-podcast__studio');
      if (!studio) {
        if (ownedMount?.parentElement) ownedMount.remove();
        ownedMount = null;
        setMount(null);
        return;
      }

      const existing = studio.querySelector('[data-podcast-master-audio-v2="true"]');
      if (existing) {
        ownedMount = existing;
        setMount((current) => current === existing ? current : existing);
        return;
      }

      ownedMount = document.createElement('div');
      ownedMount.dataset.podcastMasterAudioV2 = 'true';
      const note = studio.querySelector('.dhq-local-podcast__studio-note');
      if (note) studio.insertBefore(ownedMount, note);
      else studio.appendChild(ownedMount);
      setMount(ownedMount);
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (ownedMount?.parentElement) ownedMount.remove();
    };
  }, []);

  const selectedEpisode = episodes.find((episode) => publicationIdFor(episode) === selectedPublicationId) || null;
  const selectedIssue = issueByPublication.get(selectedPublicationId) || null;
  const isNotebookMaster = selectedEpisode?.audioEngine === 'notebooklm-master-upload';
  const busy = Boolean(operation);

  const patchEpisode = async (publicationId, patch) => {
    if (!user || !db) throw new Error('Sign in to manage podcast audio.');
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('Your DynastyHQ career could not be loaded.');
      const state = snapshot.data();
      const episodesNow = state.podcastEpisodes || [];
      const currentEpisode = episodesNow.find((episode) => publicationIdFor(episode) === publicationId);
      if (!currentEpisode) throw new Error('Create the episode transcript before attaching master audio.');
      const patchedEpisode = { ...currentEpisode, ...patch };
      const revision = (Number(state?._sync?.revision) || 0) + 1;
      transaction.set(ref, {
        ...state,
        podcastEpisodes: episodesNow.map((episode) => publicationIdFor(episode) === publicationId ? patchedEpisode : episode),
        _sync: { revision, deviceId: DEVICE_ID, updatedAt: new Date().toISOString() },
      });
      return patchedEpisode;
    });
  };

  const uploadMaster = async (file) => {
    if (!file || !user || !selectedEpisode || busy) return;
    if (user.isAnonymous) {
      setMessageType('error');
      setMessage('Sign in with your normal DynastyHQ account before attaching master audio.');
      return;
    }
    if (!audioFileAllowed(file)) {
      setMessageType('error');
      setMessage('Choose an MP3, M4A, WAV, AAC, or OGG audio file.');
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      setMessageType('error');
      setMessage('That file is over 30 MB. Export a smaller MP3/M4A version and try again.');
      return;
    }

    const publicationId = publicationIdFor(selectedEpisode);
    const episodeId = selectedEpisode.id || `podcast-${publicationId}`;
    const previousStatus = selectedEpisode.audioStatus || 'not-generated';
    const previousEngine = selectedEpisode.audioEngine || '';
    const previousModel = selectedEpisode.audioModel || '';
    setOperation('upload');
    setMessageType('success');
    setMessage('Preparing NotebookLM master audio…');

    try {
      await patchEpisode(publicationId, { audioStatus: 'uploading-master' });
      const data = await fileToBase64(file);
      const mimeType = audioMimeFor(file);
      const piece = {
        index: 0,
        data,
        mimeType,
        hostId: '',
        continuous: true,
        source: 'notebooklm',
      };

      setMessage('Saving the master episode to DynastyHQ…');
      await savePodcastAudioLocal(episodeId, [piece]);
      await savePodcastAudioCloud({ db, appId, userId: user.uid, episodeId, segments: [piece] });

      const savedAt = new Date().toISOString();
      await patchEpisode(publicationId, {
        status: 'published',
        audioStatus: 'ready',
        audioModel: 'notebooklm-audio-overview',
        audioEngine: 'notebooklm-master-upload',
        audioSource: 'notebooklm',
        audioContinuous: true,
        audioSegmentCount: 1,
        audioGeneratedAt: savedAt,
        audioTranscriptFingerprint: '',
        masterAudioFileName: file.name || 'NotebookLM Audio Overview',
        masterAudioMimeType: mimeType,
        masterAudioSizeBytes: file.size,
        masterAudioUploadedAt: savedAt,
      });
      setMessageType('success');
      setMessage('NotebookLM master attached. The normal episode player now uses this audio.');
    } catch (error) {
      try {
        await patchEpisode(publicationId, {
          audioStatus: previousStatus,
          audioEngine: previousEngine,
          audioModel: previousModel,
        });
      } catch {
        // Preserve the useful upload error below even if status recovery fails.
      }
      setMessageType('error');
      setMessage(error?.message || 'The NotebookLM audio could not be attached.');
    } finally {
      setOperation('');
    }
  };

  const exportSourcePack = () => {
    if (!career || !selectedEpisode || !selectedIssue) {
      setMessageType('error');
      setMessage('This episode is saved, but its matching verified Newsroom week is not available for a NotebookLM source pack. You can still attach master audio.');
      return;
    }
    try {
      const publicationId = publicationIdFor(selectedEpisode);
      const text = buildNotebookLmSourcePack(career, publicationId);
      const season = Number(selectedIssue.season || selectedEpisode.season) || 1;
      const week = Math.max(0, Number(selectedIssue.week ?? selectedEpisode.week) || 0);
      downloadText(text, `DynastyHQ-NotebookLM-S${season}-W${week}.txt`);
      setMessageType('success');
      setMessage('NotebookLM source pack downloaded. Add it as a source before generating the Audio Overview.');
    } catch (error) {
      setMessageType('error');
      setMessage(error?.message || 'The NotebookLM source pack could not be created.');
    }
  };

  if (!mount || !career || !episodes.length || !selectedEpisode) return null;

  return createPortal(
    <div className="dhq-podcast-master" data-master-audio-visible="true">
      <div className="dhq-podcast-master__heading">
        <div className="dhq-podcast-master__icon"><FileAudio2 size={17} /></div>
        <div className="dhq-podcast-master__copy">
          <div className="dhq-podcast-master__title-row">
            <strong>Master Episode Audio</strong>
            {isNotebookMaster && <span><CheckCircle2 size={11} /> NotebookLM master</span>}
          </div>
          <p>Optional premium path. Export the verified source pack, create the Audio Overview in NotebookLM, then attach the downloaded audio here.</p>
        </div>
      </div>

      {episodes.length > 1 && (
        <select
          aria-label="Choose episode for NotebookLM master audio"
          value={selectedPublicationId}
          disabled={busy}
          onChange={(event) => { setSelectedPublicationId(event.target.value); setMessage(''); }}
        >
          {[...episodes].reverse().map((episode) => {
            const id = publicationIdFor(episode);
            const issue = issueByPublication.get(id);
            const season = Number(issue?.season || episode?.season) || 1;
            const week = Math.max(0, Number(issue?.week ?? episode?.week) || 0);
            return (
              <option key={id} value={id}>
                S{season} · W{week} — {episode.title || issue?.label || 'Podcast episode'}
              </option>
            );
          })}
        </select>
      )}

      <div className="dhq-podcast-master__actions">
        <button
          type="button"
          onClick={exportSourcePack}
          disabled={busy || !selectedIssue}
          className="dhq-podcast-master__source"
          title={selectedIssue ? 'Download a verified source pack for NotebookLM' : 'Matching Newsroom week is unavailable'}
        >
          <Download size={13} /> NotebookLM Source Pack
        </button>
        <label className="dhq-podcast-master__upload" data-busy={operation === 'upload'}>
          <input
            type="file"
            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,audio/aac,audio/ogg,.mp3,.m4a,.wav,.aac,.ogg"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) uploadMaster(file);
            }}
          />
          {operation === 'upload' ? <Loader2 className="animate-spin" size={13} /> : <UploadCloud size={13} />}
          {operation === 'upload' ? 'Attaching…' : (isNotebookMaster ? 'Replace Master' : 'Attach Master Audio')}
        </label>
      </div>

      {isNotebookMaster && selectedEpisode?.masterAudioFileName && (
        <p className="dhq-podcast-master__file">Now playing: {selectedEpisode.masterAudioFileName}</p>
      )}
      {message && <p className="dhq-podcast-master__message" data-type={messageType}>{message}</p>}
    </div>,
    mount,
  );
};

export default PodcastMasterAudioPortalV2;
