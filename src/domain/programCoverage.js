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

const appearanceHasProduction = (game = {}) => [
  game.passYds, game.passTD, game.rushYds, game.rushTD, game.int,
].some((value) => finite(value) !== null);

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
  const didPlay = Boolean(game && game.didPlay !== false && appearanceHasProduction(game));
  const priorAppearances = (state.gameLogs || []).filter((entry) => (
    Number(entry.season || 1) === Number(issue.season || 1)
    && Number(entry.week ?? 0) < Number(issue.week ?? 0)
    && entry.didPlay !== false
    && appearanceHasProduction(entry)
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

const storyPlansFor = ({ issue, relevance, program }) => {
  const weekType = clean(issue.weekType, 40) || (program.currentGame ? 'game' : 'weekly');
  const isBye = weekType === 'bye' || !program.currentGame;
  const playerPolicy = relevance.level;
  const plans = [];

  plans.push({
    outletId: 'college-local',
    storyType: isBye ? 'program-preview' : 'game-recap',
    angle: isBye
      ? 'Cover the program week first: preparation, quarterback-room structure, and what the upcoming phase means. Mention the tracked player only if his relevance warrants it.'
      : 'Lead with the Cincinnati game: result, opponent, score, defining verified statistical contrasts, and what the result means. The tracked player is the focal point only if his relevance is primary.',
    playerMentionPolicy: playerPolicy === 'primary' ? 'focal-if-natural' : playerPolicy === 'high' ? 'secondary' : playerPolicy === 'developing' ? 'brief-if-relevant' : 'omit-unless-essential',
    subjectPriority: 'program-first',
  });

  plans.push({
    outletId: 'college-regional',
    storyType: 'season-context',
    angle: `Place this week in the larger season picture: current record${program.streak ? `, ${program.streak}` : ''}, trajectory, stakes, and what the result or bye changes. Do not default to a player profile.`,
    playerMentionPolicy: playerPolicy === 'primary' ? 'important-secondary' : playerPolicy === 'high' ? 'brief-secondary' : 'omit-unless-story-event',
    subjectPriority: 'season-first',
  });

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
      storyType: 'qb-room-analysis',
      angle: `Use the verified depth-chart ${relevance.promoted ? 'promotion' : relevance.demoted ? 'demotion' : 'change'} (${relevance.previousRole} to ${relevance.currentRole}) as a real quarterback-room story. Explain what changes about opportunity and role without inventing practice performance, coach quotes, or promised snaps.${program.currentGame ? ' Keep the same week’s team result in view as context.' : ''}`,
      playerMentionPolicy: 'focal',
      subjectPriority: 'player-event',
    });
  } else if (!isBye && (hasTeamAnalysis || relevance.didPlay)) {
    plans.push({
      outletId: 'filmroom',
      storyType: relevance.level === 'primary' || relevance.level === 'high' ? 'performance-analysis' : 'game-analysis',
      angle: relevance.level === 'primary' || relevance.level === 'high'
        ? 'Analyze the most meaningful verified performance evidence from the game. The quarterback can be central when his actual playing time and production justify it; otherwise analyze team-level statistical contrasts.'
        : 'Analyze the game through verified team-level statistical contrasts and the result. Do not manufacture tactical film observations.',
      playerMentionPolicy: relevance.level === 'primary' ? 'focal' : relevance.level === 'high' ? 'major-secondary' : 'omit-unless-evidence',
      subjectPriority: relevance.level === 'primary' ? 'player-and-game' : 'game-first',
    });
  }

  const postseason = clean(issue.weekPhase, 80) === 'postseason';
  const nationalWorthy = relevance.level === 'primary' || postseason || program.streakCount >= 3;
  if (nationalWorthy) {
    plans.push({
      outletId: 'national',
      storyType: relevance.level === 'primary' ? 'player-program-arc' : 'program-trajectory',
      angle: relevance.level === 'primary'
        ? 'Frame the game and quarterback performance inside Cincinnati’s larger season. The player may be central because his role and production justify it, but keep the team result and stakes visible.'
        : postseason
          ? 'Take a national college-football view of Cincinnati’s postseason position and the verified path or result without inventing rankings, bracket details, or outside reaction.'
          : 'Use the sustained verified team streak as the reason this Cincinnati development deserves wider attention. Keep the story program-first unless a separate player event warrants more.',
      playerMentionPolicy: relevance.level === 'primary' ? 'focal-if-nationally-relevant' : 'omit-unless-story-event',
      subjectPriority: relevance.level === 'primary' ? 'shared' : 'program-first',
    });
  }

  return plans.slice(0, 4);
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
  const record = recordContext(seasonGames);
  const relevance = playerRelevanceFor({ state, issue, publicationId });
  const program = {
    school: clean(state.player?.college || state.player?.school || issue.outletProfile?.school, 160),
    currentGame,
    wins: record.wins,
    losses: record.losses,
    games: record.games,
    record: `${record.wins}-${record.losses}`,
    streak: record.streak,
    streakCount: record.streakCount,
  };
  const facts = [
    derivedFact({ publicationId, key: 'program.seasonRecord', label: 'Team record', value: program.record, editorialUse: 'primary' }),
    derivedFact({ publicationId, key: 'program.gamesPlayed', label: 'Games played', value: record.games }),
  ];
  if (record.streak) facts.push(derivedFact({ publicationId, key: 'program.streak', label: 'Current streak', value: record.streak, editorialUse: 'primary' }));
  if (currentGame) {
    const teamScore = finite(currentGame.homeScore);
    const opponentScore = finite(currentGame.awayScore);
    if (teamScore !== null && opponentScore !== null) {
      facts.push(derivedFact({ publicationId, key: 'program.scoringMargin', label: 'Current game scoring margin', value: teamScore - opponentScore, editorialUse: 'context' }));
    }
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
    if (currentGame.didPlay === false) {
      facts.push(derivedFact({ publicationId, key: 'player.didPlay', label: 'Tracked player appeared', value: false, editorialUse: 'context' }));
    } else if (relevance.didPlay) {
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
    storyPlans: storyPlansFor({ issue, relevance, program }),
    facts,
  };
};
