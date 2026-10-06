import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, productionAppId } from '../firebase.js';
import { DEFAULT_CAREER_STATE } from '../domain/defaultCareerState.js';
import { migrateCareerState } from '../domain/weeklyEngine.js';
import { podcastTranscriptText } from '../domain/podcastEngine.js';
import { buildPlayerOffseasonMode } from '../domain/playerOffseason.js';
import { buildCareerChronicle2 } from '../domain/careerChronicle2.js';
import { CAREER_STAGES, deriveCareerStage } from '../domain/commandCenter.js';
import { resolveNewsroomPresentation } from '../domain/newsroomPresentation.js';
import { scheduleDisplayLabel } from '../domain/seasonSchedule.js';
import { applyOfficialCoverageLegacyBackfill, mergeOfficialCoveragePages } from '../domain/officialCoverageCapture.js';
import {
  CAREER_ARCHIVE_COLLECTION,
  hydrateCareerStateFromArchives,
  storageArchiveIds,
} from '../domain/careerStorage.js';

const clean = (value, fallback = '') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const numeric = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const optionalNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const valueOr = (value, fallback = 0) => (
  value === '' || value === null || value === undefined ? fallback : numeric(value, fallback)
);

const bySeasonWeek = (left, right) => (
  numeric(left?.season, 1) - numeric(right?.season, 1)
  || numeric(left?.week, 0) - numeric(right?.week, 0)
);

const gameScores = (game = {}) => {
  const directTeam = game.teamScore ?? game.scoreFor;
  const directOpponent = game.opponentScore ?? game.scoreAgainst;
  if (directTeam !== undefined && directTeam !== '' && directOpponent !== undefined && directOpponent !== '') {
    return { us: numeric(directTeam), them: numeric(directOpponent) };
  }

  const site = clean(game.homeAway).toLowerCase();
  const home = game.homeScore;
  const away = game.awayScore;
  if (home === '' || home === undefined || away === '' || away === undefined) return { us: 0, them: 0 };
  if (site === 'away') return { us: numeric(away), them: numeric(home) };
  return { us: numeric(home), them: numeric(away) };
};

const scheduleEntries = (state, season) => {
  const schedule = (state.seasonSchedules || []).find((entry) => numeric(entry?.season, 1) === numeric(season, 1));
  const entries = schedule?.entries || schedule?.games || schedule?.schedule || [];
  return Array.isArray(entries) ? entries : [];
};

const nextScheduledGame = (state, season, afterWeek, { historical = false } = {}) => {
  const entries = scheduleEntries(state, season)
    .filter((entry) => entry && !entry.isBye && clean(entry.opponent))
    .sort((a, b) => numeric(a.week) - numeric(b.week));

  if (historical) {
    return entries.find((entry) => numeric(entry.week) > numeric(afterWeek)) || null;
  }

  return entries.find((entry) => {
    const status = clean(entry.status).toLowerCase();
    return numeric(entry.week) > numeric(afterWeek)
      && entry.completed !== true
      && status !== 'completed';
  })
    || entries.find((entry) => numeric(entry.week) > numeric(afterWeek))
    || null;
};

const collegeGames = (state, season) => (state.gameLogs || [])
  .filter((game) => (
    game
    && game.didPlay !== false
    && !game.evaluation
    && game.stage !== 'high-school'
    && clean(game.opponent)
    && numeric(game.season, season) === numeric(season)
  ))
  .sort(bySeasonWeek);

const publicationIdFor = (entry = {}) => clean(entry?.publicationId || entry?.id || entry?.weekKey);

const matchesSeasonWeek = (entry, season, week) => (
  numeric(entry?.season, 1) === numeric(season, 1)
  && numeric(entry?.week, 0) === numeric(week, 0)
);

const issueForGame = (state, game, season, week) => {
  const issues = [...(state.newsroomIssues || [])].filter(Boolean).sort(bySeasonWeek);
  if (!issues.length) return null;
  const targetSeason = numeric(game?.season, season);
  const targetWeek = numeric(game?.week, week);
  return issues.findLast?.((entry) => matchesSeasonWeek(entry, targetSeason, targetWeek))
    || [...issues].reverse().find((entry) => matchesSeasonWeek(entry, targetSeason, targetWeek))
    || issues.at(-1)
    || null;
};

