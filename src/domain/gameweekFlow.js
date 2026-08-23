import { buildProgramCoverageContext } from './programCoverage.js';
import { createWeekKey } from './weeklyEngine.js';

const finite = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const publicationMatches = (entry, publicationId, season, week) => (
  entry?.publicationId === publicationId
  || entry?.id === publicationId
  || entry?.weekKey === publicationId
  || (finite(entry?.season, 1) === season && finite(entry?.week, 0) === week)
);

const sortedPublishedWeeks = (state = {}) => [...(state.weeklyUpdates || [])]
  .filter((entry) => Number.isFinite(Number(entry?.week)))
  .sort((a, b) => {
    const seasonDelta = finite(a?.season, 1) - finite(b?.season, 1);
    return seasonDelta || finite(a?.week, 0) - finite(b?.week, 0);
  });

const finalizationFor = (state = {}, publicationId = '') => {
  const collection = state.weekFinalizations || {};
  if (Array.isArray(collection)) {
    return collection.find((entry) => entry?.publicationId === publicationId) || null;
  }
  return collection?.[publicationId] || null;
};

const chronicleExists = (state, publicationId, season, week) => (
  (state.careerChronicle || []).some((entry) => publicationMatches(entry, publicationId, season, week))
);

const collegeCoverageFor = (state, issue) => {
  if (!issue || !(state.player?.isCommitted || state.player?.college)) return null;
  try {
    return buildProgramCoverageContext(state, issue);
  } catch {
    return null;
  }
};

const articleGenerated = (issue = {}) => (
  issue.editorialStatus === 'generated'
  || (issue.articles || []).some((article) => article?.editorialStatus === 'generated')
);

const podcastGenerated = (episode = {}) => (
  episode?.status === 'scripted'
  || episode?.status === 'ready'
  || (episode?.segments || []).length >= 10
);

const setupForActiveWeek = (state = {}) => {
  const season = finite(state.currentSeason, 1);
  const week = Math.max(0, finite(state.currentWeek, 1));
  const setup = state.currentWeekSetup || {};
  const setupMatches = finite(setup.week, -1) === week
    && ['game', 'bye'].includes(String(setup.type || '').toLowerCase());
  return {
    season,
    week,
    publicationId: createWeekKey(season, week),
    configured: setupMatches,
    label: setup.label || setup.customLabel || `Week ${week}`,
    type: String(setup.type || 'game').toLowerCase(),
    phase: String(setup.phase || (week === 0 ? 'preseason' : 'regular')).toLowerCase(),
  };
};

const latestWrapUpWeek = (state = {}) => {
  const latest = sortedPublishedWeeks(state).at(-1);
  if (!latest) return null;
  const season = finite(latest.season, 1);
  const week = Math.max(0, finite(latest.week, 0));
  const currentSeason = finite(state.currentSeason, 1);
  const currentWeek = Math.max(0, finite(state.currentWeek, 1));
  const publicationId = latest.publicationId || latest.weekKey || latest.id || createWeekKey(season, week);
  const closeEnoughToCurrent = season === currentSeason && currentWeek <= week + 1;
  if (!closeEnoughToCurrent) return null;
  return { entry: latest, season, week, publicationId, label: latest.label || latest.weekLabel || `Week ${week}` };
};

const statusStep = ({ id, label, state, detail, action = '', target = '', optional = false }) => ({
  id, label, state, detail, action, target, optional,
});

