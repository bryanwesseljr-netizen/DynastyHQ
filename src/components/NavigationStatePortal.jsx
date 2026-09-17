import { useEffect } from 'react';

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

const targetFromLabel = (value) => {
  const label = clean(value);
  if (/^(home|dashboard)$/.test(label)) return 'home';
  if (/^(career|legacy)$/.test(label)) return 'career';
  if (/^(game hub|weekly agenda|log weekly agenda)$/.test(label)) return 'gameHub';
  if (/^(offseason|offseason war room)$/.test(label)) return 'offseason';
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
  // Portals render outside the normal page route. If one is visibly mounted,
  // it is the authoritative destination even if the underlying app briefly
  // reports dashboard/Home while the portal handoff is settling.
  if (document.querySelector('.dhq-career-overview')) return 'career';
  if (document.querySelector('.dhq-game-hub')) return 'gameHub';
  if (document.body.classList.contains('dhq-player-offseason-open')) return 'offseason';
  if (document.body.classList.contains('dhq-career-overview-open')) return 'career';
  if (document.body.classList.contains('dhq-game-hub-open')) return 'gameHub';

  const activeTab = document.querySelector('main.dhq-page-main')?.dataset?.activeTab || 'dashboard';
  if (activeTab === 'trophies') return 'career';
  if (activeTab === 'dataEntry') return 'gameHub';
  if (activeTab === 'offseason') return 'offseason';
  if (activeTab === 'dashboard') return 'home';
  if (['newsroom', 'chronicle', 'podcast'].includes(activeTab)) return activeTab;
  return 'home';
};

const hardResetButtonVisuals = (button, active) => {
  if (!button) return;

  button.style.setProperty('background', 'transparent', 'important');
  button.style.setProperty('background-color', 'transparent', 'important');
  button.style.setProperty('background-image', 'none', 'important');
  button.style.setProperty('border-color', 'transparent', 'important');
  button.style.setProperty('text-shadow', 'none', 'important');
  button.style.setProperty('transform', 'none', 'important');
  button.style.setProperty('filter', 'none', 'important');
  button.style.setProperty('-webkit-tap-highlight-color', 'transparent', 'important');
  button.style.setProperty('color', active ? '#f7faf8' : '#a9b3ad', 'important');
  button.style.setProperty(
    'box-shadow',
    active ? 'inset 0 -3px 0 var(--dhq-program-highlight)' : 'none',
    'important',
  );

  [...button.children].forEach((child) => {
    if (!(child instanceof HTMLElement) || child.tagName !== 'SPAN') return;
    child.style.setProperty('background', 'transparent', 'important');
    child.style.setProperty('background-color', 'transparent', 'important');
    child.style.setProperty('background-image', 'none', 'important');
    child.style.setProperty('box-shadow', 'none', 'important');
    child.style.setProperty('text-shadow', 'none', 'important');
    child.style.setProperty('color', 'inherit', 'important');
    child.style.setProperty('transform', 'none', 'important');

    if (child.classList.contains('absolute')) {
      child.style.setProperty('display', 'none', 'important');
      child.style.setProperty('opacity', '0', 'important');
    } else {
      child.style.removeProperty('display');
      child.style.setProperty('opacity', '1', 'important');
    }
  });
};

const applyVisualActive = (target) => {
  if (!target) return;
  document.body.dataset.dhqNavVisualActive = target;

  navButtons().forEach((button) => {
    const buttonTarget = targetFromButton(button);
    const active = buttonTarget === target;
    button.classList.toggle('dhq-nav-visual-active', active);
    if (buttonTarget) button.dataset.dhqNavTarget = buttonTarget;
    else delete button.dataset.dhqNavTarget;
    hardResetButtonVisuals(button, active);
  });
};

