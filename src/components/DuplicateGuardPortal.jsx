import { useEffect } from 'react';

const normalize = (value) => String(value || '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const setDuplicateState = (element, duplicate) => {
  if (!element) return;
  if (duplicate) {
    element.dataset.dhqDisplayDuplicate = 'true';
    element.hidden = true;
  } else if (element.dataset.dhqDisplayDuplicate === 'true') {
    delete element.dataset.dhqDisplayDuplicate;
    element.hidden = false;
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

const dashboardMilestoneKey = (row) => row.querySelector('strong')?.textContent || '';

const chronicleMilestoneKey = (button) => {
  const paragraphs = [...button.querySelectorAll('p')];
  return paragraphs[1]?.textContent || button.querySelector('h3,strong')?.textContent || '';
};

const schoolRowKey = (row) => row.querySelector('strong')?.textContent || row.textContent;

const exactCardKey = (element) => element.getAttribute('aria-label') || element.textContent;

const applySpecificRules = () => {
  document.querySelectorAll('[data-dashboard-card="milestones"] .dhq-v2-card__body').forEach((container) => {
    dedupeItems([...container.querySelectorAll('.dhq-v2-list-row')], dashboardMilestoneKey);
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
  '#dynastyhq-command-center [data-dashboard-card] .grid',
  '#dynastyhq-command-center [data-dashboard-card] .divide-y',
  '.dhq-page-main[data-active-tab="recruiting"] .grid',
  '.dhq-page-main[data-active-tab="recruiting"] .divide-y',
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

const dedupeNewsroomOptions = () => {
  document.querySelectorAll('select[aria-label="Choose weekly newsroom edition"]').forEach((select) => {
    const seen = new Set();
    [...select.options].forEach((option) => {
      const key = normalize(option.textContent);
      if (!key) return;
      const duplicate = seen.has(key);
      option.hidden = duplicate;
      option.disabled = duplicate;
      if (!duplicate) seen.add(key);
    });
  });
};

const runDuplicateAudit = () => {
  applySpecificRules();
  applyExactSiblingRule();
  dedupeNewsroomOptions();
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
      document.querySelectorAll('[data-dhq-display-duplicate="true"]').forEach((element) => {
        delete element.dataset.dhqDisplayDuplicate;
        element.hidden = false;
      });
    };
  }, []);

  return null;
};

export default DuplicateGuardPortal;
