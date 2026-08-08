export const HIGH_SCHOOL_GAME_TARGET = 5;

export const TRANSFER_STATUSES = Object.freeze({
  INACTIVE: 'inactive',
  EXPLORING: 'exploring',
});

const clean = (value) => String(value || '').trim();
const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export const DEFAULT_PLAYER_RECRUITING = Object.freeze({
  highSchoolGameTarget: HIGH_SCHOOL_GAME_TARGET,
  highSchool: {
    stage: 'setup',
    gameNumber: 0,
    tapeScore: 0,
    recruitStars: 3,
    rankings: { national: '', state: '', position: '' },
    topSchoolsSelected: 0,
    events: [],
  },
  finalists: [],
  highSchoolArchive: null,
  transfer: {
    status: TRANSFER_STATUSES.INACTIVE,
    openedSeason: null,
    openedWeek: null,
    targets: [],
    decisions: [],
  },
});

export const normalizePlayerRecruiting = (value = {}) => ({
  ...DEFAULT_PLAYER_RECRUITING,
  ...value,
  highSchool: {
    ...DEFAULT_PLAYER_RECRUITING.highSchool,
    ...(value.highSchool || {}),
    rankings: {
      ...DEFAULT_PLAYER_RECRUITING.highSchool.rankings,
      ...(value.highSchool?.rankings || {}),
    },
    events: Array.isArray(value.highSchool?.events) ? value.highSchool.events : [],
  },
  finalists: Array.isArray(value.finalists) ? value.finalists.map(String).slice(0, 3) : [],
  highSchoolArchive: value.highSchoolArchive || null,
  transfer: {
    ...DEFAULT_PLAYER_RECRUITING.transfer,
    ...(value.transfer || {}),
    targets: Array.isArray(value.transfer?.targets) ? value.transfer.targets : [],
    decisions: Array.isArray(value.transfer?.decisions) ? value.transfer.decisions : [],
  },
});

export const countHighSchoolGames = (state = {}) => {
  const archived = state.playerRecruiting?.highSchoolArchive?.gamesCompleted;
  if (archived !== undefined && archived !== null) return Math.min(HIGH_SCHOOL_GAME_TARGET, numeric(archived));
  return Math.min(HIGH_SCHOOL_GAME_TARGET, (state.gameLogs || []).filter((game) => game?.didPlay !== false).length);
};

export const normalizeRecruitingSchool = (school = {}, index = 0) => ({
  ...school,
  preferenceRank: school.preferenceRank || school.customOrder || index + 1,
  customOrder: school.customOrder || school.preferenceRank || index + 1,
  progressStage: school.progressStage ?? '',
  offered: Boolean(school.offered),
  schemeFit: typeof school.schemeFit === 'boolean' ? school.schemeFit : null,
  scholarshipBonuses: {
    academics: 0,
    brand: 0,
    leadership: 0,
    fitness: 0,
    coachTrust: 0,
    skillPoints: 0,
    ...(school.scholarshipBonuses || {}),
  },
  programRatings: {
    overall: '', offense: '', defense: '',
    ...(school.programRatings || {}),
  },
  tendencies: {
    run: '', pass: '', aggressive: '', conservative: '',
    ...(school.tendencies || {}),
  },
  depthChart: Array.isArray(school.depthChart) ? school.depthChart : [],
});

export const sortedRecruitingSchools = (schools = []) => schools
  .map(normalizeRecruitingSchool)
  .sort((left, right) => (
    numeric(left.preferenceRank || 999) - numeric(right.preferenceRank || 999)
    || numeric(left.customOrder || 999) - numeric(right.customOrder || 999)
    || left.name.localeCompare(right.name)
  ));

