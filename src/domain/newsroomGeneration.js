import {
  applyGeneratedNewsroomEdition,
  buildNewsroomGenerationPayload as buildBaseNewsroomGenerationPayload,
  normalizeGeneratedNewsroomEdition as normalizeBaseGeneratedNewsroomEdition,
} from './newsroomGenerationBase.js';
import {
  buildPublishedWeekEditorialPacket,
  editorialPacketFactRows,
} from './publishedWeekEditorialPacket.js';
import { assertSupportedNarrativeClaims } from './editorialPacketStoryPolicy.js';
import { resolveIssueTeamMediaProfile } from './teamMediaProfile.js';

export { applyGeneratedNewsroomEdition };

const clean = (value, max = 2000) => String(value ?? '').trim().slice(0, max);
const unique = (values = []) => [...new Set(values.filter(Boolean))];

const INTERNAL_WORKFLOW_LANGUAGE = /\b(published ledger|verified data point|career record entry|saved data|database|fact ledger|screenshot(?:s)?|upload(?:ed|ing)?|scanner|verification draft|session import)\b/i;

const packetIdsForBrief = (packetFacts, brief = {}) => {
  const audience = clean(brief.audience, 40).toLowerCase();
  const outletId = clean(brief.outletId, 80).toLowerCase();
  const primary = packetFacts.filter((fact) => fact.editorialUse === 'primary');
  const context = packetFacts.filter((fact) => fact.editorialUse === 'context');

  if (outletId === 'filmroom' || audience === 'analysis') {
    return unique([...primary, ...context.filter((fact) => (
      fact.key.startsWith('packet.officialMedia.') || fact.key.startsWith('packet.rtg.')
    ))].map((fact) => fact.id)).slice(0, 34);
  }

  if (audience === 'local' || outletId === 'college-local') {
    return unique([...primary, ...context].map((fact) => fact.id)).slice(0, 42);
  }

  if (audience === 'regional' || audience === 'national' || audience === 'national-lead') {
    return unique([...primary, ...context.filter((fact) => fact.key.startsWith('packet.officialMedia.'))]
      .map((fact) => fact.id)).slice(0, 30);
  }

  return unique(primary.map((fact) => fact.id)).slice(0, 30);
};

const packetInstructionFor = (packet = {}) => {
  const evidence = packet.evidence || {};
  const available = [
    evidence.hasTeamComparison ? 'verified team statistical comparison' : '',
    evidence.hasPlayerStats ? 'verified individual player statistics for the teams' : '',
    evidence.hasScoringSummary ? 'verified scoring-summary/game-flow evidence' : '',
    evidence.hasRtg ? 'verified RTG status/progression context' : '',
    evidence.hasOfficialMedia ? 'EA SPORTS Network official in-game media framing' : '',
    evidence.hasMilestones ? 'verified milestones/awards' : '',
  ].filter(Boolean).join(', ');

  return [
    'Write about the football game or football development, not about DynastyHQ storing information.',
    available ? `This published week includes ${available}. Use the relevant evidence instead of reducing the story to the tracked quarterback line.` : '',
    'When verified teammate or opponent player statistics exist, name and use the relevant performers naturally.',
    'When scoring-summary evidence exists, use it to describe how the game unfolded. Without that evidence, do not invent a rally, comeback, collapse, blown lead, late surge, or turning point.',
    'EA SPORTS Network material is official in-game media framing. It may shape the angle, but it never overrides verified game statistics.',
    'Never describe facts as a ledger entry, verified data point, career-record entry, saved data, database record, screenshot, upload, scan, or verification result.',
    'Never invent quotes, play-by-play, tactics, injuries, standings, rankings, crowd reaction, coach reaction, or future stakes that are not supported by the supplied evidence.',
  ].filter(Boolean).join(' ');
};

const issueFor = (state, publicationId) => (state.newsroomIssues || []).find((issue) => (
  issue?.publicationId === publicationId || issue?.id === publicationId || issue?.weekKey === publicationId
));

const truthfulOutletName = (brief, mediaProfile = {}) => {
  const outletId = clean(brief.outletId, 80).toLowerCase();
  const audience = clean(brief.audience, 40).toLowerCase();
  if (outletId === 'college-local' || audience === 'local') return clean(mediaProfile.localOutletName, 120) || brief.outletName;
  if (outletId === 'college-regional' || audience === 'regional') return clean(mediaProfile.regionalOutletName, 120) || brief.outletName;
  if (outletId === 'national' || audience === 'national' || audience === 'national-lead') return 'ESPN';
  if (outletId === 'filmroom' || audience === 'analysis') return 'DynastyHQ Film Room';
  return brief.outletName;
};

export const buildNewsroomGenerationPayload = (state, publicationId) => {
  const base = buildBaseNewsroomGenerationPayload(state, publicationId);
  if (base.coverageStage !== 'college-player') return base;

  const editorialPacket = buildPublishedWeekEditorialPacket(state, publicationId);
  const packetFacts = editorialPacketFactRows(editorialPacket);
  const factsById = new Map();
  // The API keeps at most 120 facts. Put the canonical published-week packet first
  // so rich game/player/scoring/official-media evidence can never be truncated by
  // older contextual facts.
  [...packetFacts, ...base.facts].forEach((fact) => {
    if (!factsById.has(fact.id)) factsById.set(fact.id, fact);
  });
  const facts = [...factsById.values()];
  const packetInstruction = packetInstructionFor(editorialPacket);
  const issue = issueFor(state, publicationId) || {};
  const mediaProfile = resolveIssueTeamMediaProfile(issue, state);

  const articleBriefs = base.articleBriefs.map((brief) => ({
    ...brief,
    outletName: truthfulOutletName(brief, mediaProfile),
    purpose: `${clean(brief.purpose, 1800)} ${packetInstruction}`.trim(),
    angle: `${clean(brief.angle, 1800)} ${packetInstruction}`.trim(),
    focusFactIds: unique([
      ...packetIdsForBrief(packetFacts, brief),
      ...(brief.focusFactIds || []),
    ]),
  }));

  return {
    ...base,
    facts,
    articleBriefs,
    editorialPacket,
    editorialRules: [
      'The game/team story comes first; the tracked player is focal only when the evidence warrants it.',
      'Use verified opponent and teammate statistics, scoring sequence, and team comparison when available.',
      'Do not use internal DynastyHQ bookkeeping language in published copy.',
      'Do not imply game flow that the scoring-summary evidence cannot support.',
      'Treat EA SPORTS Network as official in-game media framing, not as statistical authority.',
      'Different outlets must have genuinely different audience, angle, and purpose rather than rewriting the same five facts.',
      'A regional assignment must render as a regional outlet; never dress a regional story as ESPN unless the national-attention gate actually cleared.',
    ],
  };
};

export const normalizeGeneratedNewsroomEdition = (args) => {
  const edition = normalizeBaseGeneratedNewsroomEdition(args);
  const packet = args?.payload?.editorialPacket;
  if (!packet) return edition;

  edition.articles.forEach((article) => {
    const text = [article.headline, article.dek, ...(article.paragraphs || []), article.pullQuote]
      .filter(Boolean)
      .join(' ');
    assertSupportedNarrativeClaims(packet, text);
    if (INTERNAL_WORKFLOW_LANGUAGE.test(text)) {
      const error = new Error('The newsroom draft used internal DynastyHQ workflow language instead of sports journalism. Please write the edition again.');
      error.code = 'EDITORIAL_WORKFLOW_LANGUAGE';
      throw error;
    }
  });

  return {
    ...edition,
    editorialPacketVersion: packet.version || 1,
  };
};
