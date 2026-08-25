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

const normalizedStage = (value) => String(value || '').trim().toLowerCase().replaceAll('_', '-');

export const getNewsroomIssueFolder = (issue = {}) => {
  const careerPhase = normalizedStage(issue?.careerPhase);
  const coverageStage = normalizedStage(issue?.coverageStage);
  const gameStage = normalizedStage(issue?.game?.stage);
  const outletStage = normalizedStage(issue?.outletProfile?.stage);
  const editionType = normalizedStage(issue?.editionType);
  const label = String(issue?.label || '').trim().toLowerCase();

  if (
    ['oc', 'hc', 'coordinator', 'head-coach', 'offensive-coordinator', 'retired'].includes(careerPhase)
    || /coach|coordinator|legacy|retired/.test(careerPhase)
    || ['coaching', 'coach'].includes(coverageStage)
  ) return NEWSROOM_MEDIA_FOLDERS.COACHING;

  if (
    ['high-school', 'highschool', 'prep'].includes(coverageStage)
    || ['high-school', 'highschool', 'prep'].includes(gameStage)
    || ['high-school', 'highschool', 'prep'].includes(outletStage)
    || editionType === 'high-school-evaluation'
    || /\bhigh school\b|\bprep\b/.test(label)
  ) return NEWSROOM_MEDIA_FOLDERS.HIGH_SCHOOL;

  if (
    ['college', 'college-player'].includes(coverageStage)
    || ['college', 'college-player'].includes(gameStage)
    || ['college', 'college-player'].includes(outletStage)
  ) return NEWSROOM_MEDIA_FOLDERS.COLLEGE;

  return NEWSROOM_MEDIA_FOLDERS.COLLEGE;
};

export const newsroomMediaFolderMatchesIssue = (asset, issue) => (
  getNewsroomMediaFolder(asset) === getNewsroomIssueFolder(issue)
);
