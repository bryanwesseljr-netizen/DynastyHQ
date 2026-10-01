export const DYNASTY_VIEW_SESSION_KEY = 'dynastyhq:view-session:v1';

const storageOrNull = (storage) => {
  try {
    return storage || globalThis.sessionStorage || null;
  } catch {
    return null;
  }
};

export const readDynastyViewSession = (storage = null) => {
  const target = storageOrNull(storage);
  if (!target) return {};
  try {
    const raw = target.getItem(DYNASTY_VIEW_SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export const updateDynastyViewSession = (patch = {}, storage = null) => {
  const target = storageOrNull(storage);
  const current = readDynastyViewSession(target);
  const next = {
    ...current,
    ...patch,
    newsroom: patch.newsroom
      ? { ...(current.newsroom || {}), ...patch.newsroom }
      : current.newsroom,
    scroll: patch.scroll
      ? { ...(current.scroll || {}), ...patch.scroll }
      : current.scroll,
    viewport: patch.viewport
      ? { ...(current.viewport || {}), ...patch.viewport }
      : current.viewport,
    updatedAt: new Date().toISOString(),
  };
  if (!target) return next;
  try {
    target.setItem(DYNASTY_VIEW_SESSION_KEY, JSON.stringify(next));
  } catch {
    // View persistence is convenience state and must never block the career.
  }
  return next;
};

export const resetDynastyNewsroomHome = (storage = null) => updateDynastyViewSession({
  newsroom: {
    activeDesk: 'front',
    selectedIssueId: '',
    selectedOutletId: '',
    readerOpen: false,
    frontPageIssueId: '',
  },
}, storage);