const episodeForIssue = (state, issue, game, season, week) => {
  const episodes = [...(state.podcastEpisodes || [])].filter(Boolean).sort(bySeasonWeek);
  if (!episodes.length) return null;
  const publicationId = publicationIdFor(issue);
  if (publicationId) {
    const exact = episodes.find((entry) => publicationIdFor(entry) === publicationId);
    if (exact) return exact;
  }
  const targetSeason = numeric(game?.season, season);
  const targetWeek = numeric(game?.week, week);
  return [...episodes].reverse().find((entry) => matchesSeasonWeek(entry, targetSeason, targetWeek))
    || episodes.at(-1)
    || null;
};


const stageLabelFor = (state = {}) => {
  const stage = deriveCareerStage(state);
  if (stage === CAREER_STAGES.RETIRED) return 'Career Complete';
  if (stage === CAREER_STAGES.HC) return 'Head Coach';
  if (stage === CAREER_STAGES.OC) return 'Offensive Coordinator';
  if (stage === CAREER_STAGES.COLLEGE) return 'Road to Glory Player';
  return 'High School Recruit';
};

const careerOverview = (state = {}) => {
  const allGames = (state.gameLogs || []).filter(Boolean);
  const college = allGames.filter((game) => (
    game.didPlay !== false
    && game.stage !== 'high-school'
    && !game.evaluation
    && clean(game.opponent)
  )).sort(bySeasonWeek);
  const wins = college.filter((game) => clean(game.result).toUpperCase() === 'W').length;
  const losses = college.filter((game) => clean(game.result).toUpperCase() === 'L').length;
  const postseasonGames = college.filter((game) => game?.weekPhase === 'postseason' || game?.postseason?.active);
  const postseasonWins = postseasonGames.filter((game) => clean(game.result).toUpperCase() === 'W').length;
  const postseasonLosses = postseasonGames.filter((game) => clean(game.result).toUpperCase() === 'L').length;
  const totals = college.reduce((acc, game) => ({
    passYds: acc.passYds + valueOr(game.passYds),
    rushYds: acc.rushYds + valueOr(game.rushYds),
    passTD: acc.passTD + valueOr(game.passTD),
    rushTD: acc.rushTD + valueOr(game.rushTD),
    interceptions: acc.interceptions + valueOr(game.int),
  }), { passYds:0, rushYds:0, passTD:0, rushTD:0, interceptions:0 });

  const milestones = Array.isArray(state.careerMilestones) ? state.careerMilestones : [];
  const chronicle = Array.isArray(state.careerChronicle) ? state.careerChronicle : [];
  const timeline = [...milestones, ...chronicle]
    .filter(Boolean)
    .sort((a,b) => (
      numeric(b.season,1)-numeric(a.season,1)
      || numeric(b.week,0)-numeric(a.week,0)
      || String(b.occurredAt||b.publishedAt||'').localeCompare(String(a.occurredAt||a.publishedAt||''))
    ))
    .slice(0,8)
    .map((entry,index)=>({
      id: clean(entry.id || entry.publicationId, `timeline-${index}`),
      season: numeric(entry.season,1),
      week: numeric(entry.week,0),
      title: clean(entry.title || entry.achievement || entry.type, 'Career milestone'),
      summary: clean(entry.summary || entry.detail || entry.description, 'Verified career event'),
    }));

  const rivalryMap = college.reduce((map,game)=>{
    const opponent=clean(game.opponent);
    if(!opponent) return map;
    const row=map.get(opponent)||{opponent,wins:0,losses:0,lastSeason:numeric(game.season,1)};
    if(clean(game.result).toUpperCase()==='W') row.wins+=1;
    if(clean(game.result).toUpperCase()==='L') row.losses+=1;
    row.lastSeason=Math.max(row.lastSeason,numeric(game.season,1));
    map.set(opponent,row);
    return map;
  },new Map());

  return {
    stage: stageLabelFor(state),
    record:{wins,losses},
    appearances:college.length,
    totals,
    postseason:{
      appearances:postseasonGames.length,
      wins:postseasonWins,
      losses:postseasonLosses,
      passYds:postseasonGames.reduce((sum,game)=>sum+valueOr(game.passYds),0),
      rushYds:postseasonGames.reduce((sum,game)=>sum+valueOr(game.rushYds),0),
      passTD:postseasonGames.reduce((sum,game)=>sum+valueOr(game.passTD),0),
      rushTD:postseasonGames.reduce((sum,game)=>sum+valueOr(game.rushTD),0),
    },
    timeline,
    rivalries:[...rivalryMap.values()]
      .sort((a,b)=>((b.wins+b.losses)-(a.wins+a.losses))||(b.lastSeason-a.lastSeason))
      .slice(0,6),
    honors:(state.trophies||[]).filter(Boolean).slice(0,6).map((honor,index)=>({
      id:clean(honor.id,`honor-${index}`),
      name:clean(honor.name || honor.title || honor.type,'Honor'),
      year:clean(honor.year || honor.season || honor.summary,'Career achievement'),
    })),
    milestones,
    legacyCount:(state.trophies||[]).length+milestones.length,
    profile:{
      height:clean(state.player?.height,'—'),
      weight:clean(state.player?.weight,'—'),
      archetype:clean(state.player?.archetype,'Not captured'),
      overall:clean(state.player?.overall,'—'),
      rank:clean(state.rtg?.rank || state.player?.depthChartRole,'Not captured'),
      gpa:clean(state.rtg?.gpa,'Not captured'),
      followers:valueOr(state.rtg?.followers),
      valuation:valueOr(state.rtg?.valuation),
      coachTrust:valueOr(state.rtg?.coachTrust),
      skillPoints:valueOr(state.rtg?.skillPoints),
    },
  };
};

