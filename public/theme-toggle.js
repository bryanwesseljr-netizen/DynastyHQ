(() => {
  const STORAGE_KEY = 'dynastyhq.appearance';
  const root = document.documentElement;
  const THEME_META = 'meta[name="theme-color"]';
  const validTheme = (value) => value === 'light' || value === 'dark';

  const readStoredTheme = () => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return validTheme(stored) ? stored : null;
    } catch {
      return null;
    }
  };

  const persistTheme = (theme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Appearance still works for this page even when storage is unavailable.
    }
  };

  const sunIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
      <circle cx="12" cy="12" r="3.5"></circle>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
    </svg>`;

  const moonIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.5 14.2A8 8 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"></path>
    </svg>`;

  const syncButton = () => {
    const button = document.getElementById('dhq-theme-toggle');
    if (!button) return;
    const theme = root.dataset.dhqTheme === 'light' ? 'light' : 'dark';
    const next = theme === 'dark' ? 'light' : 'dark';
    button.innerHTML = next === 'light' ? sunIcon : moonIcon;
    button.setAttribute('aria-label', `Switch to ${next} mode`);
    button.setAttribute('title', `Switch to ${next} mode`);
    button.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
  };

  const applyTheme = (theme, { persist = false } = {}) => {
    const resolved = validTheme(theme) ? theme : 'dark';
    root.dataset.dhqTheme = resolved;
    root.style.colorScheme = resolved;
    const meta = document.querySelector(THEME_META);
    if (meta) meta.setAttribute('content', resolved === 'light' ? '#f8fafc' : '#02070b');
    if (persist) persistTheme(resolved);
    syncButton();
  };

  // Preserve DynastyHQ's existing dark look until the visitor explicitly changes it.
  applyTheme(readStoredTheme() || 'dark');

  const ensureToggle = () => {
    const appHeader = document.querySelector('#root header.no-print');
    let host = document.getElementById('dhq-theme-toggle-host');

    if (!appHeader) {
      if (host) host.hidden = true;
      return;
    }

    if (!host) {
      host = document.createElement('div');
      host.id = 'dhq-theme-toggle-host';

      const button = document.createElement('button');
      button.id = 'dhq-theme-toggle';
      button.type = 'button';
      button.addEventListener('click', () => {
        const current = root.dataset.dhqTheme === 'light' ? 'light' : 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark', { persist: true });
      });

      host.appendChild(button);
      document.body.appendChild(host);
    }

    host.hidden = false;
    syncButton();
  };

  let queued = false;
  const scheduleToggleCheck = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      ensureToggle();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureToggle, { once: true });
  } else {
    ensureToggle();
  }

  const observer = new MutationObserver(scheduleToggleCheck);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
