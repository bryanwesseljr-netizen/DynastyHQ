import { createRtgSnapshot, diffRtgSnapshots, hasRtgSnapshot, RTG_FIELDS } from './rtgProgress';

export const WEEK_SETUP_TYPES = Object.freeze({
  GAME: 'game',
  BYE: 'bye',
});

export const WEEK_PHASES = Object.freeze({
  PRESEASON: 'preseason',
  REGULAR: 'regular-season',
  POSTSEASON: 'postseason',
});

const hasValue = (value) => value !== '' && value !== null && value !== undefined;

export const normalizeWeekNumber = (value, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.trunc(parsed);
};

export const createWeekSetupKey = (season = 1, week = 1) => {
  const safeSeason = Math.max(1, normalizeWeekNumber(season, 1));
  const safeWeek = normalizeWeekNumber(week, 1);
  return `season-${safeSeason}-week-${safeWeek}`;
};

export const defaultWeekLabel = ({ week = 1, type = WEEK_SETUP_TYPES.GAME, phase = WEEK_PHASES.REGULAR } = {}) => {
  const safeWeek = normalizeWeekNumber(week, 1);
  if (phase === WEEK_PHASES.PRESEASON) {
    if (type === WEEK_SETUP_TYPES.BYE) return safeWeek === 0 ? 'Preseason Bye' : `Preseason Week ${safeWeek} Bye`;
    return safeWeek === 0 ? 'Preseason' : `Preseason Week ${safeWeek}`;
  }
  if (phase === WEEK_PHASES.POSTSEASON) {
    return type === WEEK_SETUP_TYPES.BYE ? 'Postseason Bye' : 'Postseason';
  }
  return type === WEEK_SETUP_TYPES.BYE ? `Week ${safeWeek} Bye` : `Week ${safeWeek}`;
};

export const normalizeWeekSetup = (setup = {}, state = {}) => {
  const week = normalizeWeekNumber(setup.week ?? state.currentWeek ?? 1, 1);
  const phase = Object.values(WEEK_PHASES).includes(setup.phase) ? setup.phase : WEEK_PHASES.REGULAR;
  const type = Object.values(WEEK_SETUP_TYPES).includes(setup.type) ? setup.type : WEEK_SETUP_TYPES.GAME;
  const customLabel = String(setup.label || '').trim();
  return {
    week,
    type,
    phase,
    label: customLabel || defaultWeekLabel({ week, type, phase }),
    customLabel,
    note: String(setup.note || '').trim(),
  };
};

const verifiedFact = (publicationId, key, label, value) => ({
  id: `${publicationId}:${key}`,
  key,
  label,
  value,
  confidence: 1,
  sourceId: 'week-setup',
  verified: true,
  publicationId,
});

const previousRtgSnapshot = (state = {}) => [...(state.weeklyUpdates || [])]
  .reverse()
  .find((entry) => hasRtgSnapshot(entry.rtgSnapshot))?.rtgSnapshot || {};

const formatValue = (key, value) => {
  if (!hasValue(value)) return '—';
  if (key === 'gpa') return Number(value).toFixed(1);
  if (key === 'valuation') return `$${Number(value).toLocaleString()}`;
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
};

const developmentPieces = ({ player = {}, rtg = {} }) => {
  const pieces = [];
  if (hasValue(player.overall)) pieces.push(`${player.overall} OVR`);
  if (rtg.rank) pieces.push(`${rtg.rank} on the depth chart`);
  if (hasValue(rtg.coachTrust)) pieces.push(`${Number(rtg.coachTrust).toLocaleString()} Coach Trust`);
  if (hasValue(rtg.skillPoints)) pieces.push(`${Number(rtg.skillPoints).toLocaleString()} available Skill Points`);
  if (hasValue(rtg.energy)) pieces.push(`${Number(rtg.energy).toLocaleString()} Energy`);
  if (hasValue(rtg.gpa)) pieces.push(`${Number(rtg.gpa).toFixed(1)} GPA`);
  return pieces;
};

const changeSentence = (changes = []) => {
  if (!changes.length) return 'No week-over-week RTG change was claimed beyond the verified snapshot entered for this bye.';
  const visible = changes.slice(0, 4).map((change) => `${change.label} ${formatValue(change.key, change.previous)} → ${formatValue(change.key, change.current)}`);
  return `Verified movement in this update: ${visible.join('; ')}.`;
};

const currentCollegeOutlet = (state = {}) => {
  const stops = state.collegeNewsroom?.stops || [];
  const active = stops.find((stop) => stop.id === state.collegeNewsroom?.activeStopId) || stops[stops.length - 1] || {};
  return {
    local: active.localOutletName || 'Campus Football Desk',
    regional: active.regionalOutletName || 'Regional College Football Desk',
    national: active.nationalOutletName || 'Saturday National',
  };
};

