import { Component, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, CalendarDays, CheckCircle2, ChevronDown, Clock3, Download,
  FileText, Headphones, Layers3, Loader2, Mic2, Pause, Play, Radio,
  ShieldCheck, SkipBack, SkipForward, Sparkles, Volume2,
} from 'lucide-react';
import { audioSegmentDataUrl, podcastAudioBlob } from '../services/podcastAudioStorage';
import { podcastTranscriptText } from '../domain/podcastEngine';

const IMPORTANCE_RANK = Object.freeze({
  routine: 0,
  notable: 1,
  major: 2,
  'career-defining': 3,
});

const IMPACT_META = Object.freeze({
  routine: {
    label: 'Weekly Show',
    eyebrow: 'Weekly edition',
    shell: 'border-blue-500/30',
    badge: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  },
  notable: {
    label: 'Story Developing',
    eyebrow: 'Story developing',
    shell: 'border-cyan-400/40',
    badge: 'border-cyan-400/35 bg-cyan-400/10 text-cyan-100',
  },
  major: {
    label: 'Big Week',
    eyebrow: 'Big week edition',
    shell: 'border-amber-400/50 shadow-amber-950/30',
    badge: 'border-amber-400/45 bg-amber-400/15 text-amber-100',
  },
  'career-defining': {
    label: 'Career Special',
    eyebrow: 'Career special',
    shell: 'border-fuchsia-400/50 shadow-fuchsia-950/30',
    badge: 'border-fuchsia-400/45 bg-fuchsia-400/15 text-fuchsia-100',
  },
});

const CHAPTER_IDENTITIES = Object.freeze([
  { title: 'Opening Drive', subtitle: 'The lead story' },
  { title: 'QB Room', subtitle: 'Role, development and pressure points' },
  { title: 'Film Room', subtitle: 'What the verified performance says' },
  { title: 'Recruiting Desk', subtitle: 'Offers, portal and roster movement' },
  { title: 'Around the Program', subtitle: 'The wider program picture' },
  { title: "Coach's Clipboard", subtitle: 'Coaching decisions and direction' },
  { title: 'Next Saturday', subtitle: 'What matters next' },
]);

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

const issueImportance = (issue) => {
  let best = 'routine';
  const seen = new Set();
  const visit = (value, depth = 0) => {
    if (!value || depth > 4) return;
    if (typeof value === 'string') {
      if (Object.hasOwn(IMPORTANCE_RANK, value) && IMPORTANCE_RANK[value] > IMPORTANCE_RANK[best]) best = value;
      return;
    }
    if (typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.slice(0, 20).forEach((entry) => visit(entry, depth + 1));
      return;
    }
    if (Object.hasOwn(IMPORTANCE_RANK, value.storyImportance) && IMPORTANCE_RANK[value.storyImportance] > IMPORTANCE_RANK[best]) {
      best = value.storyImportance;
    }
    Object.entries(value).slice(0, 40).forEach(([key, entry]) => {
      if (key === 'paragraphs' || key === 'segments' || key === 'transcript') return;
      visit(entry, depth + 1);
    });
  };
  visit(issue);
  return best;
};

