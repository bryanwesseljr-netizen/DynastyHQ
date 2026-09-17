import { buildCareerArchive } from './careerArchive.js';
import { officialCoverageForWeek, publicationIdFor } from './officialCoverageCapture.js';
import { teamRecordForSeason } from './seasonSchedule.js';
import { resolveCareerTeamMediaProfile, resolveIssueTeamMediaProfile } from './teamMediaProfile.js';

const clean = (value, max = 1200) => String(value ?? '').trim().slice(0, max);
const numberOf = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const list = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

const matchWeek = (entry = {}, season = 1, week = 0, publicationId = publicationIdFor(season, week)) => (
  entry?.publicationId === publicationId
  || entry?.weekKey === publicationId
  || entry?.id === publicationId
  || (Number(entry?.season || 1) === Number(season || 1) && Number(entry?.week || 0) === Number(week || 0))
);

const gameMediaFor = (state = {}, issue = null, season = 1, week = 0) => {
  const assets = list(state.newsroomMediaLibrary);
  const wanted = new Set();
  const frontPage = list(state.postgameFrontPages).find((entry) => matchWeek(entry, season, week));
  if (frontPage?.gamePhotoAssetId) wanted.add(frontPage.gamePhotoAssetId);
  if (frontPage?.player?.headshotAssetId) wanted.add(frontPage.player.headshotAssetId);
  list(issue?.articles).forEach((article) => {
    if (article?.mediaAssetId) wanted.add(article.mediaAssetId);
    if (article?.assignedMedia?.id) wanted.add(article.assignedMedia.id);
  });
  return assets.filter((asset) => wanted.has(asset.id)).map((asset) => ({
    id: asset.id,
    url: clean(asset.downloadUrl || asset.url || asset.imageUrl, 4000),
    label: clean(asset.referenceLabel || asset.fileName || 'Game photo', 180),
  })).filter((asset) => asset.url);
};

const milestoneForWeek = (state = {}, season = 1, week = 0) => list(state.careerMilestones)
  .filter((entry) => Number(entry?.season || 1) === Number(season) && Number(entry?.week || 0) === Number(week));

const roleEventForWeek = (entry = {}) => list(entry.rtgChanges).find((change) => (
  /rank|role|depth/i.test(clean(change?.key)) || /qb[1-4]|starter|backup/i.test(`${clean(change?.previous)} ${clean(change?.current)}`)
));

const signatureReasons = ({ entry, firstAppearance = false, milestones = [] } = {}) => {
  const game = entry?.game;
  if (!game || game.stage === 'high-school' || game.evaluation) return [];
  const reasons = [];
  const totalTD = numberOf(game.passTD) + numberOf(game.rushTD);
  const passYds = numberOf(game.passYds);
  const rushYds = numberOf(game.rushYds);
  const teamRank = numberOf(game.teamRank);
  const opponentRank = numberOf(game.opponentRank);
  const margin = Number.isFinite(Number(game.homeScore)) && Number.isFinite(Number(game.awayScore))
    ? Math.abs(Number(game.homeScore) - Number(game.awayScore))
    : null;
  const roleEvent = roleEventForWeek(entry);

  if (firstAppearance && game.didPlay !== false) reasons.push('First recorded college appearance');
  if (roleEvent && /qb1|starter/i.test(clean(roleEvent.current))) reasons.push('Starting-role chapter began');
  if (milestones.length) reasons.push(clean(milestones[0]?.title || milestones[0]?.achievement || 'Career milestone'));
  if (totalTD >= 4) reasons.push(`${totalTD}-touchdown performance`);
  else if (totalTD >= 3) reasons.push(`${totalTD} total touchdowns`);
  if (passYds >= 350) reasons.push(`${passYds} passing yards`);
  else if (passYds >= 300) reasons.push('300-yard passing game');
  if (rushYds >= 100) reasons.push('100-yard rushing game');
  if (opponentRank > 0 && opponentRank <= 25) reasons.push(`Ranked opponent · #${opponentRank}`);
  if (teamRank > 0 && teamRank <= 10) reasons.push(`Top-10 team context · #${teamRank}`);
  if (margin !== null && margin <= 7) reasons.push('One-score finish');
  if (/champ|playoff|bowl|rival|title|award|record/i.test(milestones.map((item) => `${clean(item.type)} ${clean(item.title)} ${clean(item.summary)}`).join(' '))) {
    reasons.push('Major season or career stakes');
  }
  return [...new Set(reasons.filter(Boolean))];
};

const signatureLabel = (reasons = [], game = {}) => {
  const joined = reasons.join(' ').toLowerCase();
  if (joined.includes('starting-role')) return 'THE FIRST START';
  if (joined.includes('first recorded college appearance')) return 'THE DEBUT';
  if (joined.includes('major season or career stakes')) return 'A DEFINING NIGHT';
  if (joined.includes('touchdown') || joined.includes('300-yard') || joined.includes('passing yards') || joined.includes('100-yard')) return 'A STATEMENT GAME';
  if (joined.includes('one-score')) return game.result === 'W' ? 'SURVIVE AND ADVANCE' : 'THE ONE THAT GOT AWAY';
  if (joined.includes('ranked opponent')) return 'UNDER THE LIGHTS';
  return 'SIGNATURE GAME';
};

