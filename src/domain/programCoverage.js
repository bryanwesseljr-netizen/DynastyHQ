import { buildEditorialCoverageDecision, COVERAGE_TIERS } from './editorialCoverage.js';

const clean = (value, max = 600) => String(value ?? '').trim().slice(0, max);

const finite = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const publicationMatches = (entry, publicationId) => (
  entry?.publicationId === publicationId || entry?.id === publicationId || entry?.weekKey === publicationId
);

const roleNumber = (value) => {
  const match = clean(value, 40).toUpperCase().match(/^QB([1-9])$/);
  return match ? Number(match[1]) : null;
};

// A row full of zeroes is common when the tracked player did not take a snap.
// Treat only non-zero production as implicit appearance evidence. An explicit
// didPlay=true still wins for legitimate appearances that happen to finish 0s.
const appearanceHasProduction = (game = {}) => [
  game.passYds, game.passTD, game.rushYds, game.rushTD, game.int,
].some((value) => {
  const parsed = finite(value);
  return parsed !== null && parsed !== 0;
});

const appearanceIsVerified = (game = {}) => (
  game?.didPlay === true || (game?.didPlay !== false && appearanceHasProduction(game))
);

const totalIfComplete = (a, b) => {
  const first = finite(a);
  const second = finite(b);
  return first === null || second === null ? null : first + second;
};

const gameUpdatesForSeason = (state, issue) => (state.weeklyUpdates || [])
  .filter((entry) => Number(entry.season || 1) === Number(issue.season || 1))
  .filter((entry) => Number(entry.week ?? 0) <= Number(issue.week ?? 0))
  .filter((entry) => entry?.game && !entry.game.evaluation && entry.game.stage !== 'high-school')
  .sort((a, b) => Number(a.week ?? 0) - Number(b.week ?? 0));

const recordContext = (updates = []) => {
  const decided = updates.filter((entry) => ['W', 'L'].includes(entry?.game?.result));
  const wins = decided.filter((entry) => entry.game.result === 'W').length;
  const losses = decided.filter((entry) => entry.game.result === 'L').length;
  const lastResult = decided[decided.length - 1]?.game?.result || '';
  let streakCount = 0;
  for (let index = decided.length - 1; index >= 0; index -= 1) {
    if (decided[index]?.game?.result !== lastResult) break;
    streakCount += 1;
  }
  const streak = streakCount >= 2
    ? `${streakCount}-game ${lastResult === 'W' ? 'winning' : 'losing'} streak`
    : '';
  return { wins, losses, games: decided.length, streak, streakCount };
};

const priorRtgSnapshot = (state, issue, publicationId) => [...(state.weeklyUpdates || [])]
  .filter((entry) => !publicationMatches(entry, publicationId))
  .filter((entry) => Number(entry.season || 1) === Number(issue.season || 1))
  .filter((entry) => Number(entry.week ?? 0) < Number(issue.week ?? 0))
  .reverse()
  .find((entry) => entry?.rtgSnapshot && Object.keys(entry.rtgSnapshot).length)?.rtgSnapshot || {};

const currentUpdateFor = (state, issue, publicationId) => (state.weeklyUpdates || [])
  .find((entry) => publicationMatches(entry, publicationId)) || null;

