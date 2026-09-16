const clean = (value) => String(value ?? '').trim();
const numberOf = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const arrayOf = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const hasValue = (value) => value !== undefined && value !== null && value !== '';

const gameSortValue = (game = {}) => (numberOf(game.season, 1) * 100) + numberOf(game.week, 0);

const collegeGames = (state = {}) => arrayOf(state.gameLogs)
  .filter((game) => game && game.didPlay !== false && game.stage !== 'high-school' && !game.evaluation && clean(game.opponent))
  .sort((left, right) => gameSortValue(left) - gameSortValue(right));

const scoreFor = (game = {}) => {
  if (!hasValue(game.homeScore) || !hasValue(game.awayScore)) return '';
  return `${game.homeScore}-${game.awayScore}`;
};

const resultWord = (value) => {
  const result = clean(value).toUpperCase();
  if (result === 'W') return 'win';
  if (result === 'L') return 'loss';
  return 'result';
};

const roleFor = (state = {}) => clean(
  state.rtg?.depthChartRole
  || state.rtg?.role
  || state.rtg?.rank
  || state.player?.depthChartRole
  || state.player?.role,
);

const latestWeeklyUpdateFor = (state = {}, game = null) => {
  if (!game) return null;
  return arrayOf(state.weeklyUpdates).find((entry) => (
    numberOf(entry?.season, 1) === numberOf(game.season, 1)
    && numberOf(entry?.week, 0) === numberOf(game.week, 0)
  )) || null;
};

const statLineFor = (game = {}) => ({
  passYds: numberOf(game.passYds),
  passTD: numberOf(game.passTD),
  rushYds: numberOf(game.rushYds),
  rushTD: numberOf(game.rushTD),
  interceptions: numberOf(game.int ?? game.interceptions),
});

const seasonTotalsFor = (games = []) => games.reduce((totals, game) => {
  const stats = statLineFor(game);
  return {
    passYds: totals.passYds + stats.passYds,
    passTD: totals.passTD + stats.passTD,
    rushYds: totals.rushYds + stats.rushYds,
    rushTD: totals.rushTD + stats.rushTD,
    interceptions: totals.interceptions + stats.interceptions,
  };
}, { passYds: 0, passTD: 0, rushYds: 0, rushTD: 0, interceptions: 0 });

const opponentRankFor = (setup = {}) => clean(setup.opponentRank || setup.opponentRanking || setup.rank);

const opponentFactsFor = (setup = {}) => {
  const rank = opponentRankFor(setup);
  return [
    rank ? { label: 'RANK', value: rank.startsWith('#') ? rank : `#${rank}` } : null,
    clean(setup.opponentRecord) ? { label: 'RECORD', value: clean(setup.opponentRecord) } : null,
    clean(setup.kickoff) ? { label: 'KICKOFF', value: clean(setup.kickoff) } : null,
    clean(setup.venue) ? { label: 'VENUE', value: clean(setup.venue) } : null,
  ].filter(Boolean);
};

const previousFor = ({ school, opponent, week, previousGame }) => {
  if (!previousGame) {
    return {
      label: 'STORY SO FAR',
      title: 'THE NEXT CHAPTER STARTS HERE',
      copy: `${school} has no previous college result saved for this chapter. Week ${week} against ${opponent} becomes the next verified point in the story.`,
      result: '',
      score: '',
    };
  }

  const result = clean(previousGame.result).toUpperCase();
  const score = scoreFor(previousGame);
  const previousOpponent = clean(previousGame.opponent) || 'the previous opponent';
  const resultText = `${resultWord(result)} against ${previousOpponent}${score ? `, ${score}` : ''}`;
  return {
    label: 'STORY SO FAR',
    title: result === 'L' ? 'THE RESPONSE STARTS NOW' : result === 'W' ? 'MOMENTUM MOVES FORWARD' : 'THE STORY MOVES FORWARD',
    copy: `Last time out, ${school} recorded a ${resultText}. Week ${week} now turns the focus to ${opponent}.`,
    result,
    score,
  };
};

const keysFor = ({ opponent, previousGame, role, setup }) => {
  const last = statLineFor(previousGame || {});
  const result = clean(previousGame?.result).toUpperCase();
  const rank = opponentRankFor(setup);
  const keys = [];

  if (last.interceptions > 0) {
    keys.push({
      title: 'PROTECT POSSESSIONS',
      detail: `The last saved game included ${last.interceptions} interception${last.interceptions === 1 ? '' : 's'}. Make ${opponent} earn its opportunities.`,
      evidence: 'Previous game',
    });
  } else if (result === 'L') {
    keys.push({
      title: 'ANSWER EARLY',
      detail: 'The previous week ended in a loss. Establish a clean opening rhythm instead of chasing the last result.',
      evidence: 'Previous result',
    });
  } else if (result === 'W') {
    keys.push({
      title: 'CARRY THE MOMENTUM',
      detail: 'The previous week ended in a win. Start on schedule and make the next game earn its own identity.',
      evidence: 'Previous result',
    });
  } else {
    keys.push({ title: 'START ON SCHEDULE', detail: 'Open with clean decisions and avoid giving away short fields.', evidence: 'Game plan' });
  }

  if (role) {
    keys.push({
      title: `OWN THE ${role.toUpperCase()} ROLE`,
      detail: `DynastyHQ currently has the depth-chart role saved as ${role}. Let the role shape the game instead of forcing the spotlight.`,
      evidence: 'Current RTG status',
    });
  } else if (rank) {
    keys.push({
      title: 'HANDLE THE STAGE',
      detail: `${opponent} is saved as ${rank.startsWith('#') ? rank : `#${rank}`}. Treat the ranking as context, not a reason to abandon the plan.`,
      evidence: 'Week setup',
    });
  } else {
    keys.push({ title: 'VALUE EVERY DRIVE', detail: 'Stay patient, keep the offense on schedule, and avoid empty possessions.', evidence: 'Game plan' });
  }

  if (rank && role) {
    keys.push({
      title: 'HANDLE THE STAGE',
      detail: `${opponent} is saved as ${rank.startsWith('#') ? rank : `#${rank}`}. Keep the moment from becoming bigger than the reads in front of you.`,
      evidence: 'Week setup',
    });
  } else {
    keys.push({
      title: `MAKE ${opponent.toUpperCase()} ADJUST`,
      detail: 'Lean into what is actually working on the field and let the verified postgame data explain why.',
      evidence: 'Game plan',
    });
  }

  return keys.slice(0, 3);
};

