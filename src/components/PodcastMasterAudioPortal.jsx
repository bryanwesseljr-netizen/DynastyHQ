import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Download, FileAudio2, Loader2, UploadCloud } from 'lucide-react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, db } from '../firebase';
import { buildPodcastGenerationPayload, podcastTranscriptText } from '../domain/podcastEngine';
import { savePodcastAudioCloud, savePodcastAudioLocal } from '../services/podcastAudioStorage';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import '../podcast-master-audio.css';

const DEVICE_ID = globalThis.crypto?.randomUUID?.() || 'podcast-master-audio';
const MAX_AUDIO_BYTES = 30_000_000;
const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'aac', 'ogg'];

const clean = (value) => String(value ?? '').trim();
const publicationIdFor = (entry) => clean(entry?.publicationId || entry?.id);

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
  return clean(file?.type).toLowerCase().startsWith('audio/') || AUDIO_EXTENSIONS.includes(extension);
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

const issueChronology = (left = {}, right = {}) => (
  Number(left?.season || 1) - Number(right?.season || 1)
  || Number(left?.week ?? 0) - Number(right?.week ?? 0)
  || String(left?.publishedAt || '').localeCompare(String(right?.publishedAt || ''))
);

const appendFactSection = (lines, title, facts = []) => {
  const usable = (facts || []).filter(Boolean);
  if (!usable.length) return;
  lines.push('', '## ' + title);
  usable.forEach((fact) => {
    const label = fact?.label || fact?.key || 'Fact';
    const evidence = clean(fact?.evidence);
    lines.push('- ' + label + ': ' + factValue(fact?.value) + (evidence ? ' — Evidence: ' + evidence : ''));
  });
};

const appendObjectSection = (lines, title, value) => {
  if (!value || (typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length)) return;
  lines.push('', '## ' + title, JSON.stringify(value, null, 2));
};

const notebookSourcePack = (state, publicationId, episode = null) => {
  const payload = buildPodcastGenerationPayload(state, publicationId);
  const showName = payload.show?.name || 'DynastyHQ Football Podcast';
  const school = payload.show?.school || 'Current Program';
  const facts = (payload.facts || []).filter((fact) => fact.editorialUse !== 'background-only');
  const backgroundFacts = (payload.facts || []).filter((fact) => fact.editorialUse === 'background-only');
  const threads = payload.storylineThreads || payload.coverageDecision?.storylineThreads || [];
  const research = payload.researchPacket || {};
  const transcript = episode?.segments?.length ? podcastTranscriptText(episode) : '';
  const lines = [
    `# ${showName} — NotebookLM Source Pack`,
    '',
    `Program: ${school}`,
    `Season: ${payload.season}`,
    `Week: ${payload.week}`,
    payload.label ? `Week label: ${payload.label}` : '',
    payload.episodeContext?.opponent ? `Opponent: ${payload.episodeContext.opponent}` : '',
    payload.episodeContext?.result ? `Result: ${payload.episodeContext.result}` : '',
    research.sourceCount ? `Verified upload sources: ${research.sourceCount}` : '',
    '',
    '## Audio Overview direction',
    `Create a natural two-host local college-football conversation for ${showName}. Sound like knowledgeable hosts who cover ${school} every week, not announcers reading a script. Use casual reactions, follow-up questions, disagreement when reasonable, and natural transitions. Keep the current team/game as the default subject.`,
    '',
    'IMPORTANT: This pack is for the SELECTED week above. The current completed game, current player performance, scoring flow, team comparison and verified development changes outrank older preseason or depth-chart context. Treat the verified material below as authoritative and do not invent missing facts.',
    '',
    'The complete DynastyHQ-generated transcript is included near the end as a production reference. NotebookLM may use its structure, topics and detail, but should still sound conversational rather than simply reading the transcript verbatim.',
    '',
    '## Episode focus',
    `Working title: ${payload.brief?.title || `${school} Week ${payload.week}`}`,
    `Editorial brief: ${payload.brief?.summary || 'Cover the most meaningful verified football developments from this week.'}`,
    payload.coveragePlan?.editorialPrinciple ? `Editorial principle: ${payload.coveragePlan.editorialPrinciple}` : '',
    payload.coveragePlan?.playerMentionPolicy ? `Tracked-player mention policy: ${payload.coveragePlan.playerMentionPolicy}` : '',
  ].filter((line) => line !== '');

  appendObjectSection(lines, 'Current game record', research.game);
  appendFactSection(lines, 'Tracked player — game statistics', research.playerGameFacts);
  appendFactSection(lines, 'Team and opponent — game statistics', research.teamGameFacts);
  appendFactSection(lines, 'Scoring summary and drive detail', research.scoringFacts);
  appendFactSection(lines, 'Additional game coverage detail', research.coverageFacts);

  if ((research.developmentSummary || []).length || (research.progressionFacts || []).length) {
    lines.push('', '## Player progress / regression since the prior update');
    (research.developmentSummary || []).forEach((change) => lines.push('- ' + change));
    (research.progressionFacts || []).forEach((fact) => {
      lines.push('- ' + (fact.label || fact.key) + ': ' + factValue(fact.value) + (fact.evidence ? ' — Evidence: ' + fact.evidence : ''));
    });
  }
  appendObjectSection(lines, 'Current RTG snapshot', research.rtgSnapshot);

  if (research.quote) lines.push('', '## Current quote / weekly context', research.quote);
  appendObjectSection(lines, 'Prior game context', research.priorGame);

  lines.push('', '## Verified facts');
  facts.forEach((fact) => lines.push('- ' + (fact.label || fact.key) + ': ' + factValue(fact.value) + (fact.editorialUse ? ' [' + fact.editorialUse + ']' : '')));

  if (threads.length) {
    lines.push('', '## Active storylines');
    threads.forEach((thread) => {
      const label = clean(thread?.label || thread?.title || thread?.key || thread);
      const status = clean(thread?.status);
      const changed = thread?.changedThisWeek ? ' — changed this week' : '';
      if (label) lines.push('- ' + label + (status ? ': ' + status : '') + changed);
    });
  }

  if (backgroundFacts.length) {
    lines.push('', '## Background only — use sparingly');
    backgroundFacts.forEach((fact) => lines.push('- ' + (fact.label || fact.key) + ': ' + factValue(fact.value)));
  }

  if (transcript) {
    lines.push('', '## DynastyHQ generated transcript — complete', 'Use this as the detailed editorial/script reference for the selected episode.', '', transcript);
  } else {
    lines.push('', '## DynastyHQ generated transcript', 'No saved transcript is attached to this selected week yet. Create/regenerate the transcript in Podcast v3 first, then export this source pack again.');
  }

  lines.push('', '## Closing guidance', 'Prioritize what changed this week, why it matters, the current game flow, the tracked player’s actual production, and verified progress/regression. Older preseason context is secondary once a newer completed game exists.', '', 'Generated by DynastyHQ from the verified career record.');

  return lines.join('\n');
};

