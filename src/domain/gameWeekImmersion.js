import { buildGameDayBrief } from './gameDayBrief.js';
import { teamRecordThroughWeek } from './seasonSchedule.js';

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

  let mode = 'idle';
  if (flow.mode === 'wrap-up' && wrapUpGame) mode = 'postgame';
  else if (flow.mode === 'wrap-up') mode = 'season';
  else if (configured && isBye) mode = 'bye';
  else if (configured && activeOpponent) mode = 'pregame';
  else if (archivedLatestGame) mode = 'between';

  const latestGame = mode === 'postgame' ? wrapUpGame : archivedLatestGame;

  // Pregame belongs to the active Week Setup. Postgame/between-week presentation
  // belongs to the completed game. Never combine a future opponent with an older
  // final score just because Week Setup has already advanced.
  const opponent = mode === 'pregame'
    ? (activeOpponent || clean(latestGame?.opponent) || 'NEXT OPPONENT')
    : mode === 'season'
      ? (clean(archivedLatestGame?.opponent) || 'NO RESULT YET')
      : (clean(latestGame?.opponent) || activeOpponent || 'NEXT OPPONENT');
  const score = scoreFor(latestGame || {});
  const result = clean(latestGame?.result).toUpperCase();
  const latestGameSeason = finite(latestGame?.season, state.currentSeason || 1);
  const latestGameWeek = finite(latestGame?.week, week);
  const latestGameRecord = latestGame
    ? teamRecordThroughWeek(state, latestGameSeason, latestGameWeek)
    : null;

  const presentation = mode === 'pregame'
    ? {
        kicker: 'GAME DAY',
        headline: 'SATURDAY STARTS HERE',
        center: 'VS',
        centerLine: clean(state.currentWeekSetup?.kickoff) || 'KICKOFF TBD',
        centerDetail: clean(state.currentWeekSetup?.venue) || 'STADIUM DETAILS PENDING',
        primaryLabel: 'OPEN GAME DAY',
        primaryTarget: 'gameHub',
        secondaryLabel: 'IMPORT AFTER GAME',
        secondaryTarget: 'importSession',
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
          secondaryLabel: 'VIEW WEEK HUB',
          secondaryTarget: 'gameHub',
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
            secondaryLabel: 'VIEW LAST GAME',
            secondaryTarget: 'gameHub',
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
              secondaryLabel: 'VIEW CAREER',
              secondaryTarget: 'career',
            }
        : mode === 'season'
          ? {
              kicker: `SEASON ${currentSeason}`,
              headline: archivedLatestGame ? `LATEST SEASON ${currentSeason} RESULT` : `SEASON ${currentSeason} · NO FINAL YET`,
              center: archivedLatestGame ? 'FINAL' : '—',
              centerLine: archivedLatestGame ? (score || 'RESULT PUBLISHED') : `WEEK ${week}`,
              centerDetail: archivedLatestGame
                ? (result ? `${result} · WEEK ${archivedLatestGame.week ?? week}` : `WEEK ${archivedLatestGame.week ?? week}`)
                : 'FIRST RESULT PENDING',
              primaryLabel: clean(flow.nextAction?.label).toUpperCase() || 'OPEN WEEK HUB',
              primaryTarget: nextTarget(flow),
              secondaryLabel: 'OPEN GAME HUB',
              secondaryTarget: 'gameHub',
            }
          : {
              kicker: 'DYNASTYHQ',
              headline: 'YOUR STORY STARTS HERE',
              center: 'NEXT',
              centerLine: `WEEK ${week}`,
              centerDetail: 'SET UP THE WEEK TO BEGIN',
              primaryLabel: `SET UP WEEK ${week}`,
              primaryTarget: 'agenda',
              secondaryLabel: 'VIEW CAREER',
              secondaryTarget: 'career',
            };

  const role = clean(state.rtg?.rank || state.player?.depthChartRank || state.player?.role) || 'Current role';
  const keys = mode === 'pregame'
    ? gameDay.keys
    : mode === 'postgame'
      ? postgameKeys(flow)
      : mode === 'season'
        ? [
            { title: 'CURRENT ROLE', detail: `${role} at ${school}.` },
            { title: 'CURRENT STORY', detail: 'Home follows the latest career state; Game Hub owns matchup and game-day detail.' },
            { title: 'NEXT ACTION', detail: clean(flow.nextAction?.detail) || 'Continue the current week when you are ready.' },
          ]
        : betweenKeys({ week });

  const previous = mode === 'pregame'
    ? { title: 'PREVIOUSLY ON DYNASTYHQ…', copy: gameDay.previous.copy }
    : mode === 'season'
      ? {
          title: 'CURRENT CAREER STATE',
          copy: `${school} is in Season ${currentSeason}${currentPhase === 'preseason' ? ' preseason' : ''}. The homepage now follows the active career state instead of carrying an older matchup forward.`,
        }
      : { title: 'PREVIOUSLY ON DYNASTYHQ…', copy: previousCopyFor({ mode, school, opponent, latestGame, week }) };

  const scout = mode === 'pregame'
    ? { eyebrow: 'OPPONENT SCOUT', team: gameDay.scout.team, facts: gameDay.scout.facts, note: gameDay.scout.note }
    : mode === 'season'
      ? {
          eyebrow: 'PROGRAM PULSE',
          team: school,
          facts: [
            { label: 'SEASON', value: String(currentSeason) },
            { label: 'WEEK', value: String(week) },
            { label: 'ROLE', value: role.toUpperCase() },
          ],
          note: 'Open Game Hub when you want the current week, opponent, and game-day presentation.',
        }
      : scoutFor({ mode, state, opponent, latestGame });

  return {
    mode,
    school,
    opponent,
    currentSeason,
    currentPhase,
    hasCurrentSeasonGame: Boolean(archivedLatestGame),
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
    keysTitle: mode === 'pregame' ? '3 KEYS TO THE GAME' : mode === 'postgame' ? 'WEEK WRAP-UP' : mode === 'season' ? 'WHAT MATTERS NOW' : 'NEXT CHAPTER',
    scout,
    gameDay,
  };
};