export const createByeNewsroomIssue = ({ state, setup, rtgSnapshot, rtgChanges, facts, publishedAt, publicationId }) => {
  const player = state.player || {};
  const playerName = player.name || 'The quarterback';
  const school = player.college || player.school || 'the program';
  const outlets = currentCollegeOutlet(state);
  const status = developmentPieces({ player, rtg: rtgSnapshot });
  const statusText = status.length
    ? `The verified player snapshot lists ${status.join(', ')}.`
    : 'No depth-chart, overall, Coach Trust, Skill Point, GPA, or Energy value was entered for this bye snapshot.';
  const noteText = setup.note ? `The verified week note reads: ${setup.note}` : 'No additional week note was entered, so no practice result, injury claim, coach quote, or private storyline is being invented.';
  const phaseText = setup.phase === WEEK_PHASES.PRESEASON
    ? 'preseason preparation'
    : setup.phase === WEEK_PHASES.POSTSEASON
      ? 'postseason preparation'
      : 'regular-season preparation';
  const factKeys = facts.map((entry) => entry.key);
  const article = (id, outletName, desk, theme, headline, dek, paragraphs) => ({
    id,
    outletId: id,
    outletName,
    desk,
    theme,
    headline,
    dek,
    paragraphs,
    citedFactKeys: factKeys,
    groundingStatus: 'verified',
  });

  const firstHeadline = setup.phase === WEEK_PHASES.PRESEASON
    ? `${playerName} begins ${school} chapter during ${setup.label}`
    : `${school} enters ${setup.label} with development work on the record`;
  const roomHeadline = rtgSnapshot.rank
    ? `Where ${playerName} fits: ${rtgSnapshot.rank} entering ${setup.label}`
    : `${playerName}'s development snapshot enters the record`;

  return {
    id: publicationId,
    publicationId,
    season: Number(state.currentSeason ?? 1),
    week: setup.week,
    label: setup.label,
    weekLabel: setup.label,
    weekPhase: setup.phase,
    weekType: WEEK_SETUP_TYPES.BYE,
    careerPhase: state.careerPhase || 'Player',
    publishedAt,
    status: 'published',
    editionType: 'bye',
    articles: [
      article(
        'bye-local',
        outlets.local,
        'Team Desk',
        'local',
        firstHeadline,
        `A verified ${phaseText} update with no game result, score, or box-score statistics attached.`,
        [
          `${school} has no game attached to ${setup.label}, so DynastyHQ records the week as a bye rather than manufacturing an opponent or result.`,
          `${statusText} Those values establish the football context for where ${playerName} stands entering the next playable week.`,
          changeSentence(rtgChanges),
          noteText,
        ],
      ),
      article(
        'bye-development',
        outlets.regional,
        'Quarterback Development',
        'filmroom',
        roomHeadline,
        'The bye-week story is built from verified role and progression data instead of an imaginary performance.',
        [
          rtgSnapshot.rank
            ? `${playerName} is recorded as ${rtgSnapshot.rank} on the depth chart for ${setup.label}. That is the verified role marker; no snap count or playing-time promise is inferred from it.`
            : `No depth-chart rank was entered for ${setup.label}, so the quarterback-room story stops short of assigning a role.`,
          hasValue(state.player?.overall)
            ? `${playerName}'s overall rating is recorded at ${state.player.overall}. The number is preserved as a development baseline, not treated as a prediction of when he will play.`
            : `No overall rating was entered in this update, so the development desk leaves that value open.`,
          hasValue(rtgSnapshot.coachTrust) || hasValue(rtgSnapshot.skillPoints)
            ? `The current progression snapshot includes${hasValue(rtgSnapshot.coachTrust) ? ` ${Number(rtgSnapshot.coachTrust).toLocaleString()} Coach Trust` : ''}${hasValue(rtgSnapshot.coachTrust) && hasValue(rtgSnapshot.skillPoints) ? ' and' : ''}${hasValue(rtgSnapshot.skillPoints) ? ` ${Number(rtgSnapshot.skillPoints).toLocaleString()} available Skill Points` : ''}.`
            : `Coach Trust and Skill Points were not both required to publish the bye, and no missing value is being filled in from memory.`,
          changeSentence(rtgChanges),
        ],
      ),
      article(
        'bye-national',
        outlets.national,
        setup.phase === WEEK_PHASES.POSTSEASON ? 'Postseason Desk' : 'Season Desk',
        'national',
        `${setup.label} becomes part of ${school}'s verified season timeline`,
        'A bye advances the career calendar without changing the team record or creating player statistics.',
        [
          `${setup.label} is preserved as a non-game week in Season ${Number(state.currentSeason ?? 1)}. It does not add a win or loss and it does not create a game-log appearance for ${playerName}.`,
          setup.phase === WEEK_PHASES.POSTSEASON
            ? `Because this is marked as postseason, the label can carry the actual bracket language shown by the game—such as “CFP First-Round Bye”—without forcing DynastyHQ to pretend a contest was played.`
            : `The season timeline advances normally after the bye, keeping the next playable week in sequence.`,
          `${statusText}`,
          `Future coverage can compare the next verified game or weekly snapshot with this bye-week baseline; it will not attribute improvement or decline without recorded evidence.`,
        ],
      ),
    ],
    podcastBrief: {
      title: `${school} ${setup.label}: role, development, and what comes next`,
      summary: `${playerName}'s bye-week briefing uses the verified RTG snapshot and week note only. No opponent, score, game stats, or fabricated practice results are attached.`,
      citedFactKeys: factKeys,
    },
  };
};

