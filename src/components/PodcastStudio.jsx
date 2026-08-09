import { Component, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, CheckCircle2, Download, Headphones, Loader2, Mic2,
  Pause, Play, Radio, ShieldCheck, SkipBack, SkipForward, Sparkles,
} from 'lucide-react';
import { audioSegmentDataUrl, podcastAudioBlob } from '../services/podcastAudioStorage';
import { podcastTranscriptText } from '../domain/podcastEngine';

const downloadFile = (content, fileName, type) => {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const briefForIssue = (issue) => ({
  title: issue?.podcastBrief?.title || issue?.label || `Season ${issue?.season || 1}, Week ${issue?.week ?? 0} briefing`,
  summary: issue?.podcastBrief?.summary || 'This newsroom edition is available, but its original podcast summary was not preserved.',
  citedFactKeys: Array.isArray(issue?.podcastBrief?.citedFactKeys) ? issue.podcastBrief.citedFactKeys : [],
});

class PodcastStudioBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Podcast Studio render failed', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-slate-950/95 p-8 text-center shadow-2xl">
        <Radio className="mx-auto text-red-300" size={38} />
        <h2 className="mt-4 text-2xl font-black uppercase text-white">The studio hit a playback problem</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">Your saved newsroom and podcast data are still intact. Reload the studio to recover instead of leaving the page on a black screen.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-lg bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-blue-500">Reload Podcast Studio</button>
      </div>
    );
  }
}

