import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, productionAppId } from '../firebase.js';
import { DEFAULT_CAREER_STATE } from '../domain/defaultCareerState.js';
import { migrateCareerState } from '../domain/weeklyEngine.js';
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

const latestIssue = (state) => [...(state.newsroomIssues || [])]
  .filter(Boolean)
  .sort(bySeasonWeek)
  .at(-1) || null;

const latestEpisode = (state) => [...(state.podcastEpisodes || [])]
  .filter(Boolean)
  .sort(bySeasonWeek)
  .at(-1) || null;

export const derivePreviewData = (state) => {
  if (!state) return null;

  const season = Math.max(1, numeric(state.currentSeason, 1));
  const week = Math.max(0, numeric(state.currentWeek, 0));
  const games = collegeGames(state, season);
  const game = games.at(-1) || null;
  const scores = gameScores(game || {});
  const next = nextScheduledGame(state, season, Math.max(week, numeric(game?.week, 0) + 1));
  const issue = latestIssue(state);
  const article = issue?.articles?.find((entry) => entry?.headline || entry?.title) || issue?.articles?.[0] || null;
  const episode = latestEpisode(state);
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
      headline: clean(article?.headline || article?.title || issue?.headline, 'Latest DynastyHQ coverage'),
      dek: clean(article?.dek || article?.summary || issue?.dek, 'Your latest verified career story is ready.'),
    },
    podcast: {
      episode,
      title: clean(episode?.title, game ? `${clean(game.opponent, 'Game')} recap` : 'Latest episode'),
      duration: clean(episode?.duration || episode?.runtime, '—'),
      transcript: episode?.transcript || episode?.script || '',
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
