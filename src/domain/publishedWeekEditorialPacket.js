const clean = (value, max = 1200) => String(value ?? '').trim().slice(0, max);
const finite = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const publicationMatches = (entry, publicationId) => (
  entry?.publicationId === publicationId || entry?.id === publicationId || entry?.weekKey === publicationId
);

const normalizeLabel = (value) => clean(value, 220).replace(/\s+/g, ' ');
const normalizeCategory = (value) => clean(value, 80).toLowerCase().replace(/[\s-]+/g, '_');

const coverageCategoryFrom = (fact = {}) => {
  const key = clean(fact.key, 180).toLowerCase();
  const keyMatch = key.match(/^program\.coverage\.([^.]+)\./);
  if (keyMatch?.[1]) return normalizeCategory(keyMatch[1]);
  if (fact.category) return normalizeCategory(fact.category);
  const labelMatch = normalizeLabel(fact.label).match(/^([^:]+):/);
  return normalizeCategory(labelMatch?.[1]);
};

const factValue = (fact) => {
  if (typeof fact?.value === 'number' || typeof fact?.value === 'boolean') return fact.value;
  return clean(fact?.value, 1800);
};

const currentFactsFor = (state, publicationId) => (state.factLedger || [])
  .filter((fact) => fact?.verified && publicationMatches(fact, publicationId))
  .map((fact) => ({
    id: fact.id || `${publicationId}:${clean(fact.key, 180)}:${clean(fact.label, 120)}`,
    key: clean(fact.key, 180),
    label: normalizeLabel(fact.label || fact.key),
    value: factValue(fact),
    sourceType: clean(fact.sourceType || fact.source || fact.origin, 80),
    category: coverageCategoryFrom(fact),
    verified: true,
    referenceOnly: fact.referenceOnly === true,
  }));

const firstFact = (facts, keys = []) => {
  const wanted = new Set(keys);
  return facts.find((fact) => wanted.has(fact.key)) || null;
};

const matchingFacts = (facts, predicate) => facts.filter(predicate);

const canonicalGame = (state, publicationId) => {
  const update = (state.weeklyUpdates || []).find((entry) => publicationMatches(entry, publicationId));
  if (update?.game) return update.game;
  return (state.gameLogs || []).find((entry) => publicationMatches(entry, publicationId)) || null;
};

const teamNameFor = (state, game = {}) => clean(
  game.school || game.team || game.program || game.playerSchool || game.college
  || state.coach?.currentSchool || state.player?.college || state.player?.school,
  120,
);

const scoreFor = (game = {}, side) => {
  const direct = finite(side === 'team' ? game.teamScore : game.opponentScore);
  if (direct !== null) return direct;
  if (side === 'team') return finite(game.homeScore);
  return finite(game.awayScore);
};

const coverageFactsFor = (facts) => matchingFacts(facts, (fact) => fact.key.startsWith('program.coverage.'));

const playerStatFacts = (facts) => matchingFacts(facts, (fact) => (
  fact.category === 'player_stats'
  || fact.key.startsWith('coverage.player.')
  || fact.key.startsWith('players.')
  || fact.key.startsWith('playerStats.')
  || /player stats?|passing leader|rushing leader|receiving leader|tackles?|sacks?|interceptions?/i.test(`${fact.label} ${fact.value}`)
));

const scoringFacts = (facts) => matchingFacts(facts, (fact) => {
  const haystack = `${fact.key} ${fact.category} ${fact.label} ${fact.value}`;
  return fact.key.startsWith('coverage.scoring')
    || fact.key.startsWith('scoring.')
    || fact.category === 'scoring_summary'
    || /scoring (summary|drive|play)|scoring sequence|touchdown drive|field goal drive|quarter scoring|scoring recap/i.test(haystack);
});

const officialMediaFacts = (facts) => matchingFacts(facts, (fact) => (
  fact.category === 'official_media'
  || fact.key.startsWith('program.coverage.official_media.')
  || fact.key.startsWith('coverage.officialMedia')
  || fact.key.startsWith('official_media.')
  || /Official Media:|EA SPORTS Network/i.test(`${fact.label} ${fact.sourceType} ${fact.value}`)
));

const rtgFacts = (facts) => matchingFacts(facts, (fact) => (
  fact.key.startsWith('rtg.') || fact.category === 'rtg'
));