export const createByeWeekPublication = ({ state = {}, setup: rawSetup = {}, rtg = {}, playerOverall }) => {
  const setup = normalizeWeekSetup(rawSetup, state);
  if (setup.type !== WEEK_SETUP_TYPES.BYE) throw new Error('Only bye weeks can be published through the bye-week publisher.');

  const season = Math.max(1, normalizeWeekNumber(state.currentSeason ?? 1, 1));
  const publicationId = createWeekSetupKey(season, setup.week);
  const duplicate = (state.weeklyUpdates || []).some((entry) => entry.weekKey === publicationId || entry.id === publicationId);
  if (duplicate) throw new Error(`${setup.label} has already been published.`);

  const publishedAt = new Date().toISOString();
  const nextRtg = {
    ...(state.rtg || {}),
    ...rtg,
    wear: { ...(state.rtg?.wear || {}), ...(rtg.wear || {}) },
  };
  const nextPlayer = {
    ...(state.player || {}),
    ...(hasValue(playerOverall) ? { overall: Number.isFinite(Number(playerOverall)) ? Number(playerOverall) : playerOverall } : {}),
  };
  const rtgSnapshot = createRtgSnapshot(nextRtg);
  const priorRtg = previousRtgSnapshot(state);
  const rtgChanges = hasRtgSnapshot(priorRtg) ? diffRtgSnapshots(rtgSnapshot, priorRtg) : [];
  const facts = [];
  const addFact = (key, label, value) => {
    if (!hasValue(value)) return;
    facts.push(verifiedFact(publicationId, key, label, value));
  };
  addFact('profile.player.name', 'Player', nextPlayer.name);
  addFact('profile.player.school', 'School', nextPlayer.school || nextPlayer.college);
  addFact('profile.player.college', 'College', nextPlayer.college);
  addFact('profile.player.overall', 'Overall rating', nextPlayer.overall);
  addFact('weekly.phase', 'Season phase', setup.phase);
  addFact('weekly.label', 'Week label', setup.label);
  addFact('weekly.note', 'Week note', setup.note);
  RTG_FIELDS.forEach(({ key, label }) => addFact(`rtg.${key}`, label, rtgSnapshot[key]));
  Object.entries(rtgSnapshot.wear || {}).forEach(([part, value]) => addFact(`rtg.wear.${part}`, `${part} wear`, value));

  const status = developmentPieces({ player: nextPlayer, rtg: rtgSnapshot });
  const chronicleSummary = status.length
    ? `${status.join(' · ')}${setup.note ? ` · ${setup.note}` : ''}`
    : (setup.note || 'Verified bye week; no game result or player statistics recorded.');
  const weeklyUpdate = {
    id: publicationId,
    weekKey: publicationId,
    status: 'published',
    season,
    week: setup.week,
    careerPhase: state.careerPhase || 'Player',
    weekType: WEEK_SETUP_TYPES.BYE,
    weekPhase: setup.phase,
    weekLabel: setup.label,
    weekNote: setup.note,
    publishedAt,
    sourceCount: 0,
    factCount: facts.length,
    game: null,
    rtgSnapshot,
    rtgChanges,
    recruitingSnapshot: (state.recruiting || []).map((school) => ({ ...school })),
    recruitingChanges: [],
    playerRecruitingSnapshot: state.playerRecruiting?.highSchool || {},
  };
  const newsroomIssue = createByeNewsroomIssue({
    state: { ...state, player: nextPlayer },
    setup,
    rtgSnapshot,
    rtgChanges,
    facts,
    publishedAt,
    publicationId,
  });
  const nextPhase = setup.phase === WEEK_PHASES.PRESEASON && setup.week === 0
    ? WEEK_PHASES.REGULAR
    : setup.phase;

  return {
    ...state,
    player: nextPlayer,
    rtg: nextRtg,
    currentWeek: setup.week + 1,
    currentWeekSetup: {
      week: setup.week + 1,
      type: WEEK_SETUP_TYPES.GAME,
      phase: nextPhase,
      label: '',
      note: '',
    },
    weeklyUpdates: [...(state.weeklyUpdates || []), weeklyUpdate],
    factLedger: [...(state.factLedger || []), ...facts],
    careerChronicle: [...(state.careerChronicle || []), {
      id: publicationId,
      publicationId,
      type: 'bye',
      season,
      week: setup.week,
      weekType: WEEK_SETUP_TYPES.BYE,
      weekPhase: setup.phase,
      weekLabel: setup.label,
      careerPhase: state.careerPhase || 'Player',
      occurredAt: publishedAt,
      title: setup.label,
      summary: chronicleSummary,
      factKeys: facts.map((entry) => entry.key),
    }],
    newsroomIssues: [...(state.newsroomIssues || []), newsroomIssue],
  };
};