const durationLabel = (episode = {}) => {
  const masterSeconds = Number(episode.masterAudioDurationSeconds || episode.audioDurationSeconds);
  if (Number.isFinite(masterSeconds) && masterSeconds > 0) {
    const rounded = Math.round(masterSeconds);
    return `${Math.floor(rounded/60)}:${String(rounded%60).padStart(2, '0')}`;
  }
  const explicit = clean(episode.duration || episode.runtime);
  if (explicit) return explicit;
  const minutes = Number(episode.estimatedMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  const whole = Math.floor(minutes);
  const seconds = Math.round((minutes - whole) * 60);
  return `${whole}:${String(seconds).padStart(2, '0')}`;
};

const episodeTranscriptSections = (episode = {}) => {
  const hostMap = new Map((episode.hosts || []).map((host) => [host.id, clean(host.name, 'HOST')]));
  return (episode.segments || [])
    .filter((segment) => clean(segment?.text))
    .map((segment, index) => ({
      id: clean(segment.id, `segment-${index + 1}`),
      speaker: hostMap.get(segment.hostId) || clean(segment.hostId, 'HOST').replaceAll('-', ' ').toUpperCase(),
      text: clean(segment.text),
      chapterId: clean(segment.chapterId),
    }));
};



const newsroomArticleViews = (state = {}, issue = null) => {
  if (!issue || !Array.isArray(issue.articles)) return [];
  const library = Array.isArray(state.newsroomMediaLibrary) ? state.newsroomMediaLibrary : [];
  const byId = new Map(library.filter(Boolean).map((asset) => [String(asset.id || ''), asset]));

  return issue.articles.map((article,index) => {
    const presentation = resolveNewsroomPresentation(article || {});
    const asset = byId.get(String(article?.mediaAssetId || '')) || null;
    return {
      ...article,
      id: clean(article?.id || article?.outletId, `article-${index + 1}`),
      audience: clean(presentation?.audience, clean(article?.audience, 'school')),
      layout: clean(presentation?.layout, 'classic'),
      category: clean(presentation?.category, 'College Football'),
      outletId: clean(article?.outletId || article?.theme, `outlet-${index + 1}`),
      outletName: clean(article?.outletName, article?.outletId === 'national' ? 'College Football Central' : 'DynastyHQ Sports'),
      headline: clean(article?.headline || article?.title, 'Saved DynastyHQ story'),
      dek: clean(article?.dek || article?.summary, ''),
      kicker: clean(article?.kicker, ''),
      byline: clean(article?.byline, 'DynastyHQ Staff'),
      paragraphs: Array.isArray(article?.paragraphs) ? article.paragraphs.filter((entry) => clean(entry)).slice(0, 12) : [],
      photoCaption: clean(article?.photoCaption || article?.dek),
      photo: asset?.downloadUrl ? {
        id: clean(asset.id),
        url: clean(asset.downloadUrl),
        fileName: clean(asset.fileName, 'Newsroom photo'),
        photoType: clean(asset.photoType, 'general'),
        source: clean(asset.origin, 'upload'),
      } : null,
    };
  });
};

const weeklyNewsroomPhoto = (state = {}, issue = null, article = null, fallbackPublicationId = '') => {
  const library = Array.isArray(state.newsroomMediaLibrary) ? state.newsroomMediaLibrary : [];
  if (!library.length) return null;

  const publicationId = publicationIdFor(issue) || clean(fallbackPublicationId);
  const scoped = library
    .filter((asset) => (
      asset
      && !asset.isReference
      && clean(asset.downloadUrl)
      && publicationId
      && clean(asset.weekPublicationId) === publicationId
    ))
    .sort((a,b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))[0];

  if (scoped) {
    return {
      id: clean(scoped.id),
      url: clean(scoped.downloadUrl),
      fileName: clean(scoped.fileName, 'Weekly game photo'),
      photoType: clean(scoped.photoType, 'general'),
      source: 'week-game-photo',
    };
  }

  const byId = new Map(library.filter(Boolean).map((asset) => [String(asset.id || ''), asset]));
  const directIds = [
    article?.mediaAssetId,
    ...(issue?.articles || []).map((entry) => entry?.mediaAssetId),
  ].map((value) => String(value || '').trim()).filter(Boolean);

  for (const assetId of directIds) {
    const asset = byId.get(assetId);
    if (asset?.downloadUrl && !asset?.isReference) {
      return {
        id: clean(asset.id),
        url: clean(asset.downloadUrl),
        fileName: clean(asset.fileName, 'Weekly game photo'),
        photoType: clean(asset.photoType, 'general'),
        source: 'assigned-newsroom-photo',
      };
    }
  }

  const generated = library
    .filter((asset) => (
      asset
      && !asset.isReference
      && clean(asset.downloadUrl)
      && publicationId
      && clean(asset.generatedFrom?.publicationId) === publicationId
    ))
    .sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0];

  if (generated) {
    return {
      id: clean(generated.id),
      url: clean(generated.downloadUrl),
      fileName: clean(generated.fileName, 'Weekly game photo'),
      photoType: clean(generated.photoType, 'general'),
      source: 'edition-photo',
    };
  }

  return null;
};