const formatEpisodeDate = (episode, issue) => {
  const raw = episode?.audioGeneratedAt || episode?.generatedAt || issue?.publishedAt || issue?.createdAt || issue?.occurredAt;
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const issueOpponent = (issue) => (
  issue?.opponent
  || issue?.game?.opponent
  || issue?.weeklySummary?.opponent
  || issue?.summary?.opponent
  || issue?.podcastBrief?.opponent
  || ''
);

const identityForChapter = (chapter, index, total) => {
  const raw = String(chapter?.title || '').trim();
  const lower = raw.toLowerCase();
  const exact = CHAPTER_IDENTITIES.find((entry) => entry.title.toLowerCase() === lower);
  if (exact) return exact;
  if (index === 0) return CHAPTER_IDENTITIES[0];
  if (index === total - 1) return CHAPTER_IDENTITIES[6];
  if (/quarterback|\bqb\b|depth|role|trust|development/.test(lower)) return CHAPTER_IDENTITIES[1];
  if (/film|tape|performance|game|numbers|breakdown/.test(lower)) return CHAPTER_IDENTITIES[2];
  if (/recruit|portal|offer|commit|roster/.test(lower)) return CHAPTER_IDENTITIES[3];
  if (/coach|coordinator|staff|scheme|clipboard/.test(lower)) return CHAPTER_IDENTITIES[5];
  if (/program|team|award|injury|around/.test(lower)) return CHAPTER_IDENTITIES[4];
  return CHAPTER_IDENTITIES[Math.min(index, 5)];
};

const episodeStatus = (episode) => {
  if (!episode) return { label: 'Brief ready', classes: 'border-slate-700 bg-slate-900 text-slate-400' };
  if (episode.audioStatus === 'ready') return { label: 'Episode ready', classes: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' };
  return { label: 'Transcript ready', classes: 'border-amber-500/30 bg-amber-500/10 text-amber-300' };
};

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
  const [showTranscript, setShowTranscript] = useState(false);
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
  const importance = issueImportance(issue);
  const impact = IMPACT_META[importance] || IMPACT_META.routine;
  const publicationId = issue?.publicationId || issue?.id || '';
  const latestPublicationId = latestIssue?.publicationId || latestIssue?.id || '';
  const isLatest = Boolean(publicationId && publicationId === latestPublicationId);
  const sourceCount = (Array.isArray(episode?.citedFactKeys) ? episode.citedFactKeys.length : 0) || issueBrief.citedFactKeys.length;
  const opponent = issueOpponent(issue);
  const publishedDate = formatEpisodeDate(episode, issue);
  const status = episodeStatus(episode);
  const currentChapter = episodeChapters.find((chapter, index) => {
    const next = episodeChapters[index + 1];
    return segmentIndex >= (Number(chapter.segmentStart) || 0)
      && (!next || segmentIndex < (Number(next.segmentStart) || 0));
  });
  const currentIdentity = identityForChapter(
    currentChapter,
    Math.max(0, episodeChapters.indexOf(currentChapter)),
    Math.max(1, episodeChapters.length),
  );

  useEffect(() => {
    if (!initialPublicationId) return;
    setSelectedPublicationId(initialPublicationId);
  }, [initialPublicationId]);

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

  const selectPublication = (nextPublicationId) => {
    setSegmentIndex(0);
    setAudioSegments(null);
    setIsPlaying(false);
    setError('');
    setSelectedPublicationId(nextPublicationId);
    setGeneration(null);
    setShowTranscript(false);
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
      <div className="relative z-10 mx-auto max-w-5xl overflow-hidden rounded-3xl border border-blue-500/25 bg-slate-950/90 shadow-2xl">
        <div className="grid gap-8 p-8 md:grid-cols-[180px_minmax(0,1fr)] md:p-10">
          <div className="flex aspect-square items-center justify-center rounded-3xl border border-blue-500/25 bg-gradient-to-br from-blue-950 to-slate-950 shadow-xl">
            {state.outletImages?.podcast
              ? <img src={state.outletImages.podcast} alt="The Gridiron Grind" className="h-full w-full rounded-3xl object-cover" />
              : <Headphones className="text-blue-400" size={72} />}
          </div>
          <div className="self-center">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-300"><Radio size={14} /> DynastyHQ Original</p>
            <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white">The Gridiron Grind</h1>
            <h2 className="mt-6 text-xl font-black text-white">The studio is waiting for kickoff.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Publish a verified game week first. DynastyHQ will create the grounded episode brief automatically, and this page will become the weekly show archive.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <span className="rounded-full border border-slate-700 px-3 py-1.5">Verified weeks only</span>
              <span className="rounded-full border border-slate-700 px-3 py-1.5">Two-host format</span>
              <span className="rounded-full border border-slate-700 px-3 py-1.5">~5–6 minutes</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = generation?.total ? Math.round((generation.current / generation.total) * 100) : 12;
  const audioReady = Boolean(audioSegments?.[segmentIndex] && episodeSegments.length);
  const showArtwork = state.outletImages?.podcast;

  return (
    <div className="relative z-10 mx-auto max-w-7xl space-y-6 pb-20 animate-in fade-in">
      <header className="overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-950/92 shadow-2xl backdrop-blur-md">
        <div className="grid gap-5 p-5 sm:grid-cols-[110px_minmax(0,1fr)] sm:p-6 md:grid-cols-[130px_minmax(0,1fr)_auto] md:items-center">
          <div className="aspect-square overflow-hidden rounded-2xl border border-blue-400/25 bg-gradient-to-br from-blue-950 to-slate-950 shadow-xl">
            {showArtwork
              ? <img src={showArtwork} alt="The Gridiron Grind" className="h-full w-full object-cover" />
              : <Headphones className="m-auto h-full w-14 text-blue-400" />}
          </div>
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-300"><Radio size={13} /> DynastyHQ Original · College Football</p>
            <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-white md:text-4xl">The Gridiron Grind</h1>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400 md:text-sm">Marcus Grant and Tyler Brooks turn each verified career week into a grounded five-to-six-minute show—from recruiting trail to coaching legacy.</p>
          </div>
          <div className="sm:col-span-2 md:col-span-1 md:text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Hosted by</p>
            <p className="mt-1 text-xs font-black text-slate-200">Marcus Grant · Tyler Brooks</p>
            <p className="mt-1 text-[10px] text-slate-600">AI-generated voices</p>
          </div>
        </div>
      </header>

      <section className={`overflow-hidden rounded-3xl border bg-slate-950/92 shadow-2xl backdrop-blur-md ${impact.shell}`} data-episode-importance={importance}>
        <div className="grid lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="relative min-h-[260px] overflow-hidden border-b border-slate-800 bg-gradient-to-br from-blue-950 via-slate-950 to-slate-900 lg:min-h-[430px] lg:border-b-0 lg:border-r">
            {showArtwork ? (
              <img src={showArtwork} alt="" className="absolute inset-0 h-full w-full object-cover opacity-32 blur-[1px] scale-110" aria-hidden="true" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-transparent" />
            <div className="relative flex h-full min-h-[260px] flex-col justify-between p-6 lg:min-h-[430px] lg:p-7">
              <div className="flex items-start justify-between gap-3">
                <span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${impact.badge}`}>{impact.label}</span>
                <span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${status.classes}`}>{status.label}</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">{isLatest ? 'Latest Episode' : 'From the Archive'}</p>
                <p className="mt-2 text-4xl font-black uppercase tracking-tight text-white">S{issue.season || 1}<span className="text-blue-400">·</span>W{issue.week ?? 0}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider text-slate-300">
                  {episode?.estimatedMinutes && <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1.5"><Clock3 size={12} /> ~{episode.estimatedMinutes} min</span>}
                  {opponent && <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1.5">vs {opponent}</span>}
                  {issue.careerPhase && <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1.5">{issue.careerPhase}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 lg:p-9">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">{impact.eyebrow}</span>
              {publishedDate && <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600"><CalendarDays size={12} /> {publishedDate}</span>}
            </div>
            <h2 className="mt-3 max-w-4xl text-3xl font-black leading-[1.02] tracking-tight text-white md:text-5xl">{episode?.title || issueBrief.title}</h2>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-400 md:text-[15px]">{episode?.summary || issueBrief.summary}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300"><ShieldCheck size={12} /> {sourceCount} verified source{sourceCount === 1 ? '' : 's'}</span>
              <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400"><Volume2 size={12} /> Two-host show</span>
              {episode && <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400"><FileText size={12} /> {episode.transcriptWordCount || '—'} words</span>}
            </div>

            {generation && (
              <div className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-950/25 p-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-blue-200">
                  <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> {generation.stage}</span>
                  <span>{generation.current}/{generation.total}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950"><div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.max(8, progressPercent)}%` }} /></div>
              </div>
            )}

            {error && <p className="mt-5 rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-sm font-semibold text-red-200">{error}</p>}

            {episode && (
              <div className="mt-7 rounded-2xl border border-slate-700/80 bg-slate-900/75 p-4 shadow-inner md:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <button type="button" disabled={!audioReady || isLoadingAudio} onClick={playPause} aria-label={isPlaying ? 'Pause episode' : 'Play episode'} className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-950/40 transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:shadow-none">
                    {isLoadingAudio ? <Loader2 className="animate-spin" /> : isPlaying ? <Pause /> : <Play className="ml-1" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-300">{audioReady ? currentIdentity.title : 'Transcript saved · audio pending'}</p>
                      {audioReady && <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Turn {segmentIndex + 1}/{episodeSegments.length}</span>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-white">{selectedSegment ? `${hosts.get(selectedSegment.hostId)?.name || 'Host'} — ${selectedSegment.text}` : episode.title}</p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-blue-500 transition-all" style={{ width: `${audioReady ? ((segmentIndex + 1) / episodeSegments.length) * 100 : 0}%` }} /></div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" aria-label="Previous segment" disabled={!audioReady || segmentIndex === 0} onClick={() => moveSegment(segmentIndex - 1)} className="rounded-xl border border-slate-700 p-2.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30"><SkipBack size={18} /></button>
                    <button type="button" aria-label="Next segment" disabled={!audioReady || segmentIndex >= episodeSegments.length - 1} onClick={() => moveSegment(segmentIndex + 1)} className="rounded-xl border border-slate-700 p-2.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30"><SkipForward size={18} /></button>
                  </div>
                </div>
                {audioReady && <audio ref={audioRef} src={audioSegmentDataUrl(audioSegments[segmentIndex])} onEnded={onEnded} onPause={() => setIsPlaying(false)} className="hidden" />}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2.5">
              {!readOnly && (!episode || episode.audioStatus !== 'ready') && (
                <button type="button" disabled={Boolean(generation)} onClick={generate} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500 disabled:opacity-50">
                  <Sparkles size={15} /> {episode ? 'Generate Episode Audio' : 'Generate Full Episode'}
                </button>
              )}
              {episode && (
                <button type="button" onClick={() => downloadFile(podcastTranscriptText(episode), `${episode.id}-transcript.txt`, 'text/plain')} className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:bg-slate-800">
                  <BookOpen size={14} /> Transcript
                </button>
              )}
              {audioReady && (
                <button type="button" onClick={() => downloadFile(podcastAudioBlob(audioSegments), `${episode.id}.mp3`, 'audio/mpeg')} className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:bg-slate-800">
                  <Download size={14} /> Audio File
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {episode ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-3xl border border-slate-700/60 bg-slate-950/88 p-5 shadow-2xl md:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">Episode Rundown</p>
                <h3 className="mt-1 text-2xl font-black text-white">The show, segment by segment</h3>
              </div>
              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-600"><Layers3 size={13} /> {episodeChapters.length} segments</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {episodeChapters.map((chapter, index) => {
                const identity = identityForChapter(chapter, index, episodeChapters.length);
                const active = currentChapter?.id === chapter.id;
                return (
                  <button key={chapter.id} type="button" onClick={() => moveSegment(chapter.segmentStart)} className={`group rounded-2xl border p-4 text-left transition-all ${active ? 'border-blue-500/55 bg-blue-500/10' : 'border-slate-800 bg-slate-900/65 hover:border-slate-600 hover:bg-slate-900'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-400">{String(index + 1).padStart(2, '0')} · {identity.title}</p>
                        <p className="mt-1 text-sm font-black text-white">{chapter.title || identity.title}</p>
                      </div>
                      {active && <span className="rounded-full bg-blue-500/15 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-blue-300">Playing</span>}
                    </div>
                    <p className="mt-2 text-[11px] font-semibold text-slate-500">{identity.subtitle}</p>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">{chapter.summary}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-slate-700/60 bg-slate-950/88 p-5 shadow-2xl md:p-6">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">Show Notes</p>
            <h3 className="mt-1 text-xl font-black text-white">Grounded in the week</h3>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">Verified sources</p>
                <p className="mt-1 text-2xl font-black text-emerald-300">{sourceCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">Episode length</p>
                <p className="mt-1 text-lg font-black text-white">~{episode.estimatedMinutes || '—'} minutes</p>
                <p className="mt-1 text-[10px] text-slate-600">{episode.transcriptWordCount || '—'} spoken words</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">Edition weight</p>
                <p className="mt-1 text-sm font-black text-white">{impact.label}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-600">The presentation follows the Newsroom story importance already attached to this verified week.</p>
              </div>
            </div>
          </aside>
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/75 p-8 text-center shadow-xl">
          <Mic2 className="mx-auto text-blue-400" size={32} />
          <h3 className="mt-3 text-xl font-black text-white">The weekly brief is ready for the booth.</h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">Generate the episode when you want the two-host script and audio. Until then, DynastyHQ keeps this week as a verified show brief without fabricating any extra story.</p>
        </section>
      )}

      {episode && (
        <section className="overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-950/88 shadow-2xl">
          <button type="button" onClick={() => setShowTranscript((value) => !value)} className="flex w-full items-center justify-between gap-4 p-5 text-left md:p-6">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Full Episode Transcript</p>
              <p className="mt-1 text-sm font-black text-white">Read or audit every host turn</p>
            </div>
            <ChevronDown className={`text-slate-500 transition-transform ${showTranscript ? 'rotate-180' : ''}`} size={20} />
          </button>
          {showTranscript && (
            <div className="border-t border-slate-800 p-5 md:p-6">
              <div className="space-y-4">
                {episodeSegments.map((segment, index) => {
                  const host = hosts.get(segment.hostId);
                  return (
                    <button key={segment.id} type="button" onClick={() => moveSegment(index)} className={`block w-full rounded-2xl border p-4 text-left transition-colors ${index === segmentIndex ? 'border-blue-500/55 bg-blue-500/10' : 'border-slate-800 bg-slate-900/45 hover:border-slate-700'}`}>
                      <p className="mb-2 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-wider text-blue-300"><CheckCircle2 size={12} /> {host?.name || 'Host'} <span className="text-slate-600">·</span> {host?.role || 'Insider'}</p>
                      <p className="text-sm leading-7 text-slate-300">{segment.text}</p>
                      <p className="mt-3 text-[9px] font-mono text-slate-600">{segment.citedFactKeys?.length ? `${segment.citedFactKeys.length} cited fact${segment.citedFactKeys.length === 1 ? '' : 's'}` : 'Transition / show framing'}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-slate-700/60 bg-slate-950/88 p-5 shadow-2xl md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">Season Archive</p>
            <h3 className="mt-1 text-2xl font-black text-white">Every verified week, in one feed</h3>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{issues.length} brief{issues.length === 1 ? '' : 's'} · {episodes.length} produced episode{episodes.length === 1 ? '' : 's'}</p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[...issues].reverse().map((archiveIssue) => {
            const archivePublicationId = archiveIssue.publicationId || archiveIssue.id;
            const archivedEpisode = episodes.find((entry) => entry.publicationId === archivePublicationId);
            const archivedBrief = briefForIssue(archiveIssue);
            const selected = archivePublicationId === publicationId;
            const archivedImportance = issueImportance(archiveIssue);
            const archivedImpact = IMPACT_META[archivedImportance] || IMPACT_META.routine;
            const archivedStatus = episodeStatus(archivedEpisode);
            return (
              <button key={archivePublicationId} type="button" onClick={() => selectPublication(archivePublicationId)} className={`rounded-2xl border p-4 text-left transition-all ${selected ? 'border-blue-500/55 bg-blue-500/10 shadow-lg' : 'border-slate-800 bg-slate-900/55 hover:border-slate-600 hover:bg-slate-900'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-400">S{archiveIssue.season || 1} · W{archiveIssue.week ?? 0}</p>
                  <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${archivedStatus.classes}`}>{archivedStatus.label}</span>
                </div>
                <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm font-black leading-5 text-white">{archivedEpisode?.title || archivedBrief.title}</p>
                <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-500">{archivedEpisode?.summary || archivedBrief.summary}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${archivedImpact.badge}`}>{archivedImpact.label}</span>
                  {archivedEpisode?.estimatedMinutes && <span className="text-[9px] font-bold text-slate-600">~{archivedEpisode.estimatedMinutes} min</span>}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

const PodcastStudio = (props) => (
  <PodcastStudioBoundary>
    <PodcastStudioContent {...props} />
  </PodcastStudioBoundary>
);

export default PodcastStudio;
