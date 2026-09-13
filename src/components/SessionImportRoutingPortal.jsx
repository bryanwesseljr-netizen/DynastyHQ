import { useEffect } from 'react';
import { compressImage } from '../services/imageCompression.js';
import { routeSessionScreenshot } from '../services/sessionScreenshotRouterClient.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const RTG_INPUT = '[data-rtg-intake-scanner] input[type="file"]';
const COVERAGE_INPUT = '[data-coverage-intake-scanner] input[type="file"]';
const ROUTING_TIMEOUT = 180000;

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const visible = (element) => Boolean(element && element.offsetParent !== null);

const findButton = (matcher) => {
  const buttons = [...document.querySelectorAll('button')];
  return buttons.find((button) => visible(button) && matcher.test(clean(button.textContent)))
    || buttons.find((button) => matcher.test(clean(button.textContent)))
    || null;
};

const isSessionGameInput = (input) => {
  if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.multiple) return false;
  const accept = String(input.accept || '').toLowerCase();
  if (accept && !accept.includes('image')) return false;
  if (input.closest('[data-rtg-intake-scanner], [data-coverage-intake-scanner]')) return false;

  // Weekly Agenda now has both the original verified scanner input and a V3
  // façade input that forwards into it. Session Import may encounter either one
  // depending on mobile timing. Treat any multi-image file input owned by the
  // active Weekly Agenda as the game-lane entry point so routing cannot be
  // silently bypassed by a presentation-layer input.
  return Boolean(input.closest('.dhq-weekly-agenda-workspace'));
};

const waitFor = (getter, message, timeoutMs = 10000) => new Promise((resolve, reject) => {
  const startedAt = Date.now();
  const check = () => {
    const value = getter();
    if (value) {
      resolve(value);
      return;
    }
    if (Date.now() - startedAt >= timeoutMs) {
      reject(new Error(message));
      return;
    }
    window.setTimeout(check, 90);
  };
  check();
});

const filesKey = (file) => `${file.name}:${file.size}:${file.lastModified}`;
const uniqueFiles = (files) => [...new Map(files.map((file) => [filesKey(file), file])).values()];

const dispatchFiles = (input, files) => {
  if (!files.length) return;
  if (typeof DataTransfer === 'undefined') {
    throw new Error('This browser cannot route Session Import files automatically.');
  }
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

const dispatchGameFiles = (input, files) => {
  window.__dhqSessionRouterBypass = true;
  try {
    dispatchFiles(input, files);
  } finally {
    window.setTimeout(() => { window.__dhqSessionRouterBypass = false; }, 0);
  }
};

const waitForScannerCycle = (selector, label, timeoutMs = ROUTING_TIMEOUT) => new Promise((resolve, reject) => {
  const startedAt = Date.now();
  let sawBusy = false;
  const check = () => {
    const input = document.querySelector(selector);
    if (input?.disabled) sawBusy = true;
    if (sawBusy && input && !input.disabled) {
      resolve();
      return;
    }
    if (Date.now() - startedAt >= timeoutMs) {
      reject(new Error(`${label} did not finish processing the routed screenshots.`));
      return;
    }
    window.setTimeout(check, 120);
  };
  check();
});

const ensureRtgInput = async () => {
  let input = document.querySelector(RTG_INPUT);
  if (input) return input;
  const button = findButton(/^(open rtg upload|update rtg again)\b/i);
  if (!button) throw new Error('DynastyHQ could not open the RTG Status scanner.');
  button.click();
  input = await waitFor(
    () => document.querySelector(RTG_INPUT),
    'DynastyHQ could not mount the RTG Status scanner.',
  );
  return input;
};

const ensureCoverageInput = async () => {
  let input = document.querySelector(COVERAGE_INPUT);
  if (input) return input;
  const button = findButton(/^(add optional coverage|update coverage data)\b/i);
  if (!button) throw new Error('DynastyHQ could not open the Coverage Data scanner.');
  button.click();
  input = await waitFor(
    () => document.querySelector(COVERAGE_INPUT),
    'DynastyHQ could not mount the Coverage Data scanner.',
  );
  return input;
};

const routeBatch = async ({ files, user, career }) => {
  const idToken = await user.getIdToken();
  const routed = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    try {
      const imageDataUrl = await compressImage(file, 1400, 0.74);
      const route = await routeSessionScreenshot({
        idToken,
        imageDataUrl,
        fileName: file.name,
        player: career?.player || {},
      });
      routed.push({ file, route });
    } catch (error) {
      routed.push({
        file,
        route: { lanes: [], screenType: 'unknown', confidence: 0, reason: error?.message || 'Routing failed.' },
      });
    }
    window.dispatchEvent(new CustomEvent('dynastyhq:session-route-progress', {
      detail: { completed: index + 1, total: files.length },
    }));
  }
  return routed;
};

