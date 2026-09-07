import { useEffect, useMemo } from 'react';
import { resolvePodcastShow } from '../domain/podcastShow.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './game-hub-mobile.css';

const GameHubMobilePolishPortal = () => {
  const { career } = useOwnerCareer();
  const show = useMemo(() => resolvePodcastShow(career || {}), [career]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    let scheduled = false;
    const sync = () => {
      scheduled = false;
      const heading = document.querySelector('.dhq-game-hub .dhq-gh-podcast-panel .dhq-gh-card__heading > span');
      if (heading) heading.dataset.podcastShow = show.name || 'The Huddle Podcast';
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [show.name]);

  return null;
};

export default GameHubMobilePolishPortal;
