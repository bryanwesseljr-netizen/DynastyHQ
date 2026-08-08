const clean = (value, maxLength = 500) => String(value || '').trim().slice(0, maxLength);
const hasValue = (value) => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
const numeric = (value) => Number(value).toLocaleString();

const matchesPublication = (entry, publicationId) => (
  entry?.publicationId === publicationId || entry?.id === publicationId || entry?.weekKey === publicationId
);

const statLine = (game = {}) => {
  const stats = [];
  if (hasValue(game.passYds)) stats.push(`${numeric(game.passYds)} PASS YDS`);
  if (hasValue(game.passTD)) stats.push(`${numeric(game.passTD)} PASS TD`);
  if (hasValue(game.rushYds)) stats.push(`${numeric(game.rushYds)} RUSH YDS`);
  if (hasValue(game.rushTD)) stats.push(`${numeric(game.rushTD)} RUSH TD`);
  if (hasValue(game.int)) stats.push(`${numeric(game.int)} INT`);
  return stats.join(' · ') || 'No individual statistics recorded';
};

const score = (game = {}) => ({
  team: clean(game.team || game.school || 'Team', 100),
  opponent: clean(game.opponent || 'Opponent', 100),
  teamScore: hasValue(game.homeScore) ? Number(game.homeScore) : '',
  opponentScore: hasValue(game.awayScore) ? Number(game.awayScore) : '',
  result: clean(game.result, 1),
});

const seasonRecord = (games = [], season = 1, throughWeek = 1) => {
  const eligible = games.filter((game) => (
    Number(game.season || 1) === Number(season)
    && Number(game.week || 1) <= Number(throughWeek)
  ));
  return `${eligible.filter((game) => game.result === 'W').length}-${eligible.filter((game) => game.result === 'L').length}`;
};

const uniqueParagraphs = (issue = {}) => {
  const preferred = [
    issue.articles?.[0]?.paragraphs?.[0],
    issue.articles?.[0]?.paragraphs?.[1],
    issue.articles?.[1]?.paragraphs?.[2],
    issue.articles?.at(-1)?.paragraphs?.[2],
  ].map((entry) => clean(entry, 1200)).filter(Boolean);
  return [...new Set(preferred)].slice(0, 4);
};

const blankTeammate = (index) => ({
  id: `teammate-${index + 1}`,
  name: '',
  position: '',
  statLine: '',
  headshotAssetId: '',
});

export const normalizePostgameFrontPage = (page = {}) => ({
  ...page,
  id: clean(page.id, 160),
  publicationId: clean(page.publicationId, 140),
  masthead: clean(page.masthead, 120),
  editionLabel: clean(page.editionLabel, 120) || 'Postgame Special Edition',
  headline: clean(page.headline, 220),
  subheadline: clean(page.subheadline, 320),
  paragraphs: Array.isArray(page.paragraphs) ? page.paragraphs.map((entry) => clean(entry, 1200)).filter(Boolean).slice(0, 4) : [],
  score: { team: '', opponent: '', teamScore: '', opponentScore: '', result: '', ...(page.score || {}) },
  player: {
    name: '', position: '', number: '', statLine: '', headshotUrl: '', headshotAssetId: '',
    ...(page.player || {}),
  },
  teammates: Array.from({ length: 2 }, (_, index) => ({
    ...blankTeammate(index),
    ...(page.teammates?.[index] || {}),
  })),
  gamePhotoAssetId: clean(page.gamePhotoAssetId, 140),
  gamePhotoCaption: clean(page.gamePhotoCaption, 240),
  photoCredit: clean(page.photoCredit, 120),
  citedFactKeys: [...new Set((page.citedFactKeys || []).map((entry) => clean(entry, 180)).filter(Boolean))],
  revision: Math.max(1, Number(page.revision) || 1),
  needsRegeneration: Boolean(page.needsRegeneration),
  headlineEdited: Boolean(page.headlineEdited),
});

