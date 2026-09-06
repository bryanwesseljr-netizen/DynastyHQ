import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Briefcase,
  ChevronRight,
  FileText,
  Map,
  Settings,
  Target,
  X,
} from 'lucide-react';
import './mobile-broadcast.css';

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const primaryItems = [
  { id: 'dashboard', label: 'Home', matcher: /^home$/i },
  { id: 'career', label: 'Career', matcher: /^career$/i },
  { id: 'gameHub', label: 'Game Hub', matcher: /^game hub$/i },
  { id: 'newsroom', label: 'Newsroom', matcher: /^(the )?newsroom$/i },
  { id: 'chronicle', label: 'Chronicle', matcher: /^chronicle$/i },
  { id: 'podcast', label: 'Podcast', matcher: /^podcast$/i },
];

const secondaryItems = [
  { id: 'recruiting', label: 'Recruiting', matcher: /^recruiting board$/i, Icon: Map },
  { id: 'frontOffice', label: 'Front Office', matcher: /personnel.*nil office/i, Icon: Briefcase },
  { id: 'offseason', label: 'Offseason', matcher: /offseason war room/i, Icon: Target },
  { id: 'settings', label: 'Settings', matcher: /^settings$/i, Icon: Settings },
  { id: 'rules', label: 'Career Handbook', matcher: /^career handbook$/i, Icon: FileText },
];

const findNavigationButton = (matcher) => {
  const buttons = [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')];
  return buttons.find((button) => matcher.test(clean(button.textContent))) || null;
};

const currentActive = () => {
  if (document.body.classList.contains('dhq-career-overview-open')) return 'career';
  if (document.body.classList.contains('dhq-game-hub-open')) return 'gameHub';
  const activeTab = document.querySelector('main.dhq-page-main')?.dataset?.activeTab || 'dashboard';
  if (activeTab === 'trophies') return 'career';
  if (activeTab === 'dataEntry') return 'gameHub';
  return activeTab;
};

const MobileBroadcastNavPortal = () => {
  const [host, setHost] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [active, setActive] = useState(() => currentActive());
  const moreRef = useRef(moreOpen);

  useEffect(() => {
    moreRef.current = moreOpen;
  }, [moreOpen]);

  useEffect(() => {
    const header = document.querySelector('.dhq-broadcast-header');
    const ticker = header?.querySelector('.dhq-score-ticker');
    if (!header || !ticker) return undefined;

    let navHost = document.getElementById('dhq-mobile-broadcast-nav-host');
    if (!navHost) {
      navHost = document.createElement('div');
      navHost.id = 'dhq-mobile-broadcast-nav-host';
      ticker.before(navHost);
    }
    setHost(navHost);

    return () => {
      navHost?.remove();
    };
  }, []);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    const captureProfile = (event) => {
      const button = event.target?.closest?.('button.dhq-broadcast-header__profile');
      if (!button || window.innerWidth >= 768) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      setMoreOpen((open) => !open);
    };

    root.addEventListener('click', captureProfile, true);
    return () => root.removeEventListener('click', captureProfile, true);
  }, []);

  useEffect(() => {
    const refresh = () => setActive(currentActive());
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'data-active-tab'] });
    window.addEventListener('resize', refresh);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', refresh);
    };
  }, []);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const closeOnOutside = (event) => {
      if (event.target?.closest?.('.dhq-mobile-more-sheet, .dhq-broadcast-header__profile')) return;
      setMoreOpen(false);
    };
    document.addEventListener('click', closeOnOutside, true);
    return () => document.removeEventListener('click', closeOnOutside, true);
  }, [moreOpen]);

  const availableSecondary = useMemo(() => secondaryItems.filter((item) => findNavigationButton(item.matcher)), [host, moreOpen, active]);

  const navigate = (item) => {
    setMoreOpen(false);
    const button = findNavigationButton(item.matcher);
    button?.click();
    window.setTimeout(() => setActive(currentActive()), 40);
  };

  if (!host) return null;

  return createPortal(
    <>
      <nav className="dhq-mobile-broadcast-nav" aria-label="Mobile broadcast navigation">
        {primaryItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={active === item.id ? 'is-active' : ''}
            onClick={() => navigate(item)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {moreOpen ? (
        <div className="dhq-mobile-more-sheet" role="dialog" aria-modal="false" aria-label="More DynastyHQ tools">
          <div className="dhq-mobile-more-sheet__head">
            <div><span>DYNASTYHQ</span><strong>More</strong></div>
            <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close menu"><X size={17} /></button>
          </div>
          <div className="dhq-mobile-more-sheet__links">
            {availableSecondary.map(({ id, label, Icon, matcher }) => (
              <button key={id} type="button" onClick={() => navigate({ id, label, Icon, matcher })}>
                <span><Icon size={16} /> {label}</span><ChevronRight size={15} />
              </button>
            ))}
          </div>
          <p><BookOpen size={13} /> Primary pages stay in the broadcast nav above. This menu is only for secondary tools.</p>
        </div>
      ) : null}
    </>,
    host,
  );
};

export default MobileBroadcastNavPortal;
