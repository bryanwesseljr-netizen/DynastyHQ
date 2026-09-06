(() => {
  const FALLBACK_FLAG = '__dhqCareerOpponentFallback';

  const installOpponentFallback = () => {
    if (Object.prototype[FALLBACK_FLAG]) return;
    if (!Object.prototype.hasOwnProperty('opponent')) {
      Object.defineProperty(Object.prototype, 'opponent', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: '',
      });
    }
    Object.defineProperty(Object.prototype, FALLBACK_FLAG, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: true,
    });
  };

  const removeOpponentFallback = () => {
    if (!Object.prototype[FALLBACK_FLAG]) return;
    try {
      delete Object.prototype.opponent;
      delete Object.prototype[FALLBACK_FLAG];
    } catch {
      // Compatibility guard only; never block normal navigation on cleanup.
    }
  };

  const isCareerNavButton = (button) => {
    if (!button) return false;
    const nav = button.closest('.dhq-primary-nav, #mobile-primary-navigation');
    if (!nav) return false;
    const label = String(button.textContent || '').trim().toUpperCase();
    return label === 'CAREER' || label === 'LEGACY';
  };

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button');
    if (!button) return;
    if (isCareerNavButton(button)) {
      installOpponentFallback();
      return;
    }

    if (button.closest('.dhq-primary-nav, #mobile-primary-navigation, .dhq-broadcast-header__actions, .dhq-broadcast-header-logo')) {
      window.setTimeout(() => {
        const activeTab = document.querySelector('main.dhq-page-main')?.dataset?.activeTab;
        if (activeTab !== 'trophies') removeOpponentFallback();
      }, 0);
    }
  }, true);

  const observer = new MutationObserver(() => {
    const activeTab = document.querySelector('main.dhq-page-main')?.dataset?.activeTab;
    if (activeTab === 'trophies') installOpponentFallback();
    else removeOpponentFallback();
  });

  const begin = () => {
    const root = document.getElementById('root');
    if (!root) return;
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-active-tab'] });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin, { once: true });
  else begin();
})();
