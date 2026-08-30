const clean = (value, max = 240) => String(value ?? '').trim().slice(0, max);

const finite = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const PUBLIC_MEDIA_PROFILE_VERSION = 1;
export const PUBLIC_MEDIA_SECTIONS = Object.freeze(['stats', 'newsroom', 'podcast']);

export const readPublicMediaProfileId = (search = '') => {
  const params = new URLSearchParams(String(search || ''));
  return clean(params.get('media'), 180);
};

export const playerAppearedInGame = (game = {}) => {
  if (game?.didPlay === true) return true;
  if (game?.didPlay === false) return false;
  return [game?.passYds, game?.passTD, game?.rushYds, game?.rushTD, game?.int]
    .some((value) => {
      const parsed = finite(value);
      return parsed !== null && parsed !== 0;
    });
};

const publicPlayer = (player = {}) => ({
  name: clean(player.name, 120),
  school: clean(player.school, 160),
  college: clean(player.college, 160),
  pos: clean(player.pos, 24),
  number: clean(player.number, 12),
  stars: finite(player.stars),
  overall: finite(player.overall),
  archetype: clean(player.archetype, 100),
  height: clean(player.height, 40),
  weight: clean(player.weight, 40),
  headshot: clean(player.headshot, 1400),
  isCommitted: Boolean(player.isCommitted),
});

const publicGame = (game = {}) => ({
  season: finite(game.season) ?? 1,
  week: finite(game.week) ?? 0,
  opponent: clean(game.opponent, 160),
  result: clean(game.result, 8),
  homeScore: finite(game.homeScore),
  awayScore: finite(game.awayScore),
  passYds: finite(game.passYds),
  passTD: finite(game.passTD),
  rushYds: finite(game.rushYds),
  rushTD: finite(game.rushTD),
  int: finite(game.int),
  didPlay: playerAppearedInGame(game),
  stage: clean(game.stage, 40),
});

const publicWeeklyUpdate = (entry = {}) => ({
  id: clean(entry.id, 180),
  weekKey: clean(entry.weekKey, 180),
  publicationId: clean(entry.publicationId, 180),
  season: finite(entry.season) ?? 1,
  week: finite(entry.week) ?? 0,
  careerPhase: clean(entry.careerPhase, 80),
  weekType: clean(entry.weekType, 80),
  game: entry.game ? publicGame(entry.game) : null,
  rtgSnapshot: { rank: clean(entry.rtgSnapshot?.rank, 40) },
});

export const buildPublicMediaProfileSnapshot = ({ state = {}, mediaLibrary = [], sharedAt = new Date().toISOString() } = {}) => ({
  publicMediaProfileVersion: PUBLIC_MEDIA_PROFILE_VERSION,
  sections: [...PUBLIC_MEDIA_SECTIONS],
  sharedAt,
  careerPhase: clean(state.careerPhase, 80),
  currentSeason: finite(state.currentSeason) ?? 1,
  currentWeek: finite(state.currentWeek) ?? 0,
  player: publicPlayer(state.player || {}),
  rtg: { rank: clean(state.rtg?.rank, 40) },
  gameLogs: (state.gameLogs || []).map(publicGame),
  weeklyUpdates: (state.weeklyUpdates || []).map(publicWeeklyUpdate),
  newsroomIssues: structuredClone(state.newsroomIssues || []),
  postgameFrontPages: structuredClone(state.postgameFrontPages || []),
  newsroomMediaLibrary: structuredClone(mediaLibrary || []),
  newsroomMediaSettings: { autoAssignLibrary: false },
  outletImages: { podcast: clean(state.outletImages?.podcast, 1400) },
  podcastEpisodes: structuredClone(state.podcastEpisodes || []),
  collegeNewsroom: structuredClone(state.collegeNewsroom || {}),
});

export const summarizePublicPlayerStats = (state = {}, season = null) => {
  const games = (state.gameLogs || []).filter((game) => game?.stage !== 'high-school');
  const scoped = season === null
    ? games
    : games.filter((game) => Number(game.season || 1) === Number(season));
  const appearances = scoped.filter(playerAppearedInGame);
  return appearances.reduce((totals, game) => ({
    games: totals.games + 1,
    passYds: totals.passYds + (finite(game.passYds) || 0),
    passTD: totals.passTD + (finite(game.passTD) || 0),
    rushYds: totals.rushYds + (finite(game.rushYds) || 0),
    rushTD: totals.rushTD + (finite(game.rushTD) || 0),
    interceptions: totals.interceptions + (finite(game.int) || 0),
  }), { games: 0, passYds: 0, passTD: 0, rushYds: 0, rushTD: 0, interceptions: 0 });
};