const buildMedia = (state = {}, season = 1, week = 0, issue = null) => {
  const publicationId = publicationIdFor(season, week);
  const podcast = list(state.podcastEpisodes).find((entry) => matchWeek(entry, season, week, publicationId));
  const official = officialCoverageForWeek(state, season, week);
  const photos = gameMediaFor(state, issue, season, week);
  return {
    newsroom: issue ? {
      publicationId: issue.publicationId || issue.id || publicationId,
      headline: clean(issue.articles?.[0]?.headline || issue.articles?.[0]?.title || issue.headline, 260),
      dek: clean(issue.articles?.[0]?.dek || issue.articles?.[0]?.summary || '', 700),
    } : null,
    podcast: podcast ? {
      publicationId: podcast.publicationId || publicationId,
      title: clean(podcast.title || podcast.showName || 'The Huddle', 240),
      finished: podcast.audioStatus === 'ready',
    } : null,
    official: ['official', 'source'].includes(official.kind) ? {
      publicationId,
      headline: clean(official.entry?.headline, 260),
      summary: clean(official.entry?.summary, 900),
      outlet: 'EA SPORTS Network',
      kind: official.kind,
    } : null,
    photos,
  };
};

const seasonSchool = (state = {}, entries = [], season = 1) => {
  const issue = list(state.newsroomIssues).find((item) => Number(item?.season || 1) === Number(season) && item?.outletProfile?.school);
  if (issue) return resolveIssueTeamMediaProfile(issue, state).school;
  const gameSchool = entries.map((entry) => clean(entry.game?.school || entry.game?.team)).find(Boolean);
  return gameSchool || resolveCareerTeamMediaProfile(state).school;
};

export const buildCareerChronicle2 = (state = {}) => {
  const archive = buildCareerArchive(state);
  const chronological = [...archive].sort((a, b) => (
    Number(a.season) - Number(b.season)
    || Number(a.week) - Number(b.week)
    || String(a.occurredAt || '').localeCompare(String(b.occurredAt || ''))
  ));
  const firstAppearanceId = chronological.find((entry) => entry.game && entry.game.didPlay !== false && entry.game.stage !== 'high-school' && !entry.game.evaluation)?.id || '';
  const issues = list(state.newsroomIssues);

  const enriched = chronological.map((entry) => {
    const season = Number(entry.season) || 1;
    const week = Number(entry.week) || 0;
    const publicationId = entry.id || publicationIdFor(season, week);
    const issue = issues.find((item) => matchWeek(item, season, week, publicationId)) || null;
    const milestones = milestoneForWeek(state, season, week);
    const reasons = signatureReasons({ entry, firstAppearance: entry.id === firstAppearanceId, milestones });
    const media = buildMedia(state, season, week, issue);
    return {
      ...entry,
      publicationId,
      milestones,
      media,
      signature: Boolean(entry.game && reasons.length),
      signatureReasons: reasons,
      signatureLabel: reasons.length ? signatureLabel(reasons, entry.game || {}) : '',
    };
  });

  const seasons = [...new Set(enriched.map((entry) => Number(entry.season) || 1))].sort((a, b) => b - a).map((season) => {
    const entries = enriched.filter((entry) => Number(entry.season) === season);
    const games = entries.filter((entry) => entry.game && entry.game.stage !== 'high-school' && !entry.game.evaluation);
    const appearances = games.filter((entry) => entry.game.didPlay !== false);
    const record = teamRecordForSeason(state, season);
    const passYds = appearances.reduce((sum, entry) => sum + numberOf(entry.game.passYds), 0);
    const passTD = appearances.reduce((sum, entry) => sum + numberOf(entry.game.passTD), 0);
    const rushYds = appearances.reduce((sum, entry) => sum + numberOf(entry.game.rushYds), 0);
    const rushTD = appearances.reduce((sum, entry) => sum + numberOf(entry.game.rushTD), 0);
    const school = seasonSchool(state, entries, season);
    const role = [...entries].reverse().map((entry) => clean(entry.rtgSnapshot?.rank || entry.rtgSnapshot?.depthChartRole)).find(Boolean)
      || (season === Number(state.currentSeason || 1) ? clean(state.rtg?.rank || state.player?.depthChartRole) : '');
    const signatureGames = entries.filter((entry) => entry.signature).sort((a, b) => Number(b.week) - Number(a.week));
    const moments = entries.filter((entry) => !entry.game && (entry.type && !['weekly-update', 'bye'].includes(entry.type))).slice().reverse();
    return {
      season,
      school,
      role,
      record,
      games,
      appearances: appearances.length,
      passYds,
      passTD,
      rushYds,
      rushTD,
      totalTD: passTD + rushTD,
      signatureGames,
      moments,
      entries: [...entries].sort((a, b) => Number(b.week) - Number(a.week)),
      mediaCount: entries.reduce((sum, entry) => sum
        + (entry.media.newsroom ? 1 : 0)
        + (entry.media.podcast ? 1 : 0)
        + (entry.media.official ? 1 : 0)
        + entry.media.photos.length, 0),
    };
  });

  return {
    seasons,
    entries: [...enriched].sort((a, b) => Number(b.season) - Number(a.season) || Number(b.week) - Number(a.week)),
    signatureGames: enriched.filter((entry) => entry.signature).sort((a, b) => Number(b.season) - Number(a.season) || Number(b.week) - Number(a.week)),
    latestSeason: seasons[0] || null,
  };
};
