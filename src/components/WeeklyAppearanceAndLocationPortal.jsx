import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, MapPin, ShieldCheck } from 'lucide-react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, db } from '../firebase';
import { GAME_LOCATION_CONTEXTS } from '../domain/editorialRealism.js';
import { resolveWeeklyWorkContext } from '../domain/weeklyWorkContext.js';
import { WEEK_TYPES } from '../domain/weeklyEngine.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const findByExactText = (root, selector, text) => [...(root?.querySelectorAll(selector) || [])]
  .find((entry) => (entry.textContent || '').trim().toLowerCase() === text.toLowerCase());

const readQuickStat = (text, label) => {
  const match = String(text || '').match(new RegExp(`(-?\\d+)\\s+${label}`, 'i'));
  return match ? Number(match[1]) : null;
};

const readZeroStatLine = (review) => {
  const quickLabel = findByExactText(review, 'span', 'Quick read');
  const quickRead = quickLabel?.parentElement;
  if (!quickRead) return false;
  const text = quickRead.textContent || '';
  const values = [
    readQuickStat(text, 'pass yds'),
    readQuickStat(text, 'pass TD'),
    readQuickStat(text, 'INT'),
    readQuickStat(text, 'rush yds'),
    readQuickStat(text, 'rush TD'),
  ];
  return values.every((value) => value !== null) && values.every((value) => value === 0);
};

const AppearanceNotice = ({ status }) => {
  if (!status?.zeroLine) return null;
  const overridden = status.weekType === WEEK_TYPES.GAME && status.autoHandled;
  return (
    <div className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-[10px] leading-relaxed ${overridden ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'}`}>
      {overridden ? <ShieldCheck size={14} className="mt-0.5 shrink-0 text-amber-300" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />}
      <span>
        <strong className="block uppercase tracking-wider">{overridden ? 'Zero-stat appearance override' : 'DNP detected'}</strong>
        {overridden
          ? 'All five player stats are zero, but Game week is selected. Keep this only if you actually took snaps and finished with no recorded production.'
          : 'All five verified player stats are zero, so DynastyHQ selected Team game · no appearance. The team result still counts, but your Game Log and Career Chronicle will record DNP.'}
      </span>
    </div>
  );
};

const GameLocationControl = ({ user, career }) => {
  const work = useMemo(() => resolveWeeklyWorkContext(career || {}), [career]);
  const saved = career?.weeklyGameContexts?.[work.publicationId]?.location || GAME_LOCATION_CONTEXTS.UNKNOWN;
  const [busy, setBusy] = useState(false);
  const isBye = work.setupReady && work.setup?.type === 'bye';

  const saveLocation = async (location) => {
    if (!user || !db || busy || isBye) return;
    setBusy(true);
    try {
      const masterRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(masterRef);
        if (!snapshot.exists()) throw new Error('Your DynastyHQ career could not be loaded.');
        const remote = snapshot.data();
        const contexts = { ...(remote.weeklyGameContexts || {}) };
        if (location === GAME_LOCATION_CONTEXTS.UNKNOWN) delete contexts[work.publicationId];
        else contexts[work.publicationId] = {
          season: work.season,
          week: work.week,
          location,
          updatedAt: new Date().toISOString(),
        };
        transaction.update(masterRef, {
          weeklyGameContexts: contexts,
          '_sync.revision': (Number(remote?._sync?.revision) || 0) + 1,
          '_sync.deviceId': 'weekly-game-location',
          '_sync.updatedAt': new Date().toISOString(),
        });
      });
    } catch (error) {
      console.error('Game location could not be saved', error);
    } finally {
      setBusy(false);
    }
  };

  if (!work.setupReady || isBye) return null;
  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-slate-700/80 bg-slate-950/55 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2">
        <MapPin size={14} className="mt-0.5 shrink-0 text-blue-300" />
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-300">Game location</p>
          <p className="mt-0.5 text-[9px] leading-relaxed text-slate-500">Set this once per game so Newsroom Auto Select can match home/away uniform photos. It does not change the score or player stats.</p>
        </div>
      </div>
      <select
        value={saved}
        disabled={busy}
        onChange={(event) => saveLocation(event.target.value)}
        className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-[9px] font-black uppercase text-slate-200 outline-none focus:border-blue-400 disabled:opacity-50"
        aria-label="Game location for media matching"
      >
        <option value={GAME_LOCATION_CONTEXTS.UNKNOWN}>Not set</option>
        <option value={GAME_LOCATION_CONTEXTS.HOME}>Home game</option>
        <option value={GAME_LOCATION_CONTEXTS.AWAY}>Away game</option>
        <option value={GAME_LOCATION_CONTEXTS.NEUTRAL}>Neutral site</option>
      </select>
    </div>
  );
};

