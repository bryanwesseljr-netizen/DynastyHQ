const clean = (value, max = 1200) => String(value ?? '').trim().slice(0, max);
const numberOf = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const arrayOf = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const hasValue = (value) => value !== undefined && value !== null && value !== '';

const gameSortValue = (game = {}) => (numberOf(game.season, 1) * 100) + numberOf(game.week, 0);
const publicationIdFor = (season, week) => `season-${numberOf(season, 1)}-week-${numberOf(week, 0)}`;

const collegeGames = (state = {}) => arrayOf(state.gameLogs)
  .filter((game) => game && game.didPlay !== false && game.stage !== 'high-school' && !game.evaluation && clean(game.opponent))
  .sort((left, right) => gameSortValue(left) - gameSortValue(right));

const weeklyUpdates = (state = {}) => arrayOf(state.weeklyUpdates)
  .filter((entry) => entry && entry?.game?.stage !== 'high-school' && !entry?.game?.evaluation && !entry?.highSchoolEvaluation)
  .sort((left, right) => (
    numberOf(left?.season, 1) - numberOf(right?.season, 1)
    || numberOf(left?.week, 0) - numberOf(right?.week, 0)
  ));

const atOrBefore = (entry, season, week) => (
  numberOf(entry?.season, 1) < season
  || (numberOf(entry?.season, 1) === season && numberOf(entry?.week, 0) <= week)
);

const before = (entry, season, week) => (
  numberOf(entry?.season, 1) < season
  || (numberOf(entry?.season, 1) === season && numberOf(entry?.week, 0) < week)
);

const roleForSnapshot = (snapshot = {}) => clean(
  snapshot.depthChartRole
  || snapshot.role
  || snapshot.rank,
  40,
);

const roleNumber = (value) => {
  const match = clean(value, 40).toUpperCase().match(/^QB\s*([1-9])$/);
  return match ? Number(match[1]) : null;
};

const statLineFor = (game = {}) => ({
  passYds: numberOf(game.passYds),
  passTD: numberOf(game.passTD),
  rushYds: numberOf(game.rushYds),
  rushTD: numberOf(game.rushTD),
  interceptions: numberOf(game.int ?? game.interceptions),
});

const totalYardsFor = (game = {}) => {
  const stats = statLineFor(game);
  return stats.passYds + stats.rushYds;
};

const totalTouchdownsFor = (game = {}) => {
  const stats = statLineFor(game);
  return stats.passTD + stats.rushTD;
};

const scoreFor = (game = {}) => {
  if (!hasValue(game.homeScore) || !hasValue(game.awayScore)) return '';
  return `${game.homeScore}-${game.awayScore}`;
};

const resultWord = (value) => {
  const result = clean(value, 10).toUpperCase();
  if (result === 'W') return 'win';
  if (result === 'L') return 'loss';
  return 'result';
};

const recentCoverageKeys = (state = {}, season, week, currentPublicationId = '') => {
  const keys = new Set();
  const sources = [
    ...arrayOf(state.newsroomIssues),
    ...arrayOf(state.podcastEpisodes),
  ];
  sources
    .filter((entry) => entry && atOrBefore(entry, season, week))
    .filter((entry) => {
      const id = entry.publicationId || entry.id || entry.weekKey || '';
      return !currentPublicationId || id !== currentPublicationId;
    })
    .sort((a, b) => (
      numberOf(a?.season, 1) - numberOf(b?.season, 1)
      || numberOf(a?.week, 0) - numberOf(b?.week, 0)
    ))
    .slice(-6)
    .forEach((entry) => {
      arrayOf(entry.storylineKeys).forEach((key) => {
        const value = clean(key, 180);
        if (value) keys.add(value);
      });
      arrayOf(entry.storylineThreads).forEach((thread) => {
        const value = clean(thread?.key, 180);
        if (value) keys.add(value);
      });
      arrayOf(entry.coverageDecision?.storylineKeys).forEach((key) => {
        const value = clean(key, 180);
        if (value) keys.add(value);
      });
    });
  return keys;
};