export const applyPlayerRecruitingPatch = (state = {}, patch = {}) => {
  if (!patch || !Object.keys(patch).length) return state;
  const playerRecruiting = normalizePlayerRecruiting(state.playerRecruiting);
  const previous = playerRecruiting.highSchool;
  const next = {
    ...previous,
    ...patch,
    rankings: { ...previous.rankings, ...(patch.rankings || {}) },
  };
  const changed = [
    ['tapeScore', previous.tapeScore, next.tapeScore],
    ['recruitStars', previous.recruitStars, next.recruitStars],
    ['nationalRank', previous.rankings.national, next.rankings.national],
    ['stateRank', previous.rankings.state, next.rankings.state],
    ['positionRank', previous.rankings.position, next.rankings.position],
    ['topSchoolsSelected', previous.topSchoolsSelected, next.topSchoolsSelected],
  ].filter(([, before, after]) => String(before) !== String(after));
  if (changed.length) {
    next.events = [...previous.events, {
      id: `recruiting-profile-${Date.now()}-${previous.events.length}`,
      gameNumber: numeric(next.gameNumber),
      capturedAt: new Date().toISOString(),
      changes: changed.map(([field, from, to]) => ({ field, from, to })),
    }];
  }
  return {
    ...state,
    player: patch.recruitStars ? { ...state.player, stars: patch.recruitStars } : state.player,
    playerRecruiting: { ...playerRecruiting, highSchool: next },
  };
};

export const toggleRecruitingFinalist = (state, schoolId) => {
  const playerRecruiting = normalizePlayerRecruiting(state.playerRecruiting);
  const id = String(schoolId);
  const alreadySelected = playerRecruiting.finalists.includes(id);
  const finalists = alreadySelected
    ? playerRecruiting.finalists.filter((entry) => entry !== id)
    : [...playerRecruiting.finalists, id].slice(-3);
  return { ...state, playerRecruiting: { ...playerRecruiting, finalists } };
};

export const archiveHighSchoolRecruiting = (state, committedSchool, committedAt = new Date().toISOString()) => {
  const playerRecruiting = normalizePlayerRecruiting(state.playerRecruiting);
  const sortedSchools = sortedRecruitingSchools(state.recruiting || []);
  const selectedFinalists = sortedSchools.filter((school) => playerRecruiting.finalists.includes(String(school.id)));
  const fallbackFinalists = sortedSchools.filter((school) => school.offered).slice(0, 3);
  return {
    ...state,
    playerRecruiting: {
      ...playerRecruiting,
      highSchoolArchive: {
        committedSchool,
        committedAt,
        gamesCompleted: countHighSchoolGames(state),
        starRating: state.player?.stars || '',
        highSchoolProfile: { ...playerRecruiting.highSchool },
        offerCount: sortedSchools.filter((school) => school.offered).length,
        finalists: (selectedFinalists.length ? selectedFinalists : fallbackFinalists).map((school) => ({ ...school })),
        schools: sortedSchools.map((school) => ({ ...school })),
      },
    },
  };
};

export const buildRecruitingTimeline = (state = {}) => {
  const snapshots = (state.weeklyUpdates || [])
    .filter((update) => update.recruitingSnapshot?.length)
    .slice(0, HIGH_SCHOOL_GAME_TARGET)
    .map((update) => ({
      id: update.id,
      week: update.week,
      game: update.game,
      leader: sortedRecruitingSchools(update.recruitingSnapshot)[0] || null,
      changes: update.recruitingChanges || [],
    }));
  return Array.from({ length: HIGH_SCHOOL_GAME_TARGET }, (_, index) => snapshots[index] || {
    id: `pending-${index + 1}`,
    week: index + 1,
    game: null,
    leader: null,
    changes: [],
  });
};

export const openTransferRecruiting = (state) => {
  const playerRecruiting = normalizePlayerRecruiting(state.playerRecruiting);
  return {
    ...state,
    playerRecruiting: {
      ...playerRecruiting,
      transfer: {
        ...playerRecruiting.transfer,
        status: TRANSFER_STATUSES.EXPLORING,
        openedSeason: state.currentSeason || 1,
        openedWeek: state.currentWeek || 1,
      },
    },
  };
};

export const closeTransferRecruiting = (state, decision = 'stay', destination = '') => {
  const playerRecruiting = normalizePlayerRecruiting(state.playerRecruiting);
  const transfer = playerRecruiting.transfer;
  const record = {
    id: `transfer-decision-${state.currentSeason || 1}-${state.currentWeek || 1}-${Date.now()}`,
    season: state.currentSeason || 1,
    week: state.currentWeek || 1,
    decision,
    from: state.player?.college || state.player?.school || '',
    destination: clean(destination),
    targets: transfer.targets.map((target) => ({ ...target })),
  };
  return {
    ...state,
    playerRecruiting: {
      ...playerRecruiting,
      transfer: {
        ...transfer,
        status: TRANSFER_STATUSES.INACTIVE,
        openedSeason: null,
        openedWeek: null,
        targets: [],
        decisions: [...transfer.decisions, record],
      },
    },
  };
};

