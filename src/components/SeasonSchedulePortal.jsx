import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { doc, runTransaction } from 'firebase/firestore';
import {
  CalendarDays,
  CheckCircle2,
  CloudUpload,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { appId, db } from '../firebase.js';
import { compressImage } from '../services/imageCompression.js';
import { analyzeSeasonScheduleScreenshot } from '../services/seasonScheduleClient.js';
import {
  mergeSeasonSchedule,
  nextScheduledGame,
  scheduleWeekSetup,
  scheduleWindowForHome,
  seasonScheduleFor,
  syncScheduleWithCareer,
  teamRecordForSeason,
  upsertSeasonSchedule,
} from '../domain/seasonSchedule.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './season-schedule.css';

const DEVICE_ID = globalThis.crypto?.randomUUID?.() || `schedule-${Date.now()}`;
const MAX_FILES = 4;
const clean = (value) => String(value ?? '').trim();

const statusCopy = (entry = {}) => {
  if (entry.isBye) return 'BYE';
  if (entry.completed) return `${entry.result || 'FINAL'}${entry.teamScore !== null && entry.opponentScore !== null ? ` ${entry.teamScore}-${entry.opponentScore}` : ''}`;
  return entry.homeAway === 'away' ? 'AWAY' : entry.homeAway === 'home' ? 'HOME' : entry.homeAway === 'neutral' ? 'NEUTRAL' : 'UPCOMING';
};

const ScheduleRow = ({ entry, compact = false, currentWeek = 0 }) => (
  <div className={`dhq-schedule-row ${entry.completed ? 'is-complete' : ''} ${entry.isBye ? 'is-bye' : ''} ${Number(entry.week) === Number(currentWeek) && !entry.completed ? 'is-current' : ''}`}>
    <span className="dhq-schedule-row__week">W{entry.week}</span>
    <div className="dhq-schedule-row__opponent">
      <strong>{entry.isBye ? 'BYE WEEK' : clean(entry.opponent).toUpperCase() || 'OPPONENT TBD'}</strong>
      {!compact ? <small>{entry.date || (entry.homeAway === 'unknown' ? 'Schedule imported' : entry.homeAway.toUpperCase())}</small> : null}
    </div>
    <b className={`dhq-schedule-row__status ${entry.result === 'W' ? 'is-win' : entry.result === 'L' ? 'is-loss' : ''}`}>{statusCopy(entry)}</b>
  </div>
);

const SeasonSchedulePortal = () => {
  const { user, career, ready } = useOwnerCareer();
  const [homeMount, setHomeMount] = useState(null);
  const [hubMount, setHubMount] = useState(null);
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);
  const syncKeyRef = useRef('');

  const season = Number(career?.currentSeason) || 1;
  const schedule = useMemo(() => {
    if (!career) return null;
    const saved = seasonScheduleFor(career, season);
    return saved ? syncScheduleWithCareer(career, saved) : null;
  }, [career, season]);
  const record = useMemo(() => teamRecordForSeason(career || {}, season), [career, season]);
  const homeWindow = useMemo(() => scheduleWindowForHome(career || {}, 5), [career]);
  const nextGame = useMemo(() => nextScheduledGame(career || {}, season), [career, season]);

  useEffect(() => {
    let ownedHome = null;
    let ownedHub = null;
    let scheduled = false;

    const syncMounts = () => {
      scheduled = false;
      const homeAnchor = document.querySelector('#dynastyhq-command-center .dhq-gameweek-immersion');
      if (homeAnchor) {
        if (!ownedHome || !ownedHome.isConnected) {
          ownedHome = document.createElement('div');
          ownedHome.dataset.seasonScheduleHome = 'true';
          homeAnchor.insertAdjacentElement('afterend', ownedHome);
        }
        setHomeMount((current) => current === ownedHome ? current : ownedHome);
      } else if (ownedHome) {
        ownedHome.remove();
        ownedHome = null;
        setHomeMount(null);
      }

      const hubAnchor = document.querySelector('.dhq-game-hub .dhq-gh-progress');
      if (hubAnchor) {
        if (!ownedHub || !ownedHub.isConnected) {
          ownedHub = document.createElement('div');
          ownedHub.dataset.seasonScheduleHub = 'true';
          hubAnchor.insertAdjacentElement('afterend', ownedHub);
        }
        setHubMount((current) => current === ownedHub ? current : ownedHub);
      } else if (ownedHub) {
        ownedHub.remove();
        ownedHub = null;
        setHubMount(null);
      }
    };

    const scheduleSync = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(syncMounts);
    };

    syncMounts();
    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      ownedHome?.remove();
      ownedHub?.remove();
    };
  }, []);

  useEffect(() => {
    if (!career || !schedule?.entries?.length) return undefined;
    const text = `${record.wins}-${record.losses}`;
    const apply = () => {
      const targets = [
        document.querySelector('#dynastyhq-command-center .dhq-broadcast-team--left > span'),
        document.querySelector('.dhq-game-hub .dhq-gh-team--left > span'),
        document.querySelector('.dhq-gameday__player-context span:first-child strong'),
      ].filter(Boolean);
      targets.forEach((target) => {
        if (target.textContent !== text) target.textContent = text;
      });
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [career, record.losses, record.wins, schedule]);

  useEffect(() => {
    if (!user || !career || !schedule?.entries?.length || !db) return;
    const suggested = scheduleWeekSetup(career);
    if (!suggested || Number(suggested.week) !== Number(career.currentWeek)) return;
    const current = career.currentWeekSetup || {};
    if (Number(current.week) === Number(suggested.week) && clean(current.opponent).toLowerCase() === clean(suggested.opponent).toLowerCase()) return;
    const key = `${season}:${suggested.week}:${suggested.opponent}`;
    if (syncKeyRef.current === key) return;
    syncKeyRef.current = key;

    const careerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(careerRef);
      if (!snapshot.exists()) return;
      const remote = snapshot.data();
      if (Number(remote.currentWeek) !== Number(suggested.week)) return;
      const remoteCurrent = remote.currentWeekSetup || {};
      if (Number(remoteCurrent.week) === Number(suggested.week) && clean(remoteCurrent.opponent).toLowerCase() === clean(suggested.opponent).toLowerCase()) return;
      const revision = (Number(remote?._sync?.revision) || 0) + 1;
      transaction.update(careerRef, {
        currentWeekSetup: {
          ...suggested,
          opponentRecord: remoteCurrent.opponentRecord || '',
          kickoff: remoteCurrent.kickoff || suggested.kickoff || '',
          venue: remoteCurrent.venue || suggested.venue || '',
          note: remoteCurrent.note || '',
        },
        '_sync.revision': revision,
        '_sync.deviceId': DEVICE_ID,
        '_sync.updatedAt': new Date().toISOString(),
      });
    }).catch(() => {
      syncKeyRef.current = '';
    });
  }, [career, schedule, season, user]);

  const addFiles = (list) => {
    const images = [...(list || [])].filter((file) => file.type?.startsWith('image/')).slice(0, MAX_FILES);
    setFiles(images);
    setError('');
    setMessage('');
  };

  const saveImportedSchedule = async () => {
    if (!files.length || !user || !career || !db) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const idToken = await user.getIdToken();
      let merged = schedule || { season, school: career.player?.college || career.player?.school || '', entries: [], sourceFiles: [] };
      let readableScreens = 0;

      for (const file of files) {
        const imageDataUrl = await compressImage(file, 2200, 0.88);
        const response = await analyzeSeasonScheduleScreenshot({
          idToken,
          imageDataUrl,
          fileName: file.name,
          player: career.player || {},
          season,
        });
        const analysis = response.analysis || {};
        if (analysis.screenType !== 'season_schedule' || !Array.isArray(analysis.entries) || !analysis.entries.length) continue;
        readableScreens += 1;
        merged = mergeSeasonSchedule(merged, {
          season,
          school: analysis.school || career.player?.college || career.player?.school || '',
          importedAt: new Date().toISOString(),
          sourceFiles: [file.name],
          entries: analysis.entries,
        }, season);
      }

      if (!readableScreens || !merged.entries?.length) {
        throw new Error('DynastyHQ could not find a readable season schedule in those screenshots. Try a clearer schedule screen.');
      }

      const careerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(careerRef);
        if (!snapshot.exists()) throw new Error('Career save was not found. Reload DynastyHQ and try again.');
        const remote = snapshot.data();
        let next = upsertSeasonSchedule(remote, merged);
        const suggested = scheduleWeekSetup(next);
        if (suggested && Number(suggested.week) === Number(next.currentWeek)) {
          const existingSetup = next.currentWeekSetup || {};
          next = {
            ...next,
            currentWeekSetup: {
              ...suggested,
              opponentRecord: existingSetup.opponentRecord || '',
              kickoff: existingSetup.kickoff || suggested.kickoff || '',
              venue: existingSetup.venue || suggested.venue || '',
              note: existingSetup.note || '',
            },
          };
        }
        const revision = (Number(remote?._sync?.revision) || 0) + 1;
        transaction.set(careerRef, {
          ...next,
          _sync: { revision, deviceId: DEVICE_ID, updatedAt: new Date().toISOString() },
        });
      });

      setMessage(`Season ${season} schedule saved. Team record and next-opponent context now use the schedule automatically.`);
      setFiles([]);
      window.setTimeout(() => setOpen(false), 900);
    } catch (scheduleError) {
      setError(scheduleError?.message || 'The schedule could not be imported.');
    } finally {
      setBusy(false);
    }
  };

  if (!ready || !career) return null;

  const homeContent = homeMount ? createPortal(
    <section className="dhq-season-strip" aria-label="Season schedule">
      <div className="dhq-season-strip__heading">
        <div><span><CalendarDays size={14} /> SEASON SCHEDULE</span><strong>{schedule?.entries?.length ? `${record.wins}-${record.losses} · ${schedule.entries.length} WEEKS SAVED` : 'IMPORT ONCE · USE ALL SEASON'}</strong></div>
        <button type="button" onClick={() => { setOpen(true); setError(''); setMessage(''); }}>{schedule?.entries?.length ? <><RefreshCw size={13} /> UPDATE</> : <><CloudUpload size={13} /> IMPORT SCHEDULE</>}</button>
      </div>
      {homeWindow.length ? (
        <div className="dhq-season-strip__rows">{homeWindow.map((entry) => <ScheduleRow key={entry.week} entry={entry} compact currentWeek={career.currentWeek} />)}</div>
      ) : (
        <div className="dhq-season-strip__empty"><span>Upload the CFB 27 season schedule once. DynastyHQ will use it for the true team record and upcoming opponents.</span></div>
      )}
      {nextGame ? <div className="dhq-season-strip__next"><MapPin size={12} /> NEXT: WEEK {nextGame.week} · {nextGame.opponent.toUpperCase()}</div> : null}
    </section>,
    homeMount,
  ) : null;

  const hubContent = hubMount ? createPortal(
    <section className="dhq-season-hub" aria-label="Full season schedule">
      <div className="dhq-season-hub__heading">
        <div><span><CalendarDays size={15} /> SEASON SCHEDULE</span><h2>{schedule?.school || career.player?.college || career.player?.school || 'Current Program'} · {record.wins}-{record.losses}</h2></div>
        <button type="button" onClick={() => { setOpen(true); setError(''); setMessage(''); }}>{schedule?.entries?.length ? 'UPDATE SCHEDULE' : 'IMPORT SCHEDULE'}</button>
      </div>
      {schedule?.entries?.length ? (
        <div className="dhq-season-hub__grid">{schedule.entries.map((entry) => <ScheduleRow key={entry.week} entry={entry} currentWeek={career.currentWeek} />)}</div>
      ) : (
        <div className="dhq-season-hub__empty">No season schedule has been imported yet. One schedule upload can drive team record and next-opponent context for the rest of the season.</div>
      )}
    </section>,
    hubMount,
  ) : null;

  const modal = open ? createPortal(
    <div className="dhq-schedule-modal" role="dialog" aria-modal="true" aria-labelledby="dhq-schedule-modal-title">
      <div className="dhq-schedule-modal__backdrop" onClick={() => !busy && setOpen(false)} />
      <section className="dhq-schedule-modal__card">
        <button type="button" className="dhq-schedule-modal__close" onClick={() => !busy && setOpen(false)} aria-label="Close"><X size={18} /></button>
        <span className="dhq-schedule-modal__eyebrow"><CalendarDays size={15} /> SEASON {season} SETUP</span>
        <h2 id="dhq-schedule-modal-title">Upload the schedule once. DynastyHQ handles the rest.</h2>
        <p>Choose the CFB 27 schedule screenshot. If the full season takes more than one screen, add up to {MAX_FILES} screenshots now. Completed games count toward the team record even when your player did not appear.</p>

        <button type="button" className="dhq-schedule-modal__drop" onClick={() => inputRef.current?.click()} disabled={busy}>
          <CloudUpload size={26} />
          <strong>{files.length ? `${files.length} screenshot${files.length === 1 ? '' : 's'} ready` : 'Choose schedule screenshot'}</strong>
          <small>PNG, JPEG or WebP · up to {MAX_FILES} schedule screens</small>
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} />

        {files.length ? <div className="dhq-schedule-modal__files">{files.map((file) => <span key={`${file.name}-${file.size}`}>{file.name}</span>)}</div> : null}
        {error ? <div className="dhq-schedule-modal__error">{error}</div> : null}
        {message ? <div className="dhq-schedule-modal__success"><CheckCircle2 size={14} /> {message}</div> : null}

        <div className="dhq-schedule-modal__safety"><ShieldCheck size={15} /><span>The schedule is saved as team calendar data, not as player appearances. Weekly game screenshots still own player stats and career production.</span></div>
        <div className="dhq-schedule-modal__actions">
          <button type="button" className="is-secondary" onClick={() => setOpen(false)} disabled={busy}>CANCEL</button>
          <button type="button" className="is-primary" onClick={saveImportedSchedule} disabled={busy || !files.length}>{busy ? <><Loader2 className="animate-spin" size={15} /> READING SCHEDULE…</> : 'IMPORT SEASON SCHEDULE'}</button>
        </div>
      </section>
    </div>,
    document.body,
  ) : null;

  return <>{homeContent}{hubContent}{modal}</>;
};

export default SeasonSchedulePortal;
