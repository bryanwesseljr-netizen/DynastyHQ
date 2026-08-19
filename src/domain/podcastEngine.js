import {
  PODCAST_HOSTS,
  PODCAST_PUBLIC_HOSTS,
  PODCAST_PUBLIC_HOSTS_BY_ID,
} from './podcastShow.js';
import { buildProgramCoverageContext } from './programCoverage.js';

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
  'rtg.coachTrust', 'rtg.trustToNext', 'rtg.skillPoints', 'rtg.weeklyPoints', 'rtg.energy',
  'rtg.gpa', 'rtg.examWeeks', 'rtg.academicsStanding', 'rtg.academicsAbility',
  'rtg.academicsCoachHappinessBonus', 'rtg.leadershipLevel', 'rtg.leadershipAbility',
  'rtg.leadershipCoachHappinessBonus', 'rtg.leadershipTeamXpMultiplier', 'rtg.leadershipComposureBonus',
  'rtg.healthLevel', 'rtg.injuryRisk', 'rtg.healthWearImpact', 'rtg.fitnessLevel',
  'rtg.fitnessCoachHappinessBonus', 'rtg.fitnessTeamXpMultiplier', 'rtg.fitnessComposureBonus',
  'rtg.fitnessWeightBonus', 'rtg.fitnessWearImpact', 'rtg.followers', 'rtg.brandTier',
  'rtg.nextFanMilestone', 'rtg.brandEngagement', 'rtg.dealTier', 'rtg.brandAbility',
  'rtg.nilWeeklyCost', 'rtg.openNilSlots', 'rtg.valuation', 'rtg.sponsorships',
  'rtg.coachHappiness', 'rtg.draftProjection',
]).has(key) || key.startsWith('rtg.wear.');

