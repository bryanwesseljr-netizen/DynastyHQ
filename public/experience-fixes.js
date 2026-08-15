(() => {
  const commitmentKey = (text = '') => {
    const normalized = String(text).replace(/\s+/g, ' ').trim();
    const match = normalized.match(/\bcommits?\s+to\s+(.+?)(?:\s+the\s+college\s+commitment|\s+was\s+user|[.!]|$)/i);
    return match?.[1] ? match[1].trim().toLowerCase() : '';
  };

  const dedupeElements = (elements) => {
    const seen = new Set();
    elements.forEach((element) => {
      const key = commitmentKey(element.textContent || '');
      if (!key) return;
      if (seen.has(key)) {
        element.hidden = true;
        element.setAttribute('data-dhq-duplicate-commitment', 'true');
      } else {
        seen.add(key);
        if (element.getAttribute('data-dhq-duplicate-commitment') === 'true') {
          element.hidden = false;
          element.removeAttribute('data-dhq-duplicate-commitment');
        }
      }
    });
  };

  const repairDuplicateCommitments = () => {
    const chronicle = document.querySelector('main[data-active-tab="chronicle"]');
    if (chronicle) {
      // Each Chronicle section is deduped independently so a legitimate Turning
      // Point can still also appear once in the full chronological timeline.
      chronicle.querySelectorAll('section').forEach((section) => {
        const buttons = [...section.querySelectorAll(':scope button')]
          .filter((button) => commitmentKey(button.textContent || ''));
        if (buttons.length > 1) dedupeElements(buttons);
      });
    }

    const dashboard = document.querySelector('main[data-active-tab="dashboard"] #dynastyhq-command-center');
    if (dashboard) {
      const rows = [...dashboard.querySelectorAll('[class*="grid-cols-[42px"]')]
        .filter((row) => commitmentKey(row.textContent || ''));
      if (rows.length > 1) dedupeElements(rows);
    }
  };

  let queued = false;
  const queueRepair = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      repairDuplicateCommitments();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', queueRepair, { once: true });
  } else {
    queueRepair();
  }

  const observer = new MutationObserver(queueRepair);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
