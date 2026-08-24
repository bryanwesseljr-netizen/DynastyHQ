import { useEffect } from 'react';

const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const productionActionPattern = /^(?:create|regenerate) transcript$|^generating transcript|^(?:generate|regenerate) humanized audio$|^rendering humanized audio/i;

const isPodcastProductionControl = (element) => {
  const text = normalize(element?.textContent);
  if (!text) return false;

  if (element.tagName === 'ASIDE' && /script\s*\+\s*humanized audio/i.test(text)) return true;

  if (element.tagName === 'BUTTON') {
    if (productionActionPattern.test(text)) return true;
    if (/podcast v3/i.test(text) && /script\s*\+\s*audio|open/i.test(text)) return true;
  }

  return false;
};

const lockControl = (element) => {
  if (!element || element.dataset.dhqPublicShareLocked === 'true') return;
  element.dataset.dhqPublicShareLocked = 'true';
  element.setAttribute('aria-hidden', 'true');
  element.setAttribute('tabindex', '-1');
  element.style.setProperty('display', 'none', 'important');
  element.style.setProperty('pointer-events', 'none', 'important');
  if ('disabled' in element) element.disabled = true;
};

const PublicShareGuard = () => {
  useEffect(() => {
    const scrubOwnerControls = () => {
      document.querySelectorAll('aside, button').forEach((element) => {
        if (isPodcastProductionControl(element)) lockControl(element);
      });
    };

    document.documentElement.dataset.dhqPublicShare = 'true';
    scrubOwnerControls();

    const observer = new MutationObserver(scrubOwnerControls);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      delete document.documentElement.dataset.dhqPublicShare;
    };
  }, []);

  return null;
};

export default PublicShareGuard;
