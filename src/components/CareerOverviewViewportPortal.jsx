import { useEffect } from 'react';
import './career-overview-viewport.css';

const CareerOverviewViewportPortal = () => {
  useEffect(() => {
    const syncDocumentMode = () => {
      document.documentElement.classList.toggle(
        'dhq-career-overview-document-open',
        document.body.classList.contains('dhq-career-overview-open'),
      );
    };

    syncDocumentMode();
    const observer = new MutationObserver(syncDocumentMode);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('dhq-career-overview-document-open');
    };
  }, []);

  return null;
};

export default CareerOverviewViewportPortal;
