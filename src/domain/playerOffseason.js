import { CAREER_STAGES, deriveCareerStage } from './commandCenter.js';
import { normalizeCareerTransitions } from './careerTransitions.js';
import { buildMediaNetworkLayer, latestMeaningfulMediaContext } from './mediaNetworkLayer.js';
import { normalizePlayerRecruiting, TRANSFER_STATUSES } from './playerRecruiting.js';
import { buildRtgProgress, diffRtgSnapshots } from './rtgProgress.js';
import { seasonScheduleFor, syncScheduleWithCareer, teamRecordForSeason } from './seasonSchedule.js';

const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const numberOf = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const hasValue = (value) => value !== '' && value !== null && value !== undefined;

const collegeAppearancesForSeason = (state = {}, season = 1) => list(state.gameLogs)
  .filter((game) => game?.stage !== 'high-school' && !game?.evaluation && game?.didPlay !== false)
  .filter((game) => Number(game?.season || 1) === Number(season))
  .sort((left, right) => numberOf(left.week) - numberOf(right.week));

const playerSeasonLine = (games = []) => games.reduce((totals, game) => ({
  appearances: totals.appearances + 1,
  passYds: totals.passYds + numberOf(game.passYds),
  passTD: totals.passTD + numberOf(game.passTD),
  rushYds: totals.rushYds + numberOf(game.rushYds),
  rushTD: totals.rushTD + numberOf(game.rushTD),
  interceptions: totals.interceptions + numberOf(game.int ?? game.interceptions),
}), { appearances: 0, passYds: 0, passTD: 0, rushYds: 0, rushTD: 0, interceptions: 0 });

const highestPassingGame = (games = []) => [...games]
  .filter((game) => hasValue(game.passYds))
  .sort((left, right) => numberOf(right.passYds) - numberOf(left.passYds))[0] || null;

const seasonAwards = (state = {}, season = 1) => {
  const trophies = list(state.trophies)
    .filter((entry) => !hasValue(entry?.season) || Number(entry.season) === Number(season))
    .map((entry) => ({
      id: clean(entry.id) || `trophy-${clean(entry.title || entry.name || entry.achievement)}`,
      title: clean(entry.title || entry.name || entry.achievement || entry.award, 180),
      detail: clean(entry.detail || entry.summary || entry.notes, 260),
    }))
    .filter((entry) => entry.title);

  const milestones = list(state.careerMilestones)
    .filter((entry) => Number(entry?.season || season) === Number(season))
    .filter((entry) => /(award|honor|champ|all[- ]?american|heisman|record)/i.test(`${entry?.type || ''} ${entry?.title || ''} ${entry?.achievement || ''}`))
    .map((entry) => ({
      id: clean(entry.id) || `milestone-${clean(entry.title || entry.achievement)}`,
      title: clean(entry.title || entry.achievement || entry.type, 180),
      detail: clean(entry.summary || entry.notes, 260),
    }))
    .filter((entry) => entry.title);

  return [...trophies, ...milestones]
    .filter((entry, index, rows) => rows.findIndex((candidate) => candidate.title.toLowerCase() === entry.title.toLowerCase()) === index)
    .slice(0, 6);
};

const seasonProgress = (state = {}, season = 1) => {
  const progress = buildRtgProgress(state);
  const snapshots = progress.snapshots.filter((entry) => Number(entry.season) === Number(season));
  if (snapshots.length < 2) return [];
  const changes = diffRtgSnapshots(snapshots.at(-1).snapshot, snapshots[0].snapshot);
  const useful = new Set([
    'coachTrust', 'followers', 'gpa', 'leadershipLevel', 'leadershipAbility',
    'fitnessLevel', 'healthLevel', 'brandTier', 'dealTier', 'draftProjection',
  ]);
  return changes.filter((change) => useful.has(change.key)).slice(0, 5);
};

const mediaForSeason = (state = {}, season = 1) => {
  const context = latestMeaningfulMediaContext(state);
  if (Number(context.season) !== Number(season)) return null;
  const media = buildMediaNetworkLayer(state, context);
  if (!media.dynasty.newsroomReady && !media.dynasty.podcastReady && media.official.status !== 'captured') return null;
  return media;
};

const transferState = (state = {}, season = 1) => {
  const recruiting = normalizePlayerRecruiting(state.playerRecruiting);
  const transfer = recruiting.transfer;
  const latestDecision = [...transfer.decisions]
    .filter((entry) => Number(entry?.season || season) === Number(season))
    .at(-1) || null;
  const school = clean(state.player?.college || state.player?.school, 160) || 'current school';

  if (latestDecision?.decision === 'transfer' && clean(latestDecision.destination)) {
    return {
      state: 'transfer',
      complete: true,
      headline: `Next stop: ${clean(latestDecision.destination, 160)}`,
      detail: `The transfer decision is recorded from ${clean(latestDecision.from, 160) || school}.`,
      destination: clean(latestDecision.destination, 160),
      latestDecision,
    };
  }
  if (latestDecision?.decision === 'stay') {
    return {
      state: 'stay',
      complete: true,
      headline: `Returning to ${school}`,
      detail: `The stay decision is recorded for the next season.`,
      destination: school,
      latestDecision,
    };
  }
  if (transfer.status === TRANSFER_STATUSES.EXPLORING) {
    return {
      state: 'exploring',
      complete: false,
      headline: 'The transfer portal is open',
      detail: transfer.targets.length
        ? `${transfer.targets.length} school${transfer.targets.length === 1 ? '' : 's'} currently on the transfer board.`
        : 'Build the board before making a destination decision.',
      destination: '',
      latestDecision: null,
    };
  }
  return {
    state: 'pending',
    complete: false,
    headline: 'Return or explore the portal',
    detail: `No offseason decision has been recorded for Season ${season}.`,
    destination: '',
    latestDecision: null,
  };
};

