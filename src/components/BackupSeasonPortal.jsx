import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { doc, runTransaction } from 'firebase/firestore';
import {
  CalendarClock,
  Check,
  FastForward,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { appId, db } from '../firebase.js';
import {
  applyBackupSeasonCatchUp,
  backupSeasonRange,
  backupSeasonTargetOptions,
  isBackupRole,
} from '../domain/backupSeasonMode.js';
import { seasonScheduleFor } from '../domain/seasonSchedule.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './backup-season-mode.css';

const DEVICE_ID = globalThis.crypto?.randomUUID?.() || `backup-mode-${Date.now()}`;
const clean = (value) => String(value ?? '').trim();

const resultFromScores = (teamScore, opponentScore) => {
  if (teamScore === '' || opponentScore === '') return '';
  const left = Number(teamScore);
  const right = Number(opponentScore);
  if (!Number.isFinite(left) || !Number.isFinite(right) || left === right) return '';
  return left > right ? 'W' : 'L';
};

const BackupSeasonPortal = () => {
  const { user, career, ready } = useOwnerCareer();
  const [open, setOpen] = useState(false);
  const [targetWeek, setTargetWeek] = useState('');
  const [resultsOpen, setResultsOpen] = useState(false);
  const [results, setResults] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const season = Math.max(1, Number(career?.currentSeason) || 1);
  const currentWeek = Math.max(1, Number(career?.currentWeek) || 1);
  const role = clean(career?.rtg?.rank);
  const backup = isBackupRole(role);
  const targetOptions = useMemo(() => backupSeasonTargetOptions(career || {}), [career]);
  const chosenWeek = Number(targetWeek) || targetOptions[Math.min(3, Math.max(0, targetOptions.length - 1))] || currentWeek + 1;
  const range = useMemo(() => backupSeasonRange(career || {}, chosenWeek), [career, chosenWeek]);
  const schedule = useMemo(() => seasonScheduleFor(career || {}, season), [career, season]);

  useEffect(() => {
    const handler = () => {
      setError('');
      setMessage('');
      setResultsOpen(false);
      setResults({});
      const defaults = backupSeasonTargetOptions(career || {});
      setTargetWeek(String(defaults[Math.min(3, Math.max(0, defaults.length - 1))] || (Number(career?.currentWeek) || 1) + 1));
      setOpen(true);
    };
    window.addEventListener('dynastyhq:open-backup-season-mode', handler);
    return () => window.removeEventListener('dynastyhq:open-backup-season-mode', handler);
  }, [career]);

  useEffect(() => {
    if (!open || !career) return;
    const next = {};
    range.forEach((entry) => {
      if (entry.isBye) return;
      if (entry.result || entry.teamScore !== null || entry.opponentScore !== null) {
        next[entry.week] = {
          result: entry.result || '',
          teamScore: entry.teamScore ?? '',
          opponentScore: entry.opponentScore ?? '',
        };
      }
    });
    setResults((current) => ({ ...next, ...current }));
  }, [open, career, chosenWeek]);

  if (!ready || !career || !open) return null;

  const updateResult = (week, patch) => {
    setResults((current) => ({
      ...current,
      [week]: { result: '', teamScore: '', opponentScore: '', ...(current[week] || {}), ...patch },
    }));
  };

  const save = async () => {
    if (!user || !db || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (!backup) throw new Error(`Backup Season Mode is unavailable because your saved role is ${role || 'not captured'}.`);
      const resultRows = Object.entries(results).map(([week, value]) => ({
        week: Number(week),
        result: value.result || resultFromScores(value.teamScore, value.opponentScore),
        teamScore: value.teamScore,
        opponentScore: value.opponentScore,
      })).filter((entry) => entry.result || entry.teamScore !== '' || entry.opponentScore !== '');

      const careerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
      const backupRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', `before-backup-fast-forward-${season}-w${currentWeek}-${Date.now()}`);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(careerRef);
        if (!snapshot.exists()) throw new Error('Career save was not found. Reload DynastyHQ and try again.');
        const remote = snapshot.data();
        if (Number(remote.currentSeason || 1) !== season || Number(remote.currentWeek || 1) !== currentWeek) {
          throw new Error('The career week changed while Backup Season Mode was open. Close it and reopen before saving.');
        }
        const next = applyBackupSeasonCatchUp({
          state: remote,
          targetWeek: chosenWeek,
          results: resultRows,
        });
        const revision = (Number(remote?._sync?.revision) || 0) + 1;
        transaction.set(backupRef, {
          ...remote,
          _backupSeasonModeBackup: {
            season,
            fromWeek: currentWeek,
            toWeek: chosenWeek,
            createdAt: new Date().toISOString(),
          },
        });
        transaction.set(careerRef, {
          ...next,
          _sync: { revision, deviceId: DEVICE_ID, updatedAt: new Date().toISOString() },
        });
      });

      setMessage(`Season ${season} advanced from Week ${currentWeek} to Week ${chosenWeek} in one quiet backup stretch.`);
      window.setTimeout(() => setOpen(false), 1100);
    } catch (saveError) {
      setError(saveError?.message || 'Backup Season Mode could not save the catch-up.');
    } finally {
      setBusy(false);
    }
  };

  const gameRows = range.filter((entry) => !entry.isBye);

  return createPortal(
    <div className="dhq-backup-mode" role="dialog" aria-modal="true" aria-labelledby="dhq-backup-mode-title">
      <div className="dhq-backup-mode__backdrop" onClick={() => !busy && setOpen(false)} />
      <section className="dhq-backup-mode__card">
        <button type="button" className="dhq-backup-mode__close" onClick={() => !busy && setOpen(false)} aria-label="Close"><X size={18} /></button>

        <div className="dhq-backup-mode__eyebrow"><FastForward size={15} /> BACKUP SEASON MODE</div>
        <h2 id="dhq-backup-mode-title">Skip the weekly homework.</h2>
        <p className="dhq-backup-mode__lede">
          You are currently saved as <strong>{role || 'backup'}</strong>. Move DynastyHQ ahead several CFB 27 weeks in one save without screenshots, player stats, Newsroom articles, podcasts, or individual weekly publishing.
        </p>

        <div className="dhq-backup-mode__summary">
          <div><small>SEASON</small><strong>{season}</strong></div>
          <div><small>FROM</small><strong>Week {currentWeek}</strong></div>
          <div><small>ADVANCE TO</small><strong>Week {chosenWeek}</strong></div>
          <div><small>PLAYER ROLE</small><strong>{role || 'Backup'}</strong></div>
        </div>

        <label className="dhq-backup-mode__target">
          <span>I have reached this week in CFB 27</span>
          <select value={String(chosenWeek)} onChange={(event) => setTargetWeek(event.target.value)}>
            {targetOptions.map((week) => <option key={week} value={week}>Week {week}</option>)}
          </select>
        </label>

        <div className="dhq-backup-mode__quiet">
          <ShieldCheck size={17} />
          <div>
            <strong>QUIET CAREER HISTORY</strong>
            <p>DynastyHQ creates one Chronicle marker for Weeks {currentWeek}–{chosenWeek - 1}. Your role, RTG ratings, and player stats stay unchanged. If you get promoted or actually play, stop here and return to the normal weekly flow.</p>
          </div>
        </div>

        <button type="button" className="dhq-backup-mode__results-toggle" onClick={() => setResultsOpen((value) => !value)}>
          <CalendarClock size={15} />
          <span><strong>OPTIONAL TEAM RESULTS</strong><small>{resultsOpen ? 'Hide bulk results' : 'Record several games now — or do them later'}</small></span>
          <b>{resultsOpen ? '−' : '+'}</b>
        </button>

        {resultsOpen ? (
          <div className="dhq-backup-mode__results">
            {!schedule?.entries?.length ? (
              <p className="dhq-backup-mode__empty">No Season {season} schedule is saved yet. You can still fast-forward now and import the schedule/results later.</p>
            ) : null}
            {range.map((entry) => {
              if (entry.isBye) return (
                <div className="dhq-backup-result is-bye" key={entry.week}>
                  <b>W{entry.week}</b><strong>BYE WEEK</strong><span>Nothing to enter</span>
                </div>
              );
              const row = results[entry.week] || { result: '', teamScore: '', opponentScore: '' };
              return (
                <div className="dhq-backup-result" key={entry.week}>
                  <b>W{entry.week}</b>
                  <strong>{clean(entry.opponent).toUpperCase() || 'OPPONENT NOT SAVED'}</strong>
                  <div className="dhq-backup-result__wl">
                    {['W', 'L'].map((value) => (
                      <button key={value} type="button" className={row.result === value ? 'is-active' : ''} onClick={() => updateResult(entry.week, { result: row.result === value ? '' : value })}>
                        {row.result === value ? <Check size={11} /> : null}{value}
                      </button>
                    ))}
                  </div>
                  <label><span>ORE</span><input inputMode="numeric" value={row.teamScore} onChange={(event) => updateResult(entry.week, { teamScore: event.target.value.replace(/\D/g, '').slice(0, 3) })} placeholder="—" /></label>
                  <label><span>OPP</span><input inputMode="numeric" value={row.opponentScore} onChange={(event) => updateResult(entry.week, { opponentScore: event.target.value.replace(/\D/g, '').slice(0, 3) })} placeholder="—" /></label>
                </div>
              );
            })}
            {gameRows.length ? <p className="dhq-backup-mode__hint">Scores are optional. W/L alone is enough for the team record. These games are stored as team results with <strong>didPlay: false</strong>.</p> : null}
          </div>
        ) : null}

        {error ? <div className="dhq-backup-mode__error">{error}</div> : null}
        {message ? <div className="dhq-backup-mode__success">{message}</div> : null}

        <div className="dhq-backup-mode__actions">
          <button type="button" className="is-secondary" onClick={() => setOpen(false)} disabled={busy}>CANCEL</button>
          <button type="button" className="is-primary" onClick={save} disabled={busy || chosenWeek <= currentWeek}>
            {busy ? <><Loader2 className="animate-spin" size={15} /> SAVING…</> : <><FastForward size={15} /> FAST-FORWARD TO WEEK {chosenWeek}</>}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
};

export default BackupSeasonPortal;
