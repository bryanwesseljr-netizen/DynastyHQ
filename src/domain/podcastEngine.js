import {
  PODCAST_HOSTS,
  PODCAST_PUBLIC_HOSTS,
  PODCAST_PUBLIC_HOSTS_BY_ID,
} from './podcastShow.js';

const WORDS_PER_MINUTE = 145;

const text = (value, max = 5000) => String(value || '').trim().slice(0, max);
const wordCount = (value) => text(value).split(/\s+/).filter(Boolean).length;

const coverageStageFor = (state = {}, issue = {}) => {
  const phase = text(issue.careerPhase || state.careerPhase, 40);
  if (['OC', 'HC'].includes(phase)) return 'coach';
  if (['high-school-evaluation', 'recruiting'].includes(text(issue.editionType, 80))) return 'high-school';
  if (state.player?.isCommitted || state.player?.college) return 'college-player';
  return 'high-school';
};

const isHighSchoolLegacyFact = (key) => (
  key.startsWith('highSchool.')
  || key.startsWith('recruiting.profile.')
  || key === 'profile.player.stars'
  || key === 'profile.player.nationalQbRank'
);

const isMechanicalRtgFact = (key) => new Set([
  'profile.player.overall',
  'rtg.coachTrust',
  'rtg.trustToNext',
  'rtg.skillPoints',
  'rtg.weeklyPoints',
  'rtg.energy',
  'rtg.gpa',
  'rtg.examWeeks',
  'rtg.academicsStanding',
  'rtg.academicsAbility',
  'rtg.academicsCoachHappinessBonus',
  'rtg.leadershipLevel',
  'rtg.leadershipAbility',
  'rtg.leadershipCoachHappinessBonus',
  'rtg.leadershipTeamXpMultiplier',
  'rtg.leadershipComposureBonus',
  'rtg.healthLevel',
  'rtg.injuryRisk',
  'rtg.healthWearImpact',
  'rtg.fitnessLevel',
  'rtg.fitnessCoachHappinessBonus',
  'rtg.fitnessTeamXpMultiplier',
  'rtg.fitnessComposureBonus',
  'rtg.fitnessWeightBonus',
  'rtg.fitnessWearImpact',
  'rtg.followers',
  'rtg.brandTier',
  'rtg.nextFanMilestone',
  'rtg.brandEngagement',
  'rtg.dealTier',
  'rtg.brandAbility',
  'rtg.nilWeeklyCost',
  'rtg.openNilSlots',
  'rtg.valuation',
  'rtg.sponsorships',
  'rtg.coachHappiness',
]).has(key) || key.startsWith('rtg.wear.');

const podcastUseFor = (fact, coverageStage) => {
  const key = text(fact?.key, 180);
  if (!key) return 'exclude';
  if (coverageStage === 'college-player' && isHighSchoolLegacyFact(key)) return 'exclude';
  if (coverageStage === 'college-player' && key.startsWith('recruiting.')) return 'exclude';
  if (coverageStage === 'college-player' && isMechanicalRtgFact(key)) return 'exclude';
  if (coverageStage === 'coach' && (key.startsWith('rtg.') || key.startsWith('highSchool.') || key.startsWith('recruiting.profile.'))) return 'exclude';
  if (key.startsWith('game.')) return 'primary';
  if (key.startsWith('milestone.') || key.startsWith('award.') || key.startsWith('transfer.') || key.startsWith('portal.')) return 'primary';
  if (key === 'weekly.note' && text(fact.value, 800)) return 'primary';
  if (key === 'rtg.rank') return 'primary';
  if (key === 'rtg.draftProjection') return coverageStage === 'college-player' ? 'context' : 'exclude';
  if (isMechanicalRtgFact(key)) return coverageStage === 'high-school' ? 'context' : 'exclude';
  if (key.startsWith('highSchool.')) return coverageStage === 'high-school' ? 'primary' : 'exclude';
  if (key.startsWith('recruiting.')) return coverageStage === 'high-school' ? 'primary' : 'context';
  if (key.startsWith('coach.')) {
    return ['coach.portalDepartures', 'coach.openScholarships', 'coach.classCommits', 'coach.portalAdditions'].includes(key)
      ? 'primary'
      : 'context';
  }
  if (key.startsWith('roster.')) return 'context';
  if (key.startsWith('profile.player.')) return 'context';
  if (key.startsWith('weekly.')) return 'context';
  return 'context';
};

const factsForIssue = (state, issue, coverageStage) => {
  const publicationId = issue.publicationId || issue.id;
  const factsByKey = new Map();
  (state.factLedger || []).forEach((fact) => {
    if (!fact?.verified || fact.publicationId !== publicationId) return;
    const editorialUse = podcastUseFor(fact, coverageStage);
    if (editorialUse === 'exclude') return;
    factsByKey.set(fact.key, {
      key: fact.key,
      label: text(fact.label, 160),
      value: fact.value,
      editorialUse,
    });
  });
  return [...factsByKey.values()];
};