const contextFor = (state = {}, options = {}) => {
  const setup = state.currentWeekSetup || {};
  const season = Math.max(1, numberOf(options.season ?? state.currentSeason, 1));
  const week = Math.max(0, numberOf(options.week ?? setup.week ?? state.currentWeek, 0));
  const publicationId = clean(options.publicationId, 160) || publicationIdFor(season, week);
  const opponent = clean(options.opponent || setup.opponent, 160);
  const phase = clean(options.phase, 40) || 'current';
  return { season, week, publicationId, opponent, phase, setup };
};

const roleArcFor = (state, context, updates) => {
  const snapshots = updates
    .filter((entry) => atOrBefore(entry, context.season, context.week))
    .map((entry) => ({
      season: numberOf(entry.season, 1),
      week: numberOf(entry.week, 0),
      role: roleForSnapshot(entry.rtgSnapshot || {}),
    }))
    .filter((entry) => entry.role);

  let currentRole = snapshots.at(-1)?.role || '';
  const isCurrentCareerPoint = context.season === numberOf(state.currentSeason, 1)
    && context.week >= numberOf(state.currentWeek, 0);
  if (isCurrentCareerPoint) {
    currentRole = roleForSnapshot(state.rtg || {})
      || clean(state.player?.depthChartRole || state.player?.role, 40)
      || currentRole;
  }

  let previousRole = '';
  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    if (snapshots[index].role !== currentRole) {
      previousRole = snapshots[index].role;
      break;
    }
  }

  const currentNumber = roleNumber(currentRole);
  const previousNumber = roleNumber(previousRole);
  const changedThisWeek = Boolean(currentRole && previousRole && currentRole !== previousRole && snapshots.at(-1)?.week === context.week);
  const promoted = changedThisWeek && currentNumber !== null && previousNumber !== null && currentNumber < previousNumber;
  const demoted = changedThisWeek && currentNumber !== null && previousNumber !== null && currentNumber > previousNumber;
  const firstWeekAtRole = Boolean(currentRole && !snapshots.slice(0, -1).some((entry) => entry.role === currentRole));

  return {
    currentRole,
    previousRole,
    changedThisWeek,
    promoted,
    demoted,
    firstWeekAtRole,
    currentNumber,
    previousNumber,
    snapshots,
  };
};

const recordFor = (games = []) => {
  const decided = games.filter((game) => ['W', 'L'].includes(clean(game.result, 10).toUpperCase()));
  const wins = decided.filter((game) => clean(game.result, 10).toUpperCase() === 'W').length;
  const losses = decided.filter((game) => clean(game.result, 10).toUpperCase() === 'L').length;
  const lastResult = clean(decided.at(-1)?.result, 10).toUpperCase();
  let streakCount = 0;
  for (let index = decided.length - 1; index >= 0; index -= 1) {
    if (clean(decided[index]?.result, 10).toUpperCase() !== lastResult) break;
    streakCount += 1;
  }
  return { wins, losses, games: decided.length, lastResult, streakCount };
};

const addThreadFactory = ({ recentKeys, season, week }) => {
  const threads = [];
  const add = (thread) => {
    if (!thread?.key || !thread?.title) return;
    const recentlyCovered = recentKeys.has(thread.key);
    const editorialUse = thread.changedThisWeek
      ? (thread.editorialUse || 'primary')
      : recentlyCovered
        ? 'background-only'
        : (thread.editorialUse || 'context');
    threads.push({
      category: thread.category || 'career',
      key: thread.key,
      label: thread.label || 'Career storyline',
      title: thread.title,
      detail: thread.detail || '',
      value: thread.value ?? thread.title,
      status: thread.status || (thread.changedThisWeek ? 'new-development' : 'active'),
      changedThisWeek: Boolean(thread.changedThisWeek),
      recentlyCovered,
      editorialUse,
      priority: numberOf(thread.priority, 1),
      evidence: arrayOf(thread.evidence).map((entry) => clean(entry, 180)).filter(Boolean),
      season,
      week,
    });
  };
  return { threads, add };
};

