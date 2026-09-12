import { useEffect, useMemo } from 'react';
import { resolveCareerTeamMediaProfile } from '../domain/teamMediaProfile';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import '../newsroom-program-theme.css';

const safeLabel = (value) => String(value || '').trim();

const TeamAccentPortal = () => {
  const { career } = useOwnerCareer();
  const profile = useMemo(() => resolveCareerTeamMediaProfile(career || {}), [career]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (!career || !profile?.school) {
      body?.removeAttribute('data-dhq-team-accent');
      body?.removeAttribute('data-dhq-team-school');
      return undefined;
    }

    root.style.setProperty('--dhq-team-primary', profile.primary || '#e00122');
    root.style.setProperty('--dhq-team-secondary', profile.secondary || '#050505');
    root.style.setProperty('--dhq-team-accent', profile.accent || '#ffffff');
    body?.setAttribute('data-dhq-team-accent', 'true');
    body?.setAttribute('data-dhq-team-school', safeLabel(profile.shortName || profile.school));

    const appRoot = document.getElementById('root');
    let scheduled = false;
    const syncCurrentProgramExamples = () => {
      scheduled = false;
      if (!appRoot) return;
      appRoot.querySelectorAll('textarea[placeholder*="Freshman arrival at Cincinnati"]').forEach((field) => {
        field.setAttribute(
          'placeholder',
          `Example: Freshman arrival at ${profile.school}; opening bye before Week 1.`,
        );
      });
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(syncCurrentProgramExamples);
    };
    syncCurrentProgramExamples();
    const observer = appRoot ? new MutationObserver(schedule) : null;
    observer?.observe(appRoot, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      body?.removeAttribute('data-dhq-team-accent');
      body?.removeAttribute('data-dhq-team-school');
      root.style.removeProperty('--dhq-team-primary');
      root.style.removeProperty('--dhq-team-secondary');
      root.style.removeProperty('--dhq-team-accent');
    };
  }, [career, profile]);

  return null;
};

export default TeamAccentPortal;
