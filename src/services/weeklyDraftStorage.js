const STORAGE_PREFIX = 'dynastyhq:weekly-draft:v1:';

const storageKey = (ownerId) => `${STORAGE_PREFIX}${ownerId}`;

const availableStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const loadWeeklyDraftRecord = (ownerId) => {
  const storage = availableStorage();
  if (!storage || !ownerId) return null;
  try {
    const raw = storage.getItem(storageKey(ownerId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveWeeklyDraftRecord = (ownerId, record) => {
  const storage = availableStorage();
  if (!storage || !ownerId || !record) return false;
  try {
    storage.setItem(storageKey(ownerId), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
};

export const clearWeeklyDraftRecord = (ownerId) => {
  const storage = availableStorage();
  if (!storage || !ownerId) return;
  try {
    storage.removeItem(storageKey(ownerId));
  } catch {
    // Draft cleanup must never interrupt the career save flow.
  }
};
