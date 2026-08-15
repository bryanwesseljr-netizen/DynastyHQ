(() => {
  const PROFILE_TITLE = 'Your Profile';

  const tagProfileCard = () => {
    document.querySelectorAll('.dhq-dashboard-card').forEach((card) => {
      const heading = card.querySelector('h3');
      if (!heading || heading.textContent.trim() !== PROFILE_TITLE) return;
      card.classList.add('dhq-profile-polish');

      const body = card.children?.[1]?.firstElementChild;
      if (body) body.classList.add('dhq-profile-body');

      const name = card.querySelector('.truncate');
      if (name) name.classList.add('dhq-profile-name');

      const headshot = [...card.querySelectorAll('div')]
        .find((node) => String(node.className || '').includes('group/headshot'));
      if (headshot) headshot.classList.add('dhq-profile-headshot');

      const metrics = body?.lastElementChild;
      if (metrics) metrics.classList.add('dhq-profile-metrics');
    });
  };

  let queued = false;
  const apply = () => {
    queued = false;
    tagProfileCard();
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(apply);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  const root = document.getElementById('root');
  if (root) new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
})();
