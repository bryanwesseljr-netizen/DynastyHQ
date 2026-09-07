import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CAREER_STAGES, deriveCareerStage } from '../domain/commandCenter.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import DynamicMatchupHelmets from './DynamicMatchupHelmets.jsx';
import './dynamic-matchup-helmets.css';

const clean = (value) => String(value ?? '').trim();
const numberOf = (value) => Number(value) || 0;
const publicationIdFor = (season, week) => `season-${numberOf(season) || 1}-week-${numberOf(week) || 1}`;

const currentSchoolFor = (state = {}) => {
  const stage = deriveCareerStage(state);
  const player = state.player || {};
  const coach = state.coach || {};
  if (stage === CAREER_STAGES.HIGH_SCHOOL) return clean(player.school) || 'YOUR SCHOOL';
  return clean(coach.currentSchool || player.college || player.school) || 'YOUR PROGRAM';
};

const historicalSchoolFor = (game = {}, fallback) => (
  clean(game.school || game.team || game.program || game.playerSchool || game.college) || fallback
);

const DynamicMatchupHelmetPortal = () => {
  const { career } = useOwnerCareer();
  const [homeHost, setHomeHost] = useState(null);
  const [gameHubHost, setGameHubHost] = useState(null);
  const [selectionRevision, setSelectionRevision] = useState(0);

  useEffect(() => {
    let scheduled = false;

    const ensureHostAfter = (source, id, className, setter) => {
      if (!source) {
        const existing = document.getElementById(id);
        existing?.remove();
        setter((current) => (current?.isConnected ? current : null));
        return;
      }

      source.classList.add('dhq-dynamic-helmet-source-hidden');
      let host = document.getElementById(id);
      if (!host || host.previousElementSibling !== source) {
        host?.remove();
        host = document.createElement('div');
        host.id = id;
        host.className = className;
        source.insertAdjacentElement('afterend', host);
      }
      setter((current) => (current === host ? current : host));
    };

    const sync = () => {
      scheduled = false;
      const homeSource = document.querySelector('.dhq-broadcast-hero > img.dhq-broadcast-helmets');
      const gameHubSource = document.querySelector('.dhq-game-hub .dhq-gh-hero > img');
      ensureHostAfter(homeSource, 'dhq-home-dynamic-helmet-host', 'dhq-broadcast-helmets dhq-dynamic-matchup-helmets', setHomeHost);
      ensureHostAfter(gameHubSource, 'dhq-game-hub-dynamic-helmet-host', 'dhq-gh-matchup-helmets dhq-dynamic-matchup-helmets', setGameHubHost);
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };

    const handleSelectionChange = (event) => {
      if (!event.target?.matches?.('.dhq-game-hub__toolbar select')) return;
      setSelectionRevision((revision) => revision + 1);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('change', handleSelectionChange, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('change', handleSelectionChange, true);
      document.querySelectorAll('.dhq-dynamic-helmet-source-hidden').forEach((source) => source.classList.remove('dhq-dynamic-helmet-source-hidden'));
      document.getElementById('dhq-home-dynamic-helmet-host')?.remove();
      document.getElementById('dhq-game-hub-dynamic-helmet-host')?.remove();
    };
  }, []);

  const homeModel = useMemo(() => {
    const state = career || {};
    const stage = deriveCareerStage(state);
    const setup = state.currentWeekSetup || {};
    const draftGame = state.weeklyAgendaDraft?.newGame || state.weeklyAgendaDraft?.game || {};
    return {
      school: currentSchoolFor(state),
      opponent: clean(setup.opponent || draftGame.opponent) || 'NEXT OPPONENT',
      highSchool: stage === CAREER_STAGES.HIGH_SCHOOL,
    };
  }, [career]);

  const gameHubModel = useMemo(() => {
    const state = career || {};
    const currentSchool = currentSchoolFor(state);
    const stage = deriveCareerStage(state);
    const select = typeof document !== 'undefined' ? document.querySelector('.dhq-game-hub__toolbar select') : null;
    const selectedValue = select?.value || 'current';
    const games = Array.isArray(state.gameLogs) ? state.gameLogs : [];
    const selectedGame = selectedValue === 'current'
      ? null
      : games.find((game) => publicationIdFor(game.season, game.week) === selectedValue) || null;

    if (selectedGame) {
      return {
        school: historicalSchoolFor(selectedGame, currentSchool),
        opponent: clean(selectedGame.opponent) || 'OPPONENT',
        highSchool: selectedGame.stage === 'high-school' || Boolean(selectedGame.evaluation),
      };
    }

    return {
      school: currentSchool,
      opponent: clean(state.currentWeekSetup?.opponent) || 'OPPONENT TBD',
      highSchool: stage === CAREER_STAGES.HIGH_SCHOOL,
    };
  }, [career, selectionRevision, gameHubHost]);

  return (
    <>
      {homeHost ? createPortal(
        <DynamicMatchupHelmets
          homeTeam={homeModel.school}
          awayTeam={homeModel.opponent}
          highSchool={homeModel.highSchool}
        />,
        homeHost,
      ) : null}
      {gameHubHost ? createPortal(
        <DynamicMatchupHelmets
          homeTeam={gameHubModel.school}
          awayTeam={gameHubModel.opponent}
          highSchool={gameHubModel.highSchool}
        />,
        gameHubHost,
      ) : null}
    </>
  );
};

export default DynamicMatchupHelmetPortal;
