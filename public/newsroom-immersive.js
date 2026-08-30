(() => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  let articleFirstPending = true;
  let overviewRequested = false;
  let applying = false;
  let utilityClosePending = false;

  const installStyles = () => {
    if (document.getElementById('dhq-newsroom-immersive-styles')) return;
    const style = document.createElement('style');
    style.id = 'dhq-newsroom-immersive-styles';
    style.textContent = `
      main[data-active-tab="newsroom"] .dhq-newsroom-library-compact {
        border-color: rgba(51, 65, 85, 0.72) !important;
        background: rgba(2, 6, 23, 0.86) !important;
        box-shadow: 0 12px 30px rgba(2, 6, 23, 0.2) !important;
      }

      main[data-active-tab="newsroom"] .dhq-newsroom-library-compact > div:first-child {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 10px 16px !important;
      }

      main[data-active-tab="newsroom"] .dhq-newsroom-library-compact > div:first-child > p:first-child,
      main[data-active-tab="newsroom"] .dhq-newsroom-library-compact > div:first-child > p:last-child {
        display: none !important;
      }

      main[data-active-tab="newsroom"] .dhq-newsroom-library-compact > div:first-child > h2 {
        margin: 0 !important;
        font-size: 12px !important;
        line-height: 1 !important;
        letter-spacing: 0.12em !important;
      }

      main[data-active-tab="newsroom"] .dhq-newsroom-library-compact > section {
        border-top: 1px solid rgba(51, 65, 85, 0.55) !important;
        padding: 10px 16px !important;
      }

      main[data-active-tab="newsroom"] .dhq-newsroom-library-compact > section > p:not(.text-blue-300) {
        display: none !important;
      }

      main[data-active-tab="newsroom"] .dhq-newsroom-library-compact > section > div:first-of-type {
        gap: 8px !important;
      }

      main[data-active-tab="newsroom"] .dhq-newsroom-library-compact button {
        min-height: 34px;
      }

      main[data-active-tab="newsroom"] .dhq-newsroom-tools-open > .dhq-newsroom-owner-controls,
      main[data-active-tab="newsroom"] .dhq-newsroom-library-open > .dhq-newsroom-owner-library {
        margin-top: 8px !important;
        margin-bottom: 0 !important;
      }

      @media (max-width: 640px) {
        main[data-active-tab="newsroom"] .dhq-newsroom-library-compact > div:first-child {
          padding: 9px 12px !important;
        }

        main[data-active-tab="newsroom"] .dhq-newsroom-library-compact > section {
          padding: 9px 12px !important;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const newsroomMain = () => document.querySelector('main[data-active-tab="newsroom"]');

  const compactPhotoLibrary = (main) => {
    const libraryHeading = [...main.querySelectorAll('h2')]
      .find((node) => normalize(node.textContent) === 'career photo library');
    const librarySection = libraryHeading?.closest('section');
    if (!librarySection) return;

    librarySection.classList.add('dhq-newsroom-library-compact');

    const expandedLocker = [...librarySection.querySelectorAll('p')]
      .some((node) => normalize(node.textContent) === 'career photo library & ai references');
    if (!expandedLocker) return;

    const toggle = [...librarySection.querySelectorAll('button')]
      .find((button) => normalize(button.textContent).startsWith('photo library ('));
    if (toggle && !toggle.dataset.dhqCompactCollapsed) {
      toggle.dataset.dhqCompactCollapsed = 'true';
      toggle.click();
    }
  };

  const openLatestArticle = (main) => {
    if (!articleFirstPending || overviewRequested) return;
    const storyCard = main.querySelector('.dhq-newsroom-story-card');
    if (!storyCard) return;
    articleFirstPending = false;
    storyCard.click();
  };

  const apply = () => {
    if (applying) return;
    applying = true;
    requestAnimationFrame(() => {
      installStyles();
      const main = newsroomMain();
      if (main) {
        compactPhotoLibrary(main);
        openLatestArticle(main);
      }
      applying = false;
    });
  };

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button');
    if (!button) return;
    const label = normalize(button.textContent);

    if (label === 'newsroom controls' || label === 'media library') {
      if (utilityClosePending) {
        utilityClosePending = false;
        return;
      }

      const main = newsroomMain();
      const otherLabel = label === 'newsroom controls' ? 'media library' : 'newsroom controls';
      const otherButton = [...(main?.querySelectorAll('.dhq-team-newsroom__owner-tools button') || [])]
        .find((candidate) => normalize(candidate.textContent) === otherLabel);

      if (otherButton?.dataset.active === 'true') {
        utilityClosePending = true;
        setTimeout(() => otherButton.click(), 0);
      }
      setTimeout(apply, 0);
      return;
    }

    if (label === 'the newsroom') {
      overviewRequested = false;
      articleFirstPending = true;
      setTimeout(apply, 0);
      return;
    }

    if (label.includes('back to all articles')) {
      overviewRequested = true;
      articleFirstPending = false;
    }
  }, true);

  document.addEventListener('change', (event) => {
    const select = event.target?.closest?.('select[aria-label="Choose weekly newsroom edition"]');
    if (!select) return;
    overviewRequested = false;
    articleFirstPending = true;
    setTimeout(apply, 0);
  }, true);

  const appRoot = document.getElementById('root');
  if (appRoot) {
    new MutationObserver(apply).observe(appRoot, {
      childList: true,
      subtree: true,
    });
  }

  apply();
})();
