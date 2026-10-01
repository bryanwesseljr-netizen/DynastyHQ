import { useEffect, useMemo } from 'react';
import { buildCareerStorySurface } from '../domain/careerStorySurface.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const clean = (value) => String(value ?? '').trim();

const setText = (node, value) => {
  if (!node || !value) return;
  if (clean(node.textContent) !== clean(value)) node.textContent = value;
};

const CareerStoryExperiencePortal = () => {
  const { career } = useOwnerCareer();
  const model = useMemo(() => career ? buildCareerStorySurface(career) : null, [career]);

  useEffect(() => {
    if (!model) return undefined;
    let scheduled = false;

    const sync = () => {
      scheduled = false;
      const focus = document.querySelector('#dynastyhq-command-center .dhq-v3-focus');
      if (!focus) return;

      setText(focus.querySelector('.dhq-v3-focus__header h2'), model.headline);
      setText(focus.querySelector('.dhq-v3-focus__header > p'), model.summary);

      const roleCard = focus.querySelector('.dhq-v3-focus-card--role');
      const seasonCard = focus.querySelector('.dhq-v3-focus-card--season');
      if (roleCard) {
        setText(roleCard.querySelector('strong'), model.role.title);
        setText(roleCard.querySelector('small'), model.role.detail);
      }
      if (seasonCard) {
        setText(seasonCard.querySelector('strong'), model.seasonCard.title);
        setText(seasonCard.querySelector('small'), model.seasonCard.detail);
      }

      const story = focus.querySelector('.dhq-v3-story-feature');
      if (story) {
        setText(story.querySelector('strong'), model.story.title);
        setText(story.querySelector('p'), model.story.detail);
      }
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.getElementById('dynastyhq-command-center') || document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [model]);

  return null;
};

export default CareerStoryExperiencePortal;