const milestoneFacts = (facts) => matchingFacts(facts, (fact) => (
  fact.key.startsWith('milestone.') || fact.key.startsWith('award.') || ['milestone', 'awards'].includes(fact.category)
));

const meaningfulScoringSequence = (facts = []) => facts
  .map((fact) => ({ label: fact.label, value: fact.value, key: fact.key, category: fact.category }))
  .filter((entry) => clean(entry.value, 1800) || clean(entry.label, 220));

const mediaHeadline = (facts) => (
  firstFact(facts, ['coverage.officialMedia.headline', 'official_media.headline'])
  || facts.find((fact) => /headline|title|lede/i.test(`${fact.key} ${fact.label}`))
  || facts[0]
)?.value || '';

const mediaFraming = (facts) => facts
  .filter((fact) => !/headline|title/i.test(`${fact.key} ${fact.label}`))
  .slice(0, 8)
  .map((fact) => ({ label: fact.label, value: fact.value, key: fact.key }));

const teamComparison = (game = {}) => ({
  totalYards: { team: finite(game.teamTotalYards), opponent: finite(game.opponentTotalYards) },
  firstDowns: { team: finite(game.teamFirstDowns), opponent: finite(game.opponentFirstDowns) },
  turnovers: { team: finite(game.teamTurnovers), opponent: finite(game.opponentTurnovers) },
  rushingYards: { team: finite(game.teamRushYds), opponent: finite(game.opponentRushYds) },
  passingYards: { team: finite(game.teamPassYds), opponent: finite(game.opponentPassYds) },
  possession: { team: clean(game.teamPossession, 40), opponent: clean(game.opponentPossession, 40) },
});

const trackedPlayerLine = (state, game = {}) => ({
  name: clean(state.player?.name || state.playerName || 'Tracked player', 120),
  role: clean(state.rtg?.rank || state.player?.depthChart || game.role, 40),
  passYds: finite(game.passYds),
  passTD: finite(game.passTD),
  rushYds: finite(game.rushYds),
  rushTD: finite(game.rushTD),
  int: finite(game.int),
  didPlay: game.didPlay !== false,
});

export const buildPublishedWeekEditorialPacket = (state = {}, publicationId = '') => {
  if (!publicationId) throw new Error('A publication id is required to build the editorial packet.');
  const game = canonicalGame(state, publicationId) || {};
  const facts = currentFactsFor(state, publicationId);
  const coverageFacts = coverageFactsFor(facts);
  const playerFacts = playerStatFacts(facts);
  const scoreFacts = scoringFacts(facts);
  const mediaFacts = officialMediaFacts(facts);
  const rtg = rtgFacts(facts);
  const milestones = milestoneFacts(facts);
  const team = teamNameFor(state, game);
  const opponent = clean(game.opponent, 120);
  const result = clean(game.result, 12);
  const teamScore = scoreFor(game, 'team');
  const opponentScore = scoreFor(game, 'opponent');
  const score = teamScore !== null && opponentScore !== null ? `${teamScore}-${opponentScore}` : '';
  const comparison = teamComparison(game);

  return {
    version: 1,
    publicationId,
    season: Number(game.season || state.currentSeason || 1),
    week: Number(game.week ?? state.currentWeek ?? 0),
    team,
    opponent,
    result,
    score,
    teamScore,
    opponentScore,
    game: {
      ...game,
      team,
      opponent,
      result,
      score,
      comparison,
    },
    trackedPlayer: trackedPlayerLine(state, game),
    coverageFacts,
    playerStats: playerFacts,
    scoringSummary: meaningfulScoringSequence(scoreFacts),
    rtgFacts: rtg,
    milestones,
    officialMedia: {
      captured: mediaFacts.length > 0,
      headline: clean(mediaHeadline(mediaFacts), 500),
      framing: mediaFraming(mediaFacts),
      facts: mediaFacts,
    },
    verifiedFacts: facts,
    evidence: {
      hasTeamComparison: Object.values(comparison).some((pair) => pair.team !== null && pair.opponent !== null && pair.team !== '' && pair.opponent !== ''),
      hasCoverage: coverageFacts.length > 0,
      hasPlayerStats: playerFacts.length > 0,
      hasScoringSummary: scoreFacts.length > 0,
      hasRtg: rtg.length > 0,
      hasOfficialMedia: mediaFacts.length > 0,
      hasMilestones: milestones.length > 0,
    },
  };
};