const roleThreads = ({ add, roleArc, latestGame, context }) => {
  if (!roleArc.currentRole) return;
  if (roleArc.changedThisWeek) {
    add({
      category: 'role',
      key: `role:${roleArc.currentRole.toLowerCase().replace(/\s+/g, '-')}`,
      label: roleArc.promoted ? 'ROLE PROMOTION' : roleArc.demoted ? 'ROLE CHANGE' : 'DEPTH CHART CHANGE',
      title: roleArc.promoted
        ? `${roleArc.previousRole} → ${roleArc.currentRole}`
        : roleArc.demoted
          ? `${roleArc.previousRole} → ${roleArc.currentRole}`
          : `${roleArc.currentRole} is the new saved role`,
      detail: roleArc.promoted
        ? `DynastyHQ has a verified promotion from ${roleArc.previousRole} to ${roleArc.currentRole}.`
        : roleArc.demoted
          ? `DynastyHQ has a verified move from ${roleArc.previousRole} to ${roleArc.currentRole}.`
          : `The saved depth-chart role changed from ${roleArc.previousRole} to ${roleArc.currentRole}.`,
      status: 'new-development',
      changedThisWeek: true,
      editorialUse: 'primary',
      priority: 10,
      evidence: ['Weekly RTG snapshot'],
    });
  } else {
    add({
      category: 'role',
      key: `role:${roleArc.currentRole.toLowerCase().replace(/\s+/g, '-')}`,
      label: 'ROLE WATCH',
      title: `${roleArc.currentRole} remains the current saved role`,
      detail: latestGame
        ? `The ${roleArc.currentRole} role carries into the next chapter after Week ${latestGame.week}.`
        : `DynastyHQ will carry the ${roleArc.currentRole} role forward until a verified depth-chart change occurs.`,
      status: 'continuing',
      changedThisWeek: false,
      editorialUse: 'context',
      priority: roleArc.currentNumber === 1 ? 7 : 5,
      evidence: ['Current RTG status'],
    });
  }

  if (roleArc.currentNumber === 1) {
    const priorStarterSnapshot = roleArc.snapshots
      .filter((entry) => before(entry, context.season, context.week))
      .some((entry) => roleNumber(entry.role) === 1);
    if (!priorStarterSnapshot || roleArc.firstWeekAtRole) {
      add({
        category: 'role',
        key: 'role:first-qb1-window',
        label: 'STARTER ERA',
        title: 'The starting-quarterback chapter is new',
        detail: 'QB1 is now part of the verified career timeline. The next appearances will define whether that opportunity becomes an established era.',
        status: 'active',
        changedThisWeek: roleArc.changedThisWeek || roleArc.firstWeekAtRole,
        editorialUse: 'primary',
        priority: 9,
        evidence: ['Depth chart history'],
      });
    }
  }
};

