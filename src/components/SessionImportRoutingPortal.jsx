import { useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { CAREER_STAGES, deriveCareerStage } from '../domain/commandCenter.js';
import { appId, db } from '../firebase.js';
import { compressImage } from '../services/imageCompression.js';
import { routeSessionScreenshot } from '../services/sessionScreenshotRouterClient.js';
import { resetSessionImportTelemetry } from '../services/sessionImportTelemetry.js';
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

const findWeeklyWorkspace = () => (
  document.querySelector('main.dhq-page-main[data-active-tab="dataEntry"] .dhq-weekly-agenda-workspace')
  || [...document.querySelectorAll('.dhq-weekly-agenda-workspace')].find(visible)
  || null
);

const findCollegeGameInput = () => {
  const workspace = findWeeklyWorkspace();
  if (!workspace) return null;
  const labels = [...workspace.querySelectorAll('label')];
  const label = labels.find((entry) => /choose weekly screenshots/i.test(clean(entry.textContent)));
  const input = label?.querySelector('input[type="file"][accept*="image"]') || null;
  return input?.multiple ? input : null;
};

const findHighSchoolPostgameInput = () => (
  findWeeklyWorkspace()?.querySelector('input[type="file"][aria-label^="Upload Postgame Tape Score / Recruiting Summary"]')
  || null
);

const findHighSchoolMomentInput = (momentNumber) => (
  findWeeklyWorkspace()?.querySelector(`input[type="file"][aria-label^="Upload Moment ${momentNumber} screenshot"]`)
  || null
);

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

const waitForScannerCycle = (getter, label, timeoutMs = ROUTING_TIMEOUT) => new Promise((resolve, reject) => {
  const startedAt = Date.now();
  let sawBusy = false;
  const check = () => {
    const input = getter();
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

const ensureCollegeGameInput = async ({ user, career }) => {
  let input = findCollegeGameInput();
  if (input) return input;

  const derivedStage = deriveCareerStage(career || {});
  const hasStaleCommitmentFlag = (
    derivedStage === CAREER_STAGES.COLLEGE
    && career?.careerPhase === 'Player'
    && career?.player?.isCommitted !== true
  );

  if (hasStaleCommitmentFlag && user?.uid && db) {
    // Older saves can already be an established college career while retaining a
    // false legacy commitment flag. The old Weekly Agenda uses that flag alone to
    // choose its scanner. Repair only when the career-stage engine independently
    // proves this is already a college career.
    const careerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    await updateDoc(careerRef, { 'player.isCommitted': true });
    window.__dhqLegacyCollegeCommitmentRepairedAt = Date.now();

    return waitFor(
      findCollegeGameInput,
      'DynastyHQ repaired the stale college-career flag, but the current Weekly Agenda still does not expose the college Game Data scanner. Nothing was sent to the high-school Postgame Tape Score lane. Reload this preview once and retry the same batch.',
      12000,
    );
  }

  return waitFor(
    findCollegeGameInput,
    `DynastyHQ recognized college Game Data, but the current Weekly Agenda still does not expose the college Game Data scanner. Derived career stage: ${derivedStage}. Nothing was sent to the high-school Postgame Tape Score lane.`,
    12000,
  );
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
        careerPhase: career?.careerPhase || '',
      });
      routed.push({ file, route });
    } catch (error) {
      routed.push({
        file,
        route: { lanes: [], screenType: 'unknown', momentNumber: 0, confidence: 0, reason: error?.message || 'Routing failed.' },
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
  const highSchoolPostgame = [];
  const highSchoolMoments = [];
  const unknown = [];

  routed.forEach(({ file, route }) => {
    const lanes = new Set(route?.lanes || []);
    if (!lanes.size || route?.screenType === 'unknown') {
      unknown.push(file);
      return;
    }
    if (lanes.has('game')) game.push(file);
    if (lanes.has('rtg')) rtg.push(file);
    if (lanes.has('coverage')) coverage.push(file);
    if (lanes.has('high_school')) {
      if (route?.screenType === 'high_school_postgame') highSchoolPostgame.push(file);
      else if (route?.screenType === 'high_school_moment') highSchoolMoments.push({ file, momentNumber: Number(route?.momentNumber) || 0 });
      else unknown.push(file);
    }
  });

  return {
    game: uniqueFiles(game),
    rtg: uniqueFiles(rtg),
    coverage: uniqueFiles(coverage),
    highSchoolPostgame: uniqueFiles(highSchoolPostgame),
    highSchoolMoments,
    unknown: uniqueFiles(unknown),
  };
};

const fileNamesPreview = (files) => files.slice(0, 3).map((file) => file.name).join(', ');

const SessionImportRoutingPortal = () => {
  const { user, career } = useOwnerCareer();

  useEffect(() => {
    if (!user || !career) return undefined;

    let routing = false;
    window.__dhqSessionRouterReady = true;

    const processBatch = async (event) => {
      if (routing) return;
      const files = uniqueFiles([...(event?.detail?.files || [])].filter((file) => file instanceof File));
      if (!files.length) return;

      routing = true;
      window.__dhqSessionRoutingBusy = true;
      window.__dhqSessionRoutingInterceptedAt = Date.now();
      resetSessionImportTelemetry();

      try {
        window.dispatchEvent(new CustomEvent('dynastyhq:session-routing-start', { detail: { total: files.length } }));
        const routed = await routeBatch({ files, user, career });
        const groups = groupsFromRoutes(routed);
        const unresolvedMomentFiles = groups.highSchoolMoments
          .filter((entry) => entry.momentNumber < 1 || entry.momentNumber > 4)
          .map((entry) => entry.file);
        const unresolved = uniqueFiles([...groups.unknown, ...unresolvedMomentFiles]);

        const summary = {
          total: files.length,
          game: groups.game.length,
          rtg: groups.rtg.length,
          coverage: groups.coverage.length,
          highSchool: groups.highSchoolPostgame.length + groups.highSchoolMoments.length,
          unknown: unresolved.length,
          routes: routed.map(({ file, route }) => ({
            fileName: file.name,
            lanes: route?.lanes || [],
            screenType: route?.screenType || 'unknown',
            momentNumber: Number(route?.momentNumber) || 0,
            confidence: Number(route?.confidence) || 0,
            reason: route?.reason || '',
          })),
        };
        window.__dhqSessionRouteSummary = summary;
        window.dispatchEvent(new CustomEvent('dynastyhq:session-routing-classified', { detail: summary }));

        const isCollegeBatch = groups.game.length || groups.rtg.length || groups.coverage.length || groups.unknown.length;
        const gameInput = isCollegeBatch && (groups.game.length || groups.unknown.length)
          ? await ensureCollegeGameInput({ user, career })
          : findCollegeGameInput();

        if (unresolvedMomentFiles.length) {
          throw new Error(`DynastyHQ recognized ${unresolvedMomentFiles.length} high-school Moment screenshot${unresolvedMomentFiles.length === 1 ? '' : 's'}, but the exact Moment 1–4 number is not visible. Nothing was guessed. Use the guided Moment slots for ${fileNamesPreview(unresolvedMomentFiles)}.`);
        }

        if (unresolved.length && !gameInput && !groups.highSchoolPostgame.length && !groups.highSchoolMoments.length) {
          throw new Error(`DynastyHQ could not safely classify ${unresolved.length} screenshot${unresolved.length === 1 ? '' : 's'} (${fileNamesPreview(unresolved)}). Nothing was routed into the wrong lane. Try those screenshots separately or use the guided scanner.`);
        }

        // Process Game Data first. The old implementation processed RTG/Coverage first,
        // then mounting the Game review could remount Weekly Agenda and erase those
        // unsaved auxiliary review states. Game-first keeps the later RTG/Coverage
        // review panels alive for the user to verify.
        const collegeReviewFiles = gameInput ? uniqueFiles([...groups.game, ...groups.unknown]) : [];
        if (collegeReviewFiles.length) {
          dispatchFiles(gameInput, collegeReviewFiles);
          await waitFor(
            () => document.querySelector('.dhq-postgame-review'),
            'Game Data analysis did not produce a verification draft.',
            ROUTING_TIMEOUT,
          );
        }

        if (groups.rtg.length) {
          const rtgInput = await ensureRtgInput();
          dispatchFiles(rtgInput, groups.rtg);
          await waitForScannerCycle(() => document.querySelector(RTG_INPUT), 'RTG Status');
        }

        if (groups.coverage.length) {
          const coverageInput = await ensureCoverageInput();
          dispatchFiles(coverageInput, groups.coverage);
          await waitForScannerCycle(() => document.querySelector(COVERAGE_INPUT), 'Coverage Data');
        }

        if (groups.highSchoolPostgame.length) {
          const postgameInput = findHighSchoolPostgameInput();
          if (!postgameInput) {
            throw new Error('DynastyHQ recognized high-school Postgame / Recruiting screens, but the current Weekly Agenda is not in high-school evaluation mode. Nothing was applied.');
          }
          dispatchFiles(postgameInput, groups.highSchoolPostgame);
          await waitForScannerCycle(findHighSchoolPostgameInput, 'High-school Postgame scanner');
        }

        for (const entry of groups.highSchoolMoments) {
          const momentInput = findHighSchoolMomentInput(entry.momentNumber);
          if (!momentInput) {
            throw new Error(`DynastyHQ could not mount the guided Moment ${entry.momentNumber} scanner.`);
          }
          dispatchFiles(momentInput, [entry.file]);
          await waitForScannerCycle(() => findHighSchoolMomentInput(entry.momentNumber), `High-school Moment ${entry.momentNumber} scanner`);
        }

        if (!groups.game.length && !groups.unknown.length) {
          window.dispatchEvent(new CustomEvent('dynastyhq:session-routing-no-game', { detail: summary }));
        }
        window.__dhqSessionRoutingBusy = false;
        window.__dhqSessionRoutingCompleteAt = Date.now();
        window.dispatchEvent(new CustomEvent('dynastyhq:session-routing-complete', { detail: summary }));
      } catch (error) {
        console.error('Session Import routing failed', error);
        window.__dhqSessionRoutingBusy = false;
        window.dispatchEvent(new CustomEvent('dynastyhq:session-routing-error', {
          detail: { message: error?.message || 'Session Import routing failed. Nothing was applied.' },
        }));
      } finally {
        routing = false;
      }
    };

    window.addEventListener('dynastyhq:session-import-files', processBatch);
    return () => {
      window.__dhqSessionRouterReady = false;
      window.__dhqSessionRoutingBusy = false;
      window.removeEventListener('dynastyhq:session-import-files', processBatch);
    };
  }, [career, user]);

  return null;
};

export default SessionImportRoutingPortal;
