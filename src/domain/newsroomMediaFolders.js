export const NEWSROOM_MEDIA_FOLDERS = Object.freeze({
  HIGH_SCHOOL: 'high-school',
  COLLEGE: 'college',
  COACHING: 'coaching',
  UNSORTED: 'unsorted',
});

export const NEWSROOM_MEDIA_FOLDER_OPTIONS = Object.freeze([
  { value: NEWSROOM_MEDIA_FOLDERS.HIGH_SCHOOL, label: 'High School' },
  { value: NEWSROOM_MEDIA_FOLDERS.COLLEGE, label: 'College' },
  { value: NEWSROOM_MEDIA_FOLDERS.COACHING, label: 'Coaching' },
  { value: NEWSROOM_MEDIA_FOLDERS.UNSORTED, label: 'Unsorted' },
]);

const VALID_FOLDERS = new Set(Object.values(NEWSROOM_MEDIA_FOLDERS));

export const normalizeNewsroomMediaFolder = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return VALID_FOLDERS.has(normalized) ? normalized : NEWSROOM_MEDIA_FOLDERS.UNSORTED;
};

export const getNewsroomMediaFolder = (asset = {}) => normalizeNewsroomMediaFolder(asset?.careerFolder);

export const newsroomMediaFolderLabel = (value) => (
  NEWSROOM_MEDIA_FOLDER_OPTIONS.find((option) => option.value === normalizeNewsroomMediaFolder(value))?.label || 'Unsorted'
);

export const getNewsroomIssueFolder = (issue = {}) => {
  const careerPhase = String(issue?.careerPhase || '').trim().toLowerCase();
  const context = [
    issue?.coverageStage,
    issue?.editionType,
    issue?.game?.stage,
    issue?.outletProfile?.stage,
    issue?.label,
  ].filter(Boolean).join(' ').toLowerCase();

  if (
    ['oc', 'hc', 'coordinator', 'head-coach', 'offensive-coordinator', 'retired'].includes(careerPhase)
    || /coach|coordinator|legacy|retired/.test(careerPhase)
    || /coaching[- ]journey|head coach|offensive coordinator/.test(context)
  ) return NEWSROOM_MEDIA_FOLDERS.COACHING;

  if (
    /high[- ]?school|prep|recruit|commit|scholarship|college decision|evaluation/.test(context)
  ) return NEWSROOM_MEDIA_FOLDERS.HIGH_SCHOOL;

  return NEWSROOM_MEDIA_FOLDERS.COLLEGE;
};

export const newsroomMediaFolderMatchesIssue = (asset, issue) => (
  getNewsroomMediaFolder(asset) === getNewsroomIssueFolder(issue)
);