export const buildPostgameFrontPage = ({ state, publicationId, generatedAt = new Date().toISOString() }) => {
  const issue = (state.newsroomIssues || []).find((entry) => matchesPublication(entry, publicationId));
  const update = (state.weeklyUpdates || []).find((entry) => matchesPublication(entry, publicationId));
  const game = update?.game || (state.gameLogs || []).find((entry) => (
    Number(entry.season || 1) === Number(issue?.season || 1) && Number(entry.week || 1) === Number(issue?.week || 1)
  ));
  if (!issue || !game || game.didPlay === false) {
    throw new Error('A published game with a verified player appearance is required for a postgame front page.');
  }
  const current = (state.postgameFrontPages || []).find((entry) => entry.publicationId === publicationId);
  const lead = issue.articles?.[0];
  const publishedSchool = issue.outletProfile?.school
    || (state.factLedger || []).find((entry) => entry.publicationId === publicationId && entry.key === 'profile.player.school')?.value
    || state.player?.school;
  const normalizedCurrent = current ? normalizePostgameFrontPage(current) : null;
  const next = normalizePostgameFrontPage({
    id: current?.id || `front-page-${publicationId}`,
    publicationId,
    season: issue.season,
    week: issue.week,
    careerPhase: issue.careerPhase,
    masthead: lead?.outletName || issue.outletProfile?.localOutletName || 'DynastyHQ Sports',
    editionLabel: 'Postgame Special Edition',
    headline: normalizedCurrent?.headlineEdited ? normalizedCurrent.headline : (lead?.headline || `${state.player?.school || 'The team'} postgame report`),
    headlineEdited: Boolean(normalizedCurrent?.headlineEdited),
    subheadline: lead?.dek || '',
    paragraphs: uniqueParagraphs(issue),
    score: { ...score({ ...game, team: publishedSchool }) },
    seasonRecord: seasonRecord(state.gameLogs || [], issue.season, issue.week),
    player: {
      name: state.player?.name || 'The player',
      position: state.player?.pos || '',
      number: state.player?.number || '',
      statLine: statLine(game),
      headshotUrl: state.player?.headshot || '',
      headshotAssetId: normalizedCurrent?.player?.headshotAssetId || '',
    },
    teammates: normalizedCurrent?.teammates || [blankTeammate(0), blankTeammate(1)],
    gamePhotoAssetId: normalizedCurrent?.gamePhotoAssetId || lead?.mediaAssetId || '',
    gamePhotoCaption: normalizedCurrent?.gamePhotoCaption || `${publishedSchool || 'The team'} vs. ${game.opponent || 'the opponent'}, Season ${issue.season} Week ${issue.week}.`,
    photoCredit: normalizedCurrent?.photoCredit || '',
    citedFactKeys: [...new Set((issue.articles || []).flatMap((article) => article.citedFactKeys || []))],
    generatedAt: current?.generatedAt || generatedAt,
    updatedAt: generatedAt,
    revision: current ? Number(current.revision || 1) + 1 : 1,
    needsRegeneration: false,
    staleAt: '',
  });
  return next;
};

export const upsertPostgameFrontPage = (state, page) => {
  const normalized = normalizePostgameFrontPage(page);
  const pages = state.postgameFrontPages || [];
  const existingIndex = pages.findIndex((entry) => entry.publicationId === normalized.publicationId);
  return {
    ...state,
    postgameFrontPages: existingIndex < 0
      ? [...pages, normalized]
      : pages.map((entry, index) => index === existingIndex ? normalized : entry),
  };
};

export const updatePostgameFrontPage = (state, publicationId, patch = {}) => ({
  ...state,
  postgameFrontPages: (state.postgameFrontPages || []).map((entry) => {
    if (entry.publicationId !== publicationId) return entry;
    const next = {
      ...entry,
      ...patch,
      score: patch.score ? { ...(entry.score || {}), ...patch.score } : entry.score,
      player: patch.player ? { ...(entry.player || {}), ...patch.player } : entry.player,
      teammates: patch.teammates || entry.teammates,
      headlineEdited: patch.headline !== undefined ? true : entry.headlineEdited,
      updatedAt: new Date().toISOString(),
    };
    return normalizePostgameFrontPage(next);
  }),
});

export const markPostgameFrontPageStale = (pages = [], publicationId, staleAt = new Date().toISOString()) => (
  pages.map((page) => page.publicationId !== publicationId ? page : {
    ...page,
    needsRegeneration: true,
    staleAt,
  })
);

export const removeFrontPageMediaAsset = (pages = [], assetId) => pages.map((page) => ({
  ...page,
  gamePhotoAssetId: page.gamePhotoAssetId === assetId ? '' : page.gamePhotoAssetId,
  player: page.player?.headshotAssetId === assetId ? { ...page.player, headshotAssetId: '' } : page.player,
  teammates: (page.teammates || []).map((teammate) => teammate.headshotAssetId === assetId
    ? { ...teammate, headshotAssetId: '' }
    : teammate),
}));

export const getFrontPageMediaAssetIds = (pages = []) => pages.flatMap((page) => [
  page.gamePhotoAssetId,
  page.player?.headshotAssetId,
  ...(page.teammates || []).map((teammate) => teammate.headshotAssetId),
]).filter(Boolean);
