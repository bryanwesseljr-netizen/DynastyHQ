import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, productionAppId } from '../firebase.js';
import { DEFAULT_CAREER_STATE } from '../domain/defaultCareerState.js';
import { migrateCareerState } from '../domain/weeklyEngine.js';
import { podcastTranscriptText } from '../domain/podcastEngine.js';
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

const nextScheduledGame = (state, season, currentWeek) => {
  const entries = scheduleEntries(state, season)
    .filter((entry) => entry && !entry.isBye && clean(entry.opponent))
    .sort((a, b) => numeric(a.week) - numeric(b.week));

  return entries.find((entry) => !entry.completed && numeric(entry.week) >= numeric(currentWeek))
    || entries.find((entry) => numeric(entry.week) > numeric(currentWeek))
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

const durationLabel = (episode = {}) => {
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
  .slice(0, 3)
  .map((entry) => ({
    publicationId: publicationIdFor(entry),
    season: numeric(entry.season, 1),
    week: numeric(entry.week, 0),
    title: clean(entry.title, 'Archived episode'),
    summary: clean(entry.summary),
    duration: durationLabel(entry),
    audioReady: entry.audioStatus === 'ready',
  }));

export const derivePreviewData = (state) => {
  if (!state) return null;

  const season = Math.max(1, numeric(state.currentSeason, 1));
  const week = Math.max(0, numeric(state.currentWeek, 0));
  const games = collegeGames(state, season);
  const game = games.at(-1) || null;
  const scores = gameScores(game || {});
  const next = nextScheduledGame(state, season, Math.max(week, numeric(game?.week, 0) + 1));
  const issue = issueForGame(state, game, season, week);
  const article = issue?.articles?.find((entry) => entry?.headline || entry?.title) || issue?.articles?.[0] || null;
  const episode = episodeForIssue(state, issue, game, season, week);
  const publicationId = publicationIdFor(issue) || publicationIdFor(episode);
  const facts = factsForPublication(state, publicationId, numeric(game?.season, season), numeric(game?.week, week));
  const transcriptSections = episodeTranscriptSections(episode || {});
  const transcriptText = episode ? podcastTranscriptText(episode) : '';
  const player = state.player || {};
  const school = clean(player.college || player.school, 'PROGRAM');
  const pass = valueOr(game?.passYds);
  const rush = valueOr(game?.rushYds);
  const passTD = valueOr(game?.passTD);
  const rushTD = valueOr(game?.rushTD);

  return {
    state,
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
    game: {
      raw: game,
      week: numeric(game?.week, week),
      opponent: clean(game?.opponent, 'OPPONENT').toUpperCase(),
      result: clean(game?.result, 'FINAL').toUpperCase(),
      us: scores.us,
      them: scores.them,
      pass,
      rush,
      total: pass + rush,
      passTD,
      rushTD,
      td: passTD + rushTD,
      interceptions: valueOr(game?.int),
    },
    next: {
      raw: next,
      week: numeric(next?.week, Math.max(week + 1, numeric(game?.week, week) + 1)),
      opponent: clean(next?.opponent, 'NEXT OPPONENT').toUpperCase(),
    },
    rtg: state.rtg || {},
    news: {
      issue,
      article,
      publicationId,
      season: numeric(issue?.season, season),
      week: numeric(issue?.week, numeric(game?.week, week)),
      headline: clean(article?.headline || article?.title || issue?.headline, 'Latest DynastyHQ coverage'),
      dek: clean(article?.dek || article?.summary || issue?.dek, 'Your latest verified career story is ready.'),
      kicker: clean(article?.kicker, 'GAME RECAP'),
      byline: clean(article?.byline, 'DynastyHQ Staff'),
      outlet: clean(article?.outletName || issue?.outletProfile?.localOutletName, 'DynastyHQ Sports'),
      publishedAt: clean(issue?.publishedAt || issue?.editorialGeneratedAt),
      paragraphs: Array.isArray(article?.paragraphs) ? article.paragraphs.filter((entry) => clean(entry)).slice(0, 10) : [],
      photoCaption: clean(article?.photoCaption || article?.dek),
      articles: Array.isArray(issue?.articles) ? issue.articles : [],
    },
    podcast: {
      episode,
      publicationId,
      title: clean(episode?.title || issue?.podcastBrief?.title, game ? `${clean(game.opponent, 'Game')} recap` : 'Latest episode'),
      summary: clean(episode?.summary || issue?.podcastBrief?.summary, 'The latest DynastyHQ episode is tied to this verified career week.'),
      duration: durationLabel(episode || {}),
      estimatedMinutes: numeric(episode?.estimatedMinutes, 0),
      status: clean(episode?.status, episode ? 'scripted' : 'not-generated'),
      audioStatus: clean(episode?.audioStatus, 'not-generated'),
      audioReady: episode?.audioStatus === 'ready',
      chapters: Array.isArray(episode?.chapters) ? episode.chapters : [],
      segments: transcriptSections,
      transcript: transcriptText,
      citedFactKeys: Array.isArray(episode?.citedFactKeys) ? episode.citedFactKeys : [],
      sourceFacts: facts,
      previous: previousEpisodes(state, episode),
    },
    totals: games.reduce((acc, entry) => ({
      passYds: acc.passYds + valueOr(entry.passYds),
      rushYds: acc.rushYds + valueOr(entry.rushYds),
      passTD: acc.passTD + valueOr(entry.passTD),
      rushTD: acc.rushTD + valueOr(entry.rushTD),
      interceptions: acc.interceptions + valueOr(entry.int),
      appearances: acc.appearances + 1,
    }), { passYds: 0, rushYds: 0, passTD: 0, rushTD: 0, interceptions: 0, appearances: 0 }),
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
