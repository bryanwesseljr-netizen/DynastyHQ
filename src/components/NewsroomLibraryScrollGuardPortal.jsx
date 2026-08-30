import { useEffect } from 'react';

const isPageScroller = (node) => (
  !node
  || node === document.body
  || node === document.documentElement
  || node === document.scrollingElement
);

const scrollHostFor = (node) => {
  let current = node?.parentElement || null;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight + 1) return current;
    current = current.parentElement;
  }
  return document.scrollingElement || document.documentElement;
};

const scrollTopFor = (host) => (
  isPageScroller(host)
    ? (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0)
    : host.scrollTop
);

const addScroll = (host, delta) => {
  if (!Number.isFinite(delta) || Math.abs(delta) < 1) return;
  if (isPageScroller(host)) window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
  else host.scrollTop += delta;
};

const setScroll = (host, top) => {
  if (!Number.isFinite(top)) return;
  if (isPageScroller(host)) window.scrollTo({ top, left: window.scrollX || 0, behavior: 'auto' });
  else host.scrollTop = top;
};

const isLibraryMetadataControl = (target) => {
  if (!(target instanceof Element)) return false;
  const library = target.closest('.dhq-newsroom-owner-library');
  if (!library) return false;

  if (target.matches('select')) return true;
  if (target.matches('input[type="checkbox"]')) return true;

  const button = target.closest('button');
  if (!button) return false;
  return /tag current team/i.test(button.textContent || '');
};

const isTeamTagButton = (target) => {
  if (!(target instanceof Element)) return false;
  const button = target.closest('.dhq-newsroom-owner-library button');
  return Boolean(button && /tag current team/i.test(button.textContent || ''));
};

const NewsroomLibraryScrollGuardPortal = () => {
  useEffect(() => {
    let sequence = 0;
    let pending = null;
    const timers = new Set();

    const clearTimers = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };

    const release = () => {
      clearTimers();
      pending = null;
    };

    const restore = (token) => {
      if (!pending || pending.token !== token) return;

      const { anchor, anchorTop, host, hostTop } = pending;
      const currentHostTop = scrollTopFor(host);
      const severeBackwardJump = currentHostTop < hostTop - 80;

      // Only repair the actual failure we care about: the save/render cycle
      // sending the library substantially upward. Ordinary user scrolling must
      // never be treated as a layout error.
      if (!severeBackwardJump) return;

      if (anchor?.isConnected) {
        const anchorDelta = anchor.getBoundingClientRect().top - anchorTop;
        if (Math.abs(anchorDelta) > 12) addScroll(host, anchorDelta);
        else setScroll(host, hostTop);
      } else {
        setScroll(host, hostTop);
      }

      // A repair is one-shot. Once the bad jump is corrected, release the guard
      // immediately so normal scrolling cannot be pulled back afterward.
      release();
    };

    const remember = (target) => {
      if (!isLibraryMetadataControl(target)) return;
      const anchor = target.closest('label, button') || target;
      const host = scrollHostFor(anchor);
      const token = ++sequence;

      pending = {
        token,
        anchor,
        anchorTop: anchor.getBoundingClientRect().top,
        host,
        hostTop: scrollTopFor(host),
      };

      clearTimers();

      // The very first Firestore transaction in a session can be noticeably
      // slower than later warm saves. Keep the one-shot guard alive long enough
      // to cover that cold refresh, but release instantly on any real user scroll.
      [0, 80, 180, 360, 700, 1200, 2000, 3500, 5500].forEach((delay) => {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          restore(token);
          if (delay === 5500 && pending?.token === token) pending = null;
        }, delay);
        timers.add(timer);
      });
    };

    const onPointerDown = (event) => {
      // Selects and checkboxes arm the guard on change, after the user actually
      // commits a new value. Only the explicit team-tag action needs pointerdown.
      if (isTeamTagButton(event.target)) remember(event.target);
      else if (pending && !isLibraryMetadataControl(event.target)) release();
    };
    const onChange = (event) => remember(event.target);
    const onUserScrollIntent = () => {
      if (pending) release();
    };
    const onKeyDown = (event) => {
      if (!pending) return;
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) release();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('change', onChange, true);
    document.addEventListener('wheel', onUserScrollIntent, { capture: true, passive: true });
    document.addEventListener('touchmove', onUserScrollIntent, { capture: true, passive: true });
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      release();
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('change', onChange, true);
      document.removeEventListener('wheel', onUserScrollIntent, true);
      document.removeEventListener('touchmove', onUserScrollIntent, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, []);

  return null;
};

export default NewsroomLibraryScrollGuardPortal;
