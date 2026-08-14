(() => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  let articleFirstPending = true;
  let overviewRequested = false;
  let applying = false;

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

    if (label === 'the newsroom') {
      overviewRequested = false;
      articleFirstPending = true;
      setTimeout(apply, 0);
      return;
    }

    if (label.includes('back to all articles')) {
      overviewRequested = true;
      articleFirstPending = false;
      return;
    }
  }, true);

  document.addEventListener('change', (event) => {
    const select = event.target?.closest?.('select[aria-label="Choose weekly newsroom edition"]');
    if (!select) return;
    overviewRequested = false;
    articleFirstPending = true;
    setTimeout(apply, 0);
  }, true);

  new MutationObserver(apply).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  apply();
})();
