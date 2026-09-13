import { useEffect } from 'react';

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const findVerifiedScannerInput = () => {
  const labels = [...document.querySelectorAll('.dhq-weekly-agenda-workspace label')];
  const label = labels.find((entry) => /choose weekly screenshots/i.test(entry.textContent || ''));
  return label?.querySelector('input[type="file"]') || null;
};

const findLegacyGameHubButton = () => {
  const buttons = [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')];
  const matches = buttons.filter((button) => /^game hub$/i.test(clean(button.textContent)));
  return matches.find((button) => button.closest('.dhq-primary-nav')) || matches[0] || null;
};

const scannerHandoffNeeded = () => Boolean(
  document.body.classList.contains('dhq-session-import-mode')
  && document.querySelector('.dhq-session-import.is-analyzing')
  && !findVerifiedScannerInput()
);

const VerifiedScannerHandoffPortal = () => {
  useEffect(() => {
    let timer = 0;
    let attempts = 0;
    let running = false;

    const stop = () => {
      window.clearTimeout(timer);
      timer = 0;
      attempts = 0;
      running = false;
    };

    const ensureScanner = () => {
      if (!scannerHandoffNeeded()) {
        stop();
        return;
      }

      if (findVerifiedScannerInput()) {
        stop();
        return;
      }

      const button = findLegacyGameHubButton();
      if (button) {
        // Session Import needs the real legacy dataEntry route behind the modern
        // Game Hub portal. This flag lets exactly this programmatic nav click
        // reach App.jsx instead of opening the presentation-only Game Hub layer.
        window.__dhqAllowLegacyGameHubOnce = true;
        button.click();
      }

      attempts += 1;
      if (attempts >= 24) {
        running = false;
        return;
      }
      timer = window.setTimeout(ensureScanner, attempts < 4 ? 120 : 250);
    };

    const startIfNeeded = () => {
      if (running || !scannerHandoffNeeded()) return;
      running = true;
      attempts = 0;
      ensureScanner();
    };

    startIfNeeded();
    const observer = new MutationObserver(startIfNeeded);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
      stop();
    };
  }, []);

  return null;
};

export default VerifiedScannerHandoffPortal;
