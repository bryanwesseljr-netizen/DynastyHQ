import { useEffect } from 'react';
import { resolveIssueTeamMediaProfile } from '../domain/teamMediaProfile';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import '../newsroom-article-polish.css';
import '../newsroom-reader-shell-v2.css';

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

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    let scheduled = false;
    let lastStoryKey = '';
    let homeResetGeneration = 0;

    const sync = () => {
      scheduled = false;
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

      const selectedIssue = (career?.newsroomIssues || []).find((issue) => issue.id === issueSelect?.value)
        || (career?.newsroomIssues || []).find((issue) => issue.publicationId === issueSelect?.value);
      if (selectedIssue) {
        const profile = resolveIssueTeamMediaProfile(selectedIssue, career);
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

    const forceNewsroomHome = () => {
      const generation = ++homeResetGeneration;
      const resetAt = (delay) => window.setTimeout(() => {
        if (generation !== homeResetGeneration) return;

        const backButton = findBackButton(root);
        if (backButton) {
          backButton.click();
          return;
        }

        const teamButton = findTeamNewsButton(root);
        teamButton?.click();
        scrollNewsroomTop();
      }, delay);

      // React can finish the top-nav state change after the native pointer/click event,
      // so retry through the next few paint windows instead of trusting one timeout.
      resetAt(0);
      resetAt(50);
      resetAt(140);
      resetAt(280);
    };

    const isNewsroomTopNavButton = (event) => {
      const button = event.target instanceof Element ? event.target.closest('header button') : null;
      return Boolean(button && /^the newsroom$/i.test(clean(button.textContent)));
    };

    const handleNewsroomPointerDown = (event) => {
      if (!isNewsroomTopNavButton(event)) return;
      forceNewsroomHome();
    };

    const handleNewsroomClick = (event) => {
      if (!isNewsroomTopNavButton(event)) return;
      forceNewsroomHome();
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-audience'] });
    document.addEventListener('pointerdown', handleNewsroomPointerDown, true);
    document.addEventListener('click', handleNewsroomClick, true);

    return () => {
      homeResetGeneration += 1;
      observer.disconnect();
      document.removeEventListener('pointerdown', handleNewsroomPointerDown, true);
      document.removeEventListener('click', handleNewsroomClick, true);
      root.querySelector('main')?.classList.remove('dhq-newsroom-article-main');
    };
  }, [career]);

  return null;
};

export default NewsroomArticleExperiencePortal;
