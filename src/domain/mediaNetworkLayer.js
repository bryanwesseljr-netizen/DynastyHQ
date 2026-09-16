import { officialCoverageForWeek, publicationIdFor } from './officialCoverageCapture.js';
import { coverageReferenceFor } from './coverageReferences.js';
import { seasonScheduleFor, syncScheduleWithCareer } from './seasonSchedule.js';

const clean = (value, max = 1200) => String(value ?? '').trim().slice(0, max);
const arrayOf = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const numberOf = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const matchesWeek = (entry = {}, season = 1, week = 0, publicationId = publicationIdFor(season, week)) => (
  entry?.publicationId === publicationId
  || entry?.weekKey === publicationId
  || entry?.id === publicationId
  || (numberOf(entry?.season, 1) === numberOf(season, 1) && numberOf(entry?.week) === numberOf(week))
);

const firstArticle = (issue = {}) => arrayOf(issue.articles).find((article) => clean(article?.headline)) || null;

const podcastReady = (episode) => Boolean(
  episode
  && (episode.audioStatus === 'ready' || ['ready', 'published'].includes(clean(episode.status, 40).toLowerCase()))
);

export const latestCompletedMediaContext = (state = {}) => {
  const season = Math.max(1, numberOf(state.currentSeason, 1));
  const schedule = seasonScheduleFor(state, season);
  if (schedule?.entries?.length) {
    const completed = syncScheduleWithCareer(state, schedule).entries
      .filter((entry) => !entry.isBye && entry.completed && ['W', 'L'].includes(clean(entry.result, 10).toUpperCase()))
      .sort((left, right) => numberOf(left.week) - numberOf(right.week));
    const row = completed.at(-1);
    if (row) return { season, week: numberOf(row.week), opponent: clean(row.opponent, 160) };
  }

  const games = arrayOf(state.gameLogs)
    .filter((game) => game?.stage !== 'high-school' && !game?.evaluation && clean(game?.opponent))
    .sort((left, right) => numberOf(left.season, 1) - numberOf(right.season, 1) || numberOf(left.week) - numberOf(right.week));
  const game = games.at(-1);
  return game
    ? { season: numberOf(game.season, season) || season, week: numberOf(game.week), opponent: clean(game.opponent, 160) }
    : { season, week: Math.max(0, numberOf(state.currentWeek)), opponent: '' };
};

export const buildMediaNetworkLayer = (state = {}, context = {}) => {
  const fallback = latestCompletedMediaContext(state);
  const season = Math.max(1, numberOf(context.season, fallback.season || 1));
  const week = Math.max(0, numberOf(context.week, fallback.week || 0));
  const publicationId = publicationIdFor(season, week);
  const officialCapture = officialCoverageForWeek(state, season, week);
  const coverageReference = coverageReferenceFor(state, publicationId);
  const update = arrayOf(state.weeklyUpdates).find((entry) => matchesWeek(entry, season, week, publicationId));
  const game = update?.game || arrayOf(state.gameLogs).find((entry) => matchesWeek(entry, season, week, publicationId));
  const issue = arrayOf(state.newsroomIssues).find((entry) => matchesWeek(entry, season, week, publicationId));
  const article = firstArticle(issue);
  const episode = arrayOf(state.podcastEpisodes).find((entry) => matchesWeek(entry, season, week, publicationId));
  const frontPage = arrayOf(state.postgameFrontPages).find((entry) => matchesWeek(entry, season, week, publicationId));
  const media = arrayOf(state.newsroomMediaLibrary).filter((entry) => (
    clean(entry?.publicationId) === publicationId
    || (numberOf(entry?.season, -1) === season && numberOf(entry?.week, -1) === week)
  ));

  const factCount = Math.max(
    numberOf(officialCapture?.coverageFactCount),
    numberOf(coverageReference?.factCount),
  );
  const officialEntry = officialCapture?.entry || null;
  const officialStatus = ['official', 'source'].includes(officialCapture?.kind)
    ? 'captured'
    : officialCapture?.kind === 'legacy-import' || factCount > 0
      ? 'legacy-evidence'
      : 'awaiting';

  const official = {
    outlet: 'EA SPORTS NETWORK',
    status: officialStatus,
    headline: officialStatus === 'captured' ? clean(officialEntry?.headline, 220) : '',
    summary: officialStatus === 'captured' ? clean(officialEntry?.summary, 1200) : '',
    factCount,
    sourceCount: numberOf(officialCapture?.sourceCount),
    sourceFileName: clean(officialEntry?.sourceFileName, 200),
  };

  const dynasty = {
    outlet: 'DYNASTYHQ',
    newsroomReady: Boolean(issue && article),
    headline: clean(article?.headline || issue?.headline, 220),
    dek: clean(article?.dek || issue?.dek, 1200),
    podcastReady: podcastReady(episode),
    podcastTitle: clean(episode?.title || episode?.headline, 220),
    finishedPodcast: Boolean(episode?.audioStatus === 'ready' && (
      episode?.audioEngine === 'notebooklm-master-upload'
      || episode?.audioSource === 'notebooklm'
      || episode?.masterAudioUploadedAt
    )),
    photoCount: media.length,
    frontPageReady: Boolean(frontPage),
  };

  const opponent = clean(context.opponent || game?.opponent || fallback.opponent, 160);
  const result = clean(game?.result, 10).toUpperCase();
  const score = game && game.homeScore !== undefined && game.awayScore !== undefined
    ? `${game.homeScore}-${game.awayScore}`
    : '';

  const ticker = [];
  if (score && opponent) ticker.push({ source: 'FINAL', text: `${result ? `${result} · ` : ''}${score} vs ${opponent}` });
  if (official.status === 'captured' && official.headline) ticker.push({ source: 'EA SPORTS NETWORK', text: official.headline });
  else if (official.status === 'legacy-evidence' && official.factCount) ticker.push({ source: 'EA SPORTS NETWORK', text: `${official.factCount} verified official-coverage facts preserved` });
  if (dynasty.headline) ticker.push({ source: 'DYNASTYHQ', text: dynasty.headline });
  if (dynasty.podcastReady) ticker.push({ source: 'THE HUDDLE', text: dynasty.podcastTitle || 'Episode ready' });

  return {
    season,
    week,
    publicationId,
    opponent,
    result,
    score,
    official,
    dynasty,
    ticker,
    readyLaneCount: Number(official.status !== 'awaiting') + Number(dynasty.newsroomReady) + Number(dynasty.podcastReady),
  };
};
