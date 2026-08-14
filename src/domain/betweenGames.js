const hasValue = (value) => value !== '' && value !== null && value !== undefined;

const normalizedComparable = (value) => {
  if (!hasValue(value)) return '';
  if (typeof value === 'number') return String(value);
  return String(value).trim();
};

const sameValue = (left, right) => normalizedComparable(left) === normalizedComparable(right);

const chronological = (left, right) => (
  Number(left?.season || 1) - Number(right?.season || 1)
  || Number(left?.week || 1) - Number(right?.week || 1)
  || String(left?.publishedAt || '').localeCompare(String(right?.publishedAt || ''))
);

const publicationIdentity = (entry = {}) => (
  entry.publicationId || entry.weekKey || entry.id || ''
);

const samePublication = (left, right) => {
  const leftId = publicationIdentity(left);
  const rightId = publicationIdentity(right);
  if (leftId && rightId && leftId === rightId) return true;
  return Number(left?.season || 0) === Number(right?.season || 0)
    && Number(left?.week || 0) === Number(right?.week || 0)
    && Number(left?.season || 0) > 0
    && Number(left?.week || 0) > 0;
};

const fieldDefinitions = [
  { key: 'gpa', label: 'GPA' },
  { key: 'energy', label: 'Energy' },
  { key: 'coachTrust', label: 'Coach Trust' },
  { key: 'trustToNext', label: 'Next Trust Threshold' },
  { key: 'rank', label: 'Depth Chart' },
  { key: 'skillPoints', label: 'Skill Points' },
  { key: 'followers', label: 'Followers' },
  { key: 'valuation', label: 'NIL Valuation' },
  { key: 'sponsorships', label: 'Sponsorships' },
];

export const formatBetweenGamesValue = (key, value) => {
  if (!hasValue(value)) return '—';
  if (key === 'gpa') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(1) : String(value);
  }
  if (key === 'valuation') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? `$${parsed.toLocaleString()}` : String(value);
  }
  if (['energy', 'coachTrust', 'trustToNext', 'skillPoints', 'followers'].includes(key)) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toLocaleString() : String(value);
  }
  return String(value);
};

export const getLatestPublishedWeek = (state = {}) => (
  [...(state.weeklyUpdates || [])].sort(chronological).at(-1) || null
);

export const getLatestPublishedRtgSnapshot = (state = {}) => {
  const update = [...(state.weeklyUpdates || [])]
    .sort(chronological)
    .reverse()
    .find((entry) => entry?.rtgSnapshot && Object.values(entry.rtgSnapshot).some(hasValue));
  return {
    update: update || null,
    snapshot: update?.rtgSnapshot || {},
  };
};

export const buildChangeOnlyModel = ({ state = {}, rtgUpdate = {} } = {}) => {
  const { update: baselineUpdate, snapshot: baseline } = getLatestPublishedRtgSnapshot(state);
  const savedCurrent = state.rtg || {};
  const draft = rtgUpdate || {};

  const fields = fieldDefinitions.map((field) => {
    const baselineValue = baseline[field.key];
    const savedValue = savedCurrent[field.key];
    const draftValue = draft[field.key];
    const baselineKnown = hasValue(baselineValue);
    const draftWasEdited = !sameValue(draftValue, savedValue);

    let status = 'unknown';
    if (baselineKnown && sameValue(draftValue, baselineValue)) status = 'carry';
    else if (baselineKnown && !sameValue(draftValue, baselineValue)) status = 'changed';
    else if (!baselineKnown && draftWasEdited && hasValue(draftValue)) status = 'new';

    return {
      ...field,
      status,
      baselineValue,
      draftValue,
      baselineDisplay: formatBetweenGamesValue(field.key, baselineValue),
      draftDisplay: formatBetweenGamesValue(field.key, draftValue),
    };
  });

  const changed = fields.filter((field) => ['changed', 'new'].includes(field.status));
  const carried = fields.filter((field) => field.status === 'carry');
  const unknown = fields.filter((field) => field.status === 'unknown');

  return {
    baselineUpdate,
    baselineLabel: baselineUpdate
      ? `Season ${baselineUpdate.season || 1} · Week ${baselineUpdate.week || 1}`
      : 'No published RTG baseline yet',
    fields,
    changed,
    carried,
    unknown,
    changedCount: changed.length,
    carriedCount: carried.length,
    unknownCount: unknown.length,
  };
};

const formatGameSummary = (game = {}) => {
  if (!game) return null;
  if (game.stage === 'high-school' || game.evaluation) {
    const evaluation = game.evaluation || game;
    return {
      label: `Tape Game ${evaluation.gameNumber || game.week || '—'}`,
      result: 'Evaluation logged',
      score: hasValue(evaluation.tapeScoreAfter) ? `Tape ${Number(evaluation.tapeScoreAfter).toLocaleString()}` : '',
    };
  }
  const opponent = String(game.opponent || '').trim();
  if (!opponent) return null;
  const hasScore = hasValue(game.homeScore) && hasValue(game.awayScore);
  return {
    label: `vs ${opponent}`,
    result: game.result || 'Logged',
    score: hasScore ? `${game.homeScore}-${game.awayScore}` : '',
  };
};

const latestMatchingIssue = (state, latestUpdate) => {
  const issues = [...(state.newsroomIssues || [])];
  if (!issues.length) return null;
  if (latestUpdate) {
    const exact = [...issues].reverse().find((issue) => samePublication(issue, latestUpdate));
    if (exact) return exact;
  }
  return issues.at(-1) || null;
};

