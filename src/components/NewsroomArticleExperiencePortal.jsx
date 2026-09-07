import { useEffect, useRef } from 'react';
import { resolveIssueTeamMediaProfile } from '../domain/teamMediaProfile';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import '../newsroom-article-polish.css';
import '../newsroom-local-classic-restore.css';
import '../newsroom-reader-shell-v2.css';
import '../team-newsroom-refinements.css';

const clean = (value) => String(value ?? '').trim();

const scrollNewsroomTop = () => {
  const main = document.querySelector('main[data-active-tab="newsroom"]');
  if (main?.scrollTo) {
    main.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    return;
  }
  window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
};

const readerClasses = [
  'dhq-newsroom-reader-mode',
  'dhq-newsroom-reader-local',
  'dhq-newsroom-reader-regional',
  'dhq-newsroom-reader-national',
];

const findBackButton = (root) => [...root.querySelectorAll('button')]
  .find((button) => /back to all articles/i.test(clean(button.textContent)));

const findTeamNewsButton = (root) => [...root.querySelectorAll('nav[aria-label="Newsroom desks"] button')]
  .find((button) => /team news/i.test(clean(button.textContent)));

const NewsroomArticleExperiencePortal = () => {
  const { career } = useOwnerCareer();
  const careerRef = useRef(career);

  useEffect(() => {
    careerRef.current = career;
  }, [career]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    let scheduled = false;
    let lastStoryKey = '';
    let homeResetGeneration = 0;
    let wasNewsroomActive = false;

    const cancelHomeReset = () => {
      homeResetGeneration += 1;
    };

    const forceNewsroomHome = () => {
      const generation = ++homeResetGeneration;
      const delays = [0, 40, 120, 240, 450, 750, 1100, 1600, 2200, 3000];
      let hasScrolledForThisNavigation = false;

      const scrollOnce = () => {
        if (hasScrolledForThisNavigation) return;
        hasScrolledForThisNavigation = true;
        scrollNewsroomTop();
      };

      delays.forEach((delay) => {
        window.setTimeout(() => {
          if (generation !== homeResetGeneration) return;

          const backButton = findBackButton(root);
          if (backButton) {
            backButton.click();
            scrollOnce();
            return;
          }

          const teamButton = findTeamNewsButton(root);
          if (!teamButton) return;

          // Once the all-articles home exists, one Team News selection is enough.
          // Scroll only when the destination is actually ready. The old behavior
          // scrolled on every retry timer, which fought normal mobile swipes while
          // lazy Newsroom content was still mounting.
          if (teamButton.getAttribute('data-active') !== 'true') teamButton.click();
          scrollOnce();
          if (generation === homeResetGeneration) homeResetGeneration += 1;
        }, delay);
      });
    };

    const sync = () => {
      scheduled = false;
      const newsroomNavButton = [...root.querySelectorAll('header button')]
        .find((button) => /^the newsroom$/i.test(clean(button.textContent)));
      const newsroomActive = newsroomNavButton?.getAttribute('aria-current') === 'page';

      // A fresh navigation into The Newsroom always means the team/all-articles home.
      // This catches first-login lazy mounts as well as normal tab changes.
      if (newsroomActive && !wasNewsroomActive) forceNewsroomHome();
      wasNewsroomActive = newsroomActive;

      const main = root.querySelector('main[data-active-tab="newsroom"]');
      const issueSelect = root.querySelector('select[aria-label="Choose weekly newsroom edition"]');
      const newsroomRoot = issueSelect?.closest('.max-w-6xl');

      if (!newsroomRoot) {
        main?.classList.remove('dhq-newsroom-article-main');
        return;
      }

      const article = newsroomRoot.querySelector('.dhq-news-article');
      readerClasses.forEach((className) => newsroomRoot.classList.remove(className));
      main?.classList.toggle('dhq-newsroom-article-main', Boolean(article));

      const backButton = findBackButton(newsroomRoot);
      const readerTabs = newsroomRoot.querySelector('nav[aria-label="Weekly newsroom articles"]');
      backButton?.classList.add('dhq-newsroom-back-button');
      readerTabs?.classList.add('dhq-newsroom-reader-tabs');

      if (!article) {
        lastStoryKey = '';
        return;
      }

      const audience = clean(article.dataset.audience).toLowerCase();
      newsroomRoot.classList.add('dhq-newsroom-reader-mode');
      if (audience === 'local') newsroomRoot.classList.add('dhq-newsroom-reader-local');
      else if (audience === 'regional') newsroomRoot.classList.add('dhq-newsroom-reader-regional');
      else if (audience === 'national' || audience === 'national-lead') newsroomRoot.classList.add('dhq-newsroom-reader-national');

      const currentCareer = careerRef.current;
      const selectedIssue = (currentCareer?.newsroomIssues || []).find((issue) => issue.id === issueSelect?.value)
        || (currentCareer?.newsroomIssues || []).find((issue) => issue.publicationId === issueSelect?.value);
      if (selectedIssue) {
        const profile = resolveIssueTeamMediaProfile(selectedIssue, currentCareer);
        const primary = profile.primary || '#e00122';
        const secondary = profile.secondary || '#050505';
        const accent = profile.accent || '#ffffff';
        newsroomRoot.style.setProperty('--article-team-primary', primary);
        newsroomRoot.style.setProperty('--article-team-secondary', secondary);
        newsroomRoot.style.setProperty('--article-team-accent', accent);
        article.style.setProperty('--article-team-primary', primary);
        article.style.setProperty('--article-team-secondary', secondary);
        article.style.setProperty('--article-team-accent', accent);
      }

      // Keep every owner-only article production surface backstage by default.
      const director = newsroomRoot.querySelector('[data-editorial-photo-director]');
      if (director) {
        director.classList.add('dhq-newsroom-director-backstage');
        if (!director.dataset.open) director.dataset.open = 'false';
      }
      const mediaTools = newsroomRoot.querySelector('.dhq-newsroom-media-tools');
      if (mediaTools) {
        mediaTools.classList.add('dhq-newsroom-native-media-backstage');
        if (!mediaTools.dataset.open) mediaTools.dataset.open = 'false';
        if (mediaTools.dataset.open !== 'true' && mediaTools.open) mediaTools.open = false;
      }

      const headline = clean(article.querySelector('h1')?.textContent);
      const storyKey = `${issueSelect?.value || ''}:${audience}:${headline}`;
      if (storyKey && storyKey !== lastStoryKey) {
        lastStoryKey = storyKey;
        window.requestAnimationFrame(scrollNewsroomTop);
      }
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };

    const isNewsroomTopNavButton = (event) => {
      const button = event.target instanceof Element ? event.target.closest('header button') : null;
      return Boolean(button && /^the newsroom$/i.test(clean(button.textContent)));
    };

    const isNewsroomDeskButton = (event) => {
      const button = event.target instanceof Element
        ? event.target.closest('nav[aria-label="Newsroom desks"] button')
        : null;
      return Boolean(button);
    };

    const handleNewsroomPointerDown = (event) => {
      if (isNewsroomDeskButton(event)) {
        // Explicit desk navigation always wins over any refresh/login home-reset timers.
        cancelHomeReset();
        return;
      }
      if (!isNewsroomTopNavButton(event)) return;
      forceNewsroomHome();
    };

    const handleNewsroomClick = (event) => {
      if (isNewsroomDeskButton(event)) {
        cancelHomeReset();
        return;
      }
      if (!isNewsroomTopNavButton(event)) return;
      forceNewsroomHome();
    };

    const handleUserScrollIntent = () => {
      const main = root.querySelector('main[data-active-tab="newsroom"]');
      if (main) cancelHomeReset();
    };

    const handleScrollKey = (event) => {
      if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) return;
      handleUserScrollIntent();
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-audience', 'aria-current'],
    });
    document.addEventListener('pointerdown', handleNewsroomPointerDown, true);
    document.addEventListener('click', handleNewsroomClick, true);
    document.addEventListener('wheel', handleUserScrollIntent, { capture: true, passive: true });
    document.addEventListener('touchmove', handleUserScrollIntent, { capture: true, passive: true });
    document.addEventListener('keydown', handleScrollKey, true);

    return () => {
      cancelHomeReset();
      observer.disconnect();
      document.removeEventListener('pointerdown', handleNewsroomPointerDown, true);
      document.removeEventListener('click', handleNewsroomClick, true);
      document.removeEventListener('wheel', handleUserScrollIntent, true);
      document.removeEventListener('touchmove', handleUserScrollIntent, true);
      document.removeEventListener('keydown', handleScrollKey, true);
      root.querySelector('main')?.classList.remove('dhq-newsroom-article-main');
    };
  }, []);

  return null;
};

export default NewsroomArticleExperiencePortal;
