import { useEffect } from 'react';

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim().toUpperCase();

const legacyNavButton = (label) => {
  const matcher = new RegExp(`^${label}$`, 'i');
  const buttons = [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')]
    .filter((button) => matcher.test(String(button.textContent || '').replace(/\s+/g, ' ').trim()));
  return buttons.find((button) => button.offsetParent !== null) || buttons[0] || null;
};

const GameHubCareerHandoffPortal = () => {
  useEffect(() => {
    let handingOff = false;

    const capture = (event) => {
      if (handingOff || !document.body.classList.contains('dhq-game-hub-open')) return;

      const button = event.target?.closest?.('button');
      if (!button) return;

      const insideTopNavigation = button.closest?.(
        '.dhq-primary-nav, #mobile-primary-navigation, .dhq-mobile-broadcast-nav',
      );
      if (!insideTopNavigation) return;

      const label = clean(button.textContent);
      if (label !== 'CAREER' && label !== 'LEGACY') return;

      // Career's capture listener intentionally stops the legacy navigation event.
      // Close Game Hub first with the same underlying Home navigation path Game Hub
      // already trusts, then allow the original Career event to continue normally.
      const homeButton = legacyNavButton('Home');
      if (!homeButton) return;

      handingOff = true;
      try {
        homeButton.click();
      } finally {
        handingOff = false;
      }
    };

    document.addEventListener('click', capture, true);
    return () => document.removeEventListener('click', capture, true);
  }, []);

  return null;
};

export default GameHubCareerHandoffPortal;