export const buildGameweekFlow = (state = {}) => {
  const activeWeek = setupForActiveWeek(state);
  const wrapUp = latestWrapUpWeek(state);
  const finalized = wrapUp ? finalizationFor(state, wrapUp.publicationId) : null;

  if (!wrapUp || finalized) {
    const setupStep = statusStep({
      id: 'setup',
      label: 'Week Setup',
      state: activeWeek.configured ? 'complete' : 'pending',
      detail: activeWeek.configured ? `${activeWeek.label} is configured.` : `Set the identity for Week ${activeWeek.week}.`,
      action: activeWeek.configured ? 'Open Weekly Agenda' : 'Set Up Week',
      target: 'agenda',
    });
    const waitingStep = statusStep({
      id: 'logged',
      label: 'Week Logged',
      state: 'pending',
      detail: activeWeek.configured ? 'Play the week, then upload and publish the verified result.' : 'Available after Week Setup.',
      action: activeWeek.configured ? 'Open Weekly Agenda' : '',
      target: activeWeek.configured ? 'agenda' : '',
    });
    const idle = [
      statusStep({ id: 'newsroom', label: 'Newsroom', state: 'waiting', detail: 'Evaluated after the week is published.' }),
      statusStep({ id: 'podcast', label: 'Podcast', state: 'waiting', detail: 'Only required when the week earns a show.' }),
      statusStep({ id: 'finalize', label: 'Finalize', state: 'waiting', detail: 'Available after the published week is wrapped.' }),
    ];
    const next = activeWeek.configured
      ? { label: 'Play + Log Week', target: 'agenda', detail: `Week ${activeWeek.week} is ready for verified postgame data.` }
      : { label: 'Set Up Week', target: 'agenda', detail: `Start by defining Week ${activeWeek.week}.` };
    return {
      mode: 'active-week', activeWeek, wrapUp: null, finalized: null,
      steps: [setupStep, waitingStep, ...idle],
      completedRequired: setupStep.state === 'complete' ? 1 : 0,
      requiredCount: 5,
      canFinalize: false,
      nextAction: next,
    };
  }

  const issue = (state.newsroomIssues || []).find((entry) => publicationMatches(entry, wrapUp.publicationId, wrapUp.season, wrapUp.week));
  const episode = (state.podcastEpisodes || []).find((entry) => entry?.publicationId === wrapUp.publicationId || entry?.id === `podcast-${wrapUp.publicationId}`);
  const coverage = collegeCoverageFor(state, issue);
  const newsroomRequired = coverage ? coverage.coverageDecision?.articleCount > 0 : Boolean(issue?.articles?.length);
  const podcastRequired = coverage ? Boolean(coverage.coverageDecision?.podcastEligible) : Boolean(issue?.podcastBrief);
  const newsroomComplete = !newsroomRequired || articleGenerated(issue);
  const podcastComplete = !podcastRequired || podcastGenerated(episode);
  const archiveComplete = chronicleExists(state, wrapUp.publicationId, wrapUp.season, wrapUp.week);
  const loggedComplete = Boolean(wrapUp.entry) && archiveComplete;

  const steps = [
    statusStep({ id: 'setup', label: 'Week Setup', state: 'complete', detail: `${wrapUp.label} was configured and published.` }),
    statusStep({
      id: 'logged', label: 'Week Logged', state: loggedComplete ? 'complete' : 'pending',
      detail: loggedComplete ? 'Verified weekly record + Chronicle entry saved.' : 'The published week is missing its Chronicle checkpoint.',
      action: loggedComplete ? '' : 'Open Weekly Agenda', target: loggedComplete ? '' : 'agenda',
    }),
    statusStep({
      id: 'newsroom', label: 'Newsroom', state: newsroomComplete ? 'complete' : 'pending',
      detail: !newsroomRequired ? 'Not needed this week — editorial gate stayed quiet.' : newsroomComplete ? 'Required coverage is written.' : 'This week earned an article that still needs review/writing.',
      action: newsroomRequired && !newsroomComplete ? 'Open Newsroom' : '', target: newsroomRequired && !newsroomComplete ? 'newsroom' : '', optional: !newsroomRequired,
    }),
    statusStep({
      id: 'podcast', label: 'Podcast', state: podcastComplete ? 'complete' : 'pending',
      detail: !podcastRequired ? 'Not needed this week — no show warranted.' : podcastComplete ? (episode?.audioStatus === 'ready' ? 'Transcript + audio are ready.' : 'Transcript is ready. Audio is optional for week completion.') : 'This week earned a show; create the transcript before finalizing.',
      action: podcastRequired && !podcastComplete ? 'Open Podcast' : '', target: podcastRequired && !podcastComplete ? 'podcast' : '', optional: !podcastRequired,
    }),
  ];
  const canFinalize = loggedComplete && newsroomComplete && podcastComplete;
  steps.push(statusStep({
    id: 'finalize', label: 'Finalize', state: canFinalize ? 'ready' : 'waiting',
    detail: canFinalize ? 'Everything required is complete. Save the week checkpoint.' : 'Finish the remaining required items first.',
    action: canFinalize ? 'Finalize Week' : '', target: canFinalize ? 'finalize' : '',
  }));

  const firstPending = steps.find((step) => step.state === 'pending' && step.action);
  const nextAction = firstPending
    ? { label: firstPending.action, target: firstPending.target, detail: firstPending.detail }
    : canFinalize
      ? { label: 'Finalize Week', target: 'finalize', detail: `Week ${wrapUp.week} is ready to close.` }
      : { label: 'Review Week', target: 'agenda', detail: 'Check the weekly workflow for anything still missing.' };

  return {
    mode: 'wrap-up', activeWeek, wrapUp, finalized: null, steps,
    completedRequired: steps.filter((step) => step.state === 'complete').length,
    requiredCount: 5,
    canFinalize,
    newsroomRequired,
    podcastRequired,
    nextAction,
  };
};

export const createWeekFinalization = (state = {}, flow = buildGameweekFlow(state)) => {
  if (!flow.wrapUp || !flow.canFinalize) throw new Error('Finish the required week items before finalizing.');
  const { publicationId, season, week, label } = flow.wrapUp;
  return {
    publicationId,
    season,
    week,
    label,
    finalizedAt: new Date().toISOString(),
    sourceRevision: finite(state?._sync?.revision, 0),
    completion: Object.fromEntries(flow.steps.map((step) => [step.id, step.state])),
  };
};

export const isWeekFinalized = (state = {}, publicationId = '') => Boolean(finalizationFor(state, publicationId));