const teamThreads = ({ add, games, latestGame, context, record }) => {
  if (!latestGame) return;
  const latestResult = clean(latestGame.result, 10).toUpperCase();
  const score = scoreFor(latestGame);
  const isPregameAfterLatest = context.phase === 'pregame' && gameSortValue(latestGame) < ((context.season * 100) + context.week);

  if (isPregameAfterLatest && latestResult === 'L') {
    add({
      category: 'team',
      key: 'team:response-after-loss',
      label: 'RESPONSE GAME',
      title: `The response follows the ${clean(latestGame.opponent, 100)} loss`,
      detail: `${score ? `${score} against ${clean(latestGame.opponent, 100)}` : `The loss to ${clean(latestGame.opponent, 100)}`} is the most recent saved result. The next game becomes the first answer to it.`,
      status: 'active',
      changedThisWeek: true,
      editorialUse: 'primary',
      priority: 8,
      evidence: [`Week ${latestGame.week} result`],
    });
  } else if (isPregameAfterLatest && latestResult === 'W') {
    add({
      category: 'team',
      key: 'team:momentum-after-win',
      label: 'MOMENTUM TEST',
      title: `Momentum carries out of the ${clean(latestGame.opponent, 100)} win`,
      detail: `${score ? `${score} against ${clean(latestGame.opponent, 100)}` : `The win over ${clean(latestGame.opponent, 100)}`} is the latest saved result. The next matchup tests whether that result becomes a trend.`,
      status: 'active',
      changedThisWeek: true,
      editorialUse: 'context',
      priority: 7,
      evidence: [`Week ${latestGame.week} result`],
    });
  }

  if (record.streakCount >= 2 && ['W', 'L'].includes(record.lastResult)) {
    const isWinStreak = record.lastResult === 'W';
    add({
      category: 'team',
      key: `team:${isWinStreak ? 'winning' : 'losing'}-streak`,
      label: isWinStreak ? 'WINNING STREAK' : 'LOSING STREAK',
      title: `${record.streakCount}-game ${isWinStreak ? 'winning' : 'losing'} streak`,
      detail: `${record.streakCount} consecutive decided games have ended in ${isWinStreak ? 'wins' : 'losses'} in the saved season record.`,
      status: record.streakCount >= 3 ? 'established' : 'active',
      changedThisWeek: true,
      editorialUse: record.streakCount >= 3 ? 'primary' : 'context',
      priority: record.streakCount >= 3 ? 8 : 6,
      evidence: ['Saved game results'],
    });
  }

  if (record.games > 0) {
    add({
      category: 'team',
      key: 'team:season-record',
      label: 'SEASON ARC',
      title: `${record.wins}-${record.losses} through ${record.games} decided game${record.games === 1 ? '' : 's'}`,
      detail: 'The season record remains supporting context unless a new streak, ranking, postseason stage, or other verified consequence raises its importance.',
      status: 'continuing',
      changedThisWeek: false,
      editorialUse: 'background-only',
      priority: 2,
      evidence: ['Saved game results'],
    });
  }
};

const performanceThreads = ({ add, games, latestGame }) => {
  if (!latestGame) return;
  const recent = games.slice(-3);
  const latestStats = statLineFor(latestGame);
  const latestTotalYards = totalYardsFor(latestGame);
  const latestTotalTD = totalTouchdownsFor(latestGame);

  if (latestStats.interceptions >= 2) {
    add({
      category: 'performance',
      key: 'performance:turnover-watch',
      label: 'TURNOVER WATCH',
      title: `${latestStats.interceptions} interceptions in the latest saved appearance`,
      detail: `Week ${latestGame.week} included ${latestStats.interceptions} interceptions. That is a verified performance thread until the next appearance supplies a new data point.`,
      status: 'active',
      changedThisWeek: true,
      editorialUse: latestStats.interceptions >= 3 ? 'primary' : 'context',
      priority: latestStats.interceptions >= 3 ? 8 : 6,
      evidence: [`Week ${latestGame.week} player stats`],
    });
  }

  if (latestTotalTD >= 3 || latestTotalYards >= 300) {
    add({
      category: 'performance',
      key: 'performance:impact-game',
      label: 'IMPACT PERFORMANCE',
      title: `${latestTotalYards.toLocaleString()} total yards · ${latestTotalTD} total TD`,
      detail: `The latest saved appearance reached ${latestTotalYards.toLocaleString()} combined passing/rushing yards and ${latestTotalTD} combined touchdowns.`,
      status: 'active',
      changedThisWeek: true,
      editorialUse: latestTotalTD >= 4 || latestTotalYards >= 400 ? 'primary' : 'context',
      priority: latestTotalTD >= 4 || latestTotalYards >= 400 ? 9 : 7,
      evidence: [`Week ${latestGame.week} player stats`],
    });
  }

  const multiTdRun = [...recent].reverse().findIndex((game) => totalTouchdownsFor(game) < 2);
  const consecutiveMultiTd = multiTdRun === -1 ? recent.length : multiTdRun;
  if (consecutiveMultiTd >= 2) {
    add({
      category: 'performance',
      key: 'performance:multi-td-run',
      label: 'PRODUCTION RUN',
      title: `${consecutiveMultiTd} straight appearances with 2+ total touchdowns`,
      detail: 'The streak is calculated only from saved passing and rushing touchdown totals.',
      status: 'active',
      changedThisWeek: true,
      editorialUse: 'context',
      priority: 7,
      evidence: ['Recent saved player stats'],
    });
  }
};

