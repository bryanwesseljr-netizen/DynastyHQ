import { Component, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, CalendarDays, CheckCircle2, ChevronDown, Clock3, Download,
  FileText, Headphones, Layers3, Loader2, Mic2, Pause, Play, Radio,
  ShieldCheck, SkipBack, SkipForward, Sparkles, UploadCloud, Volume2,
} from 'lucide-react';
import defaultPodcastCover from '../assets/gridiron-grind-cover.webp';
import { audioSegmentDataUrl, podcastAudioBlob } from '../services/podcastAudioStorage';
import { podcastTranscriptText } from '../domain/podcastEngine';
import { buildProgramCoverageContext } from '../domain/programCoverage';
import {
  PODCAST_PUBLIC_HOSTS,
  PODCAST_PUBLIC_HOSTS_BY_ID,
  PODCAST_SHOW,
  resolvePodcastCoverUrl,
} from '../domain/podcastShow';

const IMPORTANCE_RANK = Object.freeze({ routine: 0, notable: 1, major: 2, 'career-defining': 3 });
const IMPACT_META = Object.freeze({
  routine: { label: 'Weekly Show', eyebrow: 'Weekly edition', shell: 'border-blue-500/30', badge: 'border-blue-500/30 bg-blue-500/10 text-blue-200' },
  notable: { label: 'Story Developing', eyebrow: 'Story developing', shell: 'border-cyan-400/40', badge: 'border-cyan-400/35 bg-cyan-400/10 text-cyan-100' },
  major: { label: 'Big Week', eyebrow: 'Big week edition', shell: 'border-amber-400/50 shadow-amber-950/30', badge: 'border-amber-400/45 bg-amber-400/15 text-amber-100' },
  'career-defining': { label: 'Career Special', eyebrow: 'Career special', shell: 'border-fuchsia-400/50 shadow-fuchsia-950/30', badge: 'border-fuchsia-400/45 bg-fuchsia-400/15 text-fuchsia-100' },
});

