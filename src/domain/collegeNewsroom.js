const clean = (value, maxLength = 120) => String(value || '').trim().slice(0, maxLength);

export const NATIONAL_COLLEGE_OUTLET = Object.freeze({
  id: 'national',
  name: 'College Football Central',
  desk: 'National College Football',
  theme: 'network',
});

export const DEFAULT_COLLEGE_NEWSROOM = Object.freeze({
  activeStopId: '',
  stops: [],
});

export const suggestCollegeOutlets = ({ school = '', city = '', state = '' } = {}) => {
  const safeSchool = clean(school) || 'Campus';
  const safeCity = clean(city) || safeSchool;
  const safeState = clean(state) || 'Regional';
  return {
    localOutletName: `${safeCity} Gazette`,
    regionalOutletName: `${safeState} College Sports Report`,
  };
};

export const normalizeCollegeNewsroom = (value = {}) => ({
  ...DEFAULT_COLLEGE_NEWSROOM,
  ...value,
  activeStopId: clean(value.activeStopId),
  stops: Array.isArray(value.stops) ? value.stops.map((stop, index) => ({
    id: clean(stop.id) || `college-stop-${index + 1}`,
    school: clean(stop.school),
    city: clean(stop.city),
    state: clean(stop.state),
    localOutletName: clean(stop.localOutletName) || suggestCollegeOutlets(stop).localOutletName,
    regionalOutletName: clean(stop.regionalOutletName) || suggestCollegeOutlets(stop).regionalOutletName,
    nationalOutletName: clean(stop.nationalOutletName) || NATIONAL_COLLEGE_OUTLET.name,
    startedSeason: Math.max(1, Number(stop.startedSeason) || 1),
    startedWeek: Math.max(1, Number(stop.startedWeek) || 1),
    startedAt: clean(stop.startedAt, 80),
  })) : [],
});

export const validateCollegeOutletProfile = (profile = {}) => {
  const required = ['city', 'state', 'localOutletName', 'regionalOutletName'];
  return required.reduce((errors, field) => {
    if (!clean(profile[field])) errors[field] = 'Required';
    return errors;
  }, {});
};

export const addCollegeNewsroomStop = ({
  collegeNewsroom,
  school,
  profile,
  season,
  week,
  startedAt = new Date().toISOString(),
}) => {
  const errors = validateCollegeOutletProfile(profile);
  if (Object.keys(errors).length) {
    const error = new Error('College city, state, local outlet, and regional outlet are required.');
    error.code = 'INVALID_COLLEGE_NEWSROOM_PROFILE';
    error.validation = errors;
    throw error;
  }
  const normalized = normalizeCollegeNewsroom(collegeNewsroom);
  const stop = {
    id: `college-stop-${Math.max(1, Number(season) || 1)}-${Math.max(1, Number(week) || 1)}-${Date.parse(startedAt) || Date.now()}`,
    school: clean(school),
    city: clean(profile.city),
    state: clean(profile.state),
    localOutletName: clean(profile.localOutletName),
    regionalOutletName: clean(profile.regionalOutletName),
    nationalOutletName: NATIONAL_COLLEGE_OUTLET.name,
    startedSeason: Math.max(1, Number(season) || 1),
    startedWeek: Math.max(1, Number(week) || 1),
    startedAt,
  };
  return {
    activeStopId: stop.id,
    stops: [...normalized.stops, stop],
  };
};

export const getActiveCollegeNewsroomStop = (value = {}, school = '') => {
  const normalized = normalizeCollegeNewsroom(value);
  return normalized.stops.find((stop) => stop.id === normalized.activeStopId)
    || [...normalized.stops].reverse().find((stop) => !school || stop.school === school)
    || null;
};

export const createCollegeOutletSet = (value = {}, school = '') => {
  const stop = getActiveCollegeNewsroomStop(value, school);
  const suggestions = suggestCollegeOutlets({ school, city: stop?.city, state: stop?.state });
  return [
    {
      id: 'college-local',
      name: stop?.localOutletName || suggestions.localOutletName,
      desk: stop?.city ? `${stop.city} Sports` : 'Local Sports',
      theme: 'local',
    },
    {
      id: 'college-regional',
      name: stop?.regionalOutletName || suggestions.regionalOutletName,
      desk: stop?.state ? `${stop.state} College Football` : 'Regional College Football',
      theme: 'regional',
    },
    { id: 'filmroom', name: 'The Film Room', desk: 'Numbers & Analysis', theme: 'filmroom' },
    { ...NATIONAL_COLLEGE_OUTLET, name: stop?.nationalOutletName || NATIONAL_COLLEGE_OUTLET.name },
  ];
};
