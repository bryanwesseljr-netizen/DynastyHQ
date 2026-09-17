import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Target } from 'lucide-react';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import PlayerOffseasonMode from './PlayerOffseasonMode.jsx';
import { deriveCareerStage, CAREER_STAGES } from '../domain/commandCenter.js';
import './player-offseason-navigation.css';

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

const destinationMatchers = {
  dashboard: /^(home|dashboard)$/i,
  gameHub: /^(game hub|weekly agenda|log weekly agenda)$/i,
  dataEntry: /^(game hub|weekly agenda|log weekly agenda)$/i,
  recruiting: /^recruiting board$/i,
  newsroom: /^(the )?newsroom$/i,
  chronicle: /^chronicle$/i,
  podcast: /^(podcast|gridiron grind podcast)$/i,
  settings: /^settings$/i,
};

const allNavButtons = () => [...document.querySelectorAll(
  '.dhq-primary-nav button, #mobile-primary-navigation button, .dhq-mobile-broadcast-nav button',
)];

const findButton = (matcher) => allNavButtons().find((button) => matcher.test(String(button.textContent || '').trim())) || null;

const clickDestination = (destination) => {
  if (destination === 'dashboard') {
    const logo = document.querySelector('button.dhq-broadcast-header-logo');
    if (logo) {
      logo.click();
      return true;
    }
  }

  const matcher = destinationMatchers[destination];
  if (!matcher) return false;
  const immediate = findButton(matcher);
  if (immediate) {
    immediate.click();
    return true;
  }

  // Recruiting and other secondary destinations may only exist inside the
  // profile menu. Open that menu, then hand off to the real app navigation.
  const profile = document.querySelector('button.dhq-broadcast-header__profile');
  if (!profile) return false;
  profile.click();
  window.setTimeout(() => {
    const delayed = findButton(matcher);
    delayed?.click();
  }, 80);
  return true;
};

const makeDesktopButton = (onOpen) => {
  const button = document.createElement('button');
  button.id = 'dhq-player-offseason-desktop-nav';
  button.type = 'button';
  button.title = 'End-of-Season / Offseason';
  button.className = 'dhq-primary-nav-item dhq-player-offseason-nav relative flex shrink-0 items-center justify-center whitespace-nowrap font-black uppercase transition-colors text-slate-400 hover:text-white';
  button.innerHTML = '<span>Offseason</span>';
  button.addEventListener('click', onOpen);
  return button;
};

const makeMobileButton = (onOpen) => {
  const button = document.createElement('button');
  button.id = 'dhq-player-offseason-mobile-nav';
  button.type = 'button';
  button.className = 'dhq-player-offseason-mobile-entry flex items-center gap-2 rounded border px-3 py-3 text-left text-[9px] font-black uppercase tracking-wider border-slate-800 bg-slate-950/70 text-slate-300';
  button.innerHTML = '<span class="dhq-player-offseason-mobile-icon" aria-hidden="true">◎</span><span>Offseason War Room</span>';
  button.addEventListener('click', onOpen);
  return button;
};

const PlayerOffseasonNavigationPortal = () => {
  const { career, ready } = useOwnerCareer();
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState(null);
  const stage = useMemo(() => deriveCareerStage(career || {}), [career]);
  const available = ready && Boolean(career) && stage === CAREER_STAGES.COLLEGE;

  useEffect(() => {
    if (!available) {
      setOpen(false);
      document.getElementById('dhq-player-offseason-desktop-nav')?.remove();
      document.getElementById('dhq-player-offseason-mobile-nav')?.remove();
      return undefined;
    }

    const openOffseason = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      setOpen(true);
      document.querySelector('main.dhq-page-main')?.scrollTo?.({ top: 0, behavior: 'instant' });
    };

    const ensureButtons = () => {
      const desktopNav = document.querySelector('.dhq-primary-nav');
      if (desktopNav && !document.getElementById('dhq-player-offseason-desktop-nav')) {
        const button = makeDesktopButton(openOffseason);
        const newsroom = [...desktopNav.querySelectorAll('button')].find((entry) => /newsroom/i.test(entry.textContent || ''));
        desktopNav.insertBefore(button, newsroom || null);
      }

      const mobileNav = document.querySelector('#mobile-primary-navigation nav');
      if (mobileNav && !document.getElementById('dhq-player-offseason-mobile-nav')) {
        const button = makeMobileButton(openOffseason);
        const recruiting = [...mobileNav.querySelectorAll('button')].find((entry) => /^recruiting board$/i.test(String(entry.textContent || '').trim()));
        mobileNav.insertBefore(button, recruiting || null);
      }
    };

    ensureButtons();
    const observer = new MutationObserver(ensureButtons);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.getElementById('dhq-player-offseason-desktop-nav')?.remove();
      document.getElementById('dhq-player-offseason-mobile-nav')?.remove();
    };
  }, [available]);

  useEffect(() => {
    if (!open) {
      document.body.classList.remove('dhq-player-offseason-open');
      document.getElementById('dhq-player-offseason-route-host')?.remove();
      setHost(null);
      return undefined;
    }

    const main = document.querySelector('main.dhq-page-main');
    if (!main) return undefined;
    document.body.classList.add('dhq-player-offseason-open');
    let routeHost = document.getElementById('dhq-player-offseason-route-host');
    if (!routeHost) {
      routeHost = document.createElement('div');
      routeHost.id = 'dhq-player-offseason-route-host';
      main.appendChild(routeHost);
    }
    setHost(routeHost);
    main.scrollTo({ top: 0, behavior: 'instant' });

    const closeOnOtherNavigation = (event) => {
      const button = event.target?.closest?.('button');
      if (!button || button.id === 'dhq-player-offseason-desktop-nav' || button.id === 'dhq-player-offseason-mobile-nav') return;
      if (button.closest?.('.dhq-primary-nav, .dhq-mobile-broadcast-nav, #mobile-primary-navigation') || button.matches?.('.dhq-broadcast-header-logo')) {
        setOpen(false);
      }
    };
    document.addEventListener('click', closeOnOtherNavigation, true);

    return () => {
      document.removeEventListener('click', closeOnOtherNavigation, true);
      document.body.classList.remove('dhq-player-offseason-open');
      routeHost?.remove();
      setHost(null);
    };
  }, [open]);

  useEffect(() => {
    const desktop = document.getElementById('dhq-player-offseason-desktop-nav');
    const mobile = document.getElementById('dhq-player-offseason-mobile-nav');
    [desktop, mobile].forEach((button) => {
      if (!button) return;
      button.classList.toggle('is-active', open);
      if (open) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }, [open, host]);

  if (!open || !host || !career || !available) return null;

  const navigate = (destination) => {
    setOpen(false);
    window.setTimeout(() => clickDestination(destination), 0);
  };

  return createPortal(
    <div className="dhq-player-offseason-route">
      <div className="dhq-player-offseason-route__bar">
        <span><Target size={15} /> OFFSEASON MODE</span>
        <button type="button" onClick={() => navigate('dashboard')}>RETURN HOME</button>
      </div>
      <PlayerOffseasonMode state={career} onNavigate={navigate} readOnly={false} />
    </div>,
    host,
  );
};

export default PlayerOffseasonNavigationPortal;
