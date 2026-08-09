import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { BookOpen, ChevronDown, Gauge, LogOut, Settings, User } from 'lucide-react';
import { appId, auth, db } from './firebase';
import { CAREER_STAGES, deriveCareerStage } from './domain/commandCenter';
import './dynastyPulse.css';

const numberOrZero = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const compactNumber = (value) => {
  const numeric = numberOrZero(value);
  if (numeric >= 1_000_000) return `${(numeric / 1_000_000).toFixed(1)}M`;
  if (numeric >= 1_000) return `${(numeric / 1_000).toFixed(1)}K`;
  return numeric.toLocaleString();
};

const initialsFor = (name = '') => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join('') || 'HQ';

const stageLabel = (stage) => {
  if (stage === CAREER_STAGES.HIGH_SCHOOL) return 'High School Recruit';
  if (stage === CAREER_STAGES.COLLEGE) return 'College Player';
  if (stage === CAREER_STAGES.OC) return 'Offensive Coordinator';
  if (stage === CAREER_STAGES.HC) return 'Head Coach';
  return 'Legacy';
};

const latestHeadlineFrom = (state) => {
  const issues = Array.isArray(state?.newsroomIssues) ? state.newsroomIssues : [];
  const issue = issues.at(-1) || issues[0];
  const candidates = [
    issue?.headline,
    issue?.title,
    issue?.hero?.headline,
    issue?.leadStory?.headline,
    issue?.stories?.[0]?.headline,
    issue?.articles?.[0]?.headline,
  ];
  return candidates.find((value) => String(value || '').trim()) || '';
};

const buildPulse = (state) => {
  const safeState = state || {};
  const stage = deriveCareerStage(safeState);
  const player = safeState.player || {};
  const coach = safeState.coach || {};
  const recruiting = Array.isArray(safeState.recruiting) ? safeState.recruiting : [];
  const logs = Array.isArray(safeState.gameLogs) ? safeState.gameLogs : [];
  const season = numberOrZero(safeState.currentSeason) || 1;
  const week = numberOrZero(safeState.currentWeek) || 1;
  const seasonLogs = logs.filter((game) => (numberOrZero(game?.season) || 1) === season);
  const record = {
    wins: seasonLogs.filter((game) => game?.result === 'W').length,
    losses: seasonLogs.filter((game) => game?.result === 'L').length,
  };
  const totals = seasonLogs.reduce((acc, game) => ({
    passYds: acc.passYds + numberOrZero(game?.passYds),
    passTD: acc.passTD + numberOrZero(game?.passTD),
    rushTD: acc.rushTD + numberOrZero(game?.rushTD),
  }), { passYds: 0, passTD: 0, rushTD: 0 });
  const offers = recruiting.filter((school) => school?.offered).length;
  const activeTargets = recruiting.filter((school) => numberOrZero(school?.interest) > 0).length;
  const highSchool = safeState.playerRecruiting?.highSchool || {};
  const evaluations = seasonLogs.filter((game) => game?.stage === 'high-school' || game?.evaluation);
  const stars = Math.max(1, Math.min(5, numberOrZero(player.stars) || 3));
  const overall = numberOrZero(player.overall);
  const position = String(player.pos || 'QB').toUpperCase();
  const headline = latestHeadlineFrom(safeState);
  const items = [];
  let summary = '';

  if (stage === CAREER_STAGES.HIGH_SCHOOL) {
    summary = `${stars}★ ${position}${overall ? ` · ${overall} OVR` : ''}`;
    items.push(
      { label: 'TAPE', value: compactNumber(highSchool.tapeScore) },
      { label: 'OFFERS', value: String(offers) },
      { label: 'GAMES', value: `${evaluations.length}/5` },
    );
    if (evaluations.length < 5) items.push({ label: 'NEXT', value: `GAME ${evaluations.length + 1}` });
    else items.push({ label: 'STATUS', value: 'TAPE COMPLETE' });
  } else if (stage === CAREER_STAGES.COLLEGE) {
    summary = `${position}${overall ? ` · ${overall} OVR` : ''}`;
    items.push(
      { label: 'RECORD', value: `${record.wins}-${record.losses}` },
      { label: 'PASS YDS', value: compactNumber(totals.passYds) },
      { label: 'TOTAL TD', value: String(totals.passTD + totals.rushTD) },
      { label: 'TRUST', value: compactNumber(safeState.rtg?.coachTrust) },
    );
    if (safeState.rtg?.rank) items.push({ label: 'ROLE', value: String(safeState.rtg.rank).toUpperCase() });
  } else if ([CAREER_STAGES.OC, CAREER_STAGES.HC].includes(stage)) {
    summary = `${stage === CAREER_STAGES.OC ? 'OC' : 'HC'}${coach.prestige ? ` · ${coach.prestige} PRESTIGE` : ''}`;
    items.push(
      { label: 'RECORD', value: `${record.wins}-${record.losses}` },
      { label: 'SECURITY', value: coach.security === '' || coach.security === undefined ? '—' : `${numberOrZero(coach.security)}%` },
      { label: 'TARGETS', value: String(activeTargets) },
      { label: 'RECRUIT HRS', value: compactNumber(coach.budget) },
    );
  } else {
    summary = 'CAREER COMPLETE';
    items.push(
      { label: 'CHRONICLE', value: String((safeState.careerChronicle || []).length) },
      { label: 'TROPHIES', value: String((safeState.trophies || []).length) },
    );
  }

  if (headline) items.push({ label: 'LATEST', value: headline });

  return {
    season,
    week,
    stage,
    stageName: stageLabel(stage),
    summary,
    items: items.filter((item) => item.value !== '' && item.value !== undefined && item.value !== null),
  };
};