const playerRelevanceFor = ({ state, issue, publicationId }) => {
  const currentUpdate = currentUpdateFor(state, issue, publicationId);
  const game = currentUpdate?.game || null;
  const currentRtg = currentUpdate?.rtgSnapshot || state.rtg || {};
  const previousRtg = priorRtgSnapshot(state, issue, publicationId);
  const currentRole = clean(currentRtg.rank, 40);
  const previousRole = clean(previousRtg.rank, 40);
  const currentRoleNumber = roleNumber(currentRole);
  const previousRoleNumber = roleNumber(previousRole);
  const roleChanged = Boolean(currentRole && previousRole && currentRole !== previousRole);
  const promoted = roleChanged && currentRoleNumber !== null && previousRoleNumber !== null && currentRoleNumber < previousRoleNumber;
  const demoted = roleChanged && currentRoleNumber !== null && previousRoleNumber !== null && currentRoleNumber > previousRoleNumber;
  const didPlay = Boolean(game && appearanceIsVerified(game));
  const priorAppearances = (state.gameLogs || []).filter((entry) => (
    Number(entry.season || 1) === Number(issue.season || 1)
    && Number(entry.week ?? 0) < Number(issue.week ?? 0)
    && appearanceIsVerified(entry)
    && entry.stage !== 'high-school'
  )).length;
  const firstAppearance = didPlay && priorAppearances === 0;
  const totalYards = game ? totalIfComplete(game.passYds, game.rushYds) : null;
  const totalTouchdowns = game ? totalIfComplete(game.passTD, game.rushTD) : null;
  const interceptions = game ? finite(game.int) : null;
  const starter = currentRoleNumber === 1;

  let score = 0;
  const reasons = [];
  if (starter) {
    score += 4;
    reasons.push('starting quarterback');
  }
  if (didPlay) {
    score += 2;
    reasons.push(firstAppearance ? 'first college appearance' : 'game appearance');
  }
  if (roleChanged) {
    score += promoted || demoted ? 3 : 2;
    reasons.push(promoted ? `promotion from ${previousRole} to ${currentRole}` : demoted ? `demotion from ${previousRole} to ${currentRole}` : `role change from ${previousRole} to ${currentRole}`);
  }
  if (currentRoleNumber === 1 && previousRoleNumber && previousRoleNumber > 1) score += 2;
  if (firstAppearance) score += 2;
  if (totalYards !== null && totalYards >= 250) score += 2;
  if (totalTouchdowns !== null && totalTouchdowns >= 3) score += 2;
  if (interceptions !== null && interceptions >= 3) score += 1;

  let level = 'low';
  if (score >= 7 || (starter && didPlay)) level = 'primary';
  else if (score >= 4 || didPlay) level = 'high';
  else if (score >= 2 || roleChanged) level = 'developing';

  return {
    level,
    score,
    currentRole,
    previousRole,
    roleChanged,
    promoted,
    demoted,
    didPlay,
    firstAppearance,
    starter,
    totalYards,
    totalTouchdowns,
    interceptions,
    reasons,
  };
};