const groupsFromRoutes = (routed) => {
  const game = [];
  const rtg = [];
  const coverage = [];
  const unknown = [];

  routed.forEach(({ file, route }) => {
    const lanes = new Set(route?.lanes || []);
    if (!lanes.size) {
      unknown.push(file);
      return;
    }
    if (lanes.has('game')) game.push(file);
    if (lanes.has('rtg')) rtg.push(file);
    if (lanes.has('coverage')) coverage.push(file);
  });

  // Safety fallback: an uncertain screen is allowed through each specialized scanner
  // rather than being silently ignored. Each scanner still rejects unsupported facts.
  unknown.forEach((file) => {
    game.push(file);
    rtg.push(file);
    coverage.push(file);
  });

  return {
    game: uniqueFiles(game),
    rtg: uniqueFiles(rtg),
    coverage: uniqueFiles(coverage),
    unknown: uniqueFiles(unknown),
  };
};

const SessionImportRoutingPortal = () => {
  const { user, career } = useOwnerCareer();

  useEffect(() => {
    if (!user || !career) return undefined;

    let routing = false;

    const intercept = async (event) => {
      const input = event.target;
      if (
        routing
        || window.__dhqSessionRouterBypass
        || !document.body.classList.contains('dhq-session-import-mode')
        || !isSessionGameInput(input)
      ) return;

      const files = [...(input.files || [])];
      if (!files.length) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      routing = true;
      window.__dhqSessionRoutingInterceptedAt = Date.now();

      try {
        window.dispatchEvent(new CustomEvent('dynastyhq:session-routing-start', { detail: { total: files.length } }));
        const routed = await routeBatch({ files, user, career });
        const groups = groupsFromRoutes(routed);
        window.__dhqSessionRouteSummary = {
          total: files.length,
          game: groups.game.length,
          rtg: groups.rtg.length,
          coverage: groups.coverage.length,
          unknown: groups.unknown.length,
          routes: routed.map(({ file, route }) => ({
            fileName: file.name,
            lanes: route?.lanes || [],
            screenType: route?.screenType || 'unknown',
            confidence: Number(route?.confidence) || 0,
          })),
        };

        // Process the auxiliary lanes first so Session Import does not enter the
        // Game Data verification desk until RTG and Coverage are already preloaded.
        if (groups.rtg.length) {
          const rtgInput = await ensureRtgInput();
          dispatchFiles(rtgInput, groups.rtg);
          await waitForScannerCycle(RTG_INPUT, 'RTG Status');
        }

        if (groups.coverage.length) {
          const coverageInput = await ensureCoverageInput();
          dispatchFiles(coverageInput, groups.coverage);
          await waitForScannerCycle(COVERAGE_INPUT, 'Coverage Data');
        }

        // A normal postgame session should contain Game Data. If it does not,
        // still send the original batch through the proven scanner so the
        // Session Import workflow can reach its verification desk instead of hanging.
        dispatchGameFiles(input, groups.game.length ? groups.game : files);

        if (!groups.game.length) {
          window.dispatchEvent(new CustomEvent('dynastyhq:session-routing-no-game', {
            detail: window.__dhqSessionRouteSummary,
          }));
        }

        window.dispatchEvent(new CustomEvent('dynastyhq:session-routing-complete', {
          detail: window.__dhqSessionRouteSummary,
        }));
      } catch (error) {
        console.error('Session Import routing failed', error);
        window.dispatchEvent(new CustomEvent('dynastyhq:session-routing-error', {
          detail: { message: error?.message || 'Session Import routing failed.' },
        }));
        // Never strand the user's batch. If the routing bridge itself fails,
        // fall back to the exact Game Data behavior Session Import used before.
        dispatchGameFiles(input, files);
      } finally {
        routing = false;
      }
    };

    document.addEventListener('change', intercept, true);
    return () => document.removeEventListener('change', intercept, true);
  }, [career, user]);

  return null;
};

export default SessionImportRoutingPortal;