const factsForPublication = (state, publicationId, season, week) => (state.factLedger || []).filter((fact) => (
  fact?.verified
  && (
    (publicationId && publicationIdFor(fact) === publicationId)
    || matchesSeasonWeek(fact, season, week)
  )
));

const previousEpisodes = (state, currentEpisode) => [...(state.podcastEpisodes || [])]
  .filter((entry) => entry && entry !== currentEpisode)
  .sort(bySeasonWeek)
  .reverse()
  .map((entry) => ({
    publicationId: publicationIdFor(entry),
    season: numeric(entry.season, 1),
    week: numeric(entry.week, 0),
    title: clean(entry.title, 'Archived episode'),
    summary: clean(entry.summary),
    duration: durationLabel(entry),
    masterAudioDurationSeconds: numeric(entry.masterAudioDurationSeconds || entry.audioDurationSeconds, 0),
    audioReady: entry.audioStatus === 'ready',
    coverUrl: clean(entry.coverImageUrl || entry.coverUrl || entry.artworkUrl || entry.imageUrl),
  }));


const navigationFor = (state = {}, selectedSeason = null) => {
  const seasonSet = new Set([numeric(state.currentSeason, 1)]);
  const addSeason = (entry) => {
    const season = numeric(entry?.season, 0);
    if (season > 0) seasonSet.add(season);
  };
  (state.gameLogs || []).forEach(addSeason);
  (state.newsroomIssues || []).forEach(addSeason);
  (state.podcastEpisodes || []).forEach(addSeason);
  (state.careerChronicle || []).forEach(addSeason);
  (state.seasonSchedules || []).forEach(addSeason);

  const seasons = [...seasonSet].filter(Boolean).sort((a,b)=>b-a);
  const season = numeric(selectedSeason, numeric(state.currentSeason, seasons[0] || 1));
  const weekSet = new Set();
  const addWeek = (entry) => {
    if (numeric(entry?.season, season) !== season) return;
    const week = numeric(entry?.week, -1);
    if (week >= 0) weekSet.add(week);
  };
  (state.gameLogs || []).filter((entry)=>entry && entry.stage!=='high-school' && !entry.evaluation).forEach(addWeek);
  (state.newsroomIssues || []).forEach(addWeek);
  (state.podcastEpisodes || []).forEach(addWeek);
  (state.careerChronicle || []).forEach(addWeek);
  scheduleEntries(state, season).forEach((entry)=>{
    const week = numeric(entry?.week, -1);
    if (week >= 0 && !entry?.isBye && entry?.completed) weekSet.add(week);
  });
  if (season === numeric(state.currentSeason, season)) weekSet.add(numeric(state.currentWeek, 0));

  return {
    seasons,
    weeks:[...weekSet].sort((a,b)=>b-a),
  };
};

