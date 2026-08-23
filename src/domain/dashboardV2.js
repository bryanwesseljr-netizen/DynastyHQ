import { buildCommandCenter, CAREER_STAGES } from './commandCenter.js';

export const DASHBOARD_V2_MODULES = Object.freeze({
  [CAREER_STAGES.HIGH_SCHOOL]: Object.freeze([
    'prospect-snapshot',
    'recruiting-snapshot',
    'top-schools',
    'recent-results',
    'latest-coverage',
    'milestones',
  ]),
  [CAREER_STAGES.COLLEGE]: Object.freeze([
    'player-snapshot',
    'current-week',
    'season-performance',
    'recent-results',
    'latest-coverage',
    'milestones',
  ]),
  [CAREER_STAGES.OC]: Object.freeze([
    'program-snapshot',
    'offensive-performance',
    'recent-results',
    'recruiting-snapshot',
    'latest-coverage',
    'career-outlook',
  ]),
  [CAREER_STAGES.HC]: Object.freeze([
    'program-snapshot',
    'team-performance',
    'recent-results',
    'recruiting-snapshot',
    'trophy-case',
    'latest-coverage',
  ]),
  [CAREER_STAGES.RETIRED]: Object.freeze([
    'career-resume',
    'career-timeline',
    'trophy-case',
    'latest-coverage',
  ]),
});

export const dashboardModulesForStage = (stage) => (
  DASHBOARD_V2_MODULES[stage] || DASHBOARD_V2_MODULES[CAREER_STAGES.COLLEGE]
);

export const buildDashboardV2 = (state = {}) => {
  const commandCenter = buildCommandCenter(state);
  return {
    ...commandCenter,
    moduleIds: dashboardModulesForStage(commandCenter.stage),
    dashboardVersion: 2,
  };
};
