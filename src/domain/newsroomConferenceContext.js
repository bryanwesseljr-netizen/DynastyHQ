import {
  getCollegeFootballTeamIdentity,
  normalizeCollegeFootballConference,
  normalizeTeamKey,
} from './collegeFootballTeamIdentity.js';

const clean = (value, max = 160) => String(value ?? '').trim().slice(0, max);

export const getNewsroomConferenceOverride = ({ settings = {}, teamName = '', dynastySeason = 1 } = {}) => {
  const key = normalizeTeamKey(teamName);
  if (!key) return null;
  const raw = settings?.conferenceOverrides?.[key];
  if (!raw) return null;

  const entry = typeof raw === 'string' ? { conference: raw } : raw;
  const conference = normalizeCollegeFootballConference(entry?.conference);
  if (!conference) return null;
  const effectiveSeason = Math.max(1, Number(entry?.effectiveSeason) || 1);
  const currentSeason = Math.max(1, Number(dynastySeason) || 1);
  if (effectiveSeason > currentSeason) return null;

  return {
    team: clean(entry?.team || teamName, 120),
    conference,
    effectiveSeason,
    updatedAt: clean(entry?.updatedAt, 80),
  };
};

export const resolveNewsroomTeamIdentity = ({ state = {}, teamName = '', dynastySeason = 1 } = {}) => {
  const override = getNewsroomConferenceOverride({
    settings: state?.newsroomMediaSettings || {},
    teamName,
    dynastySeason,
  });
  return getCollegeFootballTeamIdentity(teamName, {
    conferenceOverride: override?.conference || '',
    dynastySeason,
  });
};

export const setNewsroomConferenceOverride = ({
  settings = {},
  teamName = '',
  conference = '',
  effectiveSeason = 1,
  updatedAt = new Date().toISOString(),
} = {}) => {
  const key = normalizeTeamKey(teamName);
  const normalizedConference = normalizeCollegeFootballConference(conference);
  if (!key || !normalizedConference) return settings || {};

  return {
    ...(settings || {}),
    conferenceOverrides: {
      ...(settings?.conferenceOverrides || {}),
      [key]: {
        team: clean(teamName, 120),
        conference: normalizedConference,
        effectiveSeason: Math.max(1, Number(effectiveSeason) || 1),
        updatedAt: clean(updatedAt, 80),
      },
    },
  };
};

export const clearNewsroomConferenceOverride = ({ settings = {}, teamName = '' } = {}) => {
  const key = normalizeTeamKey(teamName);
  if (!key || !settings?.conferenceOverrides?.[key]) return settings || {};
  const nextOverrides = { ...(settings.conferenceOverrides || {}) };
  delete nextOverrides[key];
  return { ...(settings || {}), conferenceOverrides: nextOverrides };
};
