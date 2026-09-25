export const DYNASTYHQ_NAVIGATE_EVENT = 'dynastyhq:navigate';

export const normalizeNavigationTarget = (value) => {
  const target = String(value || '').trim();
  const key = target.toLowerCase().replace(/[\s_-]+/g, '');
  const aliases = {
    home: 'dashboard',
    dashboard: 'dashboard',
    gamehub: 'gameHub',
    weeklyagenda: 'agenda',
    agenda: 'agenda',
    importsession: 'importSession',
    verifiedtools: 'importSession',
    dataverification: 'importSession',
    dataentry: 'dataEntry',
    newsroom: 'newsroom',
    thenewsroom: 'newsroom',
    podcast: 'podcast',
    career: 'career',
    legacy: 'career',
    chronicle: 'chronicle',
    offseason: 'offseason',
    offseasonwarroom: 'offseason',
    recruiting: 'recruiting',
    recruitingboard: 'recruiting',
    frontoffice: 'frontOffice',
    settings: 'settings',
    rules: 'rules',
    careerhandbook: 'rules',
    commandcenter: 'commandCenter',
  };
  return aliases[key] || target;
};

export const requestNavigation = (target, detail = {}) => {
  if (typeof window === 'undefined') return false;
  const normalizedTarget = normalizeNavigationTarget(target);
  window.dispatchEvent(new CustomEvent(DYNASTYHQ_NAVIGATE_EVENT, {
    detail: { ...detail, target: normalizedTarget },
  }));
  return true;
};