const clickDesktopNav = (label) => {
  const button = [...document.querySelectorAll('header button[title]')]
    .find((candidate) => candidate.getAttribute('title') === label);
  button?.click();
  return Boolean(button);
};

const openProfile = () => {
  clickDesktopNav('Dashboard');
  const tryOpen = (attempt = 0) => {
    const button = [...document.querySelectorAll('button')]
      .find((candidate) => candidate.textContent?.trim().toLowerCase().includes('edit profile'));
    if (button) {
      button.click();
      return;
    }
    if (attempt < 5) window.setTimeout(() => tryOpen(attempt + 1), 180);
  };
  window.setTimeout(() => tryOpen(), 120);
};

const openHandbook = () => {
  const clickHandbook = () => {
    const handbookButton = [...document.querySelectorAll('#mobile-primary-navigation button')]
      .find((candidate) => candidate.textContent?.includes('Career Handbook'));
    if (handbookButton) handbookButton.click();
  };

  if (document.getElementById('mobile-primary-navigation')) {
    clickHandbook();
    return;
  }

  const menuButton = document.querySelector('button[aria-controls="mobile-primary-navigation"]');
  menuButton?.click();
  window.setTimeout(clickHandbook, 80);
};

const useDynastyState = () => {
  const [state, setState] = useState(null);
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('view');
    let stopSnapshot = () => {};

    if (viewId) {
      setReadOnly(true);
      const publicRef = doc(db, 'artifacts', appId, 'public', 'data', 'shared_dynasties', viewId);
      stopSnapshot = onSnapshot(publicRef, (snapshot) => {
        setState(snapshot.exists() ? snapshot.data() : null);
      }, () => setState(null));
      return () => stopSnapshot();
    }

    setReadOnly(false);
    const stopAuth = onAuthStateChanged(auth, (user) => {
      stopSnapshot();
      stopSnapshot = () => {};
      if (!user) {
        setState(null);
        return;
      }
      const privateRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
      stopSnapshot = onSnapshot(privateRef, (snapshot) => {
        setState(snapshot.exists() ? snapshot.data() : null);
      }, () => setState(null));
    });

    return () => {
      stopSnapshot();
      stopAuth();
    };
  }, []);

  return { state, readOnly };
};