const scheduleState = (state = {}, season = 1) => {
  const schedule = seasonScheduleFor(state, season);
  if (!schedule?.entries?.length) return {
    hasSchedule: false,
    closed: false,
    remaining: [],
    completed: [],
    lastTeamGame: null,
  };
  const synced = syncScheduleWithCareer(state, schedule);
  const playable = synced.entries.filter((entry) => !entry.isBye);
  const remaining = playable.filter((entry) => !entry.completed);
  const completed = playable.filter((entry) => entry.completed);
  return {
    hasSchedule: true,
    closed: playable.length > 0 && remaining.length === 0,
    remaining,
    completed,
    lastTeamGame: completed.at(-1) || null,
  };
};

export const buildPlayerOffseasonMode = (state = {}) => {
  const stage = deriveCareerStage(state);
  const season = Math.max(1, numberOf(state.currentSeason, 1));
  const school = clean(state.player?.college || state.player?.school, 160) || 'Your program';
  const schedule = scheduleState(state, season);
  const transitions = normalizeCareerTransitions(state.careerTransitions);
  const seasonComplete = Boolean(schedule.closed || transitions.graduationChecklist.finalSeasonComplete);
  const games = collegeAppearancesForSeason(state, season);
  const line = playerSeasonLine(games);
  const record = teamRecordForSeason(state, season);
  const peakPassing = highestPassingGame(games);
  const decision = transferState(state, season);
  const awards = seasonAwards(state, season);
  const movement = seasonProgress(state, season);
  const media = mediaForSeason(state, season);
  const role = clean(state.rtg?.rank, 80);
  const coachTrust = hasValue(state.rtg?.coachTrust) ? numberOf(state.rtg.coachTrust) : null;
  const overall = hasValue(state.player?.overall) ? numberOf(state.player.overall) : null;
  const skillPoints = hasValue(state.rtg?.skillPoints) ? numberOf(state.rtg.skillPoints) : null;
  const followers = hasValue(state.rtg?.followers) ? numberOf(state.rtg.followers) : null;
  const totalTD = line.passTD + line.rushTD;
  const latestPlayerGame = games.at(-1) || null;

  let headline;
  let dek;
  if (seasonComplete) {
    headline = `${school}'s Season ${season} chapter is complete`;
    dek = `${record.wins}-${record.losses} as a team. ${line.appearances} player appearance${line.appearances === 1 ? '' : 's'} are in your personal season record. The next chapter now moves through your career decision and offseason development.`;
  } else if (schedule.hasSchedule && schedule.remaining.length) {
    headline = `The offseason is waiting beyond ${schedule.remaining.length} scheduled game${schedule.remaining.length === 1 ? '' : 's'}`;
    dek = `${school} is ${record.wins}-${record.losses}. This page is a live preview of the end-of-season experience; career decisions stay in the background until the saved schedule closes.`;
  } else {
    headline = `Season ${season} is still an active chapter`;
    dek = `DynastyHQ will turn this page into the offseason command center when the season closes. Until then, it preserves the season-to-date story without guessing that the year is over.`;
  }

  const nextAction = !seasonComplete
    ? { id: 'finish-season', label: 'FINISH THE SEASON', target: 'gameHub', detail: schedule.remaining.length ? `${schedule.remaining.length} scheduled game${schedule.remaining.length === 1 ? '' : 's'} remain.` : 'Keep processing the current season.' }
    : !decision.complete
      ? { id: 'career-decision', label: decision.state === 'exploring' ? 'OPEN TRANSFER BOARD' : 'MAKE CAREER DECISION', target: 'recruiting', detail: decision.detail }
      : { id: 'development', label: 'CAPTURE OFFSEASON DEVELOPMENT', target: 'dataEntry', detail: 'Import the next verified RTG status after offseason training and progression.' };

  return {
    stage,
    isCollegePlayer: stage === CAREER_STAGES.COLLEGE,
    season,
    school,
    seasonComplete,
    status: seasonComplete ? 'season-complete' : 'preview',
    headline,
    dek,
    schedule,
    teamRecord: record,
    playerLine: { ...line, totalTD },
    latestPlayerGame,
    peakPassing: peakPassing ? {
      week: numberOf(peakPassing.week),
      opponent: clean(peakPassing.opponent, 160),
      yards: numberOf(peakPassing.passYds),
      result: clean(peakPassing.result, 10).toUpperCase(),
    } : null,
    currentStatus: { role, coachTrust, overall, skillPoints, followers },
    decision,
    awards,
    movement,
    media,
    nextAction,
    nextSeasonReady: seasonComplete && decision.complete,
    finalCareerChecklist: transitions.graduationChecklist,
  };
};
