import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Download, FileAudio2, Loader2, UploadCloud } from 'lucide-react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, db } from '../firebase';
import { buildPodcastGenerationPayload, buildPodcastResearchPacket, listPodcastProductionIssues } from '../domain/podcastEngine';
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

const issueChronology = (left = {}, right = {}) => (
  Number(left?.season || 1) - Number(right?.season || 1)
  || Number(left?.week ?? 0) - Number(right?.week ?? 0)
  || String(left?.publishedAt || '').localeCompare(String(right?.publishedAt || ''))
);

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
  const research = buildPodcastResearchPacket(state, publicationId);
  let payload = null;
  try {
    payload = buildPodcastGenerationPayload(state, publicationId);
  } catch {
    // A source pack is research material and should remain exportable even if
    // the listener-facing editorial gate decides not to produce an episode.
  }

  const issue = research.issue || {};
  const showName = payload?.show?.name || 'DynastyHQ Football Podcast';
  const school = payload?.show?.school
    || payload?.episodeContext?.school
    || state?.player?.college
    || state?.player?.school
    || 'Current Program';
  const game = research.game || {};
  const priorGame = research.priorGame || {};
  const threads = payload?.storylineThreads || [];
  const gameValue = (key) => game?.[key] === '' || game?.[key] === null || game?.[key] === undefined
    ? ''
    : factValue(game[key]);
  const addFactLines = (lines, facts = []) => {
    facts.forEach((fact) => {
      const evidence = clean(fact.evidence);
      lines.push(`- ${fact.label || fact.key}: ${factValue(fact.value)}${evidence ? ` — source: ${evidence}` : ''}`);
    });
  };

  const lines = [
    `# ${showName} — NotebookLM Audio Overview Source Pack`,
    '',
    '## Current episode identity',
    `Program: ${school}`,
    `Season: ${research.season}`,
    `Week: ${research.week}`,
    research.label ? `Week label: ${research.label}` : '',
    gameValue('opponent') ? `Opponent: ${gameValue('opponent')}` : '',
    gameValue('result') ? `Result: ${gameValue('result')}` : '',
    gameValue('homeScore') && gameValue('awayScore') ? `Final score: ${school} ${gameValue('homeScore')}, ${gameValue('opponent') || 'Opponent'} ${gameValue('awayScore')}` : '',
    '',
    '## Audio Overview direction',
    `Create a detailed, natural two-host local college-football conversation centered on ${school}. The show identity is ${showName}.`,
    'Use this document as a full producer research packet. It is intentionally more detailed than the finished conversation so the hosts can choose the strongest angles without losing any verified game information.',
    'Cover the CURRENT week first. Do not let an older preseason or depth-chart storyline replace a newer completed game.',
    'Use individual statistics, team statistical comparisons, scoring/drive notes, role changes, and player progression or regression when they help explain what happened and what changed.',
    'Treat every value below as source material only. Never invent anything that is not supplied.',
    '',
    '## Episode focus',
    `Working title: ${payload?.brief?.title || issue?.podcastBrief?.title || `${school} Week ${research.week}`}`,
    `Editorial brief: ${payload?.brief?.summary || issue?.podcastBrief?.summary || 'Break down the current verified football week in depth.'}`,
  ].filter(Boolean);

  if (game && Object.keys(game).length) {
    lines.push('', '## Current game — full verified summary');
    [
      ['opponent', 'Opponent'],
      ['result', 'Result'],
      ['homeScore', 'Team score'],
      ['awayScore', 'Opponent score'],
      ['teamRank', 'Team rank'],
      ['opponentRank', 'Opponent rank'],
      ['isConferenceGame', 'Conference game'],
    ].forEach(([key, label]) => {
      const value = gameValue(key);
      if (value !== '') lines.push(`- ${label}: ${value}`);
    });

    lines.push('', '## Tracked player — full game stat line');
    [
      ['passYds', 'Passing yards'],
      ['passTD', 'Passing touchdowns'],
      ['rushYds', 'Rushing yards'],
      ['rushTD', 'Rushing touchdowns'],
      ['int', 'Interceptions'],
    ].forEach(([key, label]) => {
      const value = gameValue(key);
      if (value !== '') lines.push(`- ${label}: ${value}`);
    });

    lines.push('', '## Team statistical comparison');
    [
      ['teamTotalYards', 'opponentTotalYards', 'Total offense'],
      ['teamFirstDowns', 'opponentFirstDowns', 'First downs'],
      ['teamTurnovers', 'opponentTurnovers', 'Turnovers'],
      ['teamRushYds', 'opponentRushYds', 'Rushing yards'],
      ['teamPassYds', 'opponentPassYds', 'Passing yards'],
    ].forEach(([teamKey, opponentKey, label]) => {
      const teamValue = gameValue(teamKey);
      const opponentValue = gameValue(opponentKey);
      if (teamValue !== '' || opponentValue !== '') {
        lines.push(`- ${label}: ${school} ${teamValue || 'not supplied'} · ${gameValue('opponent') || 'Opponent'} ${opponentValue || 'not supplied'}`);
      }
    });
  }

  if (research.scoringFacts.length) {
    lines.push('', '## Scoring summary / drive details');
    addFactLines(lines, research.scoringFacts);
  }

  const nonScoringCoverage = research.coverageFacts.filter((fact) => !research.scoringFacts.some((scoring) => scoring.key === fact.key));
  if (nonScoringCoverage.length) {
    lines.push('', '## Teammate, opponent and coverage detail');
    addFactLines(lines, nonScoringCoverage);
  }

  if (research.developmentChanges.length || research.progressionFacts.length) {
    lines.push('', '## Player progression / regression');
    if (research.developmentChanges.length) {
      research.developmentSummary.forEach((change) => lines.push(`- CHANGE: ${change}`));
    } else {
      lines.push('- No week-over-week player development change was calculated from the saved snapshots.');
    }
    if (research.progressionFacts.length) {
      lines.push('', '### Current saved player-development snapshot');
      addFactLines(lines, research.progressionFacts);
    }
  }

  if (research.quote) {
    lines.push('', '## Postgame voice', `- Verified player quote/note: ${research.quote}`);
  }

  if (priorGame && Object.keys(priorGame).length) {
    lines.push('', '## Previous-game comparison context');
    const priorOpponent = factValue(priorGame.opponent || 'Previous opponent');
    lines.push(`- Previous opponent: ${priorOpponent}`);
    if (priorGame.result) lines.push(`- Previous result: ${factValue(priorGame.result)}`);
    [
      ['passYds', 'Passing yards'],
      ['passTD', 'Passing touchdowns'],
      ['rushYds', 'Rushing yards'],
      ['rushTD', 'Rushing touchdowns'],
      ['int', 'Interceptions'],
    ].forEach(([key, label]) => {
      if (priorGame[key] !== '' && priorGame[key] !== null && priorGame[key] !== undefined) {
        lines.push(`- Previous ${label.toLowerCase()}: ${factValue(priorGame[key])}`);
      }
    });
  }

  if (threads.length) {
    lines.push('', '## Active storyline continuity');
    threads.forEach((thread) => {
      const label = clean(thread?.label || thread?.title || thread?.key || thread);
      if (!label) return;
      const value = thread?.value === undefined || thread?.value === null || thread?.value === '' ? '' : `: ${factValue(thread.value)}`;
      const change = thread?.changedThisWeek ? ' [changed this week]' : '';
      lines.push(`- ${label}${value}${change}`);
    });
  }

  lines.push('', '## Complete verified current-week fact ledger');
  addFactLines(lines, research.currentFacts);

  lines.push(
    '',
    '## Closing guidance',
    'Build the discussion from the newest game and newest player state first. Use the preseason QB1 story only as background context for why the first start matters.',
    'Use the complete research above to explain the game: who produced, how the scoring unfolded, where the team won or lost statistically, and what changed for the tracked player afterward.',
    '',
    'Generated by DynastyHQ from the verified current-week career record.',
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

  const episodes = useMemo(() => (career?.podcastEpisodes || [])
    .filter((episode) => publicationIdFor(episode)), [career?.podcastEpisodes]);
  const episodeByPublication = useMemo(() => new Map(episodes.map((episode) => [publicationIdFor(episode), episode])), [episodes]);

  // Source-pack selection follows every verified weekly update, even when the
  // matching Newsroom issue/brief is missing or has not been regenerated yet.
  // A preseason episode must never outrank a newer completed game.
  const issues = useMemo(() => listPodcastProductionIssues(career || {})
    .filter((issue) => publicationIdFor(issue))
    .sort(issueChronology), [career]);
  const issueByPublication = useMemo(() => new Map(issues.map((issue) => [publicationIdFor(issue), issue])), [issues]);

  useEffect(() => {
    if (!issues.length) {
      previousLatestPublicationIdRef.current = '';
      setSelectedPublicationId('');
      return;
    }
    const latest = publicationIdFor(issues[issues.length - 1]);
    const previousLatest = previousLatestPublicationIdRef.current;
    const selectedStillExists = issues.some((issue) => publicationIdFor(issue) === selectedPublicationId);
    const wasFollowingLatest = Boolean(previousLatest && selectedPublicationId === previousLatest);

    if (!selectedStillExists || !selectedPublicationId || (wasFollowingLatest && latest !== previousLatest)) {
      setSelectedPublicationId(latest);
      setMessage('');
    }
    previousLatestPublicationIdRef.current = latest;
  }, [issues, selectedPublicationId]);

  useEffect(() => {
    const onSelected = (event) => {
      const publicationId = String(event.detail?.publicationId || '').trim();
      if (!publicationId || !issues.some((issue) => publicationIdFor(issue) === publicationId)) return;
      setSelectedPublicationId(publicationId);
      setMessage('');
    };
    window.addEventListener('dynastyhq:podcast-publication-selected', onSelected);
    return () => window.removeEventListener('dynastyhq:podcast-publication-selected', onSelected);
  }, [issues]);

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

  const selectedEpisode = episodeByPublication.get(selectedPublicationId) || null;
  const selectedIssue = issueByPublication.get(selectedPublicationId) || null;
  const selectedHasTranscript = Boolean(Array.isArray(selectedEpisode?.segments) && selectedEpisode.segments.length);
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
    if (!career || !selectedIssue) {
      setMessageType('error');
      setMessage('Choose a verified Newsroom week before exporting the NotebookLM source pack.');
      return;
    }
    try {
      const publicationId = publicationIdFor(selectedIssue);
      const text = buildNotebookLmSourcePack(career, publicationId);
      const season = Number(selectedIssue.season) || 1;
      const week = Math.max(0, Number(selectedIssue.week) || 0);
      downloadText(text, `DynastyHQ-NotebookLM-S${season}-W${week}.txt`);
      setMessageType('success');
      setMessage('Detailed current-week NotebookLM source pack downloaded. Add it as a source before generating the Audio Overview.');
    } catch (error) {
      setMessageType('error');
      setMessage(error?.message || 'The NotebookLM source pack could not be created.');
    }
  };

  if (!mount || !career || !issues.length || !selectedIssue) return null;

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

      {issues.length > 1 && (
        <select
          aria-label="Choose week for NotebookLM source pack and master audio"
          value={selectedPublicationId}
          disabled={busy}
          onChange={(event) => selectPublication(event.target.value)}
        >
          {[...issues].reverse().map((issue) => {
            const id = publicationIdFor(issue);
            const episode = episodeByPublication.get(id);
            const season = Number(issue?.season || episode?.season) || 1;
            const week = Math.max(0, Number(issue?.week ?? episode?.week) || 0);
            return (
              <option key={id} value={id}>
                S{season} · W{week} — {episode?.title || issue?.podcastBrief?.title || issue?.label || 'Podcast week'}
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
          title={selectedIssue ? 'Download a detailed verified source pack for this week' : 'Matching Newsroom week is unavailable'}
        >
          <Download size={13} /> NotebookLM Source Pack
        </button>
        <label className="dhq-podcast-master__upload" data-busy={operation === 'upload'}>
          <input
            type="file"
            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,audio/aac,audio/ogg,.mp3,.m4a,.wav,.aac,.ogg"
            disabled={busy || !selectedEpisode || !selectedHasTranscript}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) uploadMaster(file);
            }}
          />
          {operation === 'upload' ? <Loader2 className="animate-spin" size={13} /> : <UploadCloud size={13} />}
          {operation === 'upload' ? 'Attaching…' : (!selectedEpisode || !selectedHasTranscript ? 'Generate Transcript First' : (isNotebookMaster ? 'Replace Master' : 'Attach Master Audio'))}
        </label>
      </div>

      {(!selectedEpisode || !selectedHasTranscript) && (
        <p className="dhq-podcast-master__message">The detailed NotebookLM source pack is available now. Generate this week's transcript before attaching finished master audio back to DynastyHQ.</p>
      )}
      {isNotebookMaster && selectedEpisode?.masterAudioFileName && (
        <p className="dhq-podcast-master__file">Now playing: {selectedEpisode.masterAudioFileName}</p>
      )}
      {message && <p className="dhq-podcast-master__message" data-type={messageType}>{message}</p>}
    </div>,
    mount,
  );
};

export default PodcastMasterAudioPortalV2;
