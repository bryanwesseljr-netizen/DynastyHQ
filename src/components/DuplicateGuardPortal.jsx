import { useEffect } from 'react';

const previousDisplay = new WeakMap();

const normalize = (value) => String(value || '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const setDuplicateState = (element, duplicate) => {
  if (!element) return;
  if (duplicate) {
    if (element.dataset.dhqDisplayDuplicate !== 'true') {
      previousDisplay.set(element, {
        value: element.style.getPropertyValue('display'),
        priority: element.style.getPropertyPriority('display'),
      });
    }
    element.dataset.dhqDisplayDuplicate = 'true';
    element.hidden = true;
    element.style.setProperty('display', 'none', 'important');
    return;
  }

  if (element.dataset.dhqDisplayDuplicate === 'true') {
    delete element.dataset.dhqDisplayDuplicate;
    element.hidden = false;
    const prior = previousDisplay.get(element);
    if (prior?.value) element.style.setProperty('display', prior.value, prior.priority || '');
    else element.style.removeProperty('display');
    previousDisplay.delete(element);
  }
};

const dedupeItems = (items, keyFor) => {
  const seen = new Set();
  items.forEach((item) => {
    const key = normalize(keyFor(item));
    if (!key) {
      setDuplicateState(item, false);
      return;
    }
    const duplicate = seen.has(key);
    setDuplicateState(item, duplicate);
    if (!duplicate) seen.add(key);
  });
};

const exactCardKey = (element) => element.getAttribute('aria-label') || element.textContent;

const isOneTimeCommitment = (value) => /\bcommits?\s+to\b|\bcommitment\s+to\b/i.test(String(value || ''));

const dashboardMilestoneKey = (row) => {
  const title = row.querySelector('strong')?.textContent || '';
  return isOneTimeCommitment(title) ? `commitment:${title}` : exactCardKey(row);
};

const chronicleMilestoneKey = (button) => {
  const paragraphs = [...button.querySelectorAll('p')];
  const title = paragraphs[1]?.textContent || button.querySelector('h3,strong')?.textContent || '';
  return isOneTimeCommitment(title) ? `commitment:${title}` : exactCardKey(button);
};

const schoolRowKey = (row) => row.querySelector('strong')?.textContent || row.textContent;

const applySpecificRules = () => {
  // Dashboard milestone/list rows are intentionally discovered by structure,
  // not a card id, so the guard survives card renames or stage-specific shells.
  // This semantic pass runs AFTER the generic exact-text audit so one-time
  // milestones cannot be re-shown just because their week metadata differs.
  document.querySelectorAll('.dhq-v2-card__body').forEach((container) => {
    const milestoneRows = [...container.querySelectorAll('.dhq-v2-list-row')];
    if (milestoneRows.length > 1) dedupeItems(milestoneRows, dashboardMilestoneKey);
  });

  document.querySelectorAll('[data-dashboard-card="recent-results"] .dhq-v2-card__body').forEach((container) => {
    dedupeItems([...container.querySelectorAll('.dhq-v2-result-row')], exactCardKey);
  });

  document.querySelectorAll('[data-dashboard-card="trophy-case"] .dhq-v2-card__body').forEach((container) => {
    dedupeItems([...container.querySelectorAll('.dhq-v2-trophy')], exactCardKey);
  });

  document.querySelectorAll('[data-dashboard-card="top-schools"] .dhq-v2-card__body').forEach((container) => {
    dedupeItems([...container.querySelectorAll('.dhq-v2-school-row')], schoolRowKey);
  });

  document.querySelectorAll('.dhq-page-main[data-active-tab="newsroom"] section[aria-labelledby="weekly-coverage-title"] .grid').forEach((container) => {
    dedupeItems([...container.querySelectorAll(':scope > .dhq-newsroom-story-card')], exactCardKey);
  });

  document.querySelectorAll('.dhq-page-main[data-active-tab="chronicle"] section.border-amber-500\\/20 > div.mt-4').forEach((container) => {
    dedupeItems([...container.querySelectorAll(':scope > button')], chronicleMilestoneKey);
  });

  document.querySelectorAll('[data-coach-recruiting-v2] .divide-y').forEach((container) => {
    dedupeItems([...container.querySelectorAll(':scope > div')], schoolRowKey);
  });
};

const GENERIC_CONTAINER_SELECTOR = [
  '#dynastyhq-command-center .dhq-v2-grid',
  '#dynastyhq-command-center [data-dashboard-card] .grid',
  '#dynastyhq-command-center [data-dashboard-card] .divide-y',
  '.dhq-weekly-agenda-v2 .grid',
  '.dhq-weekly-agenda-v2 .divide-y',
  '.dhq-page-main[data-active-tab="recruiting"] .grid',
  '.dhq-page-main[data-active-tab="recruiting"] .divide-y',
  '.dhq-page-main[data-active-tab="newsroom"] .grid',
  '.dhq-page-main[data-active-tab="newsroom"] .divide-y',
  '.dhq-page-main[data-active-tab="podcast"] .grid',
  '.dhq-page-main[data-active-tab="podcast"] .divide-y',
  '.dhq-page-main[data-active-tab="chronicle"] .grid',
  '.dhq-page-main[data-active-tab="chronicle"] .divide-y',
  '.dhq-page-main[data-active-tab="legacy"] .grid',
  '.dhq-page-main[data-active-tab="legacy"] .divide-y',
  '.dhq-page-main[data-active-tab="settings"] .grid',
  '.dhq-page-main[data-active-tab="settings"] .divide-y',
].join(',');

const applyExactSiblingRule = () => {
  document.querySelectorAll(GENERIC_CONTAINER_SELECTOR).forEach((container) => {
    const children = [...container.children].filter((child) => (
      ['DIV', 'BUTTON', 'ARTICLE', 'SECTION'].includes(child.tagName)
      && !child.matches('[data-dhq-display-dedupe-ignore]')
    ));
    if (children.length < 2) return;

    const seen = new Set();
    children.forEach((child) => {
      const key = normalize(child.getAttribute('aria-label') || child.textContent);
      if (key.length < 16) {
        if (child.dataset.dhqDisplayDuplicate === 'true') setDuplicateState(child, false);
        return;
      }
      const duplicate = seen.has(key);
      setDuplicateState(child, duplicate);
      if (!duplicate) seen.add(key);
    });
  });
};

const runDuplicateAudit = () => {
  // Exact-text cleanup goes first. Semantic rules go last so they remain
  // authoritative when two logical duplicates carry different metadata.
  applyExactSiblingRule();
  applySpecificRules();
};

const DuplicateGuardPortal = () => {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        runDuplicateAudit();
      });
    };

    runDuplicateAudit();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      document.querySelectorAll('[data-dhq-display-duplicate="true"]').forEach((element) => setDuplicateState(element, false));
    };
  }, []);

  return null;
};

export default DuplicateGuardPortal;
