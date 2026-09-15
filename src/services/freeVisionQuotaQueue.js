const REQUEST_SPACING_MS = 4300;
const DEFAULT_QUOTA_COOLDOWN_MS = 65000;
const TRANSIENT_BASE_COOLDOWN_MS = 10000;
const PROVIDER_BUSY_COOLDOWN_MS = 20000;
const MAX_QUOTA_RETRIES = 3;
const MAX_TRANSIENT_RETRIES = 2;
const MAX_PROVIDER_BUSY_RETRIES = 3;
const TRANSIENT_STATUSES = new Set([502, 503, 504]);

let queueTail = Promise.resolve();
let nextRequestAt = 0;

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const retryAfterMs = (response, body = {}) => {
  const headerSeconds = Number(response?.headers?.get?.('retry-after'));
  const bodySeconds = Number(body?.retryAfterSeconds);
  const seconds = Number.isFinite(bodySeconds) && bodySeconds > 0
    ? bodySeconds
    : (Number.isFinite(headerSeconds) && headerSeconds > 0 ? headerSeconds : 0);
  return seconds > 0 ? Math.ceil(seconds * 1000) + 1500 : DEFAULT_QUOTA_COOLDOWN_MS;
};

const providerMessage = (body = {}) => [body?.error, body?.message, body?.geminiError, body?.details]
  .filter(Boolean)
  .join(' ')
  .toLowerCase();

const isProviderBusy = (response, body = {}) => (
  response?.status === 503
  && /(high demand|temporar(?:ily|y)|unavailable|overload|busy|capacity)/i.test(providerMessage(body))
);

const transientCooldownMs = (attempt) => Math.min(
  30000,
  TRANSIENT_BASE_COOLDOWN_MS * Math.max(1, Number(attempt) || 1),
);

const providerBusyCooldownMs = (attempt) => Math.min(
  60000,
  Math.round(PROVIDER_BUSY_COOLDOWN_MS * (1.5 ** Math.max(0, (Number(attempt) || 1) - 1))),
);

const waitForSlot = async () => {
  const delay = Math.max(0, nextRequestAt - Date.now());
  if (delay) {
    window.dispatchEvent(new CustomEvent('dynastyhq:free-vision-wait', {
      detail: { waitMs: delay, reason: 'pacing' },
    }));
    await sleep(delay);
  }
  nextRequestAt = Date.now() + REQUEST_SPACING_MS;
};

const runPost = async ({ url, idToken, body }) => {
  let quotaRetries = 0;
  let transientRetries = 0;
  let providerBusyRetries = 0;

  while (true) {
    await waitForSlot();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      // Preserve the HTTP status when an upstream proxy returns non-JSON.
    }

    if (response.status === 429 && quotaRetries < MAX_QUOTA_RETRIES) {
      quotaRetries += 1;
      const cooldownMs = retryAfterMs(response, payload);
      nextRequestAt = Math.max(nextRequestAt, Date.now() + cooldownMs);
      window.dispatchEvent(new CustomEvent('dynastyhq:free-vision-wait', {
        detail: { waitMs: cooldownMs, reason: 'quota', attempt: quotaRetries },
      }));
      continue;
    }

    const providerBusy = isProviderBusy(response, payload);
    if (providerBusy) {
      if (providerBusyRetries < MAX_PROVIDER_BUSY_RETRIES) {
        providerBusyRetries += 1;
        const cooldownMs = providerBusyCooldownMs(providerBusyRetries);
        nextRequestAt = Math.max(nextRequestAt, Date.now() + cooldownMs);
        window.dispatchEvent(new CustomEvent('dynastyhq:free-vision-wait', {
          detail: {
            waitMs: cooldownMs,
            reason: 'provider-busy',
            attempt: providerBusyRetries,
            status: response.status,
          },
        }));
        continue;
      }
      return { response, body: payload };
    }

    if (TRANSIENT_STATUSES.has(response.status) && transientRetries < MAX_TRANSIENT_RETRIES) {
      transientRetries += 1;
      const cooldownMs = transientCooldownMs(transientRetries);
      nextRequestAt = Math.max(nextRequestAt, Date.now() + cooldownMs);
      window.dispatchEvent(new CustomEvent('dynastyhq:free-vision-wait', {
        detail: {
          waitMs: cooldownMs,
          reason: 'temporary-provider-failure',
          attempt: transientRetries,
          status: response.status,
        },
      }));
      continue;
    }

    return { response, body: payload };
  }
};

export const postFreeVisionJson = (args) => {
  const run = () => runPost(args);
  const task = queueTail.then(run, run);
  queueTail = task.then(() => undefined, () => undefined);
  return task;
};

export const freeVisionQueueConfig = Object.freeze({
  requestSpacingMs: REQUEST_SPACING_MS,
  defaultQuotaCooldownMs: DEFAULT_QUOTA_COOLDOWN_MS,
  transientBaseCooldownMs: TRANSIENT_BASE_COOLDOWN_MS,
  providerBusyCooldownMs: PROVIDER_BUSY_COOLDOWN_MS,
  maxQuotaRetries: MAX_QUOTA_RETRIES,
  maxTransientRetries: MAX_TRANSIENT_RETRIES,
  maxProviderBusyRetries: MAX_PROVIDER_BUSY_RETRIES,
});