export const addTransferTarget = (state, name) => {
  const schoolName = clean(name);
  if (!schoolName) return state;
  const playerRecruiting = normalizePlayerRecruiting(state.playerRecruiting);
  if (playerRecruiting.transfer.targets.some((target) => clean(target.name).toLowerCase() === schoolName.toLowerCase())) return state;
  const target = {
    id: `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: schoolName,
    projectedRole: '',
    fit: '',
    offered: false,
    city: '',
    state: '',
    localOutletName: '',
    regionalOutletName: '',
  };
  return {
    ...state,
    playerRecruiting: {
      ...playerRecruiting,
      transfer: { ...playerRecruiting.transfer, targets: [...playerRecruiting.transfer.targets, target] },
    },
  };
};

export const updateTransferTarget = (state, targetId, field, value) => {
  const playerRecruiting = normalizePlayerRecruiting(state.playerRecruiting);
  return {
    ...state,
    playerRecruiting: {
      ...playerRecruiting,
      transfer: {
        ...playerRecruiting.transfer,
        targets: playerRecruiting.transfer.targets.map((target) => (
          target.id === targetId ? { ...target, [field]: value } : target
        )),
      },
    },
  };
};

export const removeTransferTarget = (state, targetId) => {
  const playerRecruiting = normalizePlayerRecruiting(state.playerRecruiting);
  return {
    ...state,
    playerRecruiting: {
      ...playerRecruiting,
      transfer: {
        ...playerRecruiting.transfer,
        targets: playerRecruiting.transfer.targets.filter((target) => target.id !== targetId),
      },
    },
  };
};

export const snapshotRecruitingChanges = (previous = [], current = []) => {
  const previousById = new Map(previous.map((school) => [String(school.id), school]));
  return current.flatMap((school) => {
    const prior = previousById.get(String(school.id));
    if (!prior) return [{ schoolId: school.id, school: school.name, type: 'added', preferenceRank: school.preferenceRank, offered: Boolean(school.offered) }];
    const changes = [];
    if (prior.progressStage !== school.progressStage && school.progressStage !== '') changes.push({ schoolId: school.id, school: school.name, type: 'progress', from: prior.progressStage, to: school.progressStage });
    if (!prior.offered && school.offered) changes.push({ schoolId: school.id, school: school.name, type: 'offer' });
    if (prior.schemeFit !== school.schemeFit && typeof school.schemeFit === 'boolean') changes.push({ schoolId: school.id, school: school.name, type: 'scheme-fit', to: school.schemeFit });
    return changes;
  });
};

export const applyCommitmentToLatestNewsroom = (state, schoolName) => {
  const issues = [...(state.newsroomIssues || [])];
  if (!issues.length) return state;
  const latestIndex = issues.length - 1;
  const issue = issues[latestIndex];
  const milestone = [...(state.careerMilestones || [])].reverse().find((entry) => entry.type === 'commitment' && entry.institution === schoolName);
  const citedFactKeys = milestone?.factKeys || ['profile.player.name'];
  issues[latestIndex] = {
    ...issue,
    articles: issue.articles.map((article) => article.outletId === 'recruiting' ? {
      ...article,
      headline: `${state.player?.name || 'The quarterback'} commits to ${schoolName}`,
      dek: `The five-game recruiting journey ends with a verified Signing Day decision.`,
      paragraphs: [
        `${state.player?.name || 'The quarterback'} has officially committed to ${schoolName}, closing the high-school recruiting process with a user-confirmed decision.`,
        `The permanent recruiting archive preserves every school, offer, finalist, and verified weekly movement that led to the choice.`,
        `The ordered Top 10, game-supplied progress bars, scholarship offers, and school overviews remain frozen as recruiting history. They are not carried forward as current college or transfer-portal interest.`,
        `DynastyHQ will now move the recruiting workspace into college mode. It will remain quiet unless a future transfer decision is intentionally opened.`,
      ],
      citedFactKeys,
      groundingStatus: 'verified',
    } : article),
  };
  return { ...state, newsroomIssues: issues };
};
