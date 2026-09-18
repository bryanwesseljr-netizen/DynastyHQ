const clean = (value) => String(value ?? '').trim();
const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const factKeys = (analysis = {}) => new Set(list(analysis.facts).map((fact) => clean(fact?.key)));
const hasAny = (keys, wanted) => wanted.some((key) => keys.has(key));

export const classifyProcessWeekAnalysis = (analysis = {}) => {
  const types = new Set([
    ...list(analysis.screenTypes).map((value) => clean(value).toLowerCase()),
    clean(analysis.screenType).toLowerCase(),
  ].filter(Boolean));
  const keys = factKeys(analysis);
  const categories = [];

  if (types.has('ea_sports_network_article') || /ea\s*sports\s*network/i.test(`${clean(analysis.screenTitle)} ${clean(analysis.summary)}`)) {
    categories.push('officialCoverage');
  }
  if (hasAny(keys, ['game.result', 'game.homeScore', 'game.awayScore', 'game.opponent'])) categories.push('result');
  if (hasAny(keys, ['game.passYds', 'game.passTD', 'game.rushYds', 'game.rushTD', 'game.int'])) categories.push('playerStats');
  if (hasAny(keys, [
    'game.teamTotalYards', 'game.opponentTotalYards',
    'game.teamFirstDowns', 'game.opponentFirstDowns',
    'game.teamTurnovers', 'game.opponentTurnovers',
    'game.teamRushYds', 'game.opponentRushYds',
    'game.teamPassYds', 'game.opponentPassYds',
  ])) categories.push('teamStats');
  if (hasAny(keys, ['game.teamRank', 'game.opponentRank'])) categories.push('rankings');

  if (/^rtg_/i.test(clean(analysis.screenType))) categories.push('rtgStatus');
  if (clean(analysis.screenType).toLowerCase() === 'season_schedule') categories.push('schedule');
  if (!categories.length && (types.has('box_score') || list(analysis.facts).length)) categories.push('gameContext');
  if (!categories.length) categories.push('other');

  return [...new Set(categories)];
};

export const PROCESS_WEEK_CATEGORY_META = {
  result: { label: 'Final Result', detail: 'Opponent, score and result recognized.', critical: true },
  playerStats: { label: 'Player Line', detail: 'Tracked-player production recognized.', critical: false },
  teamStats: { label: 'Team Stats', detail: 'Team-level game context recognized.', critical: false },
  rankings: { label: 'Rankings', detail: 'Visible ranking context recognized.', critical: false },
  officialCoverage: { label: 'EA SPORTS Network', detail: 'Official in-game article detected.', critical: false },
  rtgStatus: { label: 'RTG Status', detail: 'Road to Glory status data recognized.', critical: false },
  schedule: { label: 'Schedule', detail: 'Season schedule data recognized.', critical: false },
  gameContext: { label: 'Game Context', detail: 'Useful verified game data recognized.', critical: false },
  other: { label: 'Other Screens', detail: 'Imported screen retained for review.', critical: false },
};

export const buildProcessWeekInbox = ({ analyses = [], expectedScreens = 0, review = {}, isBye = false } = {}) => {
  const counts = {};
  list(analyses).forEach((item) => {
    const categories = list(item.categories).length ? item.categories : classifyProcessWeekAnalysis(item.analysis || item);
    categories.forEach((category) => { counts[category] = (counts[category] || 0) + 1; });
  });

  const detected = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({ id, count, ...(PROCESS_WEEK_CATEGORY_META[id] || PROCESS_WEEK_CATEGORY_META.other) }));
  const analyzedScreens = list(analyses).length;
  const attention = Number(review.attention) || 0;
  const missing = Number(review.missing) || 0;
  // An applied draft has already passed the verification desk. Screenshot-analysis events are
  // transient and disappear on refresh, so never downgrade a verified applied week merely because
  // the Process Week portal remounted without those old events.
  const hasResult = isBye || Boolean(counts.result) || Boolean(review.hasApplied);
  const scanComplete = review.hasApplied || (expectedScreens > 0 ? analyzedScreens >= expectedScreens : analyzedScreens > 0);

  let state = 'analyzing';
  let label = 'ANALYZING SESSION';
  let detail = 'DynastyHQ is sorting the imported screens.';

  if (scanComplete || review.hasReview || review.hasApplied) {
    if (missing > 0 || !hasResult) {
      state = 'needs-attention';
      label = 'NEEDS ATTENTION';
      detail = missing > 0
        ? `${missing} required item${missing === 1 ? '' : 's'} still need confirmation.`
        : 'A verified final result has not been detected yet.';
    } else if (attention > 0) {
      state = 'almost-ready';
      label = 'ALMOST READY';
      detail = `${attention} uncertain fact${attention === 1 ? '' : 's'} need your review before publishing.`;
    } else {
      state = review.hasApplied ? 'ready-to-publish' : 'ready-to-apply';
      label = review.hasApplied ? 'READY TO PUBLISH' : 'READY TO APPLY';
      detail = review.hasApplied
        ? 'Verified week data is ready for the final Process Week confirmation.'
        : 'The session has the critical game identity and no flagged conflicts.';
    }
  }

  const optional = [];
  if (!counts.officialCoverage) optional.push('No EA SPORTS Network article detected — optional.');
  if (!counts.teamStats) optional.push('Team-stat context is light — optional for richer coverage.');
  if (!counts.rankings) optional.push('No ranking screen detected — optional unless rankings changed.');

  return {
    counts,
    detected,
    analyzedScreens,
    expectedScreens,
    attention,
    missing,
    hasResult,
    state,
    label,
    detail,
    optional,
    canPublish: state === 'ready-to-publish',
  };
};

export const publicationIdForProcessWeek = (season = 1, week = 1) => `season-${Number(season) || 1}-week-${Math.max(0, Number(week) || 0)}`;
