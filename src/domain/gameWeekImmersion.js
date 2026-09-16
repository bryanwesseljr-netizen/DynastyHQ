const clean = (value) => String(value ?? '').trim();
const finite = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sortedGames = (state = {}) => [...(state.gameLogs || [])]
  .filter((game) => game && clean(game.opponent) && !game.evaluation)
  .sort((left, right) => (
    finite(left?.season, 1) - finite(right?.season, 1)
    || finite(left?.week, 0) - finite(right?.week, 0)
  ));

const latestGameFor = (state = {}) => sortedGames(state).at(-1) || null;

const activeOpponentFor = (state = {}) => {
  const setup = state.currentWeekSetup || {};
  const draft = state.weeklyAgendaDraft?.newGame || state.weeklyAgendaDraft?.game || {};
  return clean(setup.opponent || draft.opponent);
};

const schoolFor = (state = {}, dashboard = {}) => (
  clean(dashboard.institution || state.player?.college || state.player?.school) || 'YOUR PROGRAM'
);

const scoreFor = (game = {}) => {
  const team = game.homeScore;
  const opponent = game.awayScore;
  if (team === '' || team === undefined || opponent === '' || opponent === undefined) return '';
  return `${team}-${opponent}`;
};

const resultWord = (result) => {
  const value = clean(result).toUpperCase();
  if (value === 'W') return 'win';
  if (value === 'L') return 'loss';
  return 'result';
};

const nextTarget = (flow = {}) => {
  const target = clean(flow.nextAction?.target);
  if (!target || target === 'finalize') return 'gameHub';
  return target;
};

const previousCopyFor = ({ mode, school, opponent, latestGame, week }) => {
  if (!latestGame) {
    return `${school} is at the beginning of its DynastyHQ story. Set the week, play it in College Football 27, and the verified history will build from there.`;
  }

  const latestOpponent = clean(latestGame.opponent) || 'the previous opponent';
  const score = scoreFor(latestGame);
  const result = resultWord(latestGame.result);
  const resultText = `${result} against ${latestOpponent}${score ? `, ${score}` : ''}`;

  if (mode === 'pregame') {
    return `Last time out, ${school} recorded a ${resultText}. Now the story turns to ${opponent} in Week ${week}.`;
  }
  if (mode === 'postgame') {
    return `${school}'s Week ${latestGame.week ?? week} ${resultText} is published. DynastyHQ is finishing the verified coverage before the career moves on.`;
  }
  return `Week ${latestGame.week ?? '—'} is in the archive: ${school} finished with a ${resultText}. Set up Week ${week} to reveal the next chapter.`;
};

const pregameKeys = ({ latestGame, opponent }) => {
  const lastResult = clean(latestGame?.result).toUpperCase();
  return [
    {
      title: lastResult === 'L' ? 'RESET THE SCRIPT' : lastResult === 'W' ? 'CARRY THE MOMENTUM' : 'START FAST',
      detail: lastResult === 'L'
        ? 'Make the next game its own story instead of chasing the previous result.'
        : 'Establish the tone early and keep the offense on schedule.',
    },
    {
      title: 'VALUE POSSESSIONS',
      detail: 'Avoid giving away short fields and force the opponent to earn every drive.',
    },
    {
      title: `MAKE ${clean(opponent).toUpperCase() || 'THE MATCHUP'} ADJUST`,
      detail: 'Lean into what is working and let the verified game data tell the postgame story.',
    },
  ];
};

const postgameKeys = (flow = {}) => {
  const pending = (flow.steps || []).filter((step) => ['pending', 'ready'].includes(step.state));
  const labels = pending.map((step) => step.label).filter(Boolean);
  return [
    { title: 'LOCK THE RECORD', detail: 'Keep the published score, stats, and Chronicle checkpoint together as one permanent game record.' },
    { title: 'FINISH THE COVERAGE', detail: labels.length ? `Still in the wrap-up: ${labels.join(', ')}.` : 'The required media coverage for this week is complete.' },
    { title: 'ADVANCE CLEANLY', detail: 'Close the week only after the verified story, media, and career record agree.' },
  ];
};

const betweenKeys = ({ week }) => [
  { title: `SET WEEK ${week}`, detail: 'Define the next opponent or bye so the homepage can shift into the next game-week presentation.' },
  { title: 'KEEP CONTINUITY', detail: 'The previous result remains visible until the new week has a verified identity.' },
  { title: 'PLAY, CAPTURE, IMPORT', detail: 'Once the next game is played, Session Import becomes the handoff back into DynastyHQ.' },
];

