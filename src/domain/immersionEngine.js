const clean = (value) => String(value ?? '').trim();
const numberOf = (value) => Number(value) || 0;
const arrayOf = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const normalized = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const sortGames = (games = []) => [...games].sort((left, right) => (
  numberOf(left?.season) - numberOf(right?.season)
  || numberOf(left?.week) - numberOf(right?.week)
));

const isPlayableGame = (game) => Boolean(
  game
  && clean(game.opponent)
  && game.didPlay !== false
  && !game.evaluation
  && clean(game.stage).toLowerCase() !== 'high-school'
);

const totalTouchdowns = (game = {}) => numberOf(game.passTD) + numberOf(game.rushTD);
const scoreMargin = (game = {}) => Math.abs(numberOf(game.homeScore) - numberOf(game.awayScore));

const cumulativeTotals = (games = []) => games.reduce((totals, game) => ({
  passYds: totals.passYds + numberOf(game.passYds),
  passTD: totals.passTD + numberOf(game.passTD),
  rushYds: totals.rushYds + numberOf(game.rushYds),
  rushTD: totals.rushTD + numberOf(game.rushTD),
  interceptions: totals.interceptions + numberOf(game.int),
}), { passYds: 0, passTD: 0, rushYds: 0, rushTD: 0, interceptions: 0 });

const bestGameFor = (games, key, formatter = (game) => numberOf(game?.[key])) => {
  if (!games.length) return null;
  return games.reduce((best, game) => formatter(game) > formatter(best) ? game : best, games[0]);
};

const nextThreshold = (value, thresholds) => thresholds.find((threshold) => threshold > value) || null;

const resultStreak = (games = []) => {
  if (!games.length) return { result: '', count: 0 };
  const result = clean(games.at(-1)?.result).toUpperCase();
  if (!['W', 'L'].includes(result)) return { result: '', count: 0 };
  let count = 0;
  for (let index = games.length - 1; index >= 0; index -= 1) {
    if (clean(games[index]?.result).toUpperCase() !== result) break;
    count += 1;
  }
  return { result, count };
};

const recordLabel = (game, valueLabel) => game ? ({
  value: valueLabel(game),
  opponent: clean(game.opponent),
  season: numberOf(game.season) || 1,
  week: numberOf(game.week),
}) : null;

const stageFor = (state = {}) => {
  if (clean(state.careerPhase).toLowerCase() === 'coach') return 'coach';
  if (!clean(state.player?.college)) return 'high_school';
  return 'college';
};

const selectGame = (games, selectionKey) => {
  const match = String(selectionKey || '').match(/^season-(\d+)-week-(\d+)$/i);
  if (!match) return null;
  const [, season, week] = match;
  return games.find((game) => numberOf(game.season) === Number(season) && numberOf(game.week) === Number(week)) || null;
};

