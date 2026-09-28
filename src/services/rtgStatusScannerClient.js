import { recordAiScanUsage } from './aiUsageTracker.js';
import { readPaidVisionFallbackEnabled } from './visionFallbackPreference.js';

const RTG_RETRY_DELAYS_MS = [1200, 3200];

export const shouldRetryRtgStatusScan = ({ status = 0, retryable = false } = {}) => (
  retryable === true || [502, 503, 504].includes(Number(status))
);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const analyzeRtgStatusScreenshot = async ({ idToken, imageDataUrl, fileName, player }) => {
  const maxAttempts = RTG_RETRY_DELAYS_MS.length + 1;
  let response = null;
  let body = {};

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    response = await fetch('/api/analyze-coverage-reference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        imageDataUrl,
        fileName,
        player,
        scanKind: 'rtg',
        allowPaidFallback: readPaidVisionFallbackEnabled(),
      }),
    });

    body = {};
    try {
      body = await response.json();
    } catch {
      // Preserve a useful user-facing error if an upstream proxy returns HTML.
    }

    if (response.ok) break;

    const canRetry = attempt < maxAttempts - 1
      && shouldRetryRtgStatusScan({ status: response.status, retryable: body.retryable });

    if (!canRetry) {
      const baseMessage = body.error || 'RTG screenshot analysis failed.';
      const message = shouldRetryRtgStatusScan({ status: response.status, retryable: body.retryable })
        ? 'RTG screenshot scanner is still busy after automatic retries. Try again in a minute.'
        : baseMessage;
      const error = new Error(message);
      error.status = response.status;
      error.retryable = body.retryable === true;
      throw error;
    }

    await wait(RTG_RETRY_DELAYS_MS[attempt]);
  }

  recordAiScanUsage('rtg-status', body);
  return body;
};
