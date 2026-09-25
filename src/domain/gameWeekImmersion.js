import { buildGameDayBrief } from './gameDayBrief.js';
import { nextScheduledGame, teamRecordThroughWeek } from './seasonSchedule.js';
import { buildPlayerOffseasonMode } from './playerOffseason.js';

const clean = (value) => String(value ?? '').trim();
const finite = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sortedGames = (state = {}) => [...(state.gameLogs || [])]
  .filter((game) => game && clean(game.opponent) && game.stage !== 'high-school' && !game.evaluation)
  .sort((left, right) => (
    finite(left?.season, 1) - finite(right?.season, 1)
    || finite(left?.week, 0) - finite(right?.week, 0)
  ));

const latestGameFor = (state = {}) => sortedGames(state).at(-1) || null;

const latestGameForSeason = (state = {}, season) => sortedGames(state)
  .filter((game) => finite(game?.season, 1) === finite(season, 1))
  .at(-1) || null;

const gameForWeek = (state = {}, season, week) => sortedGames(state).find((game) => (
  finite(game?.season, 1) === finite(season, 1)
  && finite(game?.week, 0) === finite(week, 0)
)) || null;

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
  const historicalLatestGame = latestGameFor(state);
  const activeOpponent = activeOpponentFor(state);
  const school = schoolFor(state, dashboard);
  const week = finite(flow.activeWeek?.week ?? state.currentWeek ?? dashboard.week, 1);
  const currentSeason = finite(state.currentSeason ?? dashboard.season, 1);
  const archivedLatestGame = latestGameForSeason(state, currentSeason);
  const upcomingGame = nextScheduledGame(state, currentSeason);
  const isBye = flow.activeWeek?.type === 'bye' || state.currentWeekSetup?.type === 'bye';
  const configured = Boolean(flow.activeWeek?.configured);
  const gameDay = buildGameDayBrief(state);
  const wrapUpSeason = finite(flow.wrapUp?.season, currentSeason);
  const wrapUpWeek = finite(flow.wrapUp?.week, week);
  const wrapUpGame = flow.mode === 'wrap-up' ? gameForWeek(state, wrapUpSeason, wrapUpWeek) : null;
  const currentPhase = clean(
    flow.activeWeek?.phase
    || flow.wrapUp?.entry?.weekPhase
    || state.currentWeekSetup?.phase
    || (week === 0 ? 'preseason' : 'regular'),
  ).toLowerCase();
  const offseason = buildPlayerOffseasonMode(state);
  const offseasonReady = Boolean(offseason?.isCollegePlayer && offseason?.seasonComplete);
  const preseason = currentPhase === 'preseason' || week === 0;
  const pendingFinalize = flow.mode === 'wrap-up' && clean(flow.nextAction?.target) === 'finalize';
  const wrapUpIsBye = flow.mode === 'wrap-up'
    && clean(flow.wrapUp?.entry?.weekType || flow.wrapUp?.entry?.type).toLowerCase() === 'bye';
  const upcomingOpponent = clean(activeOpponent || upcomingGame?.opponent);

  let mode = 'idle';
  if (flow.mode === 'wrap-up' && wrapUpGame) mode = 'postgame';
  else if (offseasonReady) mode = 'offseason';
  else if (wrapUpIsBye || (configured && isBye)) mode = 'bye';
  else if (preseason) mode = 'preseason';
  else if (upcomingOpponent) mode = 'pregame';
  else if (archivedLatestGame) mode = 'between';

  const latestGame = mode === 'postgame' ? wrapUpGame : archivedLatestGame;

  // Every Home state is scoped to the current season. Pregame may use the
  // current Week Setup or the current-season schedule, while final/between
  // states use only a current-season completed game.
  const opponent = mode === 'pregame'
    ? (upcomingOpponent || 'NEXT OPPONENT')
    : ['postgame', 'between'].includes(mode)
      ? (clean(latestGame?.opponent) || 'OPPONENT')
      : '';
  const score = scoreFor(latestGame || {});
  const result = clean(latestGame?.result).toUpperCase();
  const latestGameSeason = finite(latestGame?.season, state.currentSeason || 1);
  const latestGameWeek = finite(latestGame?.week, week);
  const latestGameRecord = latestGame
    ? teamRecordThroughWeek(state, latestGameSeason, latestGameWeek)
    : null;
  const upcomingWeek = finite(upcomingGame?.week, week);
  const upcomingSite = clean(
    state.currentWeekSetup?.venue
    || (upcomingGame?.homeAway === 'home' ? 'HOME'
      : upcomingGame?.homeAway === 'away' ? 'AWAY'
        : upcomingGame?.homeAway === 'neutral' ? 'NEUTRAL SITE' : ''),
  );
  const upcomingKickoff = clean(state.currentWeekSetup?.kickoff || upcomingGame?.date);

  let presentation;
  if (mode === 'pregame') {
    presentation = {
      kicker: `UP NEXT · WEEK ${upcomingWeek}`,
      headline: `${school.toUpperCase()} VS ${opponent.toUpperCase()}`,
      center: 'VS',
      centerLine: `WEEK ${upcomingWeek}`,
      centerDetail: upcomingKickoff || upcomingSite || 'MATCHUP READY',
      centerLayout: 'matchup',
      heroOpponent: opponent,
      rightTeamName: opponent,
      primaryLabel: pendingFinalize
        ? (clean(flow.nextAction?.label).toUpperCase() || 'FINALIZE WEEK')
        : 'OPEN GAME HUB',
      primaryTarget: pendingFinalize ? 'importSession' : 'gameHub',
      secondaryLabel: pendingFinalize ? 'OPEN GAME HUB' : 'IMPORT AFTER GAME',
      secondaryTarget: pendingFinalize ? 'gameHub' : 'importSession',
    };
  } else if (mode === 'postgame') {
    presentation = {
      kicker: 'POSTGAME',
      headline: `WEEK ${latestGame?.week ?? week} IS IN THE BOOKS`,
      center: 'FINAL',
      centerLine: score || 'RESULT PUBLISHED',
      centerDetail: result ? `${result} · WEEK ${latestGame?.week ?? week}` : `WEEK ${latestGame?.week ?? week}`,
      centerLayout: 'matchup',
      heroOpponent: opponent,
      rightTeamName: opponent,
      primaryLabel: 'CONTINUE WRAP-UP',
      primaryTarget: nextTarget(flow),
      secondaryLabel: 'VIEW WEEK HUB',
      secondaryTarget: 'gameHub',
    };
  } else if (mode === 'between') {
    presentation = {
      kicker: 'LATEST RESULT',
      headline: `WEEK ${latestGame?.week ?? '—'} FINAL`,
      center: 'FINAL',
      centerLine: score || 'LAST RESULT',
      centerDetail: result ? `${result} · SEASON ${currentSeason}` : `SEASON ${currentSeason}`,
      centerLayout: 'matchup',
      heroOpponent: opponent,
      rightTeamName: opponent,
      primaryLabel: `SET UP WEEK ${week}`,
      primaryTarget: 'agenda',
      secondaryLabel: 'VIEW LAST GAME',
      secondaryTarget: 'gameHub',
    };
  } else if (mode === 'bye') {
    presentation = {
      kicker: `WEEK ${week} · BYE`,
      headline: `${school.toUpperCase()} · DEVELOPMENT WEEK`,
      center: 'BYE',
      centerLine: `WEEK ${week}`,
      centerDetail: 'DEVELOPMENT WEEK',
      centerLayout: 'status',
      heroOpponent: '',
      rightTeamName: 'BYE WEEK',
      primaryLabel: pendingFinalize
        ? (clean(flow.nextAction?.label).toUpperCase() || 'FINALIZE WEEK')
        : 'OPEN WEEK HUB',
      primaryTarget: pendingFinalize ? 'importSession' : 'gameHub',
      secondaryLabel: pendingFinalize ? 'OPEN GAME HUB' : 'VIEW CAREER',
      secondaryTarget: pendingFinalize ? 'gameHub' : 'career',
    };
  } else if (mode === 'preseason') {
    presentation = {
      kicker: `SEASON ${currentSeason} · PRESEASON`,
      headline: `${school.toUpperCase()} PRESEASON`,
      center: 'PRE',
      centerLine: `WEEK ${week}`,
      centerDetail: `SEASON ${currentSeason} START`,
      centerLayout: 'status',
      heroOpponent: '',
      rightTeamName: 'PRESEASON',
      primaryLabel: pendingFinalize
        ? (clean(flow.nextAction?.label).toUpperCase() || 'FINALIZE WEEK')
        : 'OPEN GAME HUB',
      primaryTarget: pendingFinalize ? 'importSession' : 'gameHub',
      secondaryLabel: 'VIEW CAREER',
      secondaryTarget: 'career',
    };
  } else if (mode === 'offseason') {
    presentation = {
      kicker: `OFFSEASON · SEASON ${currentSeason}`,
      headline: `${school.toUpperCase()} OFFSEASON`,
      center: 'OFF',
      centerLine: 'SEASON COMPLETE',
      centerDetail: `${offseason.teamRecord?.wins || 0}-${offseason.teamRecord?.losses || 0} · NEXT CHAPTER`,
      centerLayout: 'status',
      heroOpponent: '',
      rightTeamName: 'OFFSEASON',
      primaryLabel: 'OPEN OFFSEASON',
      primaryTarget: 'offseason',
      secondaryLabel: 'VIEW CAREER',
      secondaryTarget: 'career',
    };
  } else {
    presentation = {
      kicker: 'DYNASTYHQ',
      headline: 'YOUR STORY STARTS HERE',
      center: 'NEXT',
      centerLine: `WEEK ${week}`,
      centerDetail: 'SET UP THE WEEK TO BEGIN',
      centerLayout: 'status',
      heroOpponent: '',
      rightTeamName: 'NEXT CHAPTER',
      primaryLabel: `SET UP WEEK ${week}`,
      primaryTarget: 'agenda',
      secondaryLabel: 'VIEW CAREER',
      secondaryTarget: 'career',
    };
  }

  const role = clean(state.rtg?.rank || state.player?.depthChartRank || state.player?.role) || 'Current role';
  const pregameKeys = configured && activeOpponent
    ? gameDay.keys
    : [
        { title: 'UP NEXT', detail: `Week ${upcomingWeek} brings ${opponent}.` },
        { title: 'CURRENT ROLE', detail: `${role} at ${school}.` },
        { title: 'GAME HUB', detail: 'Open the matchup hub for kickoff, venue, and game-day details.' },
      ];

  const keys = mode === 'pregame'
    ? pregameKeys
    : mode === 'postgame'
      ? postgameKeys(flow)
      : mode === 'bye'
        ? [
            { title: 'RECOVER', detail: 'Use the bye to reset wear, health, and weekly readiness.' },
            { title: 'DEVELOP', detail: `${role} remains the current saved role at ${school}.` },
            { title: 'STAY CURRENT', detail: 'Use Game Hub and Weekly Agenda for any verified bye-week changes.' },
          ]
        : mode === 'preseason'
          ? [
              { title: 'CURRENT ROLE', detail: `${role} at ${school}.` },
              { title: 'NEW SEASON', detail: `Season ${currentSeason} begins from the verified preseason state.` },
              { title: 'NEXT ACTION', detail: clean(flow.nextAction?.detail) || 'Finish preseason setup before the first game.' },
            ]
          : mode === 'offseason'
            ? [
                { title: 'SEASON COMPLETE', detail: `${school} finished ${offseason.teamRecord?.wins || 0}-${offseason.teamRecord?.losses || 0}.` },
                { title: 'CAREER DECISION', detail: offseason.decision?.detail || 'Record the next career decision before advancing.' },
                { title: 'DEVELOPMENT', detail: 'Capture verified offseason progression before the next season begins.' },
              ]
            : betweenKeys({ week });

  const previous = mode === 'offseason'
    ? {
        title: 'SEASON IN THE BOOKS',
        copy: `Season ${currentSeason} is complete at ${school}. The Home page is now in offseason mode until the next season begins.`,
      }
    : mode === 'preseason'
      ? {
          title: 'NEW SEASON, CLEAN SLATE',
          copy: `${school} is entering Season ${currentSeason}. Older opponents and finals stay in the archive instead of carrying into this preseason card.`,
        }
      : mode === 'bye'
        ? {
            title: 'THIS WEEK',
            copy: `${school} has a Week ${week} bye. The matchup card stays out of the way until the next scheduled opponent.`,
          }
        : { title: 'PREVIOUSLY ON DYNASTYHQ…', copy: previousCopyFor({ mode, school, opponent, latestGame, week }) };

  const setup = state.currentWeekSetup || {};
  const opponentRecord = clean(setup.opponentRecord || latestGame?.opponentRecord);
  const opponentRank = clean(setup.opponentRank || setup.opponentRanking || setup.rank);
  const scout = mode === 'pregame'
    ? {
        eyebrow: 'OPPONENT SCOUT',
        team: opponent,
        facts: [
          opponentRank ? { label: 'RANK', value: opponentRank.startsWith('#') ? opponentRank : `#${opponentRank}` } : null,
          opponentRecord ? { label: 'RECORD', value: opponentRecord } : null,
          upcomingKickoff ? { label: 'KICKOFF', value: upcomingKickoff } : null,
          upcomingSite ? { label: 'SITE', value: upcomingSite } : null,
        ].filter(Boolean),
        note: 'Game Hub owns the full matchup and game-day detail.',
      }
    : ['preseason', 'bye', 'offseason'].includes(mode)
      ? {
          eyebrow: mode === 'offseason' ? 'PROGRAM WRAP' : 'PROGRAM PULSE',
          team: school,
          facts: [
            { label: 'SEASON', value: String(currentSeason) },
            { label: 'WEEK', value: mode === 'offseason' ? 'DONE' : String(week) },
            { label: 'ROLE', value: role.toUpperCase() },
          ],
          note: mode === 'offseason'
            ? 'Open Offseason for the full season review, career decision, and development path.'
            : 'Game Hub remains the home for detailed weekly football context.',
        }
      : scoutFor({ mode, state, opponent, latestGame });

  return {
    mode,
    school,
    opponent,
    currentSeason,
    currentPhase,
    offseasonReady,
    pendingFinalize,
    wrapUpIsBye,
    hasCurrentSeasonGame: Boolean(archivedLatestGame),
    upcomingGame,
    historicalLatestGame,
    latestGame,
    latestGameRecord,
    activeOpponent,
    week,
    score,
    result,
    ...presentation,
    previous,
    keys,
    keysTitle: mode === 'pregame' ? 'UPCOMING GAME' : mode === 'postgame' ? 'WEEK WRAP-UP' : mode === 'offseason' ? 'OFFSEASON PRIORITIES' : mode === 'preseason' ? 'PRESEASON PRIORITIES' : mode === 'bye' ? 'BYE WEEK PLAN' : 'NEXT CHAPTER',
    scout,
    gameDay,
  };
};