const latestMatchingPodcast = (state, issue, latestUpdate) => {
  const episodes = [...(state.podcastEpisodes || [])];
  if (!episodes.length) return null;
  const target = issue || latestUpdate;
  if (target) {
    const exact = [...episodes].reverse().find((episode) => samePublication(episode, target));
    if (exact) return exact;
  }
  return episodes.at(-1) || null;
};

const currentStage = (state = {}) => {
  if (state.careerPhase === 'HC') return 'Head Coach';
  if (state.careerPhase === 'OC') return 'Offensive Coordinator';
  if (state.player?.isCommitted) return 'College Player';
  return 'High School Recruiting';
};

const recoverableAgendaDraft = (state = {}) => {
  const draft = state.weeklyAgendaDraft;
  if (!draft) return null;
  if (Number(draft.season || 0) !== Number(state.currentSeason || 1)) return null;
  if (Number(draft.week || 0) !== Number(state.currentWeek || 1)) return null;
  if (draft.careerPhase && state.careerPhase && draft.careerPhase !== state.careerPhase) return null;
  return draft;
};

export const buildBetweenGamesModel = (state = {}) => {
  const latestUpdate = getLatestPublishedWeek(state);
  const latestGame = latestUpdate?.game || [...(state.gameLogs || [])].at(-1) || null;
  const latestIssue = latestMatchingIssue(state, latestUpdate);
  const latestPodcast = latestMatchingPodcast(state, latestIssue, latestUpdate);
  const agendaDraft = recoverableAgendaDraft(state);
  const { snapshot: latestRtg } = getLatestPublishedRtgSnapshot(state);
  const stage = currentStage(state);
  const isCollegePlayer = stage === 'College Player';
  const transfer = state.playerRecruiting?.transfer || {};
  const transferOpen = transfer.status === 'exploring';

  const missingRtg = isCollegePlayer
    ? [
        ['rank', 'Depth Chart'],
        ['coachTrust', 'Coach Trust'],
        ['gpa', 'GPA'],
        ['energy', 'Energy'],
      ].filter(([key]) => !hasValue(latestRtg[key])).map(([, label]) => label)
    : [];

  const inbox = [];
  if (agendaDraft) {
    inbox.push({
      id: 'saved-week',
      priority: 'high',
      title: `Week ${state.currentWeek || 1} draft is in progress`,
      detail: 'Resume the saved Weekly Agenda instead of starting over.',
      actionLabel: 'Resume Week',
      tab: 'dataEntry',
    });
  }
  if (transferOpen) {
    inbox.push({
      id: 'transfer-decision',
      priority: 'high',
      title: 'Transfer decision is open',
      detail: `${(transfer.targets || []).length} option${(transfer.targets || []).length === 1 ? '' : 's'} currently on the board.`,
      actionLabel: 'Open Decision Desk',
      tab: 'recruiting',
    });
  }
  if (latestUpdate && !latestIssue) {
    inbox.push({
      id: 'coverage-missing',
      priority: 'medium',
      title: 'Latest verified week has no Newsroom edition',
      detail: 'The week is published, but the story layer has not caught up yet.',
      actionLabel: 'Open Newsroom',
      tab: 'newsroom',
    });
  }
  if (latestIssue?.podcastBrief && !latestPodcast) {
    inbox.push({
      id: 'podcast-ready',
      priority: 'low',
      title: 'Gridiron Grind episode is ready to create',
      detail: 'The verified Newsroom brief is available for the weekly show.',
      actionLabel: 'Open Podcast',
      tab: 'podcast',
    });
  }
  if (missingRtg.length) {
    inbox.push({
      id: 'rtg-missing',
      priority: 'low',
      title: `${missingRtg.length} RTG status item${missingRtg.length === 1 ? '' : 's'} not captured yet`,
      detail: `${missingRtg.join(', ')}. Leave unknown values blank until CFB 27 actually shows them.`,
      actionLabel: 'Open Weekly Agenda',
      tab: 'dataEntry',
    });
  }

  const latestChanges = (latestUpdate?.rtgChanges || []).slice(0, 5).map((change) => ({
    key: change.key,
    label: change.label || change.key,
    before: formatBetweenGamesValue(change.key, change.previous),
    after: formatBetweenGamesValue(change.key, change.current),
    direction: Number(change.delta) > 0 ? 'up' : Number(change.delta) < 0 ? 'down' : 'changed',
  }));

  const primaryAction = agendaDraft
    ? {
        label: `Resume Week ${state.currentWeek || 1}`,
        detail: 'A saved Weekly Agenda is waiting for you.',
        tab: 'dataEntry',
      }
    : {
        label: `Open Week ${state.currentWeek || 1}`,
        detail: latestUpdate ? 'The previous week is closed. Start with the next pregame snapshot.' : 'Start the first verified weekly workflow.',
        tab: 'dataEntry',
      };

  return {
    stage,
    season: Number(state.currentSeason) || 1,
    week: Number(state.currentWeek) || 1,
    latestUpdate,
    latestGame: formatGameSummary(latestGame),
    latestIssue,
    latestPodcast,
    latestChanges,
    agendaDraft,
    inbox,
    inboxCount: inbox.length,
    missingRtg,
    primaryAction,
    quickLinks: [
      latestIssue ? { id: 'newsroom', label: 'Read latest coverage', tab: 'newsroom' } : null,
      (latestPodcast || latestIssue?.podcastBrief) ? { id: 'podcast', label: latestPodcast ? 'Play latest podcast' : 'Create weekly podcast', tab: 'podcast' } : null,
      { id: 'chronicle', label: 'Open Chronicle', tab: 'chronicle' },
    ].filter(Boolean),
  };
};
