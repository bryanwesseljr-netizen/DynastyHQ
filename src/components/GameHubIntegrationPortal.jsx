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

const issueForPublication = (career = {}, publicationId = '') => {
  const { season, week } = seasonWeekFromPublication(publicationId);
  return asArray(career.newsroomIssues).find((issue) => (
    issue?.publicationId === publicationId
    || issue?.id === publicationId
    || (Number(issue?.season || 1) === season && Number(issue?.week) === week)
  )) || null;
};

const findNewsroomNav = () => [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')]
  .find((button) => /^(?:the\s+)?newsroom$/i.test(clean(button.textContent)) && button.offsetParent !== null)
  || [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')]
    .find((button) => /^(?:the\s+)?newsroom$/i.test(clean(button.textContent)))
  || null;

const setNativeSelectValue = (select, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
  if (setter) setter.call(select, value);
  else select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
};

const exactStoryCard = (outletId, headline) => [...document.querySelectorAll('.dhq-newsroom-story-card')]
  .find((card) => (
    (!outletId || clean(card.dataset.newsroomOutletId) === outletId)
    && (!headline || clean(card.getAttribute('aria-label')).includes(headline))
  )) || null;

const routeToExactNewsroomStory = ({ issue, story }) => {
  if (!issue || !story) return;
  const issueId = issue.id || issue.publicationId;
  const outletId = clean(story.outletId);
  const headline = clean(story.headline || story.title);
  if (!issueId || !headline) return;

  window.__dhqNewsroomExactStoryPending = true;
  findNewsroomNav()?.click();
  let finished = false;
  let resetCancelled = false;

  const finish = () => {
    finished = true;
    delete window.__dhqNewsroomExactStoryPending;
    window.requestAnimationFrame(() => {
      const main = document.querySelector('main[data-active-tab="newsroom"]');
      if (main?.scrollTo) main.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      else window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
    });
  };

  const attempt = () => {
    if (finished) return;

    // Newsroom normally resets to its landing page when the top navigation is used.
    // A Team News click is the existing signal that cancels that delayed reset.
    if (!resetCancelled) {
      const teamNews = [...document.querySelectorAll('nav[aria-label="Newsroom desks"] button')]
        .find((button) => /team\s+news/i.test(clean(button.textContent)));
      if (teamNews) {
        resetCancelled = true;
        teamNews.click();
      }
    }

    const hubStory = [...document.querySelectorAll('[data-team-newsroom-hub="true"] button')]
      .find((button) => clean(button.textContent).includes(headline));
    if (hubStory) {
      hubStory.click();
      finish();
      return;
    }

    const select = document.querySelector('select[aria-label="Choose weekly newsroom edition"]');
    if (!select) return;
    if (select.value !== issueId) setNativeSelectValue(select, issueId);

    const card = exactStoryCard(outletId, headline);
    if (!card) return;
    card.click();
    finish();
  };

  [50, 110, 190, 300, 480, 720, 1050, 1450, 2000, 2800, 3600].forEach((delay) => {
    window.setTimeout(attempt, delay);
  });
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

      const currentCareer = careerRef.current || {};
      const publicationId = publicationFromHub(currentCareer);
      const issue = issueForPublication(currentCareer, publicationId);
      const card = button.closest('.dhq-gh-wide-card');
      const visibleHeadline = clean(card?.querySelector('h2')?.textContent);
      const story = asArray(issue?.articles).find((article) => clean(article?.headline || article?.title) === visibleHeadline)
        || asArray(issue?.articles)[0]
        || null;
      if (!issue || !story) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      routeToExactNewsroomStory({ issue, story });
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
