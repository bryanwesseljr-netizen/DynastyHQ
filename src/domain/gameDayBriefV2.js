import { buildGameDayBrief as buildBaseGameDayBrief } from './gameDayBrief.js';
import { buildStorylineEngine } from './storylineEngine.js';

export const buildGameDayBrief = (state = {}) => {
  const base = buildBaseGameDayBrief(state);
  const storyline = buildStorylineEngine(state, {
    season: base.season,
    week: base.week,
    opponent: base.opponent,
    phase: 'pregame',
  });

  const storylines = storyline.activeThreads
    .filter((thread) => thread.editorialUse !== 'background-only' || thread.priority >= 7)
    .slice(0, 4)
    .map((thread) => ({
      label: thread.label,
      title: thread.title,
      detail: thread.detail,
      key: thread.key,
      status: thread.status,
      changedThisWeek: thread.changedThisWeek,
    }));

  return {
    ...base,
    previous: storyline.previous?.copy ? {
      ...base.previous,
      title: storyline.previous.title || base.previous.title,
      copy: storyline.previous.copy,
    } : base.previous,
    storylines: storylines.length ? storylines : base.storylines,
    storyline,
  };
};
