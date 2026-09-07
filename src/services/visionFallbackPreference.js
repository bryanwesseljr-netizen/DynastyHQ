const STORAGE_KEY = 'dynastyhq:paid-vision-fallback-v1';
const EVENT_NAME = 'dynastyhq:paid-vision-fallback';

const storageAvailable = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const readPaidVisionFallbackEnabled = () => {
  if (!storageAvailable()) return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'enabled';
  } catch {
    return false;
  }
};

export const setPaidVisionFallbackEnabled = (enabled) => {
  const next = Boolean(enabled);
  if (!storageAvailable()) return next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? 'enabled' : 'disabled');
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { enabled: next } }));
  } catch {
    // A storage failure must never silently enable paid fallback.
    return false;
  }
  return next;
};

export const PAID_VISION_FALLBACK_EVENT = EVENT_NAME;