const NavigationStatePortal = () => {
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    const resetStyle = document.createElement('style');
    resetStyle.id = 'dhq-navigation-hard-reset';
    resetStyle.textContent = `
      html body[data-dhq-team-accent="true"] #root .dhq-broadcast-header .dhq-primary-nav .dhq-primary-nav-item,
      html body[data-dhq-team-accent="true"] #root .dhq-broadcast-header .dhq-primary-nav .dhq-primary-nav-item:hover,
      html body[data-dhq-team-accent="true"] #root .dhq-broadcast-header .dhq-primary-nav .dhq-primary-nav-item:focus,
      html body[data-dhq-team-accent="true"] #root .dhq-broadcast-header .dhq-primary-nav .dhq-primary-nav-item:active {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
        transform: none !important;
      }

      html body[data-dhq-team-accent="true"] #root .dhq-broadcast-header .dhq-primary-nav .dhq-primary-nav-item > span {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }

      html body[data-dhq-team-accent="true"] #root .dhq-broadcast-header .dhq-primary-nav .dhq-primary-nav-item > span.absolute {
        display: none !important;
        opacity: 0 !important;
      }

      html body[data-dhq-team-accent="true"] #root .dhq-broadcast-header .dhq-primary-nav .dhq-primary-nav-item::before,
      html body[data-dhq-team-accent="true"] #root .dhq-broadcast-header .dhq-primary-nav .dhq-primary-nav-item::after,
      html body[data-dhq-team-accent="true"] #root .dhq-mobile-broadcast-nav button::before,
      html body[data-dhq-team-accent="true"] #root .dhq-mobile-broadcast-nav button::after {
        display: none !important;
        content: none !important;
        background: transparent !important;
        box-shadow: none !important;
      }
    `;
    document.getElementById(resetStyle.id)?.remove();
    document.head.appendChild(resetStyle);

    let pendingTarget = '';
    let pendingStartedAt = 0;
    let pendingUntil = 0;
    let pendingStableSince = 0;
    let releaseTimer = 0;
    let frame = 0;

    const minimumIntentHold = 360;
    const stableTargetWindow = 180;
    const intentTimeout = 1400;

    const clearPending = () => {
      pendingTarget = '';
      pendingStartedAt = 0;
      pendingUntil = 0;
      pendingStableSince = 0;
    };

    const sync = () => {
      const actual = activeFromDom();
      const now = performance.now();

      if (pendingTarget) {
        if (actual === pendingTarget) {
          if (!pendingStableSince) pendingStableSince = now;

          const heldLongEnough = now - pendingStartedAt >= minimumIntentHold;
          const stableLongEnough = now - pendingStableSince >= stableTargetWindow;

          if (heldLongEnough && stableLongEnough) {
            clearPending();
            applyVisualActive(actual);
            return;
          }

          applyVisualActive(pendingTarget);
          return;
        }

        // Any transient route (especially dashboard/Home while opening a portal)
        // must not visually steal the active state from the user's destination.
        pendingStableSince = 0;
        if (now < pendingUntil) {
          applyVisualActive(pendingTarget);
          return;
        }

        clearPending();
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
      const now = performance.now();
      pendingTarget = target;
      pendingStartedAt = now;
      pendingUntil = now + intentTimeout;
      pendingStableSince = 0;
      applyVisualActive(target);

      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(() => {
        sync();
      }, intentTimeout + 20);
    };

    const captureIntent = (event) => {
      const button = event.target?.closest?.('button');
      if (!button) return;

      const isPrimaryNav = button.closest?.('.dhq-primary-nav, .dhq-mobile-broadcast-nav, #mobile-primary-navigation');
      const isHomeLogo = button.matches?.('.dhq-broadcast-header-logo');
      if (!isPrimaryNav && !isHomeLogo) return;

      const target = targetFromButton(button);
      if (!target) return;

      setIntent(target);
      if (event.type === 'pointerdown' || event.type === 'touchstart') {
        window.requestAnimationFrame(() => button.blur?.());
      }
    };

    document.addEventListener('touchstart', captureIntent, { capture: true, passive: true });
    document.addEventListener('pointerdown', captureIntent, true);
    document.addEventListener('click', captureIntent, true);

    // Observe both body classes and portal insertion/removal. Career, Game Hub,
    // and the player Offseason experience render as portals, outside the normal
    // app route, so their visible portal state is authoritative.
    const bodyObserver = new MutationObserver(scheduleSync);
    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    const rootObserver = new MutationObserver(scheduleSync);
    rootObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-active-tab', 'aria-current', 'class'],
    });

    sync();

    return () => {
      document.removeEventListener('touchstart', captureIntent, true);
      document.removeEventListener('pointerdown', captureIntent, true);
      document.removeEventListener('click', captureIntent, true);
      bodyObserver.disconnect();
      rootObserver.disconnect();
      window.clearTimeout(releaseTimer);
      if (frame) window.cancelAnimationFrame(frame);
      resetStyle.remove();
      navButtons().forEach((button) => {
        button.classList.remove('dhq-nav-visual-active');
        delete button.dataset.dhqNavTarget;
        button.removeAttribute('style');
        [...button.children].forEach((child) => {
          if (child instanceof HTMLElement && child.tagName === 'SPAN') child.removeAttribute('style');
        });
      });
      delete document.body.dataset.dhqNavVisualActive;
    };
  }, []);

  return null;
};

export default NavigationStatePortal;
