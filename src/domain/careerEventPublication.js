import { createCollegeOutletSet, getActiveCollegeNewsroomStop } from './collegeNewsroom.js';
import { buildProgramCoverageContext } from './programCoverage.js';

const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const arrayOf = (value) => (Array.isArray(value) ? value : []);
const normalizeRole = (value) => clean(value, 40).toUpperCase();
const eligibleReason = (reason) => ['starter', 'appearance'].includes(clean(reason, 40).toLowerCase());

const priorRoleFor = (state, currentRole) => {
  const history = [...arrayOf(state?.careerTracking?.statusHistory)].reverse();
  const normalizedCurrent = normalizeRole(currentRole);

  for (const entry of history) {
    const before = normalizeRole(entry?.before?.depthChart);
    const after = normalizeRole(entry?.after?.depthChart);
    if (before && after && before !== after && after === normalizedCurrent) return before;
  }
  for (const entry of history) {
    const after = normalizeRole(entry?.after?.depthChart);
    if (after && after !== normalizedCurrent) return after;
  }
  return '';
};

const eventDescriptor = ({ reason, playerName, school, previousRole, currentRole }) => {
  if (reason === 'starter') {
    const summary = previousRole && previousRole !== currentRole
      ? `${playerName} moved from ${previousRole} to ${currentRole} at ${school}.`
      : `${playerName} is now listed as ${currentRole} at ${school}.`;
    return {
      type: 'starting-quarterback-opportunity',
      title: `${playerName} moves into the QB1 role at ${school}`,
      milestoneKey: 'milestone.startingQuarterbackOpportunity',
      milestoneLabel: 'Starting quarterback opportunity',
      milestoneValue: summary,
      note: `${summary} DynastyHQ is treating the verified depth-chart change as a career event before the next game is processed.`,
    };
  }

  const summary = `${playerName} made a first collegiate appearance for ${school}.`;
  return {
    type: 'first-college-appearance',
    title: `${playerName} makes first collegiate appearance for ${school}`,
    milestoneKey: 'milestone.firstCollegeAppearance',
    milestoneLabel: 'First collegiate appearance',
    milestoneValue: summary,
    note: `${summary} The appearance is now part of the verified career record.`,
  };
};

const fact = ({ publicationId, key, label, value, capturedAt }) => ({
  id: `${publicationId}:${key}`,
  publicationId,
  key,
  label,
  value,
  verified: true,
  confidence: 1,
  source: 'Career Standby',
  sourceId: 'career-standby',
  capturedAt,
});

