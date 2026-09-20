import { useEffect } from 'react';

const ZOOM_CLASS = 'dhq-visual-zoomed';
const ZOOM_EPSILON = 0.01;

const ZoomPanPortal = () => {
  useEffect(() => {
    const viewport = window.visualViewport;

    const syncZoomState = () => {
      const scale = Number(viewport?.scale || 1);
      const zoomed = scale > 1 + ZOOM_EPSILON;
      document.documentElement.classList.toggle(ZOOM_CLASS, zoomed);
      document.body.classList.toggle(ZOOM_CLASS, zoomed);
    };

    syncZoomState();

    viewport?.addEventListener('resize', syncZoomState, { passive: true });
    viewport?.addEventListener('scroll', syncZoomState, { passive: true });
    window.addEventListener('resize', syncZoomState, { passive: true });

    return () => {
      viewport?.removeEventListener('resize', syncZoomState);
      viewport?.removeEventListener('scroll', syncZoomState);
      window.removeEventListener('resize', syncZoomState);
      document.documentElement.classList.remove(ZOOM_CLASS);
      document.body.classList.remove(ZOOM_CLASS);
    };
  }, []);

  return null;
};

export default ZoomPanPortal;
