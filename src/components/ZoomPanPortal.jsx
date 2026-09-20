import { useEffect } from 'react';

const ZOOM_CLASS = 'dhq-visual-zoomed';
const ZOOM_EPSILON = 0.01;

const ZoomPanPortal = () => {
  useEffect(() => {
    const viewport = window.visualViewport;

    let settleFrame = 0;
    let settleTimer = 0;

    const syncZoomState = () => {
      const scale = Number(viewport?.scale || 1);
      const layoutWidth = Number(document.documentElement.clientWidth || window.innerWidth || 0);
      const visualWidth = Number(viewport?.width || layoutWidth);
      const widthIndicatesZoom = layoutWidth > 0 && visualWidth > 0 && visualWidth < layoutWidth - 2;
      const zoomed = scale > 1 + ZOOM_EPSILON || widthIndicatesZoom;
      document.documentElement.classList.toggle(ZOOM_CLASS, zoomed);
      document.body.classList.toggle(ZOOM_CLASS, zoomed);
    };

    const scheduleSync = () => {
      if (settleFrame) window.cancelAnimationFrame(settleFrame);
      window.clearTimeout(settleTimer);
      settleFrame = window.requestAnimationFrame(() => {
        settleFrame = 0;
        syncZoomState();
      });
      settleTimer = window.setTimeout(syncZoomState, 120);
    };

    syncZoomState();

    viewport?.addEventListener('resize', scheduleSync, { passive: true });
    viewport?.addEventListener('scroll', scheduleSync, { passive: true });
    window.addEventListener('resize', scheduleSync, { passive: true });

    return () => {
      viewport?.removeEventListener('resize', scheduleSync);
      viewport?.removeEventListener('scroll', scheduleSync);
      window.removeEventListener('resize', scheduleSync);
      if (settleFrame) window.cancelAnimationFrame(settleFrame);
      window.clearTimeout(settleTimer);
      document.documentElement.classList.remove(ZOOM_CLASS);
      document.body.classList.remove(ZOOM_CLASS);
    };
  }, []);

  return null;
};

export default ZoomPanPortal;
