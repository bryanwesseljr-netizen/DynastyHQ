import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import SessionImportPortal from './SessionImportPortal.jsx';
import ProcessWeek2Portal from './ProcessWeek2Portal.jsx';
import CareerOverviewPortal from './CareerOverviewPortal.jsx';
import GameHubPortal from './GameHubPortal.jsx';
import MobileBroadcastNavPortal from './MobileBroadcastNavPortal.jsx';
import NavigationStatePortal from './NavigationStatePortal.jsx';
import TeamAccentPortal from './TeamAccentPortal.jsx';
import DynamicMatchupHelmetPortal from './DynamicMatchupHelmetPortal.jsx';
import PlayerOffseasonNavigationPortal from './PlayerOffseasonNavigationPortal.jsx';
import DesktopPrimaryNavFinalizer from './DesktopPrimaryNavFinalizer.jsx';
import { OwnerCareerProvider } from './OwnerCareerContext.jsx';
import { DYNASTYHQ_NAVIGATE_EVENT } from '../domain/navigationBus.js';

const OwnerWeeklyEnhancements = lazy(() => import('./OwnerWeeklyEnhancements.jsx'));
const OwnerGameHubEnhancements = lazy(() => import('./OwnerGameHubEnhancements.jsx'));
const OwnerCareerEnhancements = lazy(() => import('./OwnerCareerEnhancements.jsx'));
const OwnerRecruitingEnhancements = lazy(() => import('./OwnerRecruitingEnhancements.jsx'));
const OwnerNewsroomEnhancements = lazy(() => import('./OwnerNewsroomEnhancements.jsx'));
const OwnerPodcastEnhancements = lazy(() => import('./OwnerPodcastEnhancements.jsx'));
const OwnerAmbientEnhancements = lazy(() => import('./OwnerAmbientEnhancements.jsx'));

const groupsForTarget = (target) => {
  const value = String(target || '').trim();
  if (['agenda', 'importSession', 'dataEntry'].includes(value)) return ['weekly'];
  if (value === 'gameHub') return ['gameHub'];
  if (['career', 'chronicle', 'offseason'].includes(value)) return ['career'];
  if (value === 'recruiting') return ['recruiting'];
  if (value === 'newsroom') return ['newsroom'];
  if (value === 'podcast') return ['podcast'];
  return [];
};

const visibleFeatureGroups = () => {
  if (typeof document === 'undefined') return [];
  const groups = new Set();
  const activeTab = document.querySelector('main.dhq-page-main')?.dataset?.activeTab || '';
  groupsForTarget(activeTab).forEach((group) => groups.add(group));

  const visualTarget = document.body?.dataset?.dhqNavVisualActive || '';
  groupsForTarget(visualTarget).forEach((group) => groups.add(group));

  if (document.body?.classList.contains('dhq-game-hub-open')) groups.add('gameHub');
  if (
    document.body?.classList.contains('dhq-career-overview-open')
    || document.body?.classList.contains('dhq-player-offseason-open')
  ) groups.add('career');
  if (document.body?.classList.contains('dhq-session-import-mode')) groups.add('weekly');

  return [...groups];
};

const OwnerAmbientLoader = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return undefined;
    const activate = () => setReady(true);
    const idleId = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(activate, { timeout: 1200 })
      : window.setTimeout(activate, 700);

    window.addEventListener(DYNASTYHQ_NAVIGATE_EVENT, activate, { once: true });
    window.addEventListener('pointerdown', activate, { once: true, passive: true });
    window.addEventListener('keydown', activate, { once: true });

    return () => {
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      window.removeEventListener(DYNASTYHQ_NAVIGATE_EVENT, activate);
      window.removeEventListener('pointerdown', activate);
      window.removeEventListener('keydown', activate);
    };
  }, [ready]);

  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <OwnerAmbientEnhancements />
    </Suspense>
  );
};

const OwnerFeatureEnhancements = () => {
  const [activeGroups, setActiveGroups] = useState(() => new Set(visibleFeatureGroups()));

  const activate = useCallback((groups) => {
    const requested = (Array.isArray(groups) ? groups : [groups]).filter(Boolean);
    if (!requested.length) return;
    setActiveGroups((current) => {
      const next = new Set(current);
      let changed = false;
      requested.forEach((group) => {
        if (!next.has(group)) {
          next.add(group);
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, []);

  useEffect(() => {
    const syncVisible = () => activate(visibleFeatureGroups());
    const onNavigate = (event) => activate(groupsForTarget(event?.detail?.target));

    syncVisible();
    window.addEventListener(DYNASTYHQ_NAVIGATE_EVENT, onNavigate);

    const observer = new MutationObserver(syncVisible);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-active-tab', 'data-dhq-nav-visual-active'],
    });

    const prefetchCommon = () => {
      import('./OwnerGameHubEnhancements.jsx');
      import('./OwnerWeeklyEnhancements.jsx');
    };
    const idleId = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(prefetchCommon, { timeout: 2600 })
      : window.setTimeout(prefetchCommon, 1800);

    return () => {
      observer.disconnect();
      window.removeEventListener(DYNASTYHQ_NAVIGATE_EVENT, onNavigate);
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, [activate]);

  return (
    <Suspense fallback={null}>
      {activeGroups.has('weekly') ? <OwnerWeeklyEnhancements /> : null}
      {activeGroups.has('gameHub') ? <OwnerGameHubEnhancements /> : null}
      {activeGroups.has('career') ? <OwnerCareerEnhancements /> : null}
      {activeGroups.has('recruiting') ? <OwnerRecruitingEnhancements /> : null}
      {activeGroups.has('newsroom') ? <OwnerNewsroomEnhancements /> : null}
      {activeGroups.has('podcast') ? <OwnerPodcastEnhancements /> : null}
    </Suspense>
  );
};

const OwnerEnhancements = () => (
  <OwnerCareerProvider>
    <TeamAccentPortal />
    <NavigationStatePortal />
    <ZoomPanPortal />
    <DynamicMatchupHelmetPortal />
    <MobileBroadcastNavPortal />
    <PlayerOffseasonNavigationPortal />
    <DesktopPrimaryNavFinalizer />
    <OwnerAmbientLoader />

    {/* Entry portals stay mounted so clicks/events are never missed. Heavier
        feature polish loads only when that destination is actually used. */}
    <SessionImportPortal />
    <ProcessWeek2Portal />
    <GameHubPortal />
    <CareerOverviewPortal />

    <OwnerFeatureEnhancements />
  </OwnerCareerProvider>
);

export default OwnerEnhancements;