const PodcastMasterAudioPortal = () => {
  const { user, career } = useOwnerCareer();
  const [mount, setMount] = useState(null);
  const [selectedPublicationId, setSelectedPublicationId] = useState('');
  const [operation, setOperation] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const previousLatestPublicationIdRef = useRef('');

  const selectPublication = (publicationId) => {
    const next = String(publicationId || '').trim();
    if (!next) return;
    setSelectedPublicationId(next);
    setMessage('');
    window.dispatchEvent(new CustomEvent('dynastyhq:podcast-publication-selected', {
      detail: { publicationId: next, source: 'master-audio-controls' },
    }));
  };

  const issues = useMemo(() => [...(career?.newsroomIssues || [])]
    .filter((issue) => publicationIdFor(issue) && issue?.podcastBrief)
    .sort(issueChronology), [career?.newsroomIssues]);
  const episodes = useMemo(() => (career?.podcastEpisodes || [])
    .filter((episode) => publicationIdFor(episode) && Array.isArray(episode?.segments) && episode.segments.length), [career?.podcastEpisodes]);
  const episodeByPublication = useMemo(() => new Map(episodes.map((episode) => [episode.publicationId, episode])), [episodes]);
  const eligibleIssues = useMemo(() => issues.filter((issue) => episodeByPublication.has(publicationIdFor(issue))), [episodeByPublication, issues]);

  useEffect(() => {
    if (!eligibleIssues.length) {
      previousLatestPublicationIdRef.current = '';
      setSelectedPublicationId('');
      return;
    }
    const latest = publicationIdFor(eligibleIssues[eligibleIssues.length - 1]);
    const previousLatest = previousLatestPublicationIdRef.current;
    const selectedStillExists = eligibleIssues.some((issue) => publicationIdFor(issue) === selectedPublicationId);
    const wasFollowingLatest = Boolean(previousLatest && selectedPublicationId === previousLatest);
    if (!selectedStillExists || !selectedPublicationId || (wasFollowingLatest && latest !== previousLatest)) {
      setSelectedPublicationId(latest);
    }
    previousLatestPublicationIdRef.current = latest;
  }, [eligibleIssues, selectedPublicationId]);

  useEffect(() => {
    const onSelected = (event) => {
      const publicationId = String(event.detail?.publicationId || '').trim();
      if (!publicationId || !eligibleIssues.some((issue) => publicationIdFor(issue) === publicationId)) return;
      setSelectedPublicationId(publicationId);
      setMessage('');
    };
    window.addEventListener('dynastyhq:podcast-publication-selected', onSelected);
    return () => window.removeEventListener('dynastyhq:podcast-publication-selected', onSelected);
  }, [eligibleIssues]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;
    let ownedMount = null;
    let scheduled = false;

    const sync = () => {
      scheduled = false;
      const studio = root.querySelector('.dhq-local-podcast__studio');
      if (!studio) {
        if (ownedMount?.parentElement) ownedMount.remove();
        ownedMount = null;
        setMount(null);
        return;
      }
      if (!ownedMount || !ownedMount.isConnected) {
        ownedMount = document.createElement('div');
        ownedMount.dataset.podcastMasterAudio = 'true';
        const note = studio.querySelector('.dhq-local-podcast__studio-note');
        if (note) studio.insertBefore(ownedMount, note);
        else studio.appendChild(ownedMount);
      }
      setMount((current) => current === ownedMount ? current : ownedMount);
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (ownedMount?.parentElement) ownedMount.remove();
    };
  }, []);

  const selectedIssue = eligibleIssues.find((issue) => publicationIdFor(issue) === selectedPublicationId) || null;
  const selectedEpisode = episodeByPublication.get(selectedPublicationId) || null;
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
      const currentEpisode = episodesNow.find((episode) => episode.publicationId === publicationId);
      if (!currentEpisode) throw new Error('Create the episode transcript before attaching master audio.');
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

    const publicationId = selectedEpisode.publicationId;
    const episodeId = selectedEpisode.id || `podcast-${publicationId}`;
    const previousStatus = selectedEpisode.audioStatus || 'not-generated';
    const previousEngine = selectedEpisode.audioEngine || '';
    setOperation('upload');
    setMessageType('success');
    setMessage('Preparing NotebookLM master audio…');

    try {
      // Deliberately move out of "ready" before replacing the cloud audio. The
      // listener player then sees a clean ready transition and reloads this file
      // even when it replaces an already-generated DynastyHQ episode.
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
        await patchEpisode(publicationId, { audioStatus: previousStatus, audioEngine: previousEngine });
      } catch {
        // Preserve the useful upload error below if status recovery also fails.
      }
      setMessageType('error');
      setMessage(error?.message || 'The NotebookLM audio could not be attached.');
    } finally {
      setOperation('');
    }
  };

  const exportSourcePack = () => {
    if (!career || !selectedIssue || !selectedPublicationId) return;
    try {
      const text = notebookSourcePack(career, selectedPublicationId, selectedEpisode);
      const season = Number(selectedIssue.season) || 1;
      const week = Math.max(0, Number(selectedIssue.week) || 0);
      downloadText(text, `DynastyHQ-NotebookLM-S${season}-W${week}.txt`);
      setMessageType('success');
      setMessage('NotebookLM source pack downloaded with the detailed weekly research packet and complete saved transcript.');
    } catch (error) {
      setMessageType('error');
      setMessage(error?.message || 'The NotebookLM source pack could not be created.');
    }
  };

  if (!mount || !career || !eligibleIssues.length) return null;

  return createPortal(
    <div className="dhq-podcast-master">
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

      {eligibleIssues.length > 1 && (
        <select
          aria-label="Choose episode for NotebookLM master audio"
          value={selectedPublicationId}
          disabled={busy}
          onChange={(event) => selectPublication(event.target.value)}
        >
          {[...eligibleIssues].reverse().map((issue) => {
            const id = publicationIdFor(issue);
            const episode = episodeByPublication.get(id);
            return (
              <option key={id} value={id}>
                S{Number(issue.season) || 1} · W{Math.max(0, Number(issue.week) || 0)} — {episode?.title || issue.label || 'Podcast episode'}
              </option>
            );
          })}
        </select>
      )}

      <div className="dhq-podcast-master__actions">
        <button type="button" onClick={exportSourcePack} disabled={busy} className="dhq-podcast-master__source">
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

export default PodcastMasterAudioPortal;