export const buildImmersionModel = (state = {}, options = {}) => {
  const games = sortGames(arrayOf(state.gameLogs).filter(isPlayableGame));
  const currentSeason = numberOf(state.currentSeason) || 1;
  const currentWeek = numberOf(state.currentWeek) || 1;
  const setup = state.currentWeekSetup || {};
  const player = state.player || {};
  const rtg = state.rtg || {};
  const stage = stageFor(state);
  const school = clean(player.college || player.school) || (stage === 'high_school' ? 'High School' : 'Your Program');
  const seasonGames = games.filter((game) => numberOf(game.season || 1) === currentSeason);
  const seasonWins = seasonGames.filter((game) => clean(game.result).toUpperCase() === 'W').length;
  const seasonLosses = seasonGames.filter((game) => clean(game.result).toUpperCase() === 'L').length;
  const totals = cumulativeTotals(games);
  const seasonTotals = cumulativeTotals(seasonGames);
  const streak = resultStreak(seasonGames);
  const currentOpponent = clean(setup.opponent);
  const selectedGame = selectGame(games, options.selectionKey);
  const focusGame = selectedGame || games.at(-1) || null;

  const opponentMeetings = currentOpponent
    ? games.filter((game) => normalized(game.opponent) === normalized(currentOpponent))
    : [];
  const previousMeeting = opponentMeetings.at(-1) || null;
  const series = {
    wins: opponentMeetings.filter((game) => clean(game.result).toUpperCase() === 'W').length,
    losses: opponentMeetings.filter((game) => clean(game.result).toUpperCase() === 'L').length,
    games: opponentMeetings.length,
  };

  const passRecordGame = bestGameFor(games, 'passYds');
  const rushRecordGame = bestGameFor(games, 'rushYds');
  const tdRecordGame = bestGameFor(games, 'passTD', totalTouchdowns);
  const recordBook = {
    passingYards: recordLabel(passRecordGame, (game) => numberOf(game.passYds)),
    rushingYards: recordLabel(rushRecordGame, (game) => numberOf(game.rushYds)),
    totalTouchdowns: recordLabel(tdRecordGame, (game) => totalTouchdowns(game)),
    careerPassingYards: totals.passYds,
    careerRushingYards: totals.rushYds,
    careerTotalTouchdowns: totals.passTD + totals.rushTD,
  };

  const passThreshold = nextThreshold(totals.passYds, [1000, 2500, 5000, 7500, 10000, 12500, 15000]);
  const tdThreshold = nextThreshold(totals.passTD + totals.rushTD, [10, 25, 50, 75, 100, 125]);
  const recordWatch = [];
  if (passThreshold && passThreshold - totals.passYds <= 500) {
    recordWatch.push({ id: 'passing-threshold', remaining: passThreshold - totals.passYds, target: passThreshold, label: `${passThreshold.toLocaleString()} career passing yards` });
  }
  if (tdThreshold && tdThreshold - (totals.passTD + totals.rushTD) <= 5) {
    recordWatch.push({ id: 'touchdown-threshold', remaining: tdThreshold - (totals.passTD + totals.rushTD), target: tdThreshold, label: `${tdThreshold} career touchdowns` });
  }

  const derivedMilestones = [];
  if (games.length) derivedMilestones.push({ id: 'first-college-game', title: 'First verified college game', achieved: true });
  if (games.some((game) => clean(game.result).toUpperCase() === 'W')) derivedMilestones.push({ id: 'first-win', title: 'First verified college win', achieved: true });
  if (games.some((game) => numberOf(game.passYds) >= 300)) derivedMilestones.push({ id: 'first-300-pass', title: '300-yard passing game', achieved: true });
  if (games.some((game) => numberOf(game.rushYds) >= 100)) derivedMilestones.push({ id: 'first-100-rush', title: '100-yard rushing game', achieved: true });
  [1000, 2500, 5000, 7500, 10000].forEach((threshold) => {
    if (totals.passYds >= threshold) derivedMilestones.push({ id: `pass-${threshold}`, title: `${threshold.toLocaleString()} career passing yards`, achieved: true });
  });

  const recentThree = seasonGames.slice(-3);
  const storylines = [];
  if (stage === 'high_school') {
    const recruiting = state.playerRecruiting?.highSchool || {};
    const stars = numberOf(recruiting.recruitStars || player.stars);
    const tape = numberOf(recruiting.tapeScore);
    storylines.push({ id: 'high-school-journey', label: 'Recruiting Journey', detail: stars ? `${stars}-star prospect${tape ? ` · ${tape} tape score` : ''}` : 'High-school evaluation is underway.' });
  }
  if (streak.result === 'W' && streak.count >= 2) storylines.push({ id: 'win-streak', label: 'Momentum', detail: `${streak.count}-game winning streak` });
  if (streak.result === 'L' && streak.count >= 2) storylines.push({ id: 'response', label: 'Response Week', detail: `${streak.count} straight losses make the next result matter more.` });
  if (currentOpponent && previousMeeting) storylines.push({ id: 'rematch', label: 'Memory Lane', detail: `Last meeting: ${clean(previousMeeting.result) || 'Result'} ${previousMeeting.homeScore ?? '—'}-${previousMeeting.awayScore ?? '—'} vs ${currentOpponent}` });
  if (recentThree.length >= 3 && recentThree.every((game) => totalTouchdowns(game) >= 2)) storylines.push({ id: 'breakout', label: 'Breakout Watch', detail: 'Three straight games with 2+ total touchdowns.' });
  if (clean(rtg.rank)) storylines.push({ id: 'depth-chart', label: 'Depth Chart', detail: `${clean(rtg.rank)} · ${numberOf(rtg.coachTrust).toLocaleString()} Coach Trust` });
  if (recordWatch[0]) storylines.push({ id: 'record-watch', label: 'Record Watch', detail: `${recordWatch[0].remaining} away from ${recordWatch[0].label}` });

  const stakes = [];
  if (stage === 'high_school') {
    const evaluations = arrayOf(state.playerRecruiting?.highSchool?.evaluations);
    stakes.push({ id: 'evaluation', label: 'Recruiting Evaluation', detail: `${evaluations.length} verified evaluation${evaluations.length === 1 ? '' : 's'} recorded so far.` });
  } else if (currentOpponent) {
    stakes.push({ id: 'record', label: 'Team Record', detail: `A win moves ${school} to ${seasonWins + 1}-${seasonLosses}.` });
    if (streak.result === 'W' && streak.count >= 2) stakes.push({ id: 'streak', label: 'Streak', detail: `A win extends the streak to ${streak.count + 1}.` });
    if (previousMeeting) stakes.push({ id: 'series', label: 'Series', detail: `DynastyHQ-era record vs ${currentOpponent}: ${series.wins}-${series.losses}.` });
    if (recordWatch[0]) stakes.push({ id: 'milestone', label: 'Milestone', detail: `${recordWatch[0].remaining} away from ${recordWatch[0].label}.` });
    if (numberOf(rtg.trustToNext) > 0) stakes.push({ id: 'coach-trust', label: 'Coach Trust', detail: `${numberOf(rtg.trustToNext).toLocaleString()} trust to the next threshold.` });
  }

  const focusIsPersonalPassRecord = focusGame && passRecordGame === focusGame && numberOf(focusGame.passYds) > 0;
  const focusIsPersonalRushRecord = focusGame && rushRecordGame === focusGame && numberOf(focusGame.rushYds) > 0;
  const focusIsPersonalTdRecord = focusGame && tdRecordGame === focusGame && totalTouchdowns(focusGame) > 0;
  const focusTotalTD = totalTouchdowns(focusGame || {});
  const focusMargin = focusGame ? scoreMargin(focusGame) : null;
  const podcastReasons = [
    focusGame && focusMargin <= 7 ? 'one-score game' : '',
    focusTotalTD >= 3 ? `${focusTotalTD}-TD performance` : '',
    focusIsPersonalPassRecord || focusIsPersonalRushRecord || focusIsPersonalTdRecord ? 'personal record' : '',
  ].filter(Boolean);
  const podcastPlan = !focusGame
    ? { level: 'none', label: 'No episode needed yet', reason: 'Wait for a verified result or major career event.' }
    : podcastReasons.length
      ? { level: 'feature', label: 'Full The Huddle Podcast episode', reason: podcastReasons.join(' · ') }
      : { level: 'quick', label: 'Quick The Huddle Podcast recap', reason: 'Standard verified game package.' };

  const postgameWrap = focusGame ? {
    result: clean(focusGame.result).toUpperCase(),
    opponent: clean(focusGame.opponent),
    score: `${focusGame.homeScore ?? '—'}-${focusGame.awayScore ?? '—'}`,
    playerLine: [
      numberOf(focusGame.passYds) ? `${numberOf(focusGame.passYds)} PASS YDS` : '',
      numberOf(focusGame.rushYds) ? `${numberOf(focusGame.rushYds)} RUSH YDS` : '',
      focusTotalTD ? `${focusTotalTD} TD` : '',
    ].filter(Boolean).join(' · ') || 'Verified game result',
    impact: [
      focusIsPersonalPassRecord ? 'Career-high passing yards' : '',
      focusIsPersonalRushRecord ? 'Career-high rushing yards' : '',
      focusIsPersonalTdRecord ? 'Career-high total touchdowns' : '',
      clean(focusGame.result).toUpperCase() === 'W' ? 'Win added to career ledger' : '',
    ].filter(Boolean),
  } : null;

  const seasonPulse = {
    record: `${seasonWins}-${seasonLosses}`,
    results: seasonGames.map((game) => clean(game.result).toUpperCase()).filter((result) => ['W', 'L'].includes(result)),
    passingYards: seasonTotals.passYds,
    totalTouchdowns: seasonTotals.passTD + seasonTotals.rushTD,
    rank: clean(seasonGames.at(-1)?.teamRank || state.teamRank || ''),
  };

  const todayBrief = [];
  if (stage === 'high_school') todayBrief.push('High-school recruiting chapter is active.');
  else todayBrief.push(`${school} is ${seasonWins}-${seasonLosses} in Season ${currentSeason}.`);
  if (currentOpponent) todayBrief.push(`Week ${currentWeek}: ${currentOpponent}.`);
  else if (setup.type === 'bye') todayBrief.push(`Week ${currentWeek}: bye / development week.`);
  if (storylines[0]) todayBrief.push(`${storylines[0].label}: ${storylines[0].detail}`);
  if (recordWatch[0]) todayBrief.push(`${recordWatch[0].remaining} away from ${recordWatch[0].label}.`);

  const contextText = `${clean(setup.note)} ${clean(setup.venue)} ${currentOpponent}`.toLowerCase();
  const postseason = /bowl|playoff|championship|semifinal|quarterfinal|title game/.test(contextText);
  const atmosphere = stage === 'high_school'
    ? 'high-school'
    : postseason
      ? 'postseason'
      : currentOpponent && series.games >= 2
        ? 'rivalry'
        : focusGame && numberOf(focusGame.season) === currentSeason && numberOf(focusGame.week) === currentWeek
          ? (clean(focusGame.result).toUpperCase() === 'W' ? 'win' : 'loss')
          : setup.type === 'bye' ? 'bye' : 'pregame';

  return {
    stage,
    school,
    currentSeason,
    currentWeek,
    currentOpponent,
    games,
    seasonGames,
    seasonWins,
    seasonLosses,
    totals,
    seasonTotals,
    streak,
    previousMeeting,
    series,
    recordBook,
    recordWatch,
    derivedMilestones,
    storylines: storylines.slice(0, 5),
    stakes: stakes.slice(0, 5),
    podcastPlan,
    postgameWrap,
    seasonPulse,
    todayBrief: todayBrief.slice(0, 4),
    atmosphere,
    focusGame,
  };
};
