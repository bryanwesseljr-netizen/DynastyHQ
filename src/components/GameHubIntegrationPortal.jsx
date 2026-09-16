import { useEffect, useRef } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, db } from '../firebase';
import {
  matchesOfficialCoverageWeek,
  officialCoverageForWeek,
  publicationIdFor,
} from '../domain/officialCoverageCapture.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const clean = (value) => String(value ?? '').trim();
const asArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean);
  return [];
};

const publicationFromHub = (career = {}) => {
  const select = document.querySelector('.dhq-game-hub__toolbar select');
  const selected = clean(select?.value);
  if (/^season-\d+-week-\d+$/.test(selected)) return selected;
  return publicationIdFor(career.currentSeason || 1, career.currentWeek || 1);
};

const seasonWeekFromPublication = (publicationId = '') => {
  const match = clean(publicationId).match(/^season-(\d+)-week-(\d+)$/);
  return match
    ? { season: Number(match[1]) || 1, week: Number(match[2]) || 1 }
    : { season: 1, week: 1 };
};

const findNewsroomNav = () => [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')]
  .find((button) => /^(?:the\s+)?newsroom$/i.test(clean(button.textContent)) && button.offsetParent !== null)
  || [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')]
    .find((button) => /^(?:the\s+)?newsroom$/i.test(clean(button.textContent)))
  || null;

const routeToNewsroomHome = () => {
  const nav = findNewsroomNav();
  if (!nav) return;

  window.__dhqNewsroomHomePending = true;
  nav.click();

  let finished = false;
  let deskSelected = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    delete window.__dhqNewsroomHomePending;
    window.requestAnimationFrame(() => {
      const main = document.querySelector('main[data-active-tab="newsroom"]');
      if (main?.scrollTo) main.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      else window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
    });
  };

  const attempt = () => {
    if (finished) return;
    const main = document.querySelector('main[data-active-tab="newsroom"]');
    if (!main) return;

    // If the user last left Newsroom with a story open, explicitly return to the
    // newsroom landing page instead of restoring that reader state.
    const backToArticles = [...main.querySelectorAll('button')]
      .find((button) => /^back\s+to\s+all\s+articles$/i.test(clean(button.textContent)));
    if (backToArticles) {
      backToArticles.click();
      return;
    }

    // The Team News desk is the main DynastyHQ newsroom landing experience.
    // Selecting it also cancels any stale delayed desk reset without opening a story.
    if (!deskSelected) {
      const teamNews = [...document.querySelectorAll('nav[aria-label="Newsroom desks"] button')]
        .find((button) => /team\s+news/i.test(clean(button.textContent)));
      if (teamNews) {
        deskSelected = true;
        teamNews.click();
      }
    }

    const newsroomHome = document.querySelector('[data-team-newsroom-hub="true"]');
    if (newsroomHome || document.querySelector('#weekly-coverage-title')) finish();
  };

  [30, 70, 130, 220, 360, 560, 820, 1150, 1550, 2100, 2800, 3600].forEach((delay) => {
    window.setTimeout(attempt, delay);
  });
  window.setTimeout(() => {
    delete window.__dhqNewsroomHomePending;
  }, 4500);
};

const updateOfficialCard = (career = {}) => {
  const card = document.querySelector('.dhq-game-hub .dhq-gh-official-card');
  const copy = card?.querySelector('.dhq-gh-official-copy');
  if (!copy) return;

  const publicationId = publicationFromHub(career);
  const { season, week } = seasonWeekFromPublication(publicationId);
  const resolved = officialCoverageForWeek(career, season, week);
  const heading = copy.querySelector('h2');
  const paragraph = copy.querySelector('p');
  if (!heading || !paragraph) return;

  if (resolved.kind === 'official' || resolved.kind === 'source') {
    const headline = clean(resolved.entry?.headline || resolved.entry?.title) || 'EA SPORTS Network game coverage';
    const summary = clean(resolved.entry?.dek || resolved.entry?.summary || resolved.entry?.body)
      || 'Official College Football 27 coverage was captured for this game.';
    if (heading.textContent !== headline) heading.textContent = headline;
    if (paragraph.textContent !== summary) paragraph.textContent = summary;
    card.dataset.dhqOfficialStatus = 'captured';
    return;
  }

  if (resolved.kind !== 'legacy-import') return;
  const currentlyClaimsMissing = /not captured|has not been captured/i.test(clean(heading.textContent));
  if (!currentlyClaimsMissing && card.dataset.dhqOfficialStatus === 'legacy-import') return;

  heading.textContent = 'Official article status unavailable from this legacy import';
  const coverageNote = resolved.coverageFactCount
    ? ` ${resolved.coverageFactCount} verified editorial facts are still attached to this game.`
    : '';
  paragraph.textContent = `Week ${week} was imported from ${resolved.sourceCount} source screenshot${resolved.sourceCount === 1 ? '' : 's'}, but the older importer did not preserve EA SPORTS Network article identity as a separate permanent record.${coverageNote} The previous “not captured” label was therefore too strong. New recognized official-network scans will be saved here automatically.`;
  card.dataset.dhqOfficialStatus = 'legacy-import';
};

const GameHubIntegrationPortal = () => {
  const { user, career } = useOwnerCareer();
  const careerRef = useRef(career);
  const userRef = useRef(user);

  useEffect(() => { careerRef.current = career; }, [career]);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    const handleOfficialCapture = async (event) => {
      const currentUser = userRef.current;
      const currentCareer = careerRef.current;
      const detail = event?.detail || {};
      if (!currentUser || !db || !currentCareer || !clean(detail.headline)) return;

      const season = Number(currentCareer.currentSeason) || 1;
      const week = Number(currentCareer.currentWeek) || 1;
      const publicationId = publicationIdFor(season, week);
      try {
        const ref = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'hq_data', 'main');
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(ref);
          if (!snapshot.exists()) return;
          const remote = snapshot.data();
          const current = asArray(remote.officialCoverage);
          const entry = {
            publicationId,
            season,
            week,
            outlet: clean(detail.outlet) || 'EA SPORTS Network',
            headline: clean(detail.headline),
            summary: clean(detail.summary),
            sourceFileName: clean(detail.sourceFileName),
            source: 'session-import',
            capturedAt: detail.capturedAt || new Date().toISOString(),
          };
          const existingIndex = current.findIndex((item) => matchesOfficialCoverageWeek(item, season, week, publicationId));
          const next = [...current];
          if (existingIndex >= 0) next[existingIndex] = { ...next[existingIndex], ...entry };
          else next.push(entry);
          transaction.update(ref, {
            officialCoverage: next,
            '_sync.revision': (Number(remote?._sync?.revision) || 0) + 1,
            '_sync.deviceId': 'official-coverage-capture',
            '_sync.updatedAt': new Date().toISOString(),
          });
        });
      } catch (error) {
        console.error('DynastyHQ official coverage capture could not be saved', error);
      }
    };

    window.addEventListener('dynastyhq:official-coverage-captured', handleOfficialCapture);
    return () => window.removeEventListener('dynastyhq:official-coverage-captured', handleOfficialCapture);
  }, []);

  useEffect(() => {
    const handleClick = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest('.dhq-game-hub button');
      if (!button || !/^open\s+newsroom\b/i.test(clean(button.textContent))) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      routeToNewsroomHome();
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  useEffect(() => {
    if (!career) return undefined;
    let scheduled = false;
    const sync = () => {
      scheduled = false;
      updateOfficialCard(careerRef.current || {});
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };
    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('change', schedule, true);
    return () => {
      observer.disconnect();
      document.removeEventListener('change', schedule, true);
    };
  }, [career]);

  return null;
};

export default GameHubIntegrationPortal;
