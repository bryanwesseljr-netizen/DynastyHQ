import { useEffect } from 'react';

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

const targetFromLabel = (value) => {
  const label = clean(value);
  if (/^(home|dashboard)$/.test(label)) return 'home';
  if (/^(career|legacy)$/.test(label)) return 'career';
  if (/^(game hub|weekly agenda|log weekly agenda)$/.test(label)) return 'gameHub';
  if (/^(the )?newsroom$/.test(label)) return 'newsroom';
  if (label === 'chronicle') return 'chronicle';
  if (/^(podcast|gridiron grind podcast)$/.test(label)) return 'podcast';
  return '';
};

const targetFromButton = (button) => {
  if (!button) return '';
  if (button.matches?.('.dhq-broadcast-header-logo')) return 'home';

  const fromText = targetFromLabel(button.textContent);
  if (fromText) return fromText;

  const aria = clean(button.getAttribute?.('aria-label'));
  if (aria.includes('career updates')) return 'chronicle';
  if (aria.includes('dashboard')) return 'home';
  return '';
};

const navButtons = () => [...document.querySelectorAll(
  '.dhq-primary-nav button, .dhq-mobile-broadcast-nav button, #mobile-primary-navigation button',
)];

const activeFromDom = () => {
  if (document.body.classList.contains('dhq-career-overview-open')) return 'career';
  if (document.body.classList.contains('dhq-game-hub-open')) return 'gameHub';

  const activeTab = document.querySelector('main.dhq-page-main')?.dataset?.activeTab || 'dashboard';
  if (activeTab === 'trophies') return 'career';
  if (activeTab === 'dataEntry') return 'gameHub';
  if (activeTab === 'dashboard') return 'home';
  if (['newsroom', 'chronicle', 'podcast'].includes(activeTab)) return activeTab;
  return 'home';
};

const applyVisualActive = (target) => {
  if (!target) return;
  document.body.dataset.dhqNavVisualActive = target;
  navButtons().forEach((button) => {
    const buttonTarget = targetFromButton(button);
    button.classList.toggle('dhq-nav-visual-active', buttonTarget === target);
    if (buttonTarget) button.dataset.dhqNavTarget = buttonTarget;
    else delete button.dataset.dhqNavTarget;
  });
};

const NavigationStatePortal = () => {
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    let pendingTarget = '';
    let pendingUntil = 0;
    let releaseTimer = 0;
    let frame = 0;

    const sync = () => {
      const actual = activeFromDom();
      const now = performance.now();

      if (pendingTarget) {
        if (actual === pendingTarget || now >= pendingUntil) {
          pendingTarget = '';
          pendingUntil = 0;
        } else {
          applyVisualActive(pendingTarget);
          return;
        }
      }

      applyVisualActive(actual);
    };

    const scheduleSync = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    };

    const setIntent = (target) => {
      if (!target) return;
      pendingTarget = target;
      pendingUntil = performance.now() + 700;
      applyVisualActive(target);
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(() => {
        pendingTarget = '';
        pendingUntil = 0;
        sync();
      }, 720);
    };

    const captureIntent = (event) => {
      const button = event.target?.closest?.('button');
      if (!button) return;

      const isPrimaryNav = button.closest?.('.dhq-primary-nav, .dhq-mobile-broadcast-nav, #mobile-primary-navigation');
      const isHomeLogo = button.matches?.('.dhq-broadcast-header-logo');
      if (!isPrimaryNav && !isHomeLogo) return;

      const target = targetFromButton(button);
      if (target) setIntent(target);
    };

    document.addEventListener('pointerdown', captureIntent, true);
    document.addEventListener('click', captureIntent, true);

    const bodyObserver = new MutationObserver(scheduleSync);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    const rootObserver = new MutationObserver(scheduleSync);
    rootObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-active-tab', 'aria-current'],
    });

    sync();

    return () => {
      document.removeEventListener('pointerdown', captureIntent, true);
      document.removeEventListener('click', captureIntent, true);
      bodyObserver.disconnect();
      rootObserver.disconnect();
      window.clearTimeout(releaseTimer);
      if (frame) window.cancelAnimationFrame(frame);
      navButtons().forEach((button) => {
        button.classList.remove('dhq-nav-visual-active');
        delete button.dataset.dhqNavTarget;
      });
      delete document.body.dataset.dhqNavVisualActive;
    };
  }, []);

  return null;
};

export default NavigationStatePortal;
