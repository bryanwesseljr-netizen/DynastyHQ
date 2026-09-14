const REQUEST_SPACING_MS = 4300;
const DEFAULT_QUOTA_COOLDOWN_MS = 65000;
const TRANSIENT_COOLDOWN_MS = 9000;
const MAX_QUOTA_RETRIES = 2;
const MAX_TRANSIENT_RETRIES = 1;
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

    if (TRANSIENT_STATUSES.has(response.status) && transientRetries < MAX_TRANSIENT_RETRIES) {
      transientRetries += 1;
      nextRequestAt = Math.max(nextRequestAt, Date.now() + TRANSIENT_COOLDOWN_MS);
      window.dispatchEvent(new CustomEvent('dynastyhq:free-vision-wait', {
        detail: {
          waitMs: TRANSIENT_COOLDOWN_MS,
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
  transientCooldownMs: TRANSIENT_COOLDOWN_MS,
  maxQuotaRetries: MAX_QUOTA_RETRIES,
  maxTransientRetries: MAX_TRANSIENT_RETRIES,
});