const editorialBriefFor = (state, issue, coverageStage) => {
  const playerName = text(state.player?.name, 120) || 'the quarterback';
  const school = text(state.player?.college || state.player?.school, 160) || 'the program';
  const label = text(issue.label || issue.weekLabel, 160) || `Week ${Number(issue.week ?? 1)}`;
  const weekType = text(issue.weekType, 60);
  const weekPhase = text(issue.weekPhase, 80);

  if (coverageStage === 'college-player' && weekType === 'bye') {
    const phaseAngle = weekPhase === 'postseason'
      ? 'postseason positioning, preparation, pressure, and the path ahead'
      : weekPhase === 'preseason'
        ? 'arrival, quarterback-room position, preparation, patience, and the path toward playing time'
        : 'reset, preparation, quarterback-room competition, recovery, and the next opportunity';
    return {
      title: `${school} ${label}: what matters next`,
      summary: `Discuss ${playerName}'s football situation during ${label}. Center ${phaseAngle}. Use the depth-chart role and any real football developments supplied in the packet, but do not discuss game ratings, progression points, academics meters, follower counts, brand meters, or old high-school recruiting mechanics.`,
    };
  }

  if (coverageStage === 'college-player') {
    return {
      title: text(issue.podcastBrief?.title, 240) || `${school} ${label}: the football story`,
      summary: `Discuss the actual football result, player performance, role, pressure, momentum, and season implications supported by the packet. Use statistics selectively to support analysis. Do not discuss tracker mechanics, ratings currencies, GPA, followers, or old high-school recruiting data.`,
    };
  }

  if (coverageStage === 'coach') {
    return {
      title: text(issue.podcastBrief?.title, 240) || `${school} ${label}: program outlook`,
      summary: `Discuss the real coaching and program story: results, roster decisions, recruiting wins or losses, portal movement, depth concerns, postseason stakes, and career pressure supported by the packet. Keep management counters and game currencies out of the conversation.`,
    };
  }

  return {
    title: text(issue.podcastBrief?.title, 240),
    summary: text(issue.podcastBrief?.summary, 1200),
  };
};

export { PODCAST_HOSTS };

export const findPodcastIssue = (state, publicationId) => (
  (state.newsroomIssues || []).find((issue) => issue.publicationId === publicationId || issue.id === publicationId) || null
);

export const findPodcastEpisode = (state, publicationId) => (
  (state.podcastEpisodes || []).find((episode) => episode.publicationId === publicationId) || null
);

export const buildPodcastGenerationPayload = (state, publicationId) => {
  const issue = findPodcastIssue(state, publicationId);
  if (!issue?.podcastBrief) throw new Error('A published newsroom issue is required before generating an episode.');
  const coverageStage = coverageStageFor(state, issue);
  const facts = factsForIssue(state, issue, coverageStage);
  if (!facts.length) throw new Error('The selected issue has no football facts available for a podcast.');
  const brief = editorialBriefFor(state, issue, coverageStage);

  return {
    publicationId: issue.publicationId || issue.id,
    season: Number(issue.season) || 1,
    week: Math.max(0, Number(issue.week) || 0),
    label: text(issue.label || issue.weekLabel, 160),
    weekType: text(issue.weekType, 60),
    weekPhase: text(issue.weekPhase, 80),
    careerPhase: text(issue.careerPhase, 40),
    coverageStage,
    brief,
    hosts: PODCAST_PUBLIC_HOSTS.map((host) => ({ ...host })),
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
  if (!citedFactKeys.length) throw new Error('The generated episode did not cite its source facts.');

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
    hosts: PODCAST_PUBLIC_HOSTS.map((host) => ({ ...host })),
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
    podcastEpisodes: episodes.map((entry, index) => index === existingIndex ? { ...entry, ...episode, hosts: PODCAST_PUBLIC_HOSTS.map((host) => ({ ...host })) } : entry),
  };
};

export const markPodcastAudioReady = (state, publicationId, { model = '', segmentCount = 0 } = {}) => {
  const episode = findPodcastEpisode(state, publicationId);
  if (!episode) return state;
  return upsertPodcastEpisode(state, {
    ...episode,
    hosts: PODCAST_PUBLIC_HOSTS.map((host) => ({ ...host })),
    status: 'published',
    audioStatus: 'ready',
    audioModel: text(model, 80),
    audioSegmentCount: Number(segmentCount) || episode.segments.length,
    audioGeneratedAt: new Date().toISOString(),
  });
};

export const podcastTranscriptText = (episode) => {
  const lines = [
    'THE GRIDIRON GRIND',
    episode?.title || 'Episode',
    `Season ${episode?.season || 1}, Week ${episode?.week ?? 1}`,
    'Hosted by Mark Thompson and Sarah Chen',
    'AI-generated voices',
    '',
  ];
  (episode?.segments || []).forEach((segment) => {
    lines.push(`${PODCAST_PUBLIC_HOSTS_BY_ID.get(segment.hostId)?.name || 'Host'}: ${segment.text}`, '');
  });
  return lines.join('\n').trim();
};