export const packetSupportsNarrativeClaim = (packet = {}, claim = '') => {
  const normalized = clean(claim, 80).toLowerCase();
  if (!normalized) return false;
  if (['comeback', 'rally', 'late rally', 'collapse', 'blew a lead', 'came back'].includes(normalized)) {
    return Array.isArray(packet.scoringSummary) && packet.scoringSummary.length >= 2;
  }
  if (['dominant rushing', 'rushing dominance'].includes(normalized)) {
    const team = finite(packet.game?.comparison?.rushingYards?.team);
    const opponent = finite(packet.game?.comparison?.rushingYards?.opponent);
    return team !== null && opponent !== null && Math.abs(team - opponent) >= 75;
  }
  if (['turnover battle', 'turnovers decided it'].includes(normalized)) {
    const team = finite(packet.game?.comparison?.turnovers?.team);
    const opponent = finite(packet.game?.comparison?.turnovers?.opponent);
    return team !== null && opponent !== null && team !== opponent;
  }
  return true;
};

export const editorialPacketFactRows = (packet = {}) => {
  const rows = [];
  const push = (key, label, value, editorialUse = 'context') => {
    if (value === '' || value === null || value === undefined) return;
    rows.push({
      id: `${packet.publicationId}:packet:${key}`,
      key,
      label,
      value,
      period: 'current edition',
      publicationId: packet.publicationId,
      editorialUse,
      derived: true,
      packetDerived: true,
    });
  };

  push('packet.game.matchup', 'Matchup', `${packet.team || 'Team'} vs ${packet.opponent || 'Opponent'}`, 'primary');
  push('packet.game.result', 'Game result', packet.result, 'primary');
  push('packet.game.score', 'Final score', packet.score, 'primary');
  push('packet.player.line', 'Tracked player stat line', [
    packet.trackedPlayer?.passYds !== null ? `${packet.trackedPlayer.passYds} pass yds` : '',
    packet.trackedPlayer?.passTD !== null ? `${packet.trackedPlayer.passTD} pass TD` : '',
    packet.trackedPlayer?.rushYds !== null ? `${packet.trackedPlayer.rushYds} rush yds` : '',
    packet.trackedPlayer?.rushTD !== null ? `${packet.trackedPlayer.rushTD} rush TD` : '',
    packet.trackedPlayer?.int !== null ? `${packet.trackedPlayer.int} INT` : '',
  ].filter(Boolean).join(', '), 'primary');

  const comparison = packet.game?.comparison || {};
  Object.entries(comparison).forEach(([key, pair]) => {
    if (!pair || pair.team === null || pair.opponent === null || pair.team === '' || pair.opponent === '') return;
    push(`packet.teamComparison.${key}`, `${key} team vs opponent`, `${pair.team}-${pair.opponent}`, 'primary');
  });

  packet.playerStats?.slice(0, 30).forEach((fact, index) => push(`packet.playerStats.${index}`, fact.label || `Player stat ${index + 1}`, fact.value, 'primary'));
  packet.scoringSummary?.slice(0, 20).forEach((fact, index) => push(`packet.scoring.${index}`, fact.label || `Scoring event ${index + 1}`, fact.value, 'primary'));
  packet.coverageFacts?.filter((fact) => !packet.playerStats?.some((playerFact) => playerFact.id === fact.id) && !packet.officialMedia?.facts?.some((mediaFact) => mediaFact.id === fact.id)).slice(0, 24).forEach((fact, index) => push(`packet.coverage.${index}`, fact.label || `Coverage fact ${index + 1}`, fact.value, 'context'));
  packet.rtgFacts?.slice(0, 16).forEach((fact, index) => push(`packet.rtg.${index}`, fact.label || `RTG fact ${index + 1}`, fact.value, 'context'));
  packet.milestones?.slice(0, 12).forEach((fact, index) => push(`packet.milestone.${index}`, fact.label || `Milestone ${index + 1}`, fact.value, 'primary'));
  push('packet.officialMedia.headline', 'EA SPORTS Network headline', packet.officialMedia?.headline, 'context');
  packet.officialMedia?.framing?.slice(0, 8).forEach((fact, index) => push(`packet.officialMedia.framing.${index}`, fact.label || `Official media framing ${index + 1}`, fact.value, 'context'));
  return rows;
};