const storyPlansFor = ({ issue, relevance, program, coverageDecision }) => {
  if (!coverageDecision || coverageDecision.tier === COVERAGE_TIERS.NONE || coverageDecision.articleCount < 1) return [];

  const weekType = clean(issue.weekType, 40).toLowerCase() || (program.currentGame ? 'game' : 'weekly');
  const weekPhase = clean(issue.weekPhase, 80).toLowerCase();
  const isBye = weekType.includes('bye') || !program.currentGame;
  const preseasonWithoutGames = weekPhase.includes('preseason') && program.games === 0;
  const playerPolicy = coverageDecision.playerMentionPolicy;
  const reach = coverageDecision.audienceReach || {};
  const school = program.school || 'the program';
  const plans = [];

  plans.push({
    outletId: 'college-local',
    audience: 'local',
    storyType: isBye ? (preseasonWithoutGames ? 'program-brief' : 'program-update') : 'game-recap',
    angle: isBye
      ? preseasonWithoutGames
        ? `Cover only the strongest verified ${school} football development that actually created coverage this week. Write with the familiarity of a local beat reporter, but do not default to quarterback hierarchy, backup-player development, 0-0, or the absence of a game.`
        : 'Cover the strongest verified program development or established season pressure point. The local audience already follows the team closely, so lead with what actually changed instead of re-explaining the program.'
      : `Lead with the ${school} game: result, opponent, score, defining verified statistical contrasts, and what the result changes. Write like a reporter who covers this team every day. The tracked player is central only when his football relevance warrants it.`,
    playerMentionPolicy: playerPolicy,
    subjectPriority: relevance.level === 'primary' ? 'game-and-player' : 'program-first',
  });

  if (reach.regionalEligible) {
    plans.push({
      outletId: 'college-regional',
      audience: 'regional',
      storyType: isBye ? 'regional-development' : 'regional-game-context',
      angle: preseasonWithoutGames
        ? 'Take a broader regional view only because the verified football development cleared a regional-interest threshold. Assume the reader follows college football in the region but not every detail of this program.'
        : `Explain why this development matters beyond the home beat. Place it in the larger regional season picture without inventing conference standings, rankings or future stakes. ${program.recordEstablished ? `The ${program.record} record can appear when it adds meaning.` : 'Do not mention a season record before a game has been played.'}`,
      playerMentionPolicy: relevance.level === 'primary' ? 'important-secondary' : relevance.level === 'high' ? 'brief-secondary' : 'omit-unless-story-event',
      subjectPriority: 'season-first',
    });
  }

  if (reach.nationalEligible) {
    const reason = (reach.nationalReasons || []).find((entry) => !/remained below national-attention threshold/i.test(entry)) || 'verified national-scale football significance';
    plans.push({
      outletId: 'national',
      audience: reach.nationalLead ? 'national-lead' : 'national',
      storyType: reach.nationalLead ? 'national-headline' : 'national-analysis',
      angle: `This assignment exists because the week earned national attention through ${reason}. Write for a neutral national college-football reader who does not follow ${school} every week. Open with the nationally meaningful development, quickly establish the necessary program context, and explain why the wider sport should care. Never manufacture national buzz, rankings, reaction or stakes that are not supplied.`,
      playerMentionPolicy: relevance.level === 'primary' ? 'focal-only-if-part-of-national-story' : 'omit-unless-national-story-event',
      subjectPriority: relevance.level === 'primary' ? 'shared-national-story' : 'program-first',
    });
  }

  const hasTeamAnalysis = Boolean(program.currentGame && (
    program.currentGame.teamTotalYards !== undefined
    || program.currentGame.teamTurnovers !== undefined
    || program.currentGame.teamFirstDowns !== undefined
    || program.currentGame.teamRushYds !== undefined
    || program.currentGame.teamPassYds !== undefined
  ));

  if (relevance.roleChanged) {
    plans.push({
      outletId: 'filmroom',
      audience: 'analysis',
      storyType: 'qb-room-analysis',
      angle: `Use the verified depth-chart ${relevance.promoted ? 'promotion' : relevance.demoted ? 'demotion' : 'change'} (${relevance.previousRole} to ${relevance.currentRole}) as the player event. Explain what changed about role and opportunity without inventing practice performance, coach quotes, or promised snaps.${program.currentGame ? ' Keep the team result visible as context.' : ''}`,
      playerMentionPolicy: 'focal',
      subjectPriority: 'player-event',
    });
  } else if (!isBye && (hasTeamAnalysis || relevance.didPlay)) {
    plans.push({
      outletId: 'filmroom',
      audience: 'analysis',
      storyType: relevance.level === 'primary' || relevance.level === 'high' ? 'performance-analysis' : 'game-analysis',
      angle: relevance.level === 'primary' || relevance.level === 'high'
        ? 'Analyze the most meaningful verified performance evidence from the game. The quarterback can be central only because actual playing time and production justify it.'
        : 'Analyze the game through verified team-level statistical contrasts and the result. Do not manufacture tactical film observations or a backup-player angle.',
      playerMentionPolicy: relevance.level === 'primary' ? 'focal' : relevance.level === 'high' ? 'major-secondary' : 'omit-unless-evidence',
      subjectPriority: relevance.level === 'primary' ? 'player-and-game' : 'game-first',
    });
  }

  return plans.slice(0, coverageDecision.articleCount);
};

const derivedFact = ({ publicationId, key, label, value, editorialUse = 'context' }) => ({
  id: `${publicationId}:derived:${key}`,
  key,
  label,
  value,
  period: 'current edition',
  publicationId,
  editorialUse,
  derived: true,
});

