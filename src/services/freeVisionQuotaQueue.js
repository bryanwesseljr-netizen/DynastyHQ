const REQUEST_SPACING_MS = 4300;
const DEFAULT_QUOTA_COOLDOWN_MS = 65000;
const MAX_QUOTA_RETRIES = 2;

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
  let last = null;
  for (let attempt = 0; attempt <= MAX_QUOTA_RETRIES; attempt += 1) {
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

    last = { response, body: payload };
    if (response.status !== 429 || attempt >= MAX_QUOTA_RETRIES) return last;

    const cooldownMs = retryAfterMs(response, payload);
    nextRequestAt = Math.max(nextRequestAt, Date.now() + cooldownMs);
    window.dispatchEvent(new CustomEvent('dynastyhq:free-vision-wait', {
      detail: { waitMs: cooldownMs, reason: 'quota', attempt: attempt + 1 },
    }));
  }
  return last;
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
  maxQuotaRetries: MAX_QUOTA_RETRIES,
});
