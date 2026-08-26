import { useEffect } from 'react';
import { resolveIssueTeamMediaProfile } from '../domain/teamMediaProfile';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import '../newsroom-article-polish.css';

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

const NewsroomArticleExperiencePortal = () => {
  const { career } = useOwnerCareer();

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    let scheduled = false;
    let lastStoryKey = '';

    const sync = () => {
      scheduled = false;
      const issueSelect = root.querySelector('select[aria-label="Choose weekly newsroom edition"]');
      const newsroomRoot = issueSelect?.closest('.max-w-6xl');
      if (!newsroomRoot) return;

      const article = newsroomRoot.querySelector('.dhq-news-article');
      readerClasses.forEach((className) => newsroomRoot.classList.remove(className));

      const backButton = [...newsroomRoot.querySelectorAll('button')]
        .find((button) => /back to all articles/i.test(clean(button.textContent)));
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

    const handleDocumentClick = (event) => {
      const button = event.target instanceof Element ? event.target.closest('header button') : null;
      if (!button || clean(button.textContent) !== 'The Newsroom') return;

      // Clicking The Newsroom always means the current program's Team News home,
      // even when the user is already inside a Regional or National article.
      window.setTimeout(() => {
        const backButton = [...root.querySelectorAll('button')]
          .find((candidate) => /back to all articles/i.test(clean(candidate.textContent)));
        backButton?.click();
        window.setTimeout(() => {
          const teamButton = [...root.querySelectorAll('nav[aria-label="Newsroom desks"] button')]
            .find((candidate) => /team news/i.test(clean(candidate.textContent)));
          teamButton?.click();
          scrollNewsroomTop();
        }, 0);
      }, 0);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-audience'] });
    document.addEventListener('click', handleDocumentClick);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [career]);

  return null;
};

export default NewsroomArticleExperiencePortal;
