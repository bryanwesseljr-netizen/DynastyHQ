import { useEffect, useMemo } from 'react';
import { buildAdaptiveTeamTheme } from '../domain/adaptiveTeamTheme.js';
import { resolveCareerTeamMediaProfile } from '../domain/teamMediaProfile';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import '../newsroom-program-theme.css';
import '../active-program-theme-v2.css';

const safeLabel = (value) => String(value || '').trim();

const parseHex = (value) => {
  const match = /^#([0-9a-f]{6})$/i.exec(safeLabel(value));
  if (!match) return null;
  return [0, 2, 4].map((index) => Number.parseInt(match[1].slice(index, index + 2), 16));
};

// Secondary colors such as Oregon yellow or Michigan maize make excellent
// highlights on the dark DynastyHQ shell. Neutral secondaries (black, white,
// silver/gray) fall back to the program primary so Cincinnati still reads red,
// Michigan State reads green, Ohio State reads scarlet, etc.
const resolveProgramHighlight = (primary, secondary) => {
  const fallback = safeLabel(primary) || '#64748b';
  const rgb = parseHex(secondary);
  if (!rgb) return fallback;
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  const chroma = max - min;
  const neutral = chroma < 44;
  const tooDark = max < 72;
  const nearWhite = min > 218 && chroma < 55;
  return neutral || tooDark || nearWhite ? fallback : safeLabel(secondary);
};

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

    const primary = profile.primary || '#64748b';
    const secondary = profile.secondary || '#cbd5e1';
    const accent = profile.accent || '#ffffff';
    const highlight = resolveProgramHighlight(primary, secondary);
    const adaptive = buildAdaptiveTeamTheme({ primary, secondary, highlight });

    const variables = {
      '--dhq-team-primary': primary,
      '--dhq-team-secondary': secondary,
      '--dhq-team-accent': accent,
      '--dhq-team-highlight': highlight,
      '--dhq-team-readable-highlight': adaptive.readableHighlight,
      '--dhq-team-on-primary': adaptive.onPrimary,
      '--dhq-team-on-highlight': adaptive.onHighlight,
      '--dhq-team-surface': adaptive.surface,
      '--dhq-team-surface-strong': adaptive.surfaceStrong,
      '--dhq-team-surface-alt': adaptive.surfaceAlt,
      '--dhq-team-text': adaptive.onSurface,
      '--dhq-team-muted': adaptive.muted,
      '--dhq-team-subtle': adaptive.subtle,
      '--dhq-team-border': adaptive.border,
      '--dhq-team-focus': adaptive.focus,
      '--dhq-program-primary': primary,
      '--dhq-program-secondary': secondary,
      '--dhq-program-accent': accent,
      '--dhq-program-highlight': highlight,
      '--dhq-program-readable-highlight': adaptive.readableHighlight,
      '--dhq-program-on-primary': adaptive.onPrimary,
    };
    Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value));

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
      Object.keys(variables).forEach((name) => root.style.removeProperty(name));
    };
  }, [career, profile]);

  return null;
};

export default TeamAccentPortal;
