import { useEffect, useMemo } from 'react';
import { resolvePodcastShow } from '../domain/podcastShow.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './game-hub-mobile.css';

const MOBILE_HUB_TOP = 150;

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

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    let zoomPanActive = false;
    let underlyingScrollY = window.scrollY;

    const scroller = () => document.querySelector('.dhq-game-hub__scroll');

    const enterZoomPan = () => {
      if (zoomPanActive) return;
      zoomPanActive = true;
      underlyingScrollY = window.scrollY;
      const innerScrollTop = scroller()?.scrollTop || 0;
      document.body.classList.add('dhq-game-hub-zoom-pan');
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: MOBILE_HUB_TOP + innerScrollTop, left: 0, behavior: 'auto' });
      });
    };

    const exitZoomPan = () => {
      if (!zoomPanActive) return;
      const translatedScrollTop = Math.max(0, window.scrollY - MOBILE_HUB_TOP);
      zoomPanActive = false;
      document.body.classList.remove('dhq-game-hub-zoom-pan');
      window.requestAnimationFrame(() => {
        const hubScroller = scroller();
        if (hubScroller) hubScroller.scrollTop = translatedScrollTop;
        window.scrollTo({ top: underlyingScrollY, left: 0, behavior: 'auto' });
      });
    };

    const syncZoomPan = () => {
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      const hubOpen = document.body.classList.contains('dhq-game-hub-open');
      const zoomed = viewport.scale > 1.01;
      if (mobile && hubOpen && zoomed) enterZoomPan();
      else exitZoomPan();
    };

    syncZoomPan();
    viewport.addEventListener('resize', syncZoomPan);
    viewport.addEventListener('scroll', syncZoomPan);
    window.addEventListener('resize', syncZoomPan);
    const observer = new MutationObserver(syncZoomPan);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      viewport.removeEventListener('resize', syncZoomPan);
      viewport.removeEventListener('scroll', syncZoomPan);
      window.removeEventListener('resize', syncZoomPan);
      document.body.classList.remove('dhq-game-hub-zoom-pan');
    };
  }, []);

  return null;
};

export default GameHubMobilePolishPortal;