const storylinesFor = ({ state, previousGame, opponent, role, record, setup }) => {
  const stories = [];
  const result = clean(previousGame?.result).toUpperCase();
  const rank = opponentRankFor(setup);
  const previousUpdate = latestWeeklyUpdateFor(state, previousGame);
  const progression = arrayOf(previousUpdate?.rtgChanges)[0];

  if (previousGame) {
    stories.push({
      label: result === 'L' ? 'RESPONSE GAME' : result === 'W' ? 'MOMENTUM TEST' : 'NEXT CHAPTER',
      title: result === 'L' ? 'How does the offense answer the last result?' : result === 'W' ? 'Can the last result carry into another week?' : 'What changes from the previous game?',
      detail: `${clean(previousGame.opponent)} is now history; ${opponent} is the next verified matchup.`,
    });
  }

  if (role) {
    stories.push({
      label: 'ROLE WATCH',
      title: `${role} remains the current saved depth-chart role`,
      detail: hasValue(state.rtg?.coachTrust) ? `Coach Trust is currently ${numberOf(state.rtg.coachTrust).toLocaleString()}.` : 'DynastyHQ will track any verified role change after the game.',
    });
  }

  if (rank) {
    stories.push({
      label: 'MATCHUP PROFILE',
      title: `${opponent} enters the week at ${rank.startsWith('#') ? rank : `#${rank}`}`,
      detail: clean(setup.opponentRecord) ? `The saved opponent record is ${clean(setup.opponentRecord)}.` : 'No opponent record has been captured yet.',
    });
  }

  if (progression?.label || progression?.key) {
    stories.push({
      label: 'PROGRESSION WATCH',
      title: clean(progression.label || progression.key),
      detail: 'This was the latest saved RTG change and remains part of the week-to-week career context.',
    });
  }

  if (!stories.length) {
    stories.push({
      label: 'SEASON ARC',
      title: `${record} is the current saved season record`,
      detail: `Week setup against ${opponent} gives DynastyHQ the next checkpoint to follow.`,
    });
  }

  return stories.slice(0, 4);
};

export const buildGameDayBrief = (state = {}) => {
  const setup = state.currentWeekSetup || {};
  const player = state.player || {};
  const rtg = state.rtg || {};
  const season = numberOf(state.currentSeason, 1);
  const week = numberOf(setup.week ?? state.currentWeek, 1);
  const school = clean(player.college || player.school) || 'YOUR PROGRAM';
  const opponent = clean(setup.opponent) || 'OPPONENT TBD';
  const games = collegeGames(state);
  const seasonGames = games.filter((game) => numberOf(game.season, 1) === season);
  const previousGame = [...games].reverse().find((game) => (
    numberOf(game.season, 1) < season
    || (numberOf(game.season, 1) === season && numberOf(game.week, 0) < week)
  )) || null;
  const wins = seasonGames.filter((game) => clean(game.result).toUpperCase() === 'W').length;
  const losses = seasonGames.filter((game) => clean(game.result).toUpperCase() === 'L').length;
  const role = roleFor(state);
  const record = `${wins}-${losses}`;
  const seasonTotals = seasonTotalsFor(seasonGames);
  const previousStats = previousGame ? statLineFor(previousGame) : null;
  const opponentFacts = opponentFactsFor(setup);

  return {
    ready: setup.type !== 'bye' && Boolean(clean(setup.opponent)),
    season,
    week,
    school,
    opponent,
    record,
    matchup: {
      rank: opponentRankFor(setup),
      record: clean(setup.opponentRecord),
      kickoff: clean(setup.kickoff),
      venue: clean(setup.venue),
      note: clean(setup.note),
      facts: opponentFacts,
    },
    previousGame,
    previous: previousFor({ school, opponent, week, previousGame }),
    player: {
      name: clean(player.name) || 'Tracked Player',
      pos: clean(player.pos) || 'Player',
      number: clean(player.number) || '—',
      overall: hasValue(player.overall) ? numberOf(player.overall) : null,
      role,
      coachTrust: hasValue(rtg.coachTrust) ? numberOf(rtg.coachTrust) : null,
      skillPoints: hasValue(rtg.skillPoints) ? numberOf(rtg.skillPoints) : null,
      seasonTotals,
      previousStats,
    },
    keys: keysFor({ opponent, previousGame, role, setup }),
    storylines: storylinesFor({ state, previousGame, opponent, role, record, setup }),
    scout: {
      team: opponent,
      facts: opponentFacts,
      note: opponentFacts.length
        ? 'Only verified Week Setup facts are shown here. DynastyHQ will not invent opponent tendencies that have not been captured.'
        : 'Opponent tendencies are intentionally blank until verified game-week information is captured.',
    },
  };
};
