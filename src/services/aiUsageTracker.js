const STORAGE_KEY = 'dynastyhq:ai-scan-usage-v1';
const EVENT_NAME = 'dynastyhq:ai-scan-usage';
const MAX_EVENTS = 200;

const storageAvailable = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const readAiScanUsage = () => {
  if (!storageAvailable()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-MAX_EVENTS) : [];
  } catch {
    return [];
  }
};

export const recordAiScanUsage = (kind, responseBody = {}) => {
  const usage = responseBody?.usage;
  if (!usage?.provider || !usage?.model || !storageAvailable()) return null;

  const event = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    kind: String(kind || 'scan'),
    provider: String(usage.provider),
    model: String(usage.model),
    fallbackUsed: Boolean(usage.fallbackUsed),
    fallbackReason: String(usage.fallbackReason || ''),
    fallbackUnavailable: Boolean(usage.fallbackUnavailable),
    reviewRecommended: Boolean(usage.reviewRecommended),
    inputTokens: Number(usage.inputTokens) || 0,
    outputTokens: Number(usage.outputTokens) || 0,
    totalTokens: Number(usage.totalTokens) || 0,
  };

  try {
    const next = [...readAiScanUsage(), event].slice(-MAX_EVENTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: event }));
  } catch {
    // Usage telemetry is convenience-only and must never block a scan.
  }
  return event;
};

export const summarizeAiScanUsage = (events = readAiScanUsage()) => {
  const source = Array.isArray(events) ? events : [];
  return source.reduce((summary, event) => {
    summary.total += 1;
    if (event.provider === 'google') summary.gemini += 1;
    if (event.provider === 'openai') summary.openai += 1;
    if (event.fallbackUsed) summary.fallbacks += 1;
    if (event.fallbackUnavailable) summary.unavailableFallbacks += 1;
    if (event.reviewRecommended) summary.reviewRecommended += 1;
    summary.totalTokens += Number(event.totalTokens) || 0;
    return summary;
  }, {
    total: 0,
    gemini: 0,
    openai: 0,
    fallbacks: 0,
    unavailableFallbacks: 0,
    reviewRecommended: 0,
    totalTokens: 0,
  });
};

export const AI_SCAN_USAGE_EVENT = EVENT_NAME;