export const buildCareerEventPublication = (state = {}) => {
  const tracking = state.careerTracking || {};
  const reason = clean(tracking.activationReason, 40).toLowerCase();
  const activatedAt = clean(tracking.activatedAt, 100);
  if (tracking.mode !== 'active' || !activatedAt || !eligibleReason(reason)) return state;
  if (clean(tracking.editorialPublicationId, 180)) return state;

  const existing = arrayOf(state.newsroomIssues).find((issue) => (
    issue?.editionType === 'career-event'
    && issue?.careerEvent?.activatedAt === activatedAt
    && issue?.careerEvent?.activationReason === reason
  ));
  if (existing?.publicationId) {
    return {
      ...state,
      careerTracking: {
        ...tracking,
        editorialPublicationId: existing.publicationId,
        editorialQueuedAt: existing.publishedAt || activatedAt,
        editorialCoverageTier: existing.coverageDecision?.tier || '',
      },
    };
  }

  const season = Math.max(1, Number(state.currentSeason) || 1);
  const week = Math.max(0, Number(state.currentWeek) || 0);
  const stamp = Date.parse(activatedAt) || 0;
  const publicationId = `career-event-s${season}-w${week}-${reason}-${stamp}`;
  const playerName = clean(state.player?.name, 120) || 'The quarterback';
  const school = clean(state.player?.college || state.player?.school, 120) || 'the program';
  const originalRole = normalizeRole(state.rtg?.rank);
  const currentRole = reason === 'starter' ? 'QB1' : originalRole;
  const historyPriorRole = priorRoleFor(state, currentRole);
  const previousRole = reason === 'starter' && originalRole && originalRole !== 'QB1'
    ? originalRole
    : historyPriorRole;
  const descriptor = eventDescriptor({ reason, playerName, school, previousRole, currentRole });
  const stop = getActiveCollegeNewsroomStop(state.collegeNewsroom, school);
  const outlets = createCollegeOutletSet(state.collegeNewsroom, school);
  const outletById = new Map(outlets.map((outlet) => [outlet.id, outlet]));
  const factKeys = [
    'profile.player.name',
    'profile.player.school',
    'profile.player.college',
    'profile.player.classYear',
    ...(currentRole ? ['rtg.rank'] : []),
    ...(previousRole ? ['rtg.previousRank'] : []),
    descriptor.milestoneKey,
    'weekly.note',
  ];
  const currentFacts = [
    fact({ publicationId, key: 'profile.player.name', label: 'Player name', value: playerName, capturedAt: activatedAt }),
    fact({ publicationId, key: 'profile.player.school', label: 'School', value: school, capturedAt: activatedAt }),
    fact({ publicationId, key: 'profile.player.college', label: 'College', value: school, capturedAt: activatedAt }),
    fact({ publicationId, key: 'profile.player.classYear', label: 'Class', value: clean(state.player?.classYear || state.player?.year, 60), capturedAt: activatedAt }),
    ...(currentRole ? [fact({ publicationId, key: 'rtg.rank', label: 'Depth chart', value: currentRole, capturedAt: activatedAt })] : []),
    ...(previousRole ? [fact({ publicationId, key: 'rtg.previousRank', label: 'Previous depth chart', value: previousRole, capturedAt: activatedAt })] : []),
    fact({ publicationId, key: descriptor.milestoneKey, label: descriptor.milestoneLabel, value: descriptor.milestoneValue, capturedAt: activatedAt }),
    fact({ publicationId, key: 'weekly.note', label: 'Career event note', value: descriptor.note, capturedAt: activatedAt }),
  ];

  const outletProfile = {
    school,
    city: stop?.city || '',
    state: stop?.state || '',
    localOutletName: outletById.get('college-local')?.name || '',
    regionalOutletName: outletById.get('college-regional')?.name || '',
    nationalOutletName: outletById.get('national')?.name || 'College Football Central',
  };
  const shellIssue = {
    id: publicationId,
    publicationId,
    season,
    week,
    label: descriptor.title,
    careerPhase: 'Player',
    coverageStage: 'college',
    editionType: 'career-event',
    weekType: 'career-event',
    weekPhase: clean(state.currentWeekSetup?.phase, 80) || 'regular',
    publishedAt: activatedAt,
    createdAt: activatedAt,
    status: 'published',
    editorialStatus: 'pending',
    eventOnly: true,
    outletProfile,
    articles: [],
    careerEvent: {
      type: descriptor.type,
      activatedAt,
      activationReason: reason,
      previousRole,
      currentRole,
    },
    podcastBrief: {
      title: descriptor.title,
      summary: descriptor.milestoneValue,
      citedFactKeys: factKeys,
    },
  };

  const stateForCoverage = {
    ...state,
    rtg: {
      ...(state.rtg || {}),
      ...(currentRole ? { rank: currentRole } : {}),
    },
    factLedger: [...arrayOf(state.factLedger), ...currentFacts],
  };
  const coverage = buildProgramCoverageContext(stateForCoverage, shellIssue);
  const articles = arrayOf(coverage.storyPlans).map((plan, index) => {
    const outlet = outletById.get(plan.outletId) || outlets[index] || outlets[0];
    return {
      id: `${publicationId}:${outlet.id}`,
      publicationId,
      outletId: outlet.id,
      outletName: outlet.name,
      desk: outlet.desk,
      theme: outlet.theme,
      headline: descriptor.title,
      dek: descriptor.milestoneValue,
      paragraphs: [descriptor.milestoneValue],
      citedFactKeys: factKeys,
      groundingStatus: 'verified',
      storyType: plan.storyType,
      angle: plan.angle,
      audience: plan.audience,
      playerMentionPolicy: plan.playerMentionPolicy,
    };
  });
  const issue = {
    ...shellIssue,
    articles,
    coverageDecision: coverage.coverageDecision,
    storylineKeys: coverage.coverageDecision?.storylineKeys || [],
    storyPlans: coverage.storyPlans,
    podcastCoverageStatus: coverage.coverageDecision?.podcastEligible ? 'eligible' : 'no-episode',
    podcastCoverageReason: coverage.coverageDecision?.podcastEligible
      ? 'A verified career event reached the Story Director threshold for a Huddle Podcast briefing.'
      : 'The Story Director kept this event below the podcast threshold.',
  };

  return {
    ...state,
    rtg: {
      ...(state.rtg || {}),
      ...(currentRole ? { rank: currentRole } : {}),
    },
    factLedger: [...arrayOf(state.factLedger), ...currentFacts],
    newsroomIssues: [...arrayOf(state.newsroomIssues), issue],
    careerTracking: {
      ...tracking,
      editorialPublicationId: publicationId,
      editorialQueuedAt: activatedAt,
      editorialCoverageTier: coverage.coverageDecision?.tier || '',
    },
  };
};