const opponentThreads = ({ add, state, context, allGames }) => {
  const opponent = clean(context.opponent || context.setup?.opponent, 160);
  if (!opponent) return;

  const rankRaw = clean(context.setup?.opponentRank || context.setup?.opponentRanking || context.setup?.rank, 40);
  const rank = Number(String(rankRaw).replace(/[^0-9]/g, ''));
  if (Number.isFinite(rank) && rank > 0 && rank <= 25) {
    add({
      category: 'opponent',
      key: 'opponent:ranked-matchup',
      label: 'RANKED MATCHUP',
      title: `${opponent} is saved at No. ${rank}`,
      detail: clean(context.setup?.opponentRecord, 40)
        ? `${opponent} enters the saved Week ${context.week} setup at ${clean(context.setup.opponentRecord, 40)}.`
        : 'The opponent ranking is verified in Week Setup; no additional ranking implications are assumed.',
      status: 'active',
      changedThisWeek: true,
      editorialUse: 'primary',
      priority: rank <= 10 ? 9 : 7,
      evidence: ['Week Setup'],
    });
  }

  const priorMeetings = allGames.filter((game) => (
    before(game, context.season, context.week)
    && clean(game.opponent, 160).toLowerCase() === opponent.toLowerCase()
  ));
  if (priorMeetings.length) {
    const wins = priorMeetings.filter((game) => clean(game.result, 10).toUpperCase() === 'W').length;
    const losses = priorMeetings.filter((game) => clean(game.result, 10).toUpperCase() === 'L').length;
    const lastMeeting = priorMeetings.at(-1);
    add({
      category: 'opponent',
      key: `opponent:history:${opponent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label: priorMeetings.length > 1 ? 'OPPONENT HISTORY' : 'REMATCH',
      title: `${priorMeetings.length} prior saved meeting${priorMeetings.length === 1 ? '' : 's'} with ${opponent}`,
      detail: `Saved record against ${opponent}: ${wins}-${losses}.${lastMeeting ? ` Last meeting: ${resultWord(lastMeeting.result)}${scoreFor(lastMeeting) ? `, ${scoreFor(lastMeeting)}` : ''} in Week ${lastMeeting.week}.` : ''}`,
      status: 'active',
      changedThisWeek: true,
      editorialUse: 'context',
      priority: 6,
      evidence: ['Career game archive'],
    });
  }
};

const milestoneThreads = ({ add, state, context }) => {
  const milestones = arrayOf(state.careerMilestones)
    .filter((entry) => atOrBefore(entry, context.season, context.week))
    .sort((a, b) => (
      numberOf(a?.season, 1) - numberOf(b?.season, 1)
      || numberOf(a?.week, 0) - numberOf(b?.week, 0)
    ));
  const recent = milestones.slice(-2);
  recent.forEach((milestone) => {
    const changedThisWeek = numberOf(milestone.season, 1) === context.season && numberOf(milestone.week, 0) === context.week;
    const stableId = clean(milestone.type || milestone.id || milestone.title, 120).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    add({
      category: 'career',
      key: `milestone:${stableId || 'career'}`,
      label: 'CAREER MILESTONE',
      title: clean(milestone.title || milestone.type, 180) || 'Career milestone',
      detail: clean(milestone.summary, 500) || 'A verified career milestone is preserved in the DynastyHQ timeline.',
      status: changedThisWeek ? 'new-development' : 'established',
      changedThisWeek,
      editorialUse: changedThisWeek ? 'primary' : 'background-only',
      priority: changedThisWeek ? 10 : 3,
      evidence: ['Career milestone archive'],
    });
  });
};

const previousBeatFor = ({ school, latestGame, context }) => {
  if (!latestGame) {
    return {
      kicker: 'STORY SO FAR',
      title: 'THE CAREER STORY IS JUST BEGINNING',
      copy: `${school} has no earlier college result in the saved timeline before this point.`,
    };
  }
  const opponent = clean(latestGame.opponent, 120) || 'the previous opponent';
  const score = scoreFor(latestGame);
  const result = resultWord(latestGame.result);
  return {
    kicker: 'PREVIOUSLY ON DYNASTYHQ',
    title: clean(latestGame.result, 10).toUpperCase() === 'L' ? 'THE RESPONSE BECOMES THE NEXT QUESTION' : 'THE LAST RESULT CARRIES FORWARD',
    copy: `${school} recorded a ${result} against ${opponent}${score ? `, ${score}` : ''} in Week ${latestGame.week}. ${context.phase === 'pregame' && context.opponent ? `Now the storyline turns to ${context.opponent}.` : 'That result remains part of the active career context.'}`,
  };
};

export const buildStorylineEngine = (state = {}, options = {}) => {
  const context = contextFor(state, options);
  const allGames = collegeGames(state);
  const games = allGames.filter((game) => atOrBefore(game, context.season, context.week));
  const seasonGames = games.filter((game) => numberOf(game.season, 1) === context.season);
  const updates = weeklyUpdates(state);
  const latestGame = games.at(-1) || null;
  const school = clean(state.player?.college || state.player?.school, 160) || 'YOUR PROGRAM';
  const roleArc = roleArcFor(state, context, updates);
  const record = recordFor(seasonGames);
  const recentKeys = recentCoverageKeys(state, context.season, context.week, context.publicationId);
  const { threads, add } = addThreadFactory({ recentKeys, season: context.season, week: context.week });

  roleThreads({ add, roleArc, latestGame, context });
  teamThreads({ add, games: seasonGames, latestGame, context, record });
  performanceThreads({ add, games: seasonGames, latestGame });
  opponentThreads({ add, state, context, allGames });
  milestoneThreads({ add, state, context });

  const activeThreads = [...threads]
    .sort((left, right) => (
      Number(right.changedThisWeek) - Number(left.changedThisWeek)
      || right.priority - left.priority
      || Number(left.recentlyCovered) - Number(right.recentlyCovered)
    ));
  const editorialThreads = activeThreads
    .filter((thread) => thread.editorialUse !== 'background-only' || thread.priority >= 7)
    .slice(0, 8)
    .map((thread) => ({
      key: thread.key,
      label: thread.label,
      value: thread.value,
      status: thread.status,
      changedThisWeek: thread.changedThisWeek,
      recentlyCovered: thread.recentlyCovered,
      editorialUse: thread.editorialUse,
    }));

  const lead = activeThreads.find((thread) => thread.editorialUse === 'primary') || activeThreads[0] || null;
  const supporting = activeThreads.filter((thread) => thread !== lead).slice(0, 3);

  return {
    version: 2,
    context,
    school,
    record: `${record.wins}-${record.losses}`,
    latestGame,
    roleArc,
    previous: previousBeatFor({ school, latestGame, context }),
    lead,
    supporting,
    activeThreads,
    editorialThreads,
    storylineKeys: editorialThreads.map((thread) => thread.key),
  };
};
