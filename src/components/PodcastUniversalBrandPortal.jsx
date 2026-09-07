import { useEffect, useMemo } from 'react';
import { resolvePodcastShow } from '../domain/podcastShow.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './podcast-universal-brand.css';

const PodcastUniversalBrandPortal = () => {
  const { career } = useOwnerCareer();
  const show = useMemo(() => resolvePodcastShow(career || {}), [career]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    let scheduled = false;
    const sync = () => {
      scheduled = false;
      const name = show.name || 'The Huddle Podcast';
      const targets = [
        document.querySelector('#dynastyhq-command-center .dhq-broadcast-podcast-copy > strong'),
        document.querySelector('.dhq-game-hub .dhq-gh-podcast-panel .dhq-gh-card__heading > span'),
      ].filter(Boolean);
      targets.forEach((target) => { target.dataset.podcastShow = name; });
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

export default PodcastUniversalBrandPortal;
