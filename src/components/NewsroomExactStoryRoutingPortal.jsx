import { useEffect } from 'react';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const clean = (value) => String(value ?? '').trim();

const issueLabel = (issue = {}) => clean(issue.label) || `Season ${issue.season || 1} · Week ${issue.week ?? 0}`;

const allStoryEntries = (career = {}) => (Array.isArray(career.newsroomIssues) ? career.newsroomIssues : [])
  .flatMap((issue) => (Array.isArray(issue?.articles) ? issue.articles : []).map((story) => ({ issue, story })))
  .filter(({ issue, story }) => issue?.id && story && clean(story.headline));

const newestFirst = (left, right) => {
  const seasonDelta = (Number(right.issue?.season) || 0) - (Number(left.issue?.season) || 0);
  if (seasonDelta) return seasonDelta;
  return (Number(right.issue?.week) || 0) - (Number(left.issue?.week) || 0);
};

const setNativeSelectValue = (select, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
  if (setter) setter.call(select, value);
  else select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
};

const NewsroomExactStoryRoutingPortal = () => {
  const { career } = useOwnerCareer();

  useEffect(() => {
    if (!career) return undefined;

    const entries = allStoryEntries(career);
    if (!entries.length) return undefined;

    const handleClickCapture = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest('[data-team-newsroom-hub="true"] button');
      if (!button) return;

      const buttonText = clean(button.textContent);
      if (!buttonText) return;

      let matches = entries
        .filter(({ story }) => buttonText.includes(clean(story.headline)))
        .sort((left, right) => clean(right.story.headline).length - clean(left.story.headline).length || newestFirst(left, right));
      if (!matches.length) return;

      if (matches.length > 1) {
        const issueMatched = matches.filter(({ issue }) => buttonText.includes(issueLabel(issue)));
        if (issueMatched.length) matches = issueMatched;
      }

      const { issue, story } = matches[0];
      const outletId = clean(story.outletId);
      const headline = clean(story.headline);
      if (!issue?.id || !outletId || !headline) return;

      // Stop the Team Hub's legacy delayed headline-click bridge. We will route the
      // exact saved story ourselves using issue + outlet + headline identity.
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      const select = document.querySelector('select[aria-label="Choose weekly newsroom edition"]');
      if (!select) return;

      setNativeSelectValue(select, issue.id);

      let finished = false;
      const tryOpenExactStory = () => {
        if (finished) return true;
        const cards = [...document.querySelectorAll('.dhq-newsroom-story-card')];
        const exact = cards.find((card) => (
          clean(card.dataset.newsroomOutletId) === outletId
          && clean(card.getAttribute('aria-label')).includes(headline)
        ));
        if (!exact) return false;

        finished = true;
        exact.click();
        window.requestAnimationFrame(() => {
          const main = document.querySelector('main[data-active-tab="newsroom"]');
          if (main?.scrollTo) main.scrollTo({ top: 0, left: 0, behavior: 'auto' });
          else window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
        });
        return true;
      };

      // Wait for React to finish rendering the requested edition. Never fall back
      // to merely "the same outlet" because that can open a Regional/National
      // story from a different week before the exact headline is in the DOM.
      [16, 40, 80, 140, 240, 400, 650, 900].forEach((delay) => {
        window.setTimeout(tryOpenExactStory, delay);
      });
    };

    document.addEventListener('click', handleClickCapture, true);
    return () => document.removeEventListener('click', handleClickCapture, true);
  }, [career]);

  return null;
};

export default NewsroomExactStoryRoutingPortal;
