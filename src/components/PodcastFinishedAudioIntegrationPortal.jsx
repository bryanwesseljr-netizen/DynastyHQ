import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Play } from 'lucide-react';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './podcast-finished-audio.css';

const clean = (value) => String(value ?? '').trim();
const numberOf = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const publicationIdFor = (episode = {}) => clean(episode.publicationId || episode.id).replace(/^podcast-/, '');

const episodeIsReady = (episode) => Boolean(episode && episode.audioStatus === 'ready');
const episodeIsFinishedMaster = (episode) => Boolean(
  episodeIsReady(episode)
  && (
    episode.audioEngine === 'notebooklm-master-upload'
    || episode.audioSource === 'notebooklm'
    || episode.masterAudioUploadedAt
  )
);

const visibleNavButton = (label) => {
  const matcher = new RegExp(`^${label}$`, 'i');
  const buttons = [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')]
    .filter((button) => matcher.test(clean(button.textContent)));
  return buttons.find((button) => button.offsetParent !== null) || buttons[0] || null;
};

const gameHubSelection = () => {
  const label = clean(document.querySelector('.dhq-game-hub__toolbar strong')?.textContent);
  const match = label.match(/season\s+(\d+)\s*[·•-]?\s*week\s+(\d+)/i);
  return match ? { season: Number(match[1]), week: Number(match[2]) } : null;
};

const episodeMatchesWeek = (episode, season, week) => {
  const id = publicationIdFor(episode);
  return (
    (numberOf(episode?.season, 1) === numberOf(season, 1) && numberOf(episode?.week) === numberOf(week))
    || id === `season-${numberOf(season, 1)}-week-${numberOf(week)}`
  );
};

const ensureMount = (parent, selector, dataKey) => {
  if (!parent) return null;
  const existing = parent.querySelector(selector);
  if (existing) return existing;
  const node = document.createElement('div');
  node.dataset[dataKey] = 'true';
  parent.appendChild(node);
  return node;
};

const removeOwnedMount = (parent, selector) => {
  parent?.querySelector(selector)?.remove();
};

const ReadyAction = ({ episode, variant, onOpen }) => {
  const finished = episodeIsFinishedMaster(episode);
  return (
    <div className={`dhq-finished-podcast-action dhq-finished-podcast-action--${variant}`}>
      <span className="dhq-finished-podcast-badge">
        <CheckCircle2 size={11} /> {finished ? 'FINISHED EPISODE' : 'EPISODE READY'}
      </span>
      <button type="button" onClick={onOpen}>
        <Play size={11} fill="currentColor" /> PLAY EPISODE
      </button>
    </div>
  );
};

const PodcastFinishedAudioIntegrationPortal = () => {
  const { career } = useOwnerCareer();
  const [homeMount, setHomeMount] = useState(null);
  const [gameHubMount, setGameHubMount] = useState(null);
  const [gameHubEpisodeId, setGameHubEpisodeId] = useState('');

  const episodes = useMemo(() => (career?.podcastEpisodes || []).filter(Boolean), [career?.podcastEpisodes]);
  const latestEpisode = episodes.at(-1) || null;
  const latestReadyEpisode = episodeIsReady(latestEpisode) ? latestEpisode : null;
  const gameHubEpisode = episodes.find((episode) => clean(episode.id) === gameHubEpisodeId) || null;

  const openPodcast = () => {
    visibleNavButton('Podcast')?.click();
  };

  useEffect(() => {
    let scheduled = false;

    const sync = () => {
      scheduled = false;

      const homeCard = document.querySelector('.dhq-broadcast-podcast-card');
      if (homeCard && latestReadyEpisode) {
        homeCard.classList.add('dhq-podcast-finished-ready');
        const copy = homeCard.querySelector('.dhq-broadcast-podcast-copy') || homeCard;
        const mount = ensureMount(copy, '[data-finished-podcast-home="true"]', 'finishedPodcastHome');
        setHomeMount((current) => current === mount ? current : mount);
      } else {
        homeCard?.classList.remove('dhq-podcast-finished-ready');
        removeOwnedMount(homeCard, '[data-finished-podcast-home="true"]');
        setHomeMount(null);
      }

      const gameHubCard = document.querySelector('.dhq-gh-podcast-panel');
      const selected = gameHubSelection();
      const selectedEpisode = selected
        ? episodes.find((episode) => episodeMatchesWeek(episode, selected.season, selected.week)) || null
        : null;

      if (gameHubCard && episodeIsReady(selectedEpisode)) {
        gameHubCard.classList.add('dhq-podcast-finished-ready');
        const mount = ensureMount(gameHubCard, '[data-finished-podcast-gamehub="true"]', 'finishedPodcastGamehub');
        setGameHubMount((current) => current === mount ? current : mount);
        setGameHubEpisodeId(clean(selectedEpisode.id));
      } else {
        gameHubCard?.classList.remove('dhq-podcast-finished-ready');
        removeOwnedMount(gameHubCard, '[data-finished-podcast-gamehub="true"]');
        setGameHubMount(null);
        setGameHubEpisodeId('');
      }
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      document.querySelector('.dhq-broadcast-podcast-card')?.classList.remove('dhq-podcast-finished-ready');
      document.querySelector('.dhq-gh-podcast-panel')?.classList.remove('dhq-podcast-finished-ready');
      document.querySelector('[data-finished-podcast-home="true"]')?.remove();
      document.querySelector('[data-finished-podcast-gamehub="true"]')?.remove();
    };
  }, [episodes, latestReadyEpisode]);

  return (
    <>
      {homeMount && latestReadyEpisode ? createPortal(
        <ReadyAction episode={latestReadyEpisode} variant="home" onOpen={openPodcast} />,
        homeMount,
      ) : null}
      {gameHubMount && gameHubEpisode ? createPortal(
        <ReadyAction episode={gameHubEpisode} variant="gamehub" onOpen={openPodcast} />,
        gameHubMount,
      ) : null}
    </>
  );
};

export default PodcastFinishedAudioIntegrationPortal;