export const buildProgramCoverageContext = (state = {}, issue = {}) => {
  const publicationId = issue.publicationId || issue.id || '';
  const currentUpdate = currentUpdateFor(state, issue, publicationId);
  const currentGame = currentUpdate?.game || null;
  const seasonGames = gameUpdatesForSeason(state, issue);
  const priorSeasonGames = currentGame
    ? seasonGames.filter((entry) => !publicationMatches(entry, publicationId))
    : seasonGames;
  const record = recordContext(seasonGames);
  const priorRecord = recordContext(priorSeasonGames);
  const relevance = playerRelevanceFor({ state, issue, publicationId });
  const program = {
    school: clean(state.player?.college || state.player?.school || issue.outletProfile?.school, 160),
    currentGame,
    wins: record.wins,
    losses: record.losses,
    games: record.games,
    record: `${record.wins}-${record.losses}`,
    recordEstablished: record.games > 0,
    streak: record.streak,
    streakCount: record.streakCount,
    previousStreakCount: priorRecord.streakCount,
  };
  const coverageDecision = buildEditorialCoverageDecision({ state, issue, publicationId, program, relevance });
  const facts = [
    derivedFact({ publicationId, key: 'program.gamesPlayed', label: 'Games played', value: record.games, editorialUse: 'background-only' }),
    derivedFact({ publicationId, key: 'program.coverageTier', label: 'Editorial coverage tier', value: coverageDecision.tier, editorialUse: 'background-only' }),
    derivedFact({ publicationId, key: 'program.audienceReach', label: 'Editorial audience reach', value: coverageDecision.audienceReach?.level || 'local', editorialUse: 'background-only' }),
  ];
  if (record.games > 0) {
    facts.push(derivedFact({ publicationId, key: 'program.seasonRecord', label: 'Team record', value: program.record, editorialUse: 'context' }));
  }
  if (record.streak) {
    facts.push(derivedFact({
      publicationId,
      key: 'program.streak',
      label: 'Current streak',
      value: record.streak,
      editorialUse: record.streakCount >= 3 && priorRecord.streakCount < 3 ? 'primary' : 'context',
    }));
  }
  if (currentGame) {
    const teamScore = finite(currentGame.homeScore);
    const opponentScore = finite(currentGame.awayScore);
    if (teamScore !== null && opponentScore !== null) {
      facts.push(derivedFact({ publicationId, key: 'program.scoringMargin', label: 'Current game scoring margin', value: teamScore - opponentScore, editorialUse: 'context' }));
    }
    const teamRank = finite(currentGame.teamRank);
    const opponentRank = finite(currentGame.opponentRank);
    if (teamRank !== null) facts.push(derivedFact({ publicationId, key: 'game.teamRank', label: 'Team ranking', value: teamRank, editorialUse: 'context' }));
    if (opponentRank !== null) facts.push(derivedFact({ publicationId, key: 'game.opponentRank', label: 'Opponent ranking', value: opponentRank, editorialUse: 'primary' }));
    [
      ['teamTotalYards', 'opponentTotalYards', 'program.totalYards', 'Total yards'],
      ['teamFirstDowns', 'opponentFirstDowns', 'program.firstDowns', 'First downs'],
      ['teamTurnovers', 'opponentTurnovers', 'program.turnovers', 'Turnovers'],
      ['teamRushYds', 'opponentRushYds', 'program.rushingYards', 'Rushing yards'],
      ['teamPassYds', 'opponentPassYds', 'program.passingYards', 'Passing yards'],
    ].forEach(([teamKey, opponentKey, factKey, label]) => {
      const teamValue = finite(currentGame[teamKey]);
      const opponentValue = finite(currentGame[opponentKey]);
      if (teamValue === null || opponentValue === null) return;
      facts.push(derivedFact({
        publicationId,
        key: factKey,
        label: `${label}, team vs opponent`,
        value: `${teamValue}-${opponentValue}`,
        editorialUse: 'primary',
      }));
    });
    if (!relevance.didPlay) {
      facts.push(derivedFact({ publicationId, key: 'player.didPlay', label: 'Tracked player appeared', value: false, editorialUse: 'background-only' }));
    } else {
      facts.push(derivedFact({ publicationId, key: 'player.didPlay', label: 'Tracked player appeared', value: true, editorialUse: 'context' }));
    }
  }
  if (relevance.firstAppearance) facts.push(derivedFact({ publicationId, key: 'player.firstAppearance', label: 'First college appearance', value: true, editorialUse: 'primary' }));
  if (relevance.roleChanged) {
    facts.push(derivedFact({
      publicationId,
      key: 'player.roleChange',
      label: 'Depth-chart change',
      value: `${relevance.previousRole} → ${relevance.currentRole}`,
      editorialUse: 'primary',
    }));
  }
  facts.push(derivedFact({ publicationId, key: 'player.coverageRelevance', label: 'Editorial player relevance', value: relevance.level, editorialUse: 'background-only' }));

  return {
    publicationId,
    program,
    relevance,
    coverageDecision,
    storylineThreads: coverageDecision.storylineThreads,
    storyPlans: storyPlansFor({ issue, relevance, program, coverageDecision }),
    facts,
  };
};