const PodcastStudioContent = ({ state = {}, readOnly, initialPublicationId, onGenerate, onLoadAudio }) => {
  const issues = useMemo(() => state.newsroomIssues || [], [state.newsroomIssues]);
  const episodes = useMemo(() => state.podcastEpisodes || [], [state.podcastEpisodes]);
  const latestIssue = issues[issues.length - 1];
  const latestEpisode = episodes[episodes.length - 1];
  const [selectedPublicationId, setSelectedPublicationId] = useState(
    initialPublicationId || latestEpisode?.publicationId || latestIssue?.publicationId || latestIssue?.id || '',
  );
  const [audioSegments, setAudioSegments] = useState(null);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [generation, setGeneration] = useState(null);
  const [error, setError] = useState('');
  const audioRef = useRef(null);

  const issue = useMemo(() => issues.find((entry) => (
    entry.publicationId === selectedPublicationId || entry.id === selectedPublicationId
  )) || latestIssue, [issues, latestIssue, selectedPublicationId]);
  const episode = useMemo(() => episodes.find((entry) => (
    entry.publicationId === selectedPublicationId
  )) || null, [episodes, selectedPublicationId]);
  const issueBrief = briefForIssue(issue);
  const episodeHosts = Array.isArray(episode?.hosts) ? episode.hosts : [];
  const episodeSegments = Array.isArray(episode?.segments) ? episode.segments : [];
  const episodeChapters = Array.isArray(episode?.chapters) ? episode.chapters : [];
  const hosts = new Map(episodeHosts.map((host) => [host.id, host]));
  const selectedSegment = episodeSegments[segmentIndex];
  const episodeId = episode?.id;
  const episodeAudioStatus = episode?.audioStatus;

  useEffect(() => {
    let cancelled = false;
    if (!episodeId || episodeAudioStatus !== 'ready' || typeof onLoadAudio !== 'function') return undefined;
    const loadEpisodeAudio = async () => {
      setIsLoadingAudio(true);
      try {
        const segments = await onLoadAudio(episodeId);
        if (!cancelled) {
          setAudioSegments(segments);
          if (!segments?.length) setError('The episode transcript is available, but its archived audio could not be found.');
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'The archived audio could not be loaded.');
      } finally {
        if (!cancelled) setIsLoadingAudio(false);
      }
    };
    loadEpisodeAudio();
    return () => { cancelled = true; };
  }, [episodeAudioStatus, episodeId, onLoadAudio]);

  useEffect(() => {
    if (!isPlaying || !audioRef.current || !audioSegments?.[segmentIndex]) return;
    audioRef.current.play().catch(() => setIsPlaying(false));
  }, [audioSegments, isPlaying, segmentIndex]);

  const selectPublication = (publicationId) => {
    setSegmentIndex(0);
    setAudioSegments(null);
    setIsPlaying(false);
    setError('');
    setSelectedPublicationId(publicationId);
    setGeneration(null);
  };

  const generate = async () => {
    if (!issue) return;
    setError('');
    setGeneration({ stage: episode ? 'Rendering audio' : 'Writing grounded script', current: 0, total: episodeSegments.length || 1 });
    try {
      const result = await onGenerate(issue.publicationId || issue.id, (progress) => setGeneration(progress));
      if (!result?.episode) throw new Error('The podcast service returned an incomplete episode. Please try again.');
      setSelectedPublicationId(result.episode.publicationId);
      setAudioSegments(result.audioSegments);
      setSegmentIndex(0);
    } catch (generationError) {
      setError(generationError.message || 'The episode could not be generated.');
    } finally {
      setGeneration(null);
    }
  };

  const playPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  };

  const moveSegment = (nextIndex) => {
    if (!episodeSegments.length) return;
    setSegmentIndex(Math.max(0, Math.min(nextIndex, episodeSegments.length - 1)));
    setIsPlaying(true);
  };

  const onEnded = () => {
    if (segmentIndex < episodeSegments.length - 1) {
      setSegmentIndex((index) => index + 1);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      setSegmentIndex(0);
    }
  };

  if (!issues.length) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-700 bg-slate-900/85 p-10 text-center shadow-2xl">
        <Radio className="mx-auto mb-4 text-blue-400" size={42} />
        <h2 className="text-2xl font-black uppercase text-white">The studio is waiting for kickoff</h2>
        <p className="mt-3 text-sm text-slate-400">Publish a verified game week to create the first Gridiron Grind episode brief.</p>
      </div>
    );
  }

  const progressPercent = generation?.total ? Math.round((generation.current / generation.total) * 100) : 12;
  const audioReady = Boolean(audioSegments?.[segmentIndex] && episodeSegments.length);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20 animate-in fade-in">
      <header className="overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-950 shadow-2xl">
        <div className="grid gap-6 p-7 md:grid-cols-[160px_minmax(0,1fr)] md:p-10">
          <div className="aspect-square overflow-hidden rounded-2xl border border-blue-400/30 bg-slate-900 shadow-xl">
            {state.outletImages?.podcast
              ? <img src={state.outletImages.podcast} alt="The Gridiron Grind" className="h-full w-full object-cover" />
              : <Headphones className="m-auto h-full w-20 text-blue-400" />}
          </div>
          <div className="self-center">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-blue-300"><Radio size={15} /> DynastyHQ Original</p>
            <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white md:text-6xl">The Gridiron Grind</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">Marcus Grant and Tyler Brooks break down each verified week from the high-school recruiting trail through the head-coaching years.</p>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Voices are AI-generated.</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-700/70 bg-slate-900/90 p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">Episode Archive</h2>
            <span className="rounded-full bg-blue-500/15 px-2 py-1 text-[10px] font-black text-blue-300">{episodes.length}</span>
          </div>
          <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {[...issues].reverse().map((archiveIssue) => {
              const publicationId = archiveIssue.publicationId || archiveIssue.id;
              const archivedEpisode = episodes.find((entry) => entry.publicationId === publicationId);
              const selected = publicationId === (issue?.publicationId || issue?.id);
              return (
                <button key={publicationId} type="button" onClick={() => selectPublication(publicationId)} className={`w-full rounded-xl border p-3 text-left transition-colors ${selected ? 'border-blue-500 bg-blue-500/15' : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'}`}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-300">Season {archiveIssue.season} · Week {archiveIssue.week}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold text-white">{archivedEpisode?.title || briefForIssue(archiveIssue).title}</p>
                  <p className={`mt-2 text-[10px] font-black uppercase ${archivedEpisode?.audioStatus === 'ready' ? 'text-emerald-400' : archivedEpisode ? 'text-amber-400' : 'text-slate-500'}`}>
                    {archivedEpisode?.audioStatus === 'ready' ? 'Audio ready' : archivedEpisode ? 'Transcript ready' : 'Brief ready'}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="space-y-6">
          <section className="rounded-2xl border border-slate-700/70 bg-slate-900/90 p-6 shadow-2xl md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">Season {issue.season} · Week {issue.week}</p>
                <h2 className="mt-2 max-w-3xl text-3xl font-black uppercase leading-tight text-white">{episode?.title || issueBrief.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">{episode?.summary || issueBrief.summary}</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                <ShieldCheck size={14} /> {(Array.isArray(episode?.citedFactKeys) ? episode.citedFactKeys.length : 0) || issueBrief.citedFactKeys.length} verified sources
              </div>
            </div>

            {generation && (
              <div className="mt-6 rounded-xl border border-blue-500/30 bg-blue-950/30 p-4">
                <div className="flex items-center justify-between text-xs font-black uppercase text-blue-200">
                  <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={15} /> {generation.stage}</span>
                  <span>{generation.current}/{generation.total}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950"><div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.max(8, progressPercent)}%` }} /></div>
              </div>
            )}

            {error && <p className="mt-5 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm font-semibold text-red-200">{error}</p>}

            {episode && (
              <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/80 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <button type="button" disabled={!audioReady || isLoadingAudio} onClick={playPause} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg disabled:cursor-not-allowed disabled:bg-slate-700">
                    {isLoadingAudio ? <Loader2 className="animate-spin" /> : isPlaying ? <Pause /> : <Play className="ml-1" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-300">{audioReady ? `Turn ${segmentIndex + 1} of ${episodeSegments.length}` : 'Transcript saved · audio pending'}</p>
                    <p className="mt-1 truncate text-sm font-bold text-white">{selectedSegment ? `${hosts.get(selectedSegment.hostId)?.name || 'Host'} — ${selectedSegment.text}` : episode.title}</p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-blue-500" style={{ width: `${audioReady ? ((segmentIndex + 1) / episodeSegments.length) * 100 : 0}%` }} /></div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" disabled={!audioReady || segmentIndex === 0} onClick={() => moveSegment(segmentIndex - 1)} className="rounded-lg border border-slate-700 p-2 text-slate-300 disabled:opacity-30"><SkipBack size={18} /></button>
                    <button type="button" disabled={!audioReady || segmentIndex >= episodeSegments.length - 1} onClick={() => moveSegment(segmentIndex + 1)} className="rounded-lg border border-slate-700 p-2 text-slate-300 disabled:opacity-30"><SkipForward size={18} /></button>
                  </div>
                </div>
                {audioReady && <audio ref={audioRef} src={audioSegmentDataUrl(audioSegments[segmentIndex])} onEnded={onEnded} onPause={() => setIsPlaying(false)} className="hidden" />}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {!readOnly && (!episode || episode.audioStatus !== 'ready') && (
                <button type="button" disabled={Boolean(generation)} onClick={generate} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-blue-500 disabled:opacity-50">
                  <Sparkles size={16} /> {episode ? 'Generate Episode Audio' : 'Generate Full Episode'}
                </button>
              )}
              {episode && (
                <button type="button" onClick={() => downloadFile(podcastTranscriptText(episode), `${episode.id}-transcript.txt`, 'text/plain')} className="flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-200 hover:bg-slate-800">
                  <BookOpen size={15} /> Download Transcript
                </button>
              )}
              {audioReady && (
                <button type="button" onClick={() => downloadFile(podcastAudioBlob(audioSegments), `${episode.id}.mp3`, 'audio/mpeg')} className="flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-200 hover:bg-slate-800">
                  <Download size={15} /> Download Audio
                </button>
              )}
            </div>
          </section>

          {episode && (
            <section className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
              <div className="h-fit rounded-2xl border border-slate-700/70 bg-slate-900/90 p-5">
                <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white"><Mic2 size={15} className="text-blue-400" /> Chapters</h3>
                <div className="mt-4 space-y-3">
                  {episodeChapters.map((chapter) => (
                    <button key={chapter.id} type="button" onClick={() => moveSegment(chapter.segmentStart)} className="block w-full border-l-2 border-blue-500 pl-3 text-left">
                      <p className="text-xs font-black text-white">{chapter.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{chapter.summary}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/90 p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h3 className="text-xs font-black uppercase tracking-[0.18em] text-white">Episode Transcript</h3>
                  <span className="text-[10px] font-bold uppercase text-slate-500">{episode.transcriptWordCount || '—'} words · ~{episode.estimatedMinutes || '—'} min</span>
                </div>
                <div className="space-y-5">
                  {episodeSegments.map((segment, index) => {
                    const host = hosts.get(segment.hostId);
                    return (
                      <button key={segment.id} type="button" onClick={() => moveSegment(index)} className={`block w-full rounded-xl border p-4 text-left transition-colors ${index === segmentIndex ? 'border-blue-500/60 bg-blue-500/10' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}>
                        <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-blue-300"><CheckCircle2 size={13} /> {host?.name || 'Host'} · {host?.role || 'Insider'}</p>
                        <p className="text-sm leading-7 text-slate-300">{segment.text}</p>
                        <p className="mt-3 text-[10px] font-mono text-slate-600">{segment.citedFactKeys?.length ? `${segment.citedFactKeys.length} cited facts` : 'Transition / show framing'}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

const PodcastStudio = (props) => (
  <PodcastStudioBoundary>
    <PodcastStudioContent {...props} />
  </PodcastStudioBoundary>
);

export default PodcastStudio;
