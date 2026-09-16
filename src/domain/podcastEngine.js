export * from './podcastEngineBase.js';

import {
  buildPodcastGenerationPayload as buildBasePodcastGenerationPayload,
  normalizeGeneratedPodcast as normalizeBaseGeneratedPodcast,
} from './podcastEngineBase.js';
import {
  buildPublishedWeekEditorialPacket,
  editorialPacketFactRows,
} from './publishedWeekEditorialPacket.js';
import { assertSupportedNarrativeClaims } from './editorialPacketStoryPolicy.js';

const clean = (value, max = 4000) => String(value ?? '').trim().slice(0, max);
const INTERNAL_WORKFLOW_LANGUAGE = /\b(published ledger|verified data point|career record entry|saved data|database|fact ledger|screenshot(?:s)?|upload(?:ed|ing)?|scanner|verification draft|session import)\b/i;

const packetPodcastFacts = (packet) => editorialPacketFactRows(packet).map((fact) => ({
  key: fact.key,
  label: fact.label,
  value: fact.value,
  editorialUse: fact.editorialUse,
}));

const evidenceSummary = (packet = {}) => {
  const evidence = packet.evidence || {};
  return [
    packet.opponent ? `${packet.team || 'The team'} vs ${packet.opponent}` : '',
    packet.score ? `final ${packet.score}` : '',
    evidence.hasTeamComparison ? 'full team statistical comparison is available' : '',
    evidence.hasPlayerStats ? 'verified teammate/opponent individual player statistics are available' : '',
    evidence.hasScoringSummary ? 'verified scoring-summary evidence is available' : '',
    evidence.hasOfficialMedia ? 'EA SPORTS Network official in-game media framing is available' : '',
    evidence.hasRtg ? 'verified RTG context is available' : '',
  ].filter(Boolean).join('; ');
};

export const buildPodcastGenerationPayload = (state, publicationId) => {
  const base = buildBasePodcastGenerationPayload(state, publicationId);
  if (base.coverageStage !== 'college-player') return base;

  const editorialPacket = buildPublishedWeekEditorialPacket(state, publicationId);
  const packetFacts = packetPodcastFacts(editorialPacket);
  const factsByKey = new Map();
  // Rich published-week evidence takes precedence over generic/contextual facts.
  [...packetFacts, ...(base.facts || [])].forEach((fact) => {
    if (!factsByKey.has(fact.key)) factsByKey.set(fact.key, fact);
  });
  const facts = [...factsByKey.values()];
  const summary = evidenceSummary(editorialPacket);

  return {
    ...base,
    facts,
    editorialPacket,
    brief: {
      ...base.brief,
      title: clean(base.brief?.title, 240),
      summary: `${clean(base.brief?.summary, 1800)} ${summary ? `Available published-week evidence: ${summary}.` : ''} Build the conversation around what happened in the football game and why, using verified team comparison, individual performers and scoring sequence when supplied. Treat EA SPORTS Network as official in-game media framing, not statistical authority. Never talk about a ledger, database, saved data, screenshots, uploads, scans or verification. Do not invent a rally, comeback, collapse, turning point, quote, tactic, injury, ranking, standing or reaction unless the supplied evidence supports it.`.trim(),
    },
  };
};

export const normalizeGeneratedPodcast = (args) => {
  const episode = normalizeBaseGeneratedPodcast(args);
  const packet = args?.payload?.editorialPacket;
  if (!packet) return episode;

  const text = [episode.title, episode.summary, ...(episode.segments || []).map((segment) => segment.text)]
    .filter(Boolean)
    .join(' ');
  assertSupportedNarrativeClaims(packet, text);
  if (INTERNAL_WORKFLOW_LANGUAGE.test(text)) {
    const error = new Error('The podcast script used internal DynastyHQ workflow language instead of a football conversation. Please generate it again.');
    error.code = 'PODCAST_WORKFLOW_LANGUAGE';
    throw error;
  }

  return {
    ...episode,
    editorialPacketVersion: packet.version || 1,
  };
};