const exactIssueFor = (state, season, week) => [...(state.newsroomIssues || [])]
  .filter(Boolean)
  .sort(bySeasonWeek)
  .reverse()
  .find((entry)=>matchesSeasonWeek(entry, season, week)) || null;

const exactEpisodeFor = (state, issue, season, week) => {
  const episodes=[...(state.podcastEpisodes || [])].filter(Boolean).sort(bySeasonWeek).reverse();
  const publicationId=publicationIdFor(issue);
  if (publicationId) {
    const match=episodes.find((entry)=>publicationIdFor(entry)===publicationId);
    if (match) return match;
  }
  return episodes.find((entry)=>matchesSeasonWeek(entry, season, week)) || null;
};

export const derivePreviewData = (state, selection = {}) => {
  if (!state) return null;

  const currentSeason = Math.max(1, numeric(state.currentSeason, 1));
  const currentWeek = Math.max(0, numeric(state.currentWeek, 0));
  const season = Math.max(1, numeric(selection?.season, currentSeason));
  const navigation = navigationFor(state, season);
  const defaultWeek = season === currentSeason
    ? currentWeek
    : (navigation.weeks[0] ?? 0);
  const week = Math.max(0, numeric(selection?.week, defaultWeek));
  const isExplicitSelection = selection?.season !== undefined || selection?.week !== undefined;

  const games = collegeGames(state, season);
  const exactGame = games.find((entry)=>numeric(entry?.week, -1) === week) || null;
  const game = isExplicitSelection ? exactGame : (games.at(-1) || null);
  const contextWeek = game ? numeric(game.week, week) : week;
  const scores = gameScores(game || {});
  const historicalSelection = season < currentSeason || (season === currentSeason && week < currentWeek);
  const next = nextScheduledGame(state, season, contextWeek, { historical: historicalSelection });

  const issue = isExplicitSelection
    ? exactIssueFor(state, season, week)
    : issueForGame(state, game, season, week);
  const rawArticle = issue?.articles?.find((entry) => entry?.headline || entry?.title) || issue?.articles?.[0] || null;
  const articleViews = newsroomArticleViews(state, issue);
  const article = articleViews.find((entry) => entry.id === rawArticle?.id || entry.outletId === rawArticle?.outletId) || articleViews[0] || null;
  const localArticle = articleViews.find((entry) => entry.audience === 'local')
    || articleViews.find((entry) => entry.audience === 'regional')
    || null;
  const nationalArticle = articleViews.find((entry) => entry.audience === 'national-lead')
    || articleViews.find((entry) => entry.audience === 'national')
    || null;
  const episode = isExplicitSelection
    ? exactEpisodeFor(state, issue, season, week)
    : episodeForIssue(state, issue, game, season, week);
  const publicationId = publicationIdFor(issue) || publicationIdFor(episode) || `season-${season}-week-${week}`;
  const weeklyPhoto = weeklyNewsroomPhoto(state, issue, rawArticle, publicationId);
  const officialEntries = (state.eaSportsNetworkArticles || [])
    .filter((entry)=>(
      (publicationId && publicationIdFor(entry)===publicationId)
      || matchesSeasonWeek(entry,season,week)
    ));
  const mergedOfficialArticle=mergeOfficialCoveragePages(officialEntries);
  const officialArticles = mergedOfficialArticle ? [{
    ...applyOfficialCoverageLegacyBackfill(mergedOfficialArticle,{
      season,
      week,
      opponent:game?.opponent || '',
    }),
    id:clean(officialEntries[0]?.id, `ea-network-${season}-${week}-1`),
    publicationId:clean(officialEntries[0]?.publicationId, publicationId),
    season,
    week,
    sourcePages:Array.isArray(mergedOfficialArticle.sourcePages)?mergedOfficialArticle.sourcePages:[],
  }] : [];
  const facts = factsForPublication(state, publicationId, season, week);
  const coverageFacts = facts.filter((fact) => fact?.sourceType === 'coverage-reference' || fact?.editorialOnly === true);
  const scoringFacts = coverageFacts.filter((fact) => (
    String(fact?.key || '').includes('.scoring.')
    || /scoring|touchdown|field goal|extra point/i.test(`${fact?.label || ''} ${fact?.evidence || ''}`)
  ));
  const transcriptSections = episodeTranscriptSections(episode || {});
  const transcriptText = episode ? podcastTranscriptText(episode) : '';
  const offseason = buildPlayerOffseasonMode(state);
  const chronicleView = buildCareerChronicle2(state);
  const career = careerOverview(state);
  const player = state.player || {};
  const school = clean(player.college || player.school, 'PROGRAM');
  const scheduleEntry = scheduleEntries(state, season).find((entry)=>numeric(entry?.week,-1)===week) || null;
  const currentSetup = season === currentSeason && week === currentWeek ? (state.currentWeekSetup || {}) : {};
  const weekLabel = clean(scheduleEntry ? scheduleDisplayLabel(scheduleEntry) : (game?.weekLabel || issue?.weekLabel || issue?.label || episode?.label || currentSetup.label || currentSetup.customLabel), `W${week}`);
  const opponent = clean(game?.opponent || scheduleEntry?.opponent, 'NO GAME');
  const pass = game ? valueOr(game?.passYds) : null;
  const rush = game ? valueOr(game?.rushYds) : null;
  const passTD = game ? valueOr(game?.passTD) : null;
  const rushTD = game ? valueOr(game?.rushTD) : null;

  return {
    state,
    navigation,
    selection: {
      season,
      week,
      hasGame:Boolean(game),
      hasNewsroom:Boolean(issue),
      hasPodcast:Boolean(episode),
      isCurrent:season===currentSeason && week===currentWeek,
      isUpcoming:season===currentSeason && week===currentWeek && !game,
    },
    player: {
      name: clean(player.name, 'PLAYER').toUpperCase(),
      number: clean(player.number, '—'),
      pos: clean(player.pos, 'QB').toUpperCase(),
      school: school.toUpperCase(),
      overall: clean(player.overall, '—'),
      headshot: clean(player.headshot),
    },
    season,
    week,
    weekLabel,
    game: {
      raw: game,
      week,
      weekLabel,
      weekPhase: clean(game?.weekPhase || currentSetup.phase || scheduleEntry?.phase),
      postseason: game?.postseason || null,
      opponent: opponent.toUpperCase(),
      result: clean(game?.result, game ? 'FINAL' : 'NO GAME').toUpperCase(),
      us: game ? scores.us : 0,
      them: game ? scores.them : 0,
      pass,
      rush,
      total: game ? pass + rush : null,
      passTD,
      rushTD,
      td: game ? passTD + rushTD : null,
      interceptions: game ? valueOr(game?.int) : null,
      team: {
        points: game ? scores.us : null,
        totalYards: optionalNumber(game?.teamTotalYards),
        firstDowns: optionalNumber(game?.teamFirstDowns),
        turnovers: optionalNumber(game?.teamTurnovers),
        rushYards: optionalNumber(game?.teamRushYds),
        passYards: optionalNumber(game?.teamPassYds),
        possession: clean(game?.teamPossession),
        opponentTotalYards: optionalNumber(game?.opponentTotalYards),
        opponentFirstDowns: optionalNumber(game?.opponentFirstDowns),
        opponentTurnovers: optionalNumber(game?.opponentTurnovers),
        opponentRushYards: optionalNumber(game?.opponentRushYds),
        opponentPassYards: optionalNumber(game?.opponentPassYds),
        opponentPossession: clean(game?.opponentPossession),
      },
      scoring: {
        playCount: scoringFacts.length || null,
        passTD: game ? passTD : null,
        rushTD: game ? rushTD : null,
        opponentPoints: game ? scores.them : null,
        facts: scoringFacts,
      },
    },
    next: {
      raw: next,
      week: numeric(next?.week, Math.max(week + 1, contextWeek + 1)),
      displayLabel: next ? scheduleDisplayLabel(next) : '',
      opponent: clean(next?.opponent, 'NEXT OPPONENT').toUpperCase(),
    },
    rtg: state.rtg || {},
    news: {
      issue,
      article,
      publicationId,
      season,
      week,
      headline: clean(article?.headline || article?.title || issue?.headline, issue ? 'Saved DynastyHQ coverage' : `No Newsroom edition saved for Week ${week}`),
      dek: clean(article?.dek || article?.summary || issue?.dek, issue ? 'Your saved career story is ready.' : 'Choose another saved week to open its Newsroom coverage.'),
      kicker: clean(article?.kicker, issue ? 'GAME RECAP' : 'ARCHIVE'),
      byline: clean(article?.byline, 'DynastyHQ Staff'),
      outlet: clean(article?.outletName || issue?.outletProfile?.localOutletName, 'DynastyHQ Sports'),
      publishedAt: clean(issue?.publishedAt || issue?.editorialGeneratedAt),
      paragraphs: Array.isArray(article?.paragraphs) ? article.paragraphs.filter((entry) => clean(entry)).slice(0, 10) : [],
      photoCaption: clean(article?.photoCaption || article?.dek),
      articles: articleViews,
      localArticleId: localArticle?.id || '',
      nationalArticleId: nationalArticle?.id || '',
      localArticle,
      nationalArticle,
      weeklyPhoto,
      officialArticles,
    },
    podcast: {
      episode,
      publicationId,
      title: clean(episode?.title || issue?.podcastBrief?.title, episode ? `Week ${week} episode` : `No Huddle episode saved for Week ${week}`),
      summary: clean(episode?.summary || issue?.podcastBrief?.summary, episode ? 'The saved DynastyHQ episode is tied to this career week.' : 'Choose another saved week to open its podcast episode.'),
      duration: durationLabel(episode || {}),
      masterAudioDurationSeconds: numeric(episode?.masterAudioDurationSeconds || episode?.audioDurationSeconds, 0),
      estimatedMinutes: numeric(episode?.estimatedMinutes, 0),
      status: clean(episode?.status, episode ? 'scripted' : 'not-generated'),
      audioStatus: clean(episode?.audioStatus, 'not-generated'),
      audioReady: episode?.audioStatus === 'ready',
      audioEngine: clean(episode?.audioEngine),
      audioSource: clean(episode?.audioSource),
      showCoverUrl: clean(state.podcastBranding?.coverUrl || state.outletImages?.podcast),
      episodeCoverUrl: clean(episode?.coverImageUrl || episode?.coverUrl || episode?.artworkUrl || episode?.imageUrl),
      masterAudioFileName: clean(episode?.masterAudioFileName),
      masterAudioMimeType: clean(episode?.masterAudioMimeType),
      masterAudioSizeBytes: numeric(episode?.masterAudioSizeBytes, 0),
      masterAudioUploadedAt: clean(episode?.masterAudioUploadedAt),
      chapters: Array.isArray(episode?.chapters) ? episode.chapters : [],
      segments: transcriptSections,
      transcript: transcriptText,
      citedFactKeys: Array.isArray(episode?.citedFactKeys) ? episode.citedFactKeys : [],
      sourceFacts: facts,
      previous: previousEpisodes(state, episode).slice(0, 3),
      archive: previousEpisodes(state, episode),
    },
    totals: games.reduce((acc, entry) => ({
      passYds: acc.passYds + valueOr(entry.passYds),
      rushYds: acc.rushYds + valueOr(entry.rushYds),
      passTD: acc.passTD + valueOr(entry.passTD),
      rushTD: acc.rushTD + valueOr(entry.rushTD),
      interceptions: acc.interceptions + valueOr(entry.int),
      appearances: acc.appearances + 1,
    }), { passYds: 0, rushYds: 0, passTD: 0, rushTD: 0, interceptions: 0, appearances: 0 }),
    career,
    offseason,
    chronicle: chronicleView,
  };
};