const WeeklyAppearanceAndLocationPortal = () => {
  const { user, career } = useOwnerCareer();
  const [appearanceHost, setAppearanceHost] = useState(null);
  const [locationHost, setLocationHost] = useState(null);
  const [appearanceStatus, setAppearanceStatus] = useState(null);
  const selectCleanupRef = useRef(null);

  useEffect(() => {
    const appRoot = document.getElementById('root');
    if (!appRoot) return undefined;

    const ensure = () => {
      const lane = appRoot.querySelector('[data-weekly-data-lane="1"]');
      if (lane) {
        let host = lane.querySelector('[data-game-location-host]');
        if (!host) {
          host = document.createElement('div');
          host.dataset.gameLocationHost = 'true';
          const timing = lane.querySelector('.dhq-data-intake-timing');
          if (timing?.parentNode) timing.parentNode.insertBefore(host, timing.nextSibling);
          else lane.appendChild(host);
        }
        setLocationHost((current) => current === host ? current : host);
      } else {
        setLocationHost(null);
      }

      const review = appRoot.querySelector('.dhq-postgame-review');
      if (!review) {
        setAppearanceHost(null);
        setAppearanceStatus(null);
        if (selectCleanupRef.current) selectCleanupRef.current();
        selectCleanupRef.current = null;
        return;
      }
      const select = review.querySelector('select[aria-label="Weekly update type"]');
      const zeroLine = readZeroStatLine(review);
      if (!select || !zeroLine) {
        setAppearanceStatus({ zeroLine: false });
        return;
      }

      if (!select.dataset.dhqDnpHandled && select.value === WEEK_TYPES.GAME) {
        select.dataset.dhqDnpHandled = 'true';
        select.dataset.dhqDnpAuto = 'true';
        select.value = WEEK_TYPES.NO_APPEARANCE;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }

      let host = review.querySelector('[data-dnp-detection-host]');
      if (!host) {
        host = document.createElement('div');
        host.dataset.dnpDetectionHost = 'true';
        const quickLabel = findByExactText(review, 'span', 'Quick read');
        const quickSection = quickLabel?.closest('.border-b') || quickLabel?.parentElement?.parentElement;
        if (quickSection?.parentNode) quickSection.parentNode.insertBefore(host, quickSection.nextSibling);
        else review.prepend(host);
      }
      setAppearanceHost((current) => current === host ? current : host);

      const sync = () => setAppearanceStatus({
        zeroLine: true,
        weekType: select.value,
        autoHandled: select.dataset.dhqDnpHandled === 'true',
      });
      sync();
      if (selectCleanupRef.current) selectCleanupRef.current();
      select.addEventListener('change', sync);
      selectCleanupRef.current = () => select.removeEventListener('change', sync);
    };

    ensure();
    const observer = new MutationObserver(ensure);
    observer.observe(appRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'value'] });
    return () => {
      observer.disconnect();
      if (selectCleanupRef.current) selectCleanupRef.current();
    };
  }, []);

  return (
    <>
      {appearanceHost ? createPortal(<div className="border-b border-slate-800 bg-slate-950/45 px-5 pb-4 md:px-6"><AppearanceNotice status={appearanceStatus} /></div>, appearanceHost) : null}
      {locationHost ? createPortal(<GameLocationControl user={user} career={career} />, locationHost) : null}
    </>
  );
};

export default WeeklyAppearanceAndLocationPortal;