const scoutFor = ({ mode, state, opponent, latestGame }) => {
  const setup = state.currentWeekSetup || {};
  const rank = clean(setup.opponentRank || setup.opponentRanking || setup.rank);
  const record = clean(setup.opponentRecord || latestGame?.opponentRecord);
  const venue = clean(setup.venue);
  const kickoff = clean(setup.kickoff);

  if (mode === 'pregame') {
    return {
      eyebrow: 'OPPONENT SCOUT',
      team: opponent,
      facts: [
        rank ? { label: 'RANK', value: rank.startsWith('#') ? rank : `#${rank}` } : null,
        record ? { label: 'RECORD', value: record } : null,
        kickoff ? { label: 'KICKOFF', value: kickoff } : null,
        venue ? { label: 'VENUE', value: venue } : null,
      ].filter(Boolean),
      note: 'Verified opponent details expand automatically as they are captured in your game-week screenshots.',
    };
  }

  return {
    eyebrow: mode === 'postgame' ? 'LAST OPPONENT' : 'BETWEEN WEEKS',
    team: clean(latestGame?.opponent) || 'NEXT OPPONENT TBD',
    facts: [
      scoreFor(latestGame || {}) ? { label: 'FINAL', value: scoreFor(latestGame || {}) } : null,
      clean(latestGame?.result) ? { label: 'RESULT', value: clean(latestGame.result).toUpperCase() } : null,
      latestGame?.week !== undefined ? { label: 'WEEK', value: String(latestGame.week) } : null,
    ].filter(Boolean),
    note: mode === 'postgame'
      ? 'This matchup stays in focus while DynastyHQ finishes the week wrap-up.'
      : 'The next opponent will replace this card as soon as Week Setup is complete.',
  };
};

export const buildGameWeekImmersion = (state = {}, dashboard = {}, flow = {}) => {
  const latestGame = latestGameFor(state);
  const activeOpponent = activeOpponentFor(state);
  const school = schoolFor(state, dashboard);
  const week = finite(flow.activeWeek?.week ?? state.currentWeek ?? dashboard.week, 1);
  const isBye = flow.activeWeek?.type === 'bye' || state.currentWeekSetup?.type === 'bye';
  const configured = Boolean(flow.activeWeek?.configured);

  let mode = 'idle';
  if (flow.mode === 'wrap-up' && latestGame) mode = 'postgame';
  else if (configured && isBye) mode = 'bye';
  else if (configured && activeOpponent) mode = 'pregame';
  else if (latestGame) mode = 'between';

  const opponent = activeOpponent || clean(latestGame?.opponent) || 'NEXT OPPONENT';
  const score = scoreFor(latestGame || {});
  const result = clean(latestGame?.result).toUpperCase();

  const presentation = mode === 'pregame'
    ? {
        kicker: 'GAME WEEK',
        headline: 'THE STORY CONTINUES SATURDAY',
        center: 'VS',
        centerLine: clean(state.currentWeekSetup?.kickoff) || 'SATURDAY, 7:30 PM',
        centerDetail: clean(state.currentWeekSetup?.venue) || 'STADIUM DETAILS PENDING',
        primaryLabel: 'IMPORT SESSION',
        primaryTarget: 'importSession',
      }
    : mode === 'postgame'
      ? {
          kicker: 'POSTGAME',
          headline: `WEEK ${latestGame?.week ?? week} IS IN THE BOOKS`,
          center: 'FINAL',
          centerLine: score || 'RESULT PUBLISHED',
          centerDetail: result ? `${result} · WEEK ${latestGame?.week ?? week}` : `WEEK ${latestGame?.week ?? week}`,
          primaryLabel: 'CONTINUE WRAP-UP',
          primaryTarget: nextTarget(flow),
        }
      : mode === 'between'
        ? {
            kicker: 'BETWEEN WEEKS',
            headline: 'THE NEXT CHAPTER AWAITS',
            center: 'FINAL',
            centerLine: score || 'LAST RESULT',
            centerDetail: `SET UP WEEK ${week} TO CONTINUE`,
            primaryLabel: `SET UP WEEK ${week}`,
            primaryTarget: 'agenda',
          }
        : mode === 'bye'
          ? {
              kicker: 'DEVELOPMENT WEEK',
              headline: 'THE STORY CONTINUES THIS WEEK',
              center: 'BYE',
              centerLine: `WEEK ${week}`,
              centerDetail: 'DEVELOPMENT WEEK',
              primaryLabel: 'OPEN WEEK HUB',
              primaryTarget: 'gameHub',
            }
          : {
              kicker: 'DYNASTYHQ',
              headline: 'YOUR STORY STARTS HERE',
              center: 'NEXT',
              centerLine: `WEEK ${week}`,
              centerDetail: 'SET UP THE WEEK TO BEGIN',
              primaryLabel: `SET UP WEEK ${week}`,
              primaryTarget: 'agenda',
            };

  const keys = mode === 'pregame'
    ? pregameKeys({ latestGame, opponent })
    : mode === 'postgame'
      ? postgameKeys(flow)
      : betweenKeys({ week });

  return {
    mode,
    school,
    opponent,
    latestGame,
    activeOpponent,
    week,
    score,
    result,
    ...presentation,
    previous: {
      title: 'PREVIOUSLY ON DYNASTYHQ…',
      copy: previousCopyFor({ mode, school, opponent, latestGame, week }),
    },
    keys,
    keysTitle: mode === 'pregame' ? '3 KEYS TO THE GAME' : mode === 'postgame' ? 'WEEK WRAP-UP' : 'NEXT CHAPTER',
    scout: scoutFor({ mode, state, opponent, latestGame }),
  };
};
