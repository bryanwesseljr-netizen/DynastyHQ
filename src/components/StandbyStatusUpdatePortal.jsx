import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { doc, runTransaction } from 'firebase/firestore';
import { Save, SlidersHorizontal } from 'lucide-react';
import { appId, db } from '../firebase';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './standby-status-update.css';

const DEVICE_ID = globalThis.crypto?.randomUUID?.() || `standby-status-${Date.now()}`;
const clean = (value) => String(value ?? '').trim();
const numberOrBlank = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
};

const snapshotFor = (career = {}) => ({
  season: Math.max(1, Number(career.currentSeason) || 1),
  classYear: clean(career.player?.classYear || career.player?.year) || 'Freshman',
  depthChart: clean(career.rtg?.rank) || 'QB3',
  overall: career.player?.overall ?? '',
  skillPoints: career.rtg?.skillPoints ?? '',
  coachTrust: career.rtg?.coachTrust ?? '',
  number: clean(career.player?.number),
});

const StandbyStatusUpdatePortal = () => {
  const { user, career, ready } = useOwnerCareer();
  const [host, setHost] = useState(null);
  const [form, setForm] = useState(() => snapshotFor({}));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const dirtyRef = useRef(false);

  const standby = Boolean(ready && career?.careerTracking?.mode === 'standby');

  useEffect(() => {
    if (!career || dirtyRef.current) return;
    setForm(snapshotFor(career));
  }, [career]);

  useEffect(() => {
    if (!standby) {
      document.getElementById('dhq-standby-status-update-host')?.remove();
      setHost(null);
      return undefined;
    }

    let scheduled = false;
    const sync = () => {
      scheduled = false;
      const waitingCard = document.querySelector('.dhq-standby-card--waiting');
      const statusGrid = waitingCard?.querySelector('.dhq-standby-status-grid');
      const activation = waitingCard?.querySelector('.dhq-standby-activate');
      if (!waitingCard || !statusGrid || !activation) {
        document.getElementById('dhq-standby-status-update-host')?.remove();
        setHost(null);
        return;
      }

      let nextHost = document.getElementById('dhq-standby-status-update-host');
      if (!nextHost || nextHost.parentElement !== waitingCard) {
        nextHost?.remove();
        nextHost = document.createElement('div');
        nextHost.id = 'dhq-standby-status-update-host';
        waitingCard.insertBefore(nextHost, activation);
      }
      setHost((current) => (current === nextHost ? current : nextHost));
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.getElementById('dhq-standby-status-update-host')?.remove();
    };
  }, [standby]);

  const update = (field, value) => {
    dirtyRef.current = true;
    setMessage(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveStatus = async (event) => {
    event.preventDefault();
    if (!user || !db) {
      setMessage({ type: 'error', text: 'Sign in to DynastyHQ before updating Career Standby.' });
      return;
    }

    const season = Math.max(1, Math.min(6, Number(form.season) || 1));
    const overall = numberOrBlank(form.overall);
    const skillPoints = numberOrBlank(form.skillPoints);
    const coachTrust = numberOrBlank(form.coachTrust);

    if (overall !== '' && (overall < 1 || overall > 99)) {
      setMessage({ type: 'error', text: 'Overall must be between 1 and 99.' });
      return;
    }
    if (skillPoints !== '' && skillPoints < 0) {
      setMessage({ type: 'error', text: 'Skill points cannot be negative.' });
      return;
    }
    if (coachTrust !== '' && coachTrust < 0) {
      setMessage({ type: 'error', text: 'Coach trust cannot be negative.' });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const occurredAt = new Date().toISOString();
      const careerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(careerRef);
        if (!snapshot.exists()) throw new Error('Career save was not found. Reload DynastyHQ and try again.');

        const remote = snapshot.data();
        if (remote?.careerTracking?.mode !== 'standby') {
          throw new Error('Career Standby is no longer active. Reload DynastyHQ before saving this status.');
        }

        const before = snapshotFor(remote);
        const after = {
          season,
          classYear: clean(form.classYear) || before.classYear,
          depthChart: clean(form.depthChart) || before.depthChart,
          overall,
          skillPoints,
          coachTrust,
          number: clean(form.number),
        };
        const statusHistory = [
          ...(Array.isArray(remote.careerTracking?.statusHistory) ? remote.careerTracking.statusHistory : []),
          {
            id: `standby-status-${Date.parse(occurredAt)}`,
            occurredAt,
            before,
            after,
          },
        ].slice(-50);

        transaction.set(careerRef, {
          ...remote,
          currentSeason: season,
          player: {
            ...(remote.player || {}),
            classYear: after.classYear,
            year: after.classYear,
            number: after.number,
            overall: after.overall,
          },
          rtg: {
            ...(remote.rtg || {}),
            rank: after.depthChart,
            skillPoints: after.skillPoints,
            coachTrust: after.coachTrust,
          },
          careerTracking: {
            ...(remote.careerTracking || {}),
            mode: 'standby',
            lastStatusUpdateAt: occurredAt,
            statusHistory,
          },
          _sync: {
            ...(remote._sync || {}),
            revision: (Number(remote?._sync?.revision) || 0) + 1,
            deviceId: DEVICE_ID,
            updatedAt: occurredAt,
          },
        });
      });

      dirtyRef.current = false;
      setMessage({ type: 'success', text: 'Standby status saved. Weekly tracking is still paused.' });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Standby status could not be saved.' });
    } finally {
      setBusy(false);
    }
  };

  if (!host || !standby) return null;

  return createPortal(
    <section className="dhq-standby-status-update" aria-label="Update standby career status">
      <div className="dhq-standby-status-update__heading">
        <div>
          <span><SlidersHorizontal size={14} /> Standby status update</span>
          <h3>Keep Your Player Snapshot Current</h3>
          <p>Use this when your class, depth-chart role, or ratings change while you are not logging games. It does not start weekly tracking or publish anything.</p>
        </div>
      </div>

      <form onSubmit={saveStatus} className="dhq-standby-status-update__form">
        <label><span>Career season</span><input type="number" min="1" max="6" value={form.season} onChange={(event) => update('season', event.target.value)} /></label>
        <label><span>Class</span><select value={form.classYear} onChange={(event) => update('classYear', event.target.value)}><option>Freshman</option><option>Sophomore</option><option>Junior</option><option>Senior</option><option>Graduate</option></select></label>
        <label><span>Depth chart</span><select value={form.depthChart} onChange={(event) => update('depthChart', event.target.value)}><option value="QB1">QB1</option><option value="QB2">QB2</option><option value="QB3">QB3</option><option value="Redshirt">Redshirt</option><option value="Not captured">Not captured</option></select></label>
        <label><span>Overall</span><input type="number" min="1" max="99" value={form.overall} onChange={(event) => update('overall', event.target.value)} placeholder="Optional" /></label>
        <label><span>Skill points</span><input type="number" min="0" value={form.skillPoints} onChange={(event) => update('skillPoints', event.target.value)} placeholder="Optional" /></label>
        <label><span>Coach trust</span><input type="number" min="0" value={form.coachTrust} onChange={(event) => update('coachTrust', event.target.value)} placeholder="Optional" /></label>
        <label><span>Jersey #</span><input inputMode="numeric" value={form.number} onChange={(event) => update('number', event.target.value)} placeholder="6" /></label>
        <div className="dhq-standby-status-update__action">
          <p>{form.depthChart === 'QB1' ? 'QB1 is a tracking trigger. Save this snapshot, then use Start Tracking From This Week below.' : 'No game, article, or weekly publication will be created.'}</p>
          <button type="submit" disabled={busy}>{busy ? 'SAVING…' : 'SAVE STANDBY STATUS'} <Save size={14} /></button>
        </div>
      </form>

      {message ? <div className={`dhq-standby-status-update__message is-${message.type}`}>{message.text}</div> : null}
    </section>,
    host,
  );
};

export default StandbyStatusUpdatePortal;