const COVERAGE_IMPORTANCE = Object.freeze({
  brief: 'notable',
  standard: 'routine',
  major: 'major',
  'career-defining': 'career-defining',
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

const JOURNEY_ARCHIVE_META = Object.freeze([
  { key: 'high-school', order: 1, eyebrow: 'Road to Glory · Chapter 1', title: 'High School Recruiting', description: 'Tape evaluations, recruiting momentum, scholarship offers and the college decision.' },
  { key: 'college-player', order: 2, eyebrow: 'Road to Glory · Chapter 2', title: 'College Player', description: 'College game weeks, depth-chart movement, development, NIL and transfer decisions.' },
  { key: 'offensive-coordinator', order: 3, eyebrow: 'Coaching Journey · Chapter 3', title: 'Offensive Coordinator', description: 'Coordinator results, offensive direction, recruiting duties and the climb toward a head-coaching job.' },
  { key: 'head-coach', order: 4, eyebrow: 'Coaching Journey · Chapter 4', title: 'Head Coach', description: 'Program building, recruiting, roster management, staff direction and championship pursuits.' },
  { key: 'career-retrospective', order: 5, eyebrow: 'Legacy', title: 'Career Retrospective', description: 'Career-complete specials and retrospective episodes from the finished player-to-coach journey.' },
]);

const JOURNEY_ARCHIVE_BY_KEY = new Map(JOURNEY_ARCHIVE_META.map((entry) => [entry.key, entry]));

const downloadFile = (content, fileName, type) => {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const formatClock = (seconds) => {
  const safe = Number.isFinite(Number(seconds)) ? Math.max(0, Math.floor(Number(seconds))) : 0;
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, '0')}`;
};

const briefForIssue = (issue) => ({
  title: issue?.podcastBrief?.title || issue?.label || `Season ${issue?.season || 1}, Week ${issue?.week ?? 0} briefing`,
  summary: issue?.podcastBrief?.summary || 'This newsroom edition is available, but its original podcast summary was not preserved.',
  citedFactKeys: Array.isArray(issue?.podcastBrief?.citedFactKeys) ? issue.podcastBrief.citedFactKeys : [],
});

const issueImportance = (issue) => {
  const coverageTier = issue?.coverageDecision?.tier;
  if (COVERAGE_IMPORTANCE[coverageTier]) return COVERAGE_IMPORTANCE[coverageTier];
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
    if (Object.hasOwn(IMPORTANCE_RANK, value.storyImportance) && IMPORTANCE_RANK[value.storyImportance] > IMPORTANCE_RANK[best]) best = value.storyImportance;
    Object.entries(value).slice(0, 40).forEach(([key, entry]) => {
      if (!['paragraphs', 'segments', 'transcript'].includes(key)) visit(entry, depth + 1);
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
  issue?.opponent || issue?.game?.opponent || issue?.weeklySummary?.opponent || issue?.summary?.opponent || issue?.podcastBrief?.opponent || ''
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

const episodeStatus = (episode, noEpisodeWeek = false) => {
  if (noEpisodeWeek) return { label: 'Quiet week', classes: 'border-slate-600 bg-slate-900 text-slate-400' };
  if (!episode) return { label: 'Brief ready', classes: 'border-slate-700 bg-slate-900 text-slate-400' };
  if (episode.audioStatus === 'ready') return { label: 'Episode ready', classes: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' };
  return { label: 'Transcript ready', classes: 'border-amber-500/30 bg-amber-500/10 text-amber-300' };
};

const journeyForIssue = (issue = {}) => {
  const phase = String(issue?.careerPhase || '').trim().toLowerCase();
  if (phase === 'hc' || phase.includes('head coach')) return JOURNEY_ARCHIVE_BY_KEY.get('head-coach');
  if (phase === 'oc' || phase.includes('offensive coordinator') || phase === 'coordinator') return JOURNEY_ARCHIVE_BY_KEY.get('offensive-coordinator');
  if (phase === 'retired' || phase.includes('legacy')) return JOURNEY_ARCHIVE_BY_KEY.get('career-retrospective');

  const outletIds = new Set((issue?.articles || []).map((article) => String(article?.outletId || '').toLowerCase()));
  const explicitlyHighSchool = issue?.game?.stage === 'high-school'
    || Boolean(issue?.game?.evaluation)
    || Boolean(issue?.highSchoolEvaluation)
    || String(issue?.coverageStage || '').toLowerCase() === 'high-school';
  const explicitlyCollege = String(issue?.coverageStage || '').toLowerCase() === 'college'
    || Boolean(issue?.outletProfile)
    || outletIds.has('college-local')
    || outletIds.has('college-regional');

  if (explicitlyHighSchool && !explicitlyCollege) return JOURNEY_ARCHIVE_BY_KEY.get('high-school');
  if (explicitlyCollege) return JOURNEY_ARCHIVE_BY_KEY.get('college-player');
  return phase === 'player' ? JOURNEY_ARCHIVE_BY_KEY.get('high-school') : JOURNEY_ARCHIVE_BY_KEY.get('college-player');
};

const buildJourneyArchive = (issues, episodes) => {
  const episodeByPublication = new Map((episodes || []).map((entry) => [entry.publicationId, entry]));
  const buckets = new Map(JOURNEY_ARCHIVE_META.map((meta) => [meta.key, []]));

  [...(issues || [])].reverse().forEach((archiveIssue) => {
    const publicationId = archiveIssue.publicationId || archiveIssue.id;
    const journey = journeyForIssue(archiveIssue);
    if (!journey || !publicationId) return;
    buckets.get(journey.key)?.push({ issue: archiveIssue, episode: episodeByPublication.get(publicationId) || null, publicationId });
  });

  return JOURNEY_ARCHIVE_META
    .map((meta) => {
      const items = buckets.get(meta.key) || [];
      const seasonMap = new Map();
      items.forEach((item) => {
        const season = Number(item.issue?.season) || 1;
        if (!seasonMap.has(season)) seasonMap.set(season, []);
        seasonMap.get(season).push(item);
      });
      return {
        ...meta,
        items,
        producedCount: items.filter((item) => item.episode).length,
        seasons: [...seasonMap.entries()].map(([season, seasonItems]) => ({ season, items: seasonItems })),
      };
    })
    .filter((group) => group.items.length > 0);
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
        <p className="mt-3 text-sm leading-relaxed text-slate-400">Your saved newsroom and podcast data are still intact. Reload the studio to recover.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-lg bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-blue-500">Reload Podcast Studio</button>
      </div>
    );
  }
}

const PodcastStudioContent = ({
  state = {},
  readOnly,
  initialPublicationId,
  onGenerate,
  onLoadAudio,
  onCoverUpload,
  coverBusy = false,
}) => {
  const issues = useMemo(() => state.newsroomIssues || [], [state.newsroomIssues]);
  const episodes = useMemo(() => state.podcastEpisodes || [], [state.podcastEpisodes]);
  const latestIssue = issues[issues.length - 1];
  const latestEpisode = episodes[episodes.length - 1];
  const [selectedPublicationId, setSelectedPublicationId] = useState(
    initialPublicationId || latestIssue?.publicationId || latestIssue?.id || latestEpisode?.publicationId || '',
  );
  const [audioSegments, setAudioSegments] = useState(null);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [generation, setGeneration] = useState(null);
  const [error, setError] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [expandedJourneyKey, setExpandedJourneyKey] = useState('');
  const audioRef = useRef(null);

  const managedCover = resolvePodcastCoverUrl(state.outletImages?.podcast, defaultPodcastCover);
  useEffect(() => setCoverFailed(false), [managedCover]);
  const showArtwork = coverFailed ? defaultPodcastCover : managedCover;
  const hasCustomArtwork = managedCover !== defaultPodcastCover && !coverFailed;

  const issue = useMemo(() => issues.find((entry) => (
    entry.publicationId === selectedPublicationId || entry.id === selectedPublicationId
  )) || latestIssue, [issues, latestIssue, selectedPublicationId]);
  const episode = useMemo(() => episodes.find((entry) => entry.publicationId === selectedPublicationId) || null, [episodes, selectedPublicationId]);
  const journey = journeyForIssue(issue);
  const isCollegeIssue = journey?.key === 'college-player';
  const liveCoverage = useMemo(() => {
    if (!issue || !isCollegeIssue) return null;
    try {
      return buildProgramCoverageContext(state, issue);
    } catch {
      return null;
    }
  }, [state, issue, isCollegeIssue]);
  const coverageDecision = liveCoverage?.coverageDecision || issue?.coverageDecision || episode?.coverageDecision || null;
  const noEpisodeWeek = Boolean(
    issue?.podcastCoverageStatus === 'no-episode'
    || (isCollegeIssue && coverageDecision && coverageDecision.podcastEligible === false),
  );
  const noEpisodeReason = issue?.podcastCoverageReason
    || coverageDecision?.noCoverageReason
    || 'Nothing changed enough on the football side to justify a full show this week.';

  const issueBrief = briefForIssue(issue);
  const episodeSegments = Array.isArray(episode?.segments) ? episode.segments : [];
  const episodeChapters = Array.isArray(episode?.chapters) ? episode.chapters : [];
  const hosts = PODCAST_PUBLIC_HOSTS_BY_ID;
  const selectedSegment = episodeSegments[segmentIndex];
  const episodeId = episode?.id;
  const episodeAudioStatus = episode?.audioStatus;
  const importance = issueImportance({ ...issue, coverageDecision });
  const impact = IMPACT_META[importance] || IMPACT_META.routine;
  const publicationId = issue?.publicationId || issue?.id || '';
  const latestPublicationId = latestIssue?.publicationId || latestIssue?.id || '';
  const isLatest = Boolean(publicationId && publicationId === latestPublicationId);
  const sourceCount = (Array.isArray(episode?.citedFactKeys) ? episode.citedFactKeys.length : 0) || issueBrief.citedFactKeys.length;
  const opponent = issueOpponent(issue);
  const publishedDate = formatEpisodeDate(episode, issue);
  const status = episodeStatus(episode, noEpisodeWeek);
  const continuousAudio = Boolean(episode?.audioContinuous || audioSegments?.[0]?.continuous);
  const activeAudioSegment = continuousAudio ? audioSegments?.[0] : audioSegments?.[segmentIndex];
  const audioReady = Boolean(activeAudioSegment && episodeSegments.length);
  const currentChapter = episodeChapters.find((chapter, index) => {
    const next = episodeChapters[index + 1];
    return segmentIndex >= (Number(chapter.segmentStart) || 0) && (!next || segmentIndex < (Number(next.segmentStart) || 0));
  });
  const currentIdentity = identityForChapter(currentChapter, Math.max(0, episodeChapters.indexOf(currentChapter)), Math.max(1, episodeChapters.length));
  const archiveGroups = useMemo(() => buildJourneyArchive(issues, episodes), [issues, episodes]);
  const selectedJourneyKey = journey?.key || '';
  const playbackPercent = continuousAudio
    ? (audioDuration > 0 ? Math.min(100, (audioCurrentTime / audioDuration) * 100) : 0)
    : (audioReady && episodeSegments.length ? ((segmentIndex + 1) / episodeSegments.length) * 100 : 0);

  useEffect(() => {
    if (initialPublicationId) setSelectedPublicationId(initialPublicationId);
  }, [initialPublicationId]);

  useEffect(() => {
    let cancelled = false;
    setAudioSegments(null);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setIsPlaying(false);
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

  const selectPublication = (nextPublicationId) => {
    setSegmentIndex(0);
    setAudioSegments(null);
    setIsPlaying(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setError('');
    setSelectedPublicationId(nextPublicationId);
    setGeneration(null);
    setShowTranscript(false);
  };

  const handleCoverChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || typeof onCoverUpload !== 'function') return;
    setError('');
    try {
      await onCoverUpload(file);
    } catch (uploadError) {
      setError(uploadError.message || 'The podcast cover could not be uploaded.');
    }
  };

  const generateLegacy = async () => {
    if (!issue || sourceCount < 1 || typeof onGenerate !== 'function' || isCollegeIssue) return;
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
    if (!audioRef.current || !audioReady) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  const moveSegment = (nextIndex) => {
    if (!episodeSegments.length) return;
    const bounded = Math.max(0, Math.min(Number(nextIndex) || 0, episodeSegments.length - 1));
    setSegmentIndex(bounded);
    if (!continuousAudio && audioSegments?.[bounded]) {
      setAudioCurrentTime(0);
      setAudioDuration(0);
      setIsPlaying(true);
    }
  };

  const onEnded = () => {
    if (continuousAudio) {
      setIsPlaying(false);
      setAudioCurrentTime(0);
      setSegmentIndex(0);
      return;
    }
    if (segmentIndex < episodeSegments.length - 1 && audioSegments?.[segmentIndex + 1]) {
      setSegmentIndex((index) => index + 1);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      setSegmentIndex(0);
    }
  };

  const coverControl = !readOnly && typeof onCoverUpload === 'function' ? (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-blue-200 transition-colors hover:bg-blue-500/20">
      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={coverBusy} onChange={handleCoverChange} />
      {coverBusy ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
      {coverBusy ? 'Uploading Cover…' : (hasCustomArtwork ? 'Change Podcast Cover' : 'Upload Full-Resolution Cover')}
    </label>
  ) : null;

  const progressPercent = generation?.total ? Math.round((generation.current / generation.total) * 100) : 12;

  return (
    <div className="relative z-10 mx-auto max-w-7xl space-y-6 pb-20 animate-in fade-in">
      <header className="overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-950/92 shadow-2xl backdrop-blur-md">
        <div className="grid gap-5 p-5 sm:grid-cols-[120px_minmax(0,1fr)] sm:p-6 md:grid-cols-[140px_minmax(0,1fr)_auto] md:items-center">
          <div className="space-y-2">
            <div className="aspect-square overflow-hidden rounded-2xl border border-blue-400/25 bg-slate-950 shadow-xl">
              <img src={showArtwork} onError={() => setCoverFailed(true)} alt="The Gridiron Grind podcast cover" className="h-full w-full object-contain" />
            </div>
            <div className="sm:hidden">{coverControl}</div>
          </div>
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-300"><Radio size={13} /> DynastyHQ Original · College Football</p>
            <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-white md:text-4xl">{PODCAST_SHOW.name}</h1>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400 md:text-sm">{PODCAST_SHOW.description}</p>
            <div className="mt-3 hidden sm:block">{coverControl}</div>
          </div>
          <div className="sm:col-span-2 md:col-span-1 md:text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Hosted by</p>
            <p className="mt-1 text-xs font-black text-slate-200">{PODCAST_PUBLIC_HOSTS.map((host) => host.name).join(' · ')}</p>
            <p className="mt-1 text-[10px] text-slate-600">{PODCAST_SHOW.disclosure}</p>
          </div>
        </div>
      </header>

      {!issues.length ? (
        <section className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/80 p-8 text-center shadow-xl md:p-12">
          <Headphones className="mx-auto text-blue-400" size={42} />
          <h2 className="mt-4 text-2xl font-black text-white">The studio is waiting for kickoff.</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">Publish a verified football week first. DynastyHQ will decide whether it deserves a show instead of forcing an episode every week.</p>
        </section>
      ) : (
        <>
          <section className={`overflow-hidden rounded-3xl border bg-slate-950/92 shadow-2xl backdrop-blur-md ${impact.shell}`} data-episode-importance={importance}>
            <div className="grid lg:grid-cols-[330px_minmax(0,1fr)]">
              <div className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-blue-950 via-slate-950 to-slate-900 lg:border-b-0 lg:border-r">
                <img src={showArtwork} onError={() => setCoverFailed(true)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 blur-md scale-110" aria-hidden="true" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/15" />
                <div className="relative flex min-h-[360px] flex-col p-6 lg:min-h-[470px] lg:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${impact.badge}`}>{noEpisodeWeek ? 'No Show Needed' : impact.label}</span>
                    <span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${status.classes}`}>{status.label}</span>
                  </div>
                  <div className="my-6 flex flex-1 items-center justify-center">
                    <img src={showArtwork} onError={() => setCoverFailed(true)} alt="The Gridiron Grind" className="aspect-square w-full max-w-[250px] rounded-2xl border border-white/10 object-contain shadow-2xl" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">{isLatest ? 'Current Week' : 'From the Archive'}</p>
                    <p className="mt-1 text-3xl font-black uppercase tracking-tight text-white">S{issue?.season || 1}<span className="text-blue-400">·</span>W{issue?.week ?? 0}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-wider text-slate-300">
                      {episode?.estimatedMinutes && <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1.5"><Clock3 size={11} /> ~{episode.estimatedMinutes} min</span>}
                      {opponent && <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1.5">vs {opponent}</span>}
                      {issue?.careerPhase && <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1.5">{issue.careerPhase}</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 lg:p-9">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">{noEpisodeWeek ? 'Editorial decision' : impact.eyebrow}</span>
                  {publishedDate && <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600"><CalendarDays size={12} /> {publishedDate}</span>}
                </div>

                {noEpisodeWeek && !episode ? (
                  <>
                    <h2 className="mt-3 max-w-4xl text-3xl font-black leading-tight tracking-tight text-white md:text-4xl">No new episode this week</h2>
                    <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-400 md:text-[15px]">The Gridiron Grind is staying quiet because there was not enough meaningful football movement to justify a full show. That is intentional — the previous real episode remains the latest produced show.</p>
                    <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Why no episode?</p>
                      <p className="mt-2 text-xs leading-6 text-slate-400">{noEpisodeReason}</p>
                    </div>
                    {!readOnly && <p className="mt-4 text-xs leading-5 text-slate-500">If the verified facts for this week change later, use the Podcast v3 panel to re-check the editorial gate.</p>}
                  </>
                ) : (
                  <>
                    <h2 className="mt-3 max-w-4xl text-3xl font-black leading-[1.05] tracking-tight text-white md:text-5xl">{episode?.title || issueBrief.title}</h2>
                    <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-400 md:text-[15px]">{episode?.summary || issueBrief.summary}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300"><ShieldCheck size={12} /> {sourceCount} verified source{sourceCount === 1 ? '' : 's'}</span>
                      <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400"><Volume2 size={12} /> Mark + Sarah</span>
                      {coverageDecision?.tier && <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400">{coverageDecision.tier.replace('-', ' ')}</span>}
                      {episode && <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400"><FileText size={12} /> {episode.transcriptWordCount || '—'} words</span>}
                    </div>
                  </>
                )}

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
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-300">{audioReady ? (continuousAudio ? 'Continuous episode' : currentIdentity.title) : 'Transcript saved · audio pending'}</p>
                          {audioReady && !continuousAudio && <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Turn {segmentIndex + 1}/{episodeSegments.length}</span>}
                          {audioReady && continuousAudio && <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">{formatClock(audioCurrentTime)} / {formatClock(audioDuration)}</span>}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-white">{continuousAudio ? episode.title : (selectedSegment ? `${hosts.get(selectedSegment.hostId)?.name || 'Host'} — ${selectedSegment.text}` : episode.title)}</p>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-blue-500 transition-all" style={{ width: `${playbackPercent}%` }} /></div>
                      </div>
                      {!continuousAudio && (
                        <div className="flex shrink-0 gap-2">
                          <button type="button" aria-label="Previous segment" disabled={!audioReady || segmentIndex === 0} onClick={() => moveSegment(segmentIndex - 1)} className="rounded-xl border border-slate-700 p-2.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30"><SkipBack size={18} /></button>
                          <button type="button" aria-label="Next segment" disabled={!audioReady || segmentIndex >= episodeSegments.length - 1} onClick={() => moveSegment(segmentIndex + 1)} className="rounded-xl border border-slate-700 p-2.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30"><SkipForward size={18} /></button>
                        </div>
                      )}
                    </div>
                    {audioReady && (
                      <audio
                        ref={audioRef}
                        src={audioSegmentDataUrl(activeAudioSegment)}
                        onEnded={onEnded}
                        onPause={() => setIsPlaying(false)}
                        onPlay={() => setIsPlaying(true)}
                        onLoadedMetadata={(event) => setAudioDuration(Number(event.currentTarget.duration) || 0)}
                        onTimeUpdate={(event) => setAudioCurrentTime(Number(event.currentTarget.currentTime) || 0)}
                        className="hidden"
                      />
                    )}
                    {continuousAudio && audioReady && <p className="mt-3 text-[10px] leading-5 text-slate-500">Humanized v3 plays as one uninterrupted conversation. The transcript remains available below, but DynastyHQ no longer fakes exact turn timestamps.</p>}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2.5">
                  {!readOnly && !isCollegeIssue && !noEpisodeWeek && (!episode || episode.audioStatus !== 'ready') && (
                    <button type="button" disabled={Boolean(generation) || sourceCount < 1} onClick={generateLegacy} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:opacity-70">
                      <Sparkles size={15} /> {sourceCount < 1 ? 'Verified Sources Required' : (episode ? 'Generate Episode Audio' : 'Generate Full Episode')}
                    </button>
                  )}
                  {!readOnly && isCollegeIssue && !noEpisodeWeek && !episode && (
                    <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 px-4 py-3 text-[10px] font-bold leading-5 text-cyan-200">Use the Podcast v3 panel to create the transcript first. Audio stays separate until you approve the writing.</div>
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
                    <h3 className="mt-1 text-2xl font-black text-white">The show, chapter by chapter</h3>
                  </div>
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-600"><Layers3 size={13} /> {episodeChapters.length} chapters</span>
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
                          {active && audioReady && !continuousAudio && <span className="rounded-full bg-blue-500/15 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-blue-300">Playing</span>}
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
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-slate-600">Verified sources</p><p className="mt-1 text-2xl font-black text-emerald-300">{sourceCount}</p></div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-slate-600">Episode length</p><p className="mt-1 text-lg font-black text-white">~{episode.estimatedMinutes || '—'} minutes</p><p className="mt-1 text-[10px] text-slate-600">{episode.transcriptWordCount || '—'} spoken words</p></div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-slate-600">Playback</p><p className="mt-1 text-sm font-black text-white">{continuousAudio ? 'Continuous Humanized v3' : 'Legacy segmented audio'}</p><p className="mt-1 text-[10px] leading-relaxed text-slate-600">{continuousAudio ? 'One uninterrupted Mark + Sarah mix.' : 'Older archived episodes retain their original turn-by-turn playback.'}</p></div>
                </div>
              </aside>
            </section>
          ) : noEpisodeWeek ? (
            <section className="rounded-3xl border border-slate-700 bg-slate-950/75 p-8 text-center shadow-xl">
              <Radio className="mx-auto text-slate-500" size={32} />
              <h3 className="mt-3 text-xl font-black text-white">Quiet weeks stay quiet.</h3>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">The archive records that this week did not warrant a show without creating a fake episode. The latest legitimate episode remains available in the archive below.</p>
            </section>
          ) : (
            <section className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/75 p-8 text-center shadow-xl">
              <Mic2 className="mx-auto text-blue-400" size={32} />
              <h3 className="mt-3 text-xl font-black text-white">The weekly brief is ready for the booth.</h3>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{isCollegeIssue ? 'Use the Podcast v3 panel to run the editorial gate and create a transcript. If the week is too thin, DynastyHQ will leave it quiet.' : (sourceCount > 0 ? 'Generate the episode when you want the script and audio.' : 'This archived brief does not have preserved verified source facts, so DynastyHQ will keep it as a brief rather than inventing an episode.')}</p>
            </section>
          )}

          {episode && (
            <section className="overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-950/88 shadow-2xl">
              <button type="button" onClick={() => setShowTranscript((value) => !value)} className="flex w-full items-center justify-between gap-4 p-5 text-left md:p-6">
                <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Full Episode Transcript</p><p className="mt-1 text-sm font-black text-white">Read or audit every host turn</p></div>
                <ChevronDown className={`text-slate-500 transition-transform ${showTranscript ? 'rotate-180' : ''}`} size={20} />
              </button>
              {showTranscript && (
                <div className="border-t border-slate-800 p-5 md:p-6">
                  {continuousAudio && <p className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-[10px] leading-5 text-slate-500">Transcript turns are shown for reading only. Continuous Humanized Audio no longer uses guessed turn timestamps.</p>}
                  <div className="space-y-4">
                    {episodeSegments.map((segment, index) => {
                      const host = hosts.get(segment.hostId);
                      return (
                        <button key={segment.id} type="button" onClick={() => moveSegment(index)} className={`block w-full rounded-2xl border p-4 text-left transition-colors ${index === segmentIndex ? 'border-blue-500/55 bg-blue-500/10' : 'border-slate-800 bg-slate-900/45 hover:border-slate-700'}`}>
                          <p className="mb-2 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-wider text-blue-300"><CheckCircle2 size={12} /> {host?.name || 'Host'} <span className="text-slate-600">·</span> {host?.role || 'Analyst'}</p>
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

          <section className="overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-950/88 shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-slate-800 p-5 md:flex-row md:items-end md:justify-between md:p-7">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">RTG → Coach Journey Archive</p>
                <h3 className="mt-1 text-2xl font-black text-white">Browse the show by career chapter</h3>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">Every newsroom week can appear here, but only weeks that actually deserved a show count as produced episodes.</p>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{archiveGroups.length} chapter{archiveGroups.length === 1 ? '' : 's'} · {issues.length} weeks · {episodes.length} produced</p>
            </div>

            <div className="divide-y divide-slate-800">
              {archiveGroups.map((group) => {
                const expanded = expandedJourneyKey === group.key;
                const containsSelected = selectedJourneyKey === group.key;
                const latestItem = group.items[0];
                return (
                  <div key={group.key} className={containsSelected ? 'bg-blue-500/[0.025]' : ''}>
                    <button type="button" aria-expanded={expanded} onClick={() => setExpandedJourneyKey((current) => current === group.key ? '' : group.key)} className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-slate-900/65 md:p-6">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-black ${containsSelected ? 'border-blue-500/40 bg-blue-500/10 text-blue-300' : 'border-slate-700 bg-slate-900 text-slate-500'}`}>{String(group.order).padStart(2, '0')}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-400">{group.eyebrow}</p>
                          {containsSelected && <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-blue-300">Selected week</span>}
                        </div>
                        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <h4 className="text-base font-black text-white md:text-lg">{group.title}</h4>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">{group.items.length} week{group.items.length === 1 ? '' : 's'} · {group.producedCount} produced</span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{group.description}</p>
                      </div>
                      <div className="hidden shrink-0 text-right sm:block">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">Latest</p>
                        <p className="mt-1 text-xs font-black text-slate-300">S{latestItem?.issue?.season || 1} · W{latestItem?.issue?.week ?? 0}</p>
                      </div>
                      <ChevronDown className={`shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} size={20} />
                    </button>

                    {expanded && (
                      <div className="border-t border-slate-800/80 bg-slate-950/45 px-4 pb-5 pt-3 md:px-6 md:pb-6">
                        <div className="space-y-4">
                          {group.seasons.map((seasonGroup) => (
                            <div key={`${group.key}-season-${seasonGroup.season}`} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/45">
                              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                                <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Season {seasonGroup.season}</p><p className="mt-0.5 text-[10px] text-slate-600">{seasonGroup.items.length} archived week{seasonGroup.items.length === 1 ? '' : 's'}</p></div>
                              </div>
                              <div className="divide-y divide-slate-800/80">
                                {seasonGroup.items.map((archiveItem) => {
                                  const archiveIssue = archiveItem.issue;
                                  const archivedEpisode = archiveItem.episode;
                                  const archivedBrief = briefForIssue(archiveIssue);
                                  const selected = archiveItem.publicationId === publicationId;
                                  const archivedNoEpisode = archiveIssue?.podcastCoverageStatus === 'no-episode' || archiveIssue?.coverageDecision?.podcastEligible === false;
                                  const archivedImpact = IMPACT_META[issueImportance(archiveIssue)] || IMPACT_META.routine;
                                  const archivedStatus = episodeStatus(archivedEpisode, archivedNoEpisode);
                                  const archiveDate = formatEpisodeDate(archivedEpisode, archiveIssue);
                                  return (
                                    <button key={archiveItem.publicationId} type="button" onClick={() => selectPublication(archiveItem.publicationId)} className={`grid w-full gap-3 px-4 py-3 text-left transition-colors md:grid-cols-[90px_minmax(0,1fr)_auto] md:items-center ${selected ? 'bg-blue-500/10' : 'hover:bg-slate-900'}`}>
                                      <div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-400">Week {archiveIssue.week ?? 0}</p>{archiveDate && <p className="mt-1 text-[9px] text-slate-600">{archiveDate}</p>}</div>
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2"><p className="truncate text-xs font-black text-white md:text-sm">{archivedNoEpisode && !archivedEpisode ? 'No new episode this week' : (archivedEpisode?.title || archivedBrief.title)}</p>{selected && <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-blue-300">Selected</span>}</div>
                                        <p className="mt-1 line-clamp-1 text-[10px] leading-4 text-slate-600">{archivedNoEpisode && !archivedEpisode ? 'Editorially quiet week — no show was forced.' : (archivedEpisode?.summary || archivedBrief.summary)}</p>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                                        {!archivedNoEpisode && <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${archivedImpact.badge}`}>{archivedImpact.label}</span>}
                                        <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${archivedStatus.classes}`}>{archivedStatus.label}</span>
                                        {archivedEpisode?.estimatedMinutes && <span className="text-[9px] font-bold text-slate-600">~{archivedEpisode.estimatedMinutes} min</span>}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const PodcastStudio = (props) => (
  <PodcastStudioBoundary>
    <PodcastStudioContent {...props} />
  </PodcastStudioBoundary>
);

export default PodcastStudio;
