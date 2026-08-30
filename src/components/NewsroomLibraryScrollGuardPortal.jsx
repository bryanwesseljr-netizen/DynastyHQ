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

const NewsroomLibraryScrollGuardPortal = () => {
  useEffect(() => {
    let sequence = 0;
    let pending = null;
    const timers = new Set();

    const clearTimers = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };

    const restore = (token) => {
      if (!pending || pending.token !== token) return;

      const { anchor, anchorTop, host, hostTop } = pending;
      const currentHostTop = scrollTopFor(host);
      const severeBackwardJump = currentHostTop < hostTop - 80;

      if (anchor?.isConnected) {
        const anchorDelta = anchor.getBoundingClientRect().top - anchorTop;
        if (Math.abs(anchorDelta) > 12 || severeBackwardJump) {
          addScroll(host, anchorDelta);
        }
      } else if (severeBackwardJump) {
        setScroll(host, hostTop);
      }
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
      [0, 60, 140, 260, 450, 750, 1100, 1500].forEach((delay) => {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          restore(token);
          if (delay === 1500 && pending?.token === token) pending = null;
        }, delay);
        timers.add(timer);
      });
    };

    const onPointerDown = (event) => remember(event.target);
    const onChange = (event) => remember(event.target);

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('change', onChange, true);

    return () => {
      clearTimers();
      pending = null;
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('change', onChange, true);
    };
  }, []);

  return null;
};

export default NewsroomLibraryScrollGuardPortal;
