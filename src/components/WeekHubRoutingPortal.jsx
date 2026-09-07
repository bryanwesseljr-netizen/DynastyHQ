import { useEffect } from 'react';

const clean = (value) => String(value || '').trim();

const findGameHubNavButton = () => {
  const buttons = [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')];
  const matches = buttons.filter((button) => clean(button.textContent).toUpperCase() === 'GAME HUB');
  return matches.find((button) => button.offsetParent !== null) || matches[0] || null;
};

const openNewGameHub = (attempt = 0) => {
  const button = findGameHubNavButton();
  if (button) {
    button.click();
    return;
  }

  if (attempt < 8) {
    window.setTimeout(() => openNewGameHub(attempt + 1), 60);
  }
};

const WeekHubRoutingPortal = () => {
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    const capture = (event) => {
      const button = event.target?.closest?.('button');
      if (!button?.closest?.('#dynastyhq-command-center')) return;

      const label = clean(button.textContent).toUpperCase();
      const isWeekHubCta = button.classList.contains('dhq-broadcast-secondary')
        && label.includes('VIEW WEEK HUB');

      if (!isWeekHubCta) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      window.setTimeout(() => openNewGameHub(), 0);
    };

    root.addEventListener('click', capture, true);
    return () => root.removeEventListener('click', capture, true);
  }, []);

  return null;
};

export default WeekHubRoutingPortal;