const podcastUseFor = (fact, coverageStage) => {
  const key = text(fact?.key, 180);
  if (!key) return 'exclude';
  if (coverageStage === 'college-player' && isHighSchoolLegacyFact(key)) return 'exclude';
  if (coverageStage === 'college-player' && key.startsWith('recruiting.')) return 'exclude';
  if (coverageStage === 'college-player' && isMechanicalRtgFact(key)) return 'exclude';
  if (coverageStage === 'coach' && (key.startsWith('rtg.') || key.startsWith('highSchool.') || key.startsWith('recruiting.profile.'))) return 'exclude';
  if (key === 'player.coverageRelevance') return 'background-only';
  if (key.startsWith('program.') || key.startsWith('player.')) return fact.editorialUse || 'context';
  if (key.startsWith('game.')) return 'primary';
  if (key.startsWith('milestone.') || key.startsWith('award.') || key.startsWith('transfer.') || key.startsWith('portal.')) return 'primary';
  if (key === 'weekly.note' && text(fact.value, 800)) return 'primary';
  if (key === 'rtg.rank') return 'primary';
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

const factsForIssue = (state, issue, coverageStage, coverageContext = null) => {
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
  if (coverageStage === 'college-player') {
    (coverageContext?.facts || []).forEach((fact) => {
      const editorialUse = podcastUseFor(fact, coverageStage);
      if (editorialUse === 'exclude') return;
      factsByKey.set(fact.key, {
        key: fact.key,
        label: text(fact.label, 160),
        value: fact.value,
        editorialUse,
      });
    });
  }
  return [...factsByKey.values()];
};

const editorialBriefFor = (state, issue, coverageStage, coverageContext = null) => {
  const playerName = text(state.player?.name, 120) || 'the quarterback';
  const school = text(state.player?.college || state.player?.school, 160) || 'the program';
  const label = text(issue.label || issue.weekLabel, 160) || `Week ${Number(issue.week ?? 1)}`;
  const weekType = text(issue.weekType, 60);
  const weekPhase = text(issue.weekPhase, 80);
  const relevance = coverageContext?.relevance;
  const program = coverageContext?.program;

  if (coverageStage === 'college-player' && (weekType === 'bye' || !program?.currentGame)) {
    const phaseAngle = weekPhase === 'postseason'
      ? 'postseason positioning, preparation, pressure, and the path ahead'
      : weekPhase === 'preseason'
        ? 'the program’s opening-week preparation, quarterback hierarchy, roster opportunity, and what must take shape before the opener'
        : 'reset, preparation, season trajectory, role evaluation, recovery, and the next opportunity';
    const playerAngle = relevance?.roleChanged
      ? ` A real depth-chart change (${relevance.previousRole} to ${relevance.currentRole}) gives ${playerName} a legitimate QB-room segment.`
      : relevance?.level === 'low'
        ? ` ${playerName} is low-relevance this week and should not be forced into the conversation.`
        : ' Mention the tracked player only to the extent his verified football role warrants it.';
    return {
      title: `${school} ${label}: the program outlook`,
      summary: `Lead with ${school} and ${phaseAngle}. Current verified team record: ${program?.record || '0-0'}.${playerAngle}`,
    };
  }

  if (coverageStage === 'college-player') {
    const relevanceInstruction = relevance?.level === 'primary'
      ? `${playerName} is a primary football storyline this week because his verified role/playing time warrants it, but the game result and team stakes still frame the episode.`
      : relevance?.level === 'high'
        ? `${playerName} deserves a meaningful secondary segment, not ownership of the whole show.`
        : relevance?.level === 'developing'
          ? `${playerName} may get a concise spotlight for a real role or opportunity development, while the game/program remain the main show.`
          : `${playerName} is not a meaningful player storyline this week; do not manufacture a QB segment just because he is the tracked player.`;
    return {
      title: `${school} Week ${Number(issue.week ?? 0)}: the game and what it means`,
      summary: `Discuss the actual ${school} game first: result, opponent, score, meaningful verified team/player statistics, current ${program?.record || 'season'} record, momentum, and what changes next. ${relevanceInstruction}`,
    };
  }

  if (coverageStage === 'coach') {
    return {
      title: text(issue.podcastBrief?.title, 240) || `${school} ${label}: program outlook`,
      summary: 'Discuss the real coaching and program story: result, team performance, roster decisions, recruiting wins/losses, portal movement, depth concerns, postseason stakes, and career pressure supported by the packet. Keep management counters and game currencies out of the conversation.',
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
  const coverageContext = coverageStage === 'college-player' ? buildProgramCoverageContext(state, issue) : null;
  const facts = factsForIssue(state, issue, coverageStage, coverageContext);
  const usableFacts = facts.filter((fact) => fact.editorialUse !== 'background-only');
  if (!usableFacts.length) throw new Error('The selected issue has no football facts available for a podcast.');
  const brief = editorialBriefFor(state, issue, coverageStage, coverageContext);

  return {
    publicationId: issue.publicationId || issue.id,
    season: Number(issue.season) || 1,
    week: Math.max(0, Number(issue.week) || 0),
    label: text(issue.label || issue.weekLabel, 160),
    weekType: text(issue.weekType, 60),
    weekPhase: text(issue.weekPhase, 80),
    careerPhase: text(issue.careerPhase, 40),
    coverageStage,
    coveragePlan: coverageContext ? {
      program: coverageContext.program,
      playerRelevance: coverageContext.relevance,
      editorialPrinciple: 'Discuss the team/game first. Make the tracked player a focal point only when his football relevance warrants it.',
    } : null,
    brief,
    hosts: PODCAST_PUBLIC_HOSTS.map((host) => ({ ...host })),
    facts,
  };
};

const normalizeCitations = (keys, allowedKeys) => (
  [...new Set(Array.isArray(keys) ? keys : [])]
    .filter((key) => allowedKeys.has(key))
);

const normalizeDelivery = (value) => {
  const normalized = text(value, 40).toLowerCase();
  return ['neutral', 'curious', 'reflective', 'skeptical', 'emphatic', 'amused', 'quick-agreement', 'analytical'].includes(normalized)
    ? normalized
    : 'neutral';
};

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
  const segments = (generated?.segments || []).slice(0, 20).map((segment, index) => ({
    id: text(segment.id, 80) || `segment-${index + 1}`,
    hostId: hostIds.has(segment.hostId) ? segment.hostId : PODCAST_HOSTS[index % PODCAST_HOSTS.length].id,
    chapterId: chapterIds.has(segment.chapterId) ? segment.chapterId : (chapters[0]?.id || ''),
    text: text(segment.text, 1800),
    deliveryStyle: normalizeDelivery(segment.deliveryStyle),
    citedFactKeys: normalizeCitations(segment.citedFactKeys, allowedKeys),
  })).filter((segment) => segment.text);

  if (segments.length < 10) throw new Error('The podcast script was incomplete. Please try generating it again.');
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
    coverageStage: payload.coverageStage,
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
    `Season ${episode?.season || 1}, Week ${episode?.week ?? 0}`,
    'Hosted by Mark Thompson and Sarah Chen',
    'AI-generated voices',
    '',
  ];
  (episode?.segments || []).forEach((segment) => {
    lines.push(`${PODCAST_PUBLIC_HOSTS_BY_ID.get(segment.hostId)?.name || 'Host'}: ${segment.text}`, '');
  });
  return lines.join('\n').trim();
};