const DynastyPulse = () => {
  const { state, readOnly } = useDynastyState();
  const pulse = useMemo(() => buildPulse(state), [state]);
  const [metricIndex, setMetricIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const player = state?.player || {};
  const metric = pulse.items[metricIndex % Math.max(1, pulse.items.length)] || { label: 'STATUS', value: state ? 'READY' : 'SYNCING' };

  useEffect(() => {
    setMetricIndex(0);
    if (pulse.items.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setMetricIndex((index) => (index + 1) % pulse.items.length);
    }, 4600);
    return () => window.clearInterval(timer);
  }, [pulse.items.length, pulse.stage, pulse.season, pulse.week]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  return (
    <div className="dhq-pulse-host-inner" ref={menuRef}>
      <div className="dhq-pulse-shell" aria-label="Dynasty Pulse">
        <span className="dhq-pulse-live"><span className="dhq-pulse-dot" /> LIVE</span>
        <span className="dhq-pulse-separator" />
        <span className="dhq-pulse-context">S{pulse.season} · W{pulse.week}</span>
        <span className="dhq-pulse-separator" />
        <span className="dhq-pulse-context dhq-pulse-summary">{pulse.summary || pulse.stageName}</span>
        <span className="dhq-pulse-separator" />
        <span key={`${metric.label}-${metric.value}-${metricIndex}`} className="dhq-pulse-metric">
          <span className="dhq-pulse-metric-label">{metric.label}</span>
          <strong title={metric.value}>{metric.value}</strong>
        </span>
      </div>

      <button
        type="button"
        className="dhq-pulse-avatar-button"
        onClick={() => !readOnly && setMenuOpen((open) => !open)}
        aria-expanded={!readOnly ? menuOpen : undefined}
        aria-label={readOnly ? `${player.name || 'Dynasty'} profile` : 'Open Dynasty profile menu'}
        title={player.name || pulse.stageName}
      >
        <span className="dhq-pulse-avatar">
          {player.headshot ? <img src={player.headshot} alt="" /> : <span>{initialsFor(player.name)}</span>}
        </span>
        {!readOnly ? <ChevronDown size={12} className={menuOpen ? 'dhq-pulse-chevron-open' : ''} /> : null}
      </button>

      {!readOnly && menuOpen ? (
        <div className="dhq-pulse-menu">
          <div className="dhq-pulse-menu-profile">
            <span className="dhq-pulse-menu-avatar">
              {player.headshot ? <img src={player.headshot} alt="" /> : <span>{initialsFor(player.name)}</span>}
            </span>
            <div>
              <strong>{player.name || 'Dynasty Leader'}</strong>
              <span>{pulse.stageName}</span>
            </div>
          </div>
          <div className="dhq-pulse-menu-divider" />
          <button type="button" onClick={() => { setMenuOpen(false); openProfile(); }}><User size={14} /> Open Profile</button>
          <button type="button" onClick={() => { setMenuOpen(false); clickDesktopNav('Settings'); }}><Settings size={14} /> Settings</button>
          <button type="button" onClick={() => { setMenuOpen(false); openHandbook(); }}><BookOpen size={14} /> Career Handbook</button>
          <button type="button" className="dhq-pulse-menu-signout" onClick={() => signOut(auth)}><LogOut size={14} /> Sign Out</button>
        </div>
      ) : null}
    </div>
  );
};

let pulseRoot = null;
let pulseHost = null;

const ensurePulseMounted = () => {
  const header = document.querySelector('header.no-print');
  const headerRow = header?.firstElementChild;

  if (!headerRow) {
    if (pulseHost && !document.contains(pulseHost)) {
      pulseRoot?.unmount();
      pulseRoot = null;
      pulseHost = null;
    }
    return;
  }

  if (pulseHost && document.contains(pulseHost)) return;
  if (pulseRoot) pulseRoot.unmount();

  pulseHost = document.createElement('div');
  pulseHost.id = 'dynasty-pulse-root';
  pulseHost.className = 'dhq-pulse-mount';

  const mobileToggle = headerRow.querySelector('button[aria-controls="mobile-primary-navigation"]')?.parentElement;
  if (mobileToggle) headerRow.insertBefore(pulseHost, mobileToggle);
  else headerRow.appendChild(pulseHost);

  pulseRoot = createRoot(pulseHost);
  pulseRoot.render(<DynastyPulse />);
};

const observer = new MutationObserver(ensurePulseMounted);
observer.observe(document.documentElement, { childList: true, subtree: true });
ensurePulseMounted();
