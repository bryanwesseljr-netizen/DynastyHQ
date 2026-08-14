const WORDS_PER_MINUTE = 145;

export const PODCAST_HOSTS = [
  {
    id: 'marcus-grant',
    name: 'Mark Thompson',
    role: 'Lead Host & College Football Insider',
    voice: 'cedar',
  },
  {
    id: 'tyler-brooks',
    name: 'Sarah Chen',
    role: 'College Football Analyst',
    voice: 'coral',
  },
];

const text = (value, max = 5000) => String(value || '').trim().slice(0, max);
const wordCount = (value) => text(value).split(/\s+/).filter(Boolean).length;

const latestFactsForIssue = (state, issue) => {
  const allowedKeys = new Set(issue?.podcastBrief?.citedFactKeys || []);
  const factsByKey = new Map();
  (state.factLedger || []).forEach((fact) => {
    if (!fact?.verified || !allowedKeys.has(fact.key)) return;
    if (fact.publicationId && fact.publicationId !== issue.publicationId) return;
    factsByKey.set(fact.key, {
      key: fact.key,
      label: text(fact.label, 160),
      value: fact.value,
    });
  });
  return [...factsByKey.values()];
};

export const findPodcastIssue = (state, publicationId) => (
  (state.newsroomIssues || []).find((issue) => issue.publicationId === publicationId || issue.id === publicationId) || null
);

export const findPodcastEpisode = (state, publicationId) => (
  (state.podcastEpisodes || []).find((episode) => episode.publicationId === publicationId) || null
);

export const buildPodcastGenerationPayload = (state, publicationId) => {
  const issue = findPodcastIssue(state, publicationId);
  if (!issue?.podcastBrief) throw new Error('A verified newsroom issue is required before generating an episode.');
  const facts = latestFactsForIssue(state, issue);
  if (!facts.length) throw new Error('The selected issue has no verified facts available for a podcast.');

  return {
    publicationId: issue.publicationId || issue.id,
    season: Number(issue.season) || 1,
    week: Number(issue.week) || 1,
    careerPhase: text(issue.careerPhase, 40),
    brief: {
      title: text(issue.podcastBrief.title, 240),
      summary: text(issue.podcastBrief.summary, 1200),
    },
    hosts: PODCAST_HOSTS.map(({ id, name, role }) => ({ id, name, role })),
    facts,
  };
};

const normalizeCitations = (keys, allowedKeys) => (
  [...new Set(Array.isArray(keys) ? keys : [])]
    .filter((key) => allowedKeys.has(key))
);

export const normalizeGeneratedPodcast = ({ generated, payload, model = '' }) => {
  const allowedKeys = new Set(payload.facts.map((fact) => fact.key));
  const hostIds = new Set(PODCAST_HOSTS.map((host) => host.id));
  const chapters = (generated?.chapters || []).slice(0, 8).map((chapter, index) => ({
    id: text(chapter.id, 80) || `chapter-${index + 1}`,
    title: text(chapter.title, 120) || `Chapter ${index + 1}`,
    summary: text(chapter.summary, 400),
    segmentStart: Math.max(0, Number(chapter.segmentStart) || 0),
  }));
  const chapterIds = new Set(chapters.map((chapter) => chapter.id));
  const segments = (generated?.segments || []).slice(0, 18).map((segment, index) => ({
    id: text(segment.id, 80) || `segment-${index + 1}`,
    hostId: hostIds.has(segment.hostId) ? segment.hostId : PODCAST_HOSTS[index % PODCAST_HOSTS.length].id,
    chapterId: chapterIds.has(segment.chapterId) ? segment.chapterId : (chapters[0]?.id || ''),
    text: text(segment.text, 1800),
    citedFactKeys: normalizeCitations(segment.citedFactKeys, allowedKeys),
  })).filter((segment) => segment.text);

  if (segments.length < 6) throw new Error('The podcast script was incomplete. Please try generating it again.');
  const transcriptWordCount = segments.reduce((total, segment) => total + wordCount(segment.text), 0);
  if (transcriptWordCount < 650 || transcriptWordCount > 950) {
    throw new Error('The generated episode fell outside the five-to-six-minute script range. Please try again.');
  }

  const citedFactKeys = [...new Set(segments.flatMap((segment) => segment.citedFactKeys))];
  if (!citedFactKeys.length) throw new Error('The generated episode did not cite its verified source facts.');

  return {
    id: `podcast-${payload.publicationId}`,
    publicationId: payload.publicationId,
    season: payload.season,
    week: payload.week,
    careerPhase: payload.careerPhase,
    title: text(generated.title, 240) || payload.brief.title,
    summary: text(generated.summary, 700) || payload.brief.summary,
    generatedAt: new Date().toISOString(),
    status: 'scripted',
    audioStatus: 'not-generated',
    scriptModel: text(model, 80),
    audioModel: '',
    hosts: PODCAST_HOSTS,
    chapters,
    segments,
    citedFactKeys,
    transcriptWordCount,
    estimatedMinutes: Math.max(1, Math.round((transcriptWordCount / WORDS_PER_MINUTE) * 10) / 10),
  };
};

export const upsertPodcastEpisode = (state, episode) => {
  const episodes = state.podcastEpisodes || [];
  const existingIndex = episodes.findIndex((entry) => entry.publicationId === episode.publicationId);
  if (existingIndex === -1) return { ...state, podcastEpisodes: [...episodes, episode] };
  return {
    ...state,
    podcastEpisodes: episodes.map((entry, index) => index === existingIndex ? { ...entry, ...episode } : entry),
  };
};

export const markPodcastAudioReady = (state, publicationId, { model = '', segmentCount = 0 } = {}) => {
  const episode = findPodcastEpisode(state, publicationId);
  if (!episode) return state;
  return upsertPodcastEpisode(state, {
    ...episode,
    status: 'published',
    audioStatus: 'ready',
    audioModel: text(model, 80),
    audioSegmentCount: Number(segmentCount) || episode.segments.length,
    audioGeneratedAt: new Date().toISOString(),
  });
};

export const podcastTranscriptText = (episode) => {
  const canonicalHosts = new Map(PODCAST_HOSTS.map((host) => [host.id, host.name]));
  const hosts = new Map((episode?.hosts || PODCAST_HOSTS).map((host) => [
    host.id,
    canonicalHosts.get(host.id) || host.name,
  ]));
  const lines = [
    'THE GRIDIRON GRIND',
    episode?.title || 'Episode',
    `Season ${episode?.season || 1}, Week ${episode?.week || 1}`,
    'AI-generated voices',
    '',
  ];
  (episode?.segments || []).forEach((segment) => {
    lines.push(`${hosts.get(segment.hostId) || 'Host'}: ${segment.text}`, '');
  });
  return lines.join('\n').trim();
};