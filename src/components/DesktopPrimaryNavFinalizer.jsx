import { useEffect } from 'react';

const STYLE_ID = 'dhq-desktop-nav-runtime-final';

const cssText = `
@media (min-width: 960px) {
  html body header.dhq-broadcast-header nav.dhq-primary-nav > button.dhq-primary-nav-item::before,
  html body header.dhq-broadcast-header nav.dhq-primary-nav > button.dhq-primary-nav-item::after {
    display: none !important;
    content: none !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  html body header.dhq-broadcast-header nav.dhq-primary-nav > button.dhq-primary-nav-item {
    border: 0 !important;
    outline: 0 !important;
    background: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
  }

  html body header.dhq-broadcast-header nav.dhq-primary-nav > button.dhq-primary-nav-item > .dhq-primary-nav-label {
    display: inline-block !important;
    position: static !important;
    width: auto !important;
    height: auto !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 0 5px !important;
    border: 0 !important;
    border-bottom: 3px solid transparent !important;
    background: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
    color: inherit !important;
    white-space: nowrap !important;
  }

  html body header.dhq-broadcast-header nav.dhq-primary-nav > button.dhq-primary-nav-item[aria-current="page"] > .dhq-primary-nav-label,
  html body header.dhq-broadcast-header nav.dhq-primary-nav > button.dhq-primary-nav-item.is-active > .dhq-primary-nav-label {
    border-bottom-color: var(--dhq-program-highlight, #facc15) !important;
  }

  html,
  body,
  #root,
  main.dhq-page-main {
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }

  main.dhq-page-main {
    width: 100% !important;
    min-width: 0 !important;
  }

  main.dhq-page-main > * {
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
}
`;

const setImportant = (node, property, value) => {
  if (!node) return;
  node.style.setProperty(property, value, 'important');
};

const DesktopPrimaryNavFinalizer = () => {
  useEffect(() => {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = cssText;

    let frame = 0;
    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (!window.matchMedia('(min-width: 960px)').matches) return;

        const header = document.querySelector('header.dhq-broadcast-header');
        const headerMain = header?.querySelector('.dhq-broadcast-header__main');
        const logo = header?.querySelector('.dhq-broadcast-header-logo');
        const actions = header?.querySelector('.dhq-broadcast-header__actions');
        const nav = header?.querySelector('nav.dhq-primary-nav');

        if (header) {
          setImportant(header, 'left', '0');
          setImportant(header, 'right', '0');
          setImportant(header, 'width', '100%');
          setImportant(header, 'max-width', '100vw');
          setImportant(header, 'overflow-x', 'hidden');
        }

        if (headerMain) {
          setImportant(headerMain, 'width', '100%');
          setImportant(headerMain, 'max-width', '100%');
          setImportant(headerMain, 'min-width', '0');
          setImportant(headerMain, 'padding-left', window.innerWidth < 1200 ? '12px' : '20px');
          setImportant(headerMain, 'padding-right', window.innerWidth < 1200 ? '12px' : '20px');
          setImportant(headerMain, 'box-sizing', 'border-box');
        }

        if (logo && window.innerWidth < 1200) {
          setImportant(logo, 'width', '138px');
          setImportant(logo, 'min-width', '138px');
          setImportant(logo, 'padding-right', '8px');
        }

        if (actions && window.innerWidth < 1200) {
          setImportant(actions, 'width', '42px');
          setImportant(actions, 'min-width', '42px');
          setImportant(actions, 'gap', '0');
        }

        if (nav) {
          const buttons = [...nav.querySelectorAll(':scope > button.dhq-primary-nav-item')];
          setImportant(nav, 'display', 'grid');
          setImportant(nav, 'grid-template-columns', `repeat(${Math.max(1, buttons.length)}, minmax(0, 1fr))`);
          setImportant(nav, 'gap', '0');
          setImportant(nav, 'margin-right', '0');
          setImportant(nav, 'min-width', '0');
          setImportant(nav, 'overflow', 'visible');

          buttons.forEach((button) => {
            setImportant(button, 'display', 'flex');
            setImportant(button, 'width', '100%');
            setImportant(button, 'min-width', '0');
            setImportant(button, 'max-width', 'none');
            setImportant(button, 'margin', '0');
            setImportant(button, 'padding-left', window.innerWidth < 1200 ? '2px' : '4px');
            setImportant(button, 'padding-right', window.innerWidth < 1200 ? '2px' : '4px');
            setImportant(button, 'font-size', window.innerWidth < 1200 ? '9px' : '11px');
            setImportant(button, 'letter-spacing', '0');
            setImportant(button, 'align-items', 'center');
            setImportant(button, 'justify-content', 'center');
            setImportant(button, 'border', '0');
            setImportant(button, 'outline', '0');
            setImportant(button, 'background', 'transparent');
            setImportant(button, 'box-shadow', 'none');

            const label = button.querySelector('.dhq-primary-nav-label') || button.querySelector('span');
            if (label) {
              label.classList.add('dhq-primary-nav-label');
              const active = button.getAttribute('aria-current') === 'page' || button.classList.contains('is-active');
              setImportant(label, 'display', 'inline-block');
              setImportant(label, 'position', 'static');
              setImportant(label, 'width', 'auto');
              setImportant(label, 'height', 'auto');
              setImportant(label, 'margin', '0');
              setImportant(label, 'padding', '0 0 5px');
              setImportant(label, 'border', '0');
              setImportant(label, 'border-bottom', `3px solid ${active ? 'var(--dhq-program-highlight, #facc15)' : 'transparent'}`);
              setImportant(label, 'background', 'transparent');
              setImportant(label, 'box-shadow', 'none');
              setImportant(label, 'white-space', 'nowrap');
            }
          });
        }

        const main = document.querySelector('main.dhq-page-main');
        [document.documentElement, document.body, document.getElementById('root'), main].filter(Boolean).forEach((node) => {
          setImportant(node, 'width', '100%');
          setImportant(node, 'max-width', '100vw');
          setImportant(node, 'min-width', '0');
          setImportant(node, 'overflow-x', 'hidden');
          setImportant(node, 'box-sizing', 'border-box');
        });
        if (main) {
          setImportant(main, 'width', '100%');
          setImportant(main, 'min-width', '0');
          [...main.children].forEach((child) => {
            setImportant(child, 'min-width', '0');
            setImportant(child, 'max-width', '100%');
            setImportant(child, 'box-sizing', 'border-box');
          });
        }
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-current', 'class'],
    });
    window.addEventListener('resize', sync);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
      window.cancelAnimationFrame(frame);
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);

  return null;
};

export default DesktopPrimaryNavFinalizer;