export const useReadOnlyLiveCareer = () => {
  const [user, setUser] = useState(auth.currentUser);
  const [career, setCareer] = useState(null);
  const [status, setStatus] = useState(auth.currentUser ? 'loading' : 'signed-out');
  const [error, setError] = useState('');

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    setCareer(null);
    setError('');
    setStatus(nextUser ? 'loading' : 'signed-out');
  }), []);

  useEffect(() => {
    if (!user || !db) return undefined;

    const liveRef = doc(db, 'artifacts', productionAppId, 'users', user.uid, 'hq_data', 'main');
    return onSnapshot(
      liveRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          setCareer(null);
          setStatus('missing');
          setError('No live DynastyHQ career was found for this signed-in account.');
          return;
        }

        try {
          const raw = snapshot.data();
          const archiveIds = storageArchiveIds(raw);
          let hydrated = raw;

          if (archiveIds.length) {
            const archiveSnapshots = await Promise.all(
              archiveIds.map((archiveId) => getDoc(
                doc(db, 'artifacts', productionAppId, 'users', user.uid, CAREER_ARCHIVE_COLLECTION, archiveId),
              )),
            );
            hydrated = hydrateCareerStateFromArchives(
              raw,
              archiveSnapshots.filter((entry) => entry.exists()).map((entry) => entry.data()),
            );
          }

          setCareer(migrateCareerState(hydrated, DEFAULT_CAREER_STATE));
          setStatus('connected');
          setError('');
        } catch (readError) {
          setCareer(null);
          setStatus('error');
          setError(readError?.message || 'The live career could not be read.');
        }
      },
      (readError) => {
        setCareer(null);
        setStatus('error');
        setError(readError?.message || 'The live career could not be read.');
      },
    );
  }, [user]);

  const signIn = useCallback(async (email, password) => {
    setStatus('loading');
    setError('');
    try {
      await signInWithEmailAndPassword(auth, String(email || '').trim(), String(password || ''));
      return true;
    } catch (signInError) {
      setStatus('signed-out');
      setError(signInError?.message || 'Sign-in failed.');
      return false;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await signOut(auth);
  }, []);

  const data = useMemo(() => derivePreviewData(career), [career]);

  return { user, career, data, status, error, signIn, disconnect };
};
