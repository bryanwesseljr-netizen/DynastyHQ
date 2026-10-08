import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronRight,
  CloudUpload,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
  Trophy,
} from 'lucide-react';
import { runTransaction } from 'firebase/firestore';
import { db, productionAppId } from '../firebase.js';
import { compressImage } from '../services/imageCompression.js';
import { analyzeSeasonScheduleScreenshot } from '../services/seasonScheduleClient.js';
import { resolveTeamBrand } from '../domain/teamBrandResolver.js';
import {
  mergeSeasonSchedule,
  nextScheduledGame,
  scheduleDisplayLabel,
  scheduleHighlightWeek,
  schedulePhaseForEntry,
  scheduleWeekSetup,
  seasonScheduleFor,
  syncScheduleWithCareer,
  teamRecordForSeason,
  upsertSeasonSchedule,
} from '../domain/seasonSchedule.js';
import { detectDestructiveCareerRegression } from '../domain/saveProtection.js';
import {
  advancePostseasonCareer,
  postseasonAdvanceCandidate,
} from '../domain/postseasonContext.js';
import { estimatedJsonBytes, splitCareerStateForStorage } from '../domain/careerStorage.js';
import {
  readHydratedCareerInTransaction,
  writeHydratedCareerInTransaction,
} from '../services/careerStorageFirestore.js';
import './schedule-experience.css';

const MAX_FILES = 4;
const DEVICE_ID = globalThis.crypto?.randomUUID?.() || `schedule-option-a-${Date.now()}`;
const clean = (value) => String(value ?? '').trim();

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const readScheduleWithRetry = async (args) => {
  try {
    return await analyzeSeasonScheduleScreenshot(args);
  } catch (error) {
    if (!error?.retryable) throw error;
    await wait(900);
    return analyzeSeasonScheduleScreenshot(args);
  }
};

const scheduleTeamBrandCache = new Map();

const ScheduleTeamLogo = ({ team = '', bye = false }) => {
  const teamName = clean(team);
  const [brand, setBrand] = useState(() => scheduleTeamBrandCache.get(teamName) || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (bye || !teamName) return undefined;
    let active = true;
    const cached = scheduleTeamBrandCache.get(teamName);
    if (cached) {
      setBrand(cached);
      setFailed(false);
      return () => { active = false; };
    }
    resolveTeamBrand(teamName).then((next) => {
      if (!active) return;
      scheduleTeamBrandCache.set(teamName, next);
      setBrand(next);
      setFailed(false);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, [teamName, bye]);

  if (bye) return <span className="oa-schedule-logo is-bye"><CalendarDays size={16}/></span>;

  const src = !failed ? (brand?.logo || brand?.directLogo || '') : '';
  const fallback = (brand?.abbreviation || teamName.split(/\s+/).map((word) => word[0]).join('').slice(0, 3) || '?').toUpperCase();
  return <span
    className={'oa-schedule-logo ' + (src ? 'has-logo' : 'fallback-logo')}
    style={{
      '--schedule-team-primary': brand?.primaryColor || '#0c5f46',
      '--schedule-team-secondary': brand?.secondaryColor || '#f0d832',
    }}
    aria-label={brand?.displayName || teamName || 'Opponent'}
  >
    {src ? <img src={src} alt="" onError={() => setFailed(true)}/> : <b>{fallback}</b>}
  </span>;
};

const statusLabel = (entry = {}) => {
  if (entry.isBye) return 'BYE';
  if (entry.completed) {
    const score = entry.teamScore !== null && entry.teamScore !== undefined
      && entry.opponentScore !== null && entry.opponentScore !== undefined
      ? ` ${entry.teamScore}-${entry.opponentScore}`
      : '';
    return `${entry.result || 'FINAL'}${score}`;
  }
  return entry.homeAway === 'away'
    ? 'AWAY'
    : entry.homeAway === 'home'
      ? 'HOME'
      : entry.homeAway === 'neutral'
        ? 'NEUTRAL'
        : 'UPCOMING';
};

const setupWithPreservedDetails = (suggested, existing = {}) => {
  if (!suggested) return existing;
  if (suggested.type === 'bye') return { ...existing, ...suggested };
  const sameOpponent = clean(existing.opponent).toLowerCase() === clean(suggested.opponent).toLowerCase();
  return {
    ...existing,
    ...suggested,
    opponentRecord: sameOpponent ? (existing.opponentRecord || '') : '',
    kickoff: sameOpponent ? (existing.kickoff || suggested.kickoff || '') : (suggested.kickoff || ''),
    venue: sameOpponent ? (existing.venue || suggested.venue || '') : (suggested.venue || ''),
    note: sameOpponent ? (existing.note || '') : '',
  };
};

const ScheduleRow = ({ entry, currentWeek, compact = false }) => {
  const phase = schedulePhaseForEntry(entry);
  const namedPostseason = phase === 'postseason' && (entry.postseasonRound || entry.bowlName);
  const slotLabel = namedPostseason && /^bowl\s*\d+$/i.test(clean(entry.label))
    ? clean(entry.label).toUpperCase()
    : scheduleDisplayLabel(entry);
  const active = Number(entry.week) === Number(currentWeek) && !entry.completed;
  return <div className={`oa-schedule-row ${entry.completed ? 'is-complete' : ''} ${active ? 'is-active' : ''} ${entry.isBye ? 'is-bye' : ''}`}>
    <div className="oa-schedule-week">
      <span>{slotLabel}</span>
      {phase === 'postseason' ? <em>POST</em> : null}
    </div>
    <div className="oa-schedule-opponent">
      {!compact ? <ScheduleTeamLogo team={entry.opponent} bye={entry.isBye}/> : null}
      <span>
        <strong>{entry.isBye ? 'BYE WEEK' : clean(entry.opponent).toUpperCase() || 'OPPONENT TBD'}</strong>
        {namedPostseason ? <small className="oa-postseason-game-title">{scheduleDisplayLabel(entry)}</small> : !compact && (entry.label || entry.date) ? <small>{entry.label || entry.date}</small> : null}
      </span>
    </div>
    <b className={entry.result === 'W' ? 'is-win' : entry.result === 'L' ? 'is-loss' : ''}>{statusLabel(entry)}</b>
  </div>;
};

const compactRows = ({ entries, currentWeek }) => {
  if (!entries.length) return [];
  const currentIndex = entries.findIndex((entry) => Number(entry.week) === Number(currentWeek));
  if (currentIndex >= 0) return entries.slice(Math.max(0, currentIndex - 1), currentIndex + 3);
  const nextIndex = entries.findIndex((entry) => !entry.completed && !entry.isBye);
  if (nextIndex >= 0) return entries.slice(Math.max(0, nextIndex - 1), nextIndex + 3);
  return entries.slice(-4);
};

const ScheduleExperience = ({ career, user, data, mode = 'home', go, notify, connectLive }) => {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [draftSchedule, setDraftSchedule] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [postseasonDraft, setPostseasonDraft] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const activeSeason = Number(career?.currentSeason || data?.season || 1) || 1;
  const displaySeason = mode === 'home'
    ? activeSeason
    : (Number(data?.season || activeSeason) || activeSeason);
  const currentWeek = displaySeason === activeSeason
    ? Number(career?.currentWeek || data?.week || 0)
    : Number(data?.week || 0);
  const schedule = useMemo(() => {
    if (!career) return null;
    const saved = seasonScheduleFor(career, displaySeason);
    return saved ? syncScheduleWithCareer(career, saved) : null;
  }, [career, displaySeason]);
  const entries = schedule?.entries || [];
  const record = useMemo(
    () => teamRecordForSeason(career || {}, displaySeason),
    [career, displaySeason],
  );
  const nextGame = displaySeason === activeSeason
    ? nextScheduledGame(career || {}, activeSeason)
    : entries.find((entry) => !entry.completed && !entry.isBye) || null;
  const highlightedWeek = displaySeason === activeSeason
    ? scheduleHighlightWeek(entries, currentWeek)
    : currentWeek;
  const rows = mode === 'home' ? compactRows({ entries, currentWeek: highlightedWeek }) : entries;
  const splitIndex = Math.ceil(rows.length / 2);
  const scheduleColumns = mode === 'home' ? [] : [rows.slice(0, splitIndex), rows.slice(splitIndex)];
  const playoffEntries = entries.filter((entry) => !entry.isBye && schedulePhaseForEntry(entry) === 'postseason');
  const hasPostseason = entries.some((entry) => schedulePhaseForEntry(entry) === 'postseason');
  const canUpdate = Boolean(user && career && displaySeason === activeSeason);
  const postseasonCandidate = useMemo(
    () => (career && displaySeason === activeSeason ? postseasonAdvanceCandidate(career) : null),
    [career, displaySeason, activeSeason],
  );

  const openDetails = () => {
    if (!canUpdate || !playoffEntries.length) return;
    setPostseasonDraft(playoffEntries.map((entry) => ({
      week: Number(entry.week),
      opponent: entry.opponent,
      slot: entry.label || `W${entry.week}`,
      postseasonRound: entry.postseasonRound || '',
      bowlName: entry.bowlName || '',
      homeAway: entry.homeAway || 'unknown',
    })));
    setMessage('');
    setError('');
    setDetailsOpen(true);
  };

  const editPostseasonDetail = (week, patch) => {
    setPostseasonDraft((current) => current.map((entry) => Number(entry.week) === Number(week)
      ? { ...entry, ...patch }
      : entry));
  };

  const saveDetails = async () => {
    if (!user || !career || !db || busy || !canUpdate || !postseasonDraft.length) return;
    setBusy(true);
    setError('');
    try {
      await runTransaction(db, async (transaction) => {
        const loaded = await readHydratedCareerInTransaction({
          transaction,
          db,
          appId: productionAppId,
          userId: user.uid,
        });
        if (!loaded) throw new Error('Your live DynastyHQ schedule could not be reloaded. Nothing was changed.');

        const remote = loaded.state;
        if (Number(remote.currentSeason || 1) !== Number(activeSeason)) {
          throw new Error('The active season changed during editing. Reload and try again.');
        }
        const savedSchedule = seasonScheduleFor(remote, activeSeason);
        if (!savedSchedule) throw new Error('The saved schedule is unavailable. Nothing was changed.');
        const requested = new Map(postseasonDraft.map((entry) => [Number(entry.week), entry]));
        const updated = {
          ...savedSchedule,
          entries: savedSchedule.entries.map((entry) => {
            const detail = requested.get(Number(entry.week));
            if (!detail || entry.isBye || schedulePhaseForEntry(entry) !== 'postseason') return entry;
            return {
              ...entry,
              postseasonRound: detail.postseasonRound || '',
              bowlName: clean(detail.bowlName).slice(0, 90),
              homeAway: ['home', 'away', 'neutral'].includes(detail.homeAway)
                ? detail.homeAway
                : 'unknown',
            };
          }),
          updatedAt: new Date().toISOString(),
        };
        let next = {
          ...remote,
          seasonSchedules: [
            ...(remote.seasonSchedules || []).filter((entry) => Number(entry?.season) !== Number(activeSeason)),
            updated,
          ].sort((a,b) => Number(a.season) - Number(b.season)),
        };

        const suggested = scheduleWeekSetup(next);
        if (suggested && Number(suggested.week) === Number(next.currentWeek)) {
          next = {
            ...next,
            currentWeekSetup: {
              ...setupWithPreservedDetails(suggested, next.currentWeekSetup || {}),
              // An explicitly confirmed schedule location must override the stale
              // auto-derived venue (e.g. a prior neutral-site assumption).
              ...(postseasonDraft.some((entry) => Number(entry.week) === Number(suggested.week)
                && ['home', 'away', 'neutral'].includes(entry.homeAway))
                ? { venue: suggested.venue }
                : {}),
            },
          };
        }

        const regression = detectDestructiveCareerRegression(remote, next);
        if (regression.blocked) {
          throw new Error('DynastyHQ protected your saved career history. ' + regression.reason);
        }
        const savedAt = new Date().toISOString();
        next = {
          ...next,
          _sync: {
            revision: (Number(loaded.rawMain?._sync?.revision) || 0) + 1,
            deviceId: DEVICE_ID,
            updatedAt: savedAt,
          },
        };
        const split = splitCareerStateForStorage(next, savedAt);
        if (estimatedJsonBytes(split.mainState) >= 950 * 1024
          || split.archives.some((archive) => estimatedJsonBytes(archive) >= 950 * 1024)) {
          throw new Error('The updated playoff details exceed the safe storage limit. Nothing was changed.');
        }
        writeHydratedCareerInTransaction({
          transaction,
          db,
          appId: productionAppId,
          userId: user.uid,
          state: next,
        });
      });
      setDetailsOpen(false);
      notify?.('Confirmed playoff round and bowl details saved.');
    } catch (saveError) {
      setError(saveError?.message || 'Playoff details could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const resetImporter = () => {
    setFiles([]);
    setDraftSchedule(null);
    setMessage('');
    setError('');
  };

  const openImporter = () => {
    if (!canUpdate) {
      notify?.('Schedule updates are available on the live season.');
      return;
    }
    resetImporter();
    setOpen(true);
  };

  const activatePostseason = async () => {
    if (!postseasonCandidate || !user || !career || !db || busy) return;
    setBusy(true);
    setError('');
    try {
      let activatedLabel = postseasonCandidate.displayLabel;
      await runTransaction(db, async (transaction) => {
        const loaded = await readHydratedCareerInTransaction({
          transaction,
          db,
          appId: productionAppId,
          userId: user.uid,
        });
        if (!loaded) throw new Error('Your live DynastyHQ career could not be loaded. Nothing was changed.');

        const remote = loaded.state;
        const next = advancePostseasonCareer(remote);
        if (Number(next.currentWeek) === Number(remote.currentWeek)) {
          throw new Error('The next postseason game is not ready to activate yet.');
        }
        activatedLabel = next.currentWeekSetup?.label || activatedLabel;

        const regression = detectDestructiveCareerRegression(remote, next);
        if (regression.blocked) {
          throw new Error('DynastyHQ blocked postseason activation because it would regress saved career history. ' + regression.reason);
        }

        const savedAt = new Date().toISOString();
        const withSync = {
          ...next,
          _sync: {
            revision: (Number(loaded.rawMain?._sync?.revision) || 0) + 1,
            deviceId: DEVICE_ID,
            updatedAt: savedAt,
          },
        };
        writeHydratedCareerInTransaction({
          transaction,
          db,
          appId: productionAppId,
          userId: user.uid,
          state: withSync,
        });
      });
      notify?.(`${activatedLabel} is now the active DynastyHQ game.`);
    } catch (activationError) {
      setError(activationError?.message || 'The postseason game could not be activated.');
    } finally {
      setBusy(false);
    }
  };

  const addFiles = (list) => {
    const images = [...(list || [])]
      .filter((file) => file.type?.startsWith('image/'))
      .slice(0, MAX_FILES);
    setFiles(images);
    setDraftSchedule(null);
    setMessage('');
    setError('');
  };

  const inspectSchedule = async () => {
    if (!files.length || !user || !career) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const idToken = await user.getIdToken();
      let merged = schedule || {
        season: activeSeason,
        school: career.player?.college || career.player?.school || '',
        entries: [],
        sourceFiles: [],
      };
      let readable = 0;

      for (const file of files) {
        const imageDataUrl = await compressImage(file, 2200, 0.88);
        const response = await readScheduleWithRetry({
          idToken,
          imageDataUrl,
          fileName: file.name,
          player: career.player || {},
          season: activeSeason,
        });
        const analysis = response.analysis || {};
        if (analysis.screenType !== 'season_schedule' || !Array.isArray(analysis.entries) || !analysis.entries.length) continue;
        readable += 1;
        merged = mergeSeasonSchedule(merged, {
          season: activeSeason,
          school: analysis.school || career.player?.college || career.player?.school || '',
          importedAt: new Date().toISOString(),
          sourceFiles: [file.name],
          entries: analysis.entries,
        }, activeSeason);
      }

      if (!readable || !merged.entries?.length) {
        throw new Error('DynastyHQ could not find a readable season schedule in those screenshots. Try a clearer schedule screen.');
      }

      setDraftSchedule(merged);
      setMessage(`Found ${merged.entries.length} schedule rows. Existing weeks are preserved; new or changed rows will merge into Season ${activeSeason}.`);
    } catch (scheduleError) {
      setError(scheduleError?.message || 'The schedule could not be read.');
    } finally {
      setBusy(false);
    }
  };

  const confirmSchedule = async () => {
    if (!draftSchedule || !user || !career || !db) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await runTransaction(db, async (transaction) => {
        const loaded = await readHydratedCareerInTransaction({
          transaction,
          db,
          appId: productionAppId,
          userId: user.uid,
        });
        if (!loaded) throw new Error('Your live DynastyHQ career could not be loaded. Nothing was changed.');

        const remote = loaded.state;
        let next = upsertSeasonSchedule(remote, draftSchedule);
        next = advancePostseasonCareer(next);
        const suggested = scheduleWeekSetup(next);
        if (suggested && Number(suggested.week) === Number(next.currentWeek)) {
          next = {
            ...next,
            currentWeekSetup: setupWithPreservedDetails(suggested, next.currentWeekSetup || {}),
          };
        }

        const regression = detectDestructiveCareerRegression(remote, next);
        if (regression.blocked) {
          throw new Error('DynastyHQ blocked the schedule update because it would regress saved career history. ' + regression.reason);
        }

        const savedAt = new Date().toISOString();
        next = {
          ...next,
          _sync: {
            revision: (Number(loaded.rawMain?._sync?.revision) || 0) + 1,
            deviceId: DEVICE_ID,
            updatedAt: savedAt,
          },
        };

        const storagePreview = splitCareerStateForStorage(next, savedAt);
        const mainBytes = estimatedJsonBytes(storagePreview.mainState);
        const largestArchiveBytes = storagePreview.archives.reduce(
          (largest, archive) => Math.max(largest, estimatedJsonBytes(archive)),
          0,
        );
        if (mainBytes >= 950 * 1024 || largestArchiveBytes >= 950 * 1024) {
          throw new Error('The schedule update would make a DynastyHQ storage shard too large. Nothing was written.');
        }

        writeHydratedCareerInTransaction({
          transaction,
          db,
          appId: productionAppId,
          userId: user.uid,
          state: next,
        });
      });

      setMessage(`Season ${activeSeason} schedule updated. Postseason rows will automatically feed Week Setup when their visible labels identify a bowl, conference championship, or CFP round.`);
      setFiles([]);
      setDraftSchedule(null);
      notify?.('Season schedule updated.');
      window.setTimeout(() => setOpen(false), 1000);
    } catch (scheduleError) {
      setError(scheduleError?.message || 'The schedule could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const statusText = entries.length
    ? nextGame
      ? `${record.wins}-${record.losses} · NEXT ${scheduleDisplayLabel(nextGame)} · ${clean(nextGame.opponent).toUpperCase()}`
      : hasPostseason
        ? `${record.wins}-${record.losses} · POSTSEASON SCHEDULE COMPLETE`
        : `${record.wins}-${record.losses} · AWAITING POSTSEASON`
    : `${record.wins}-${record.losses} · IMPORT SCHEDULE`;

  const disconnected = !career;

  return <>
    {mode === 'home' ? (
      <section className="oa-road-ahead" aria-label="The road ahead schedule">
        <header>
          <div>
            <span><CalendarDays size={14}/> THE ROAD AHEAD</span>
            <h2>{statusText}</h2>
          </div>
          <div className="oa-schedule-header-actions">
            {canUpdate && playoffEntries.length ? <button type="button" className="oa-edit-playoff" onClick={openDetails}><Trophy size={14}/> PLAYOFF DETAILS</button> : null}
            <button type="button" onClick={openImporter} disabled={!canUpdate} title={!canUpdate ? 'Connect Live Career first' : ''}>
              {entries.length ? <><RefreshCw size={14}/> UPDATE SCHEDULE</> : <><CloudUpload size={14}/> IMPORT SCHEDULE</>}
            </button>
          </div>
        </header>
        {postseasonCandidate ? (
          <div className="oa-postseason-ready oa-postseason-ready-full">
            <div><Trophy size={15}/><span><b>{postseasonCandidate.displayLabel} · {clean(postseasonCandidate.opponent).toUpperCase()}</b><small>Ready to become the active Week Processing game.</small></span></div>
            <button type="button" onClick={activatePostseason} disabled={busy}>{busy ? 'ACTIVATING…' : `START ${postseasonCandidate.displayLabel}`}</button>
          </div>
        ) : null}
        {disconnected ? (
          <div className="oa-schedule-empty oa-schedule-disconnected">
            <strong>Connect your live career to load the real schedule.</strong>
            <span>This Vercel preview uses a separate browser sign-in from the live DynastyHQ domain. Once connected here, the Road Ahead will use your current production career instead of the sample Week 10 data.</span>
            <button type="button" className="oa-connect-live" onClick={connectLive}>CONNECT LIVE CAREER</button>
          </div>
        ) : rows.length ? (
          <div className="oa-road-ahead-rows">
            {rows.map((entry) => <ScheduleRow key={`${entry.week}-${entry.opponent}`} entry={entry} currentWeek={highlightedWeek} compact />)}
          </div>
        ) : (
          <div className="oa-schedule-empty">
            <strong>Your season road map belongs here.</strong>
            <span>Upload the CFB 27 schedule once, then update it when conference championship, bowl, or CFP matchups are revealed.</span>
          </div>
        )}
        {postseasonCandidate ? (
          <div className="oa-postseason-ready">
            <div><Trophy size={15}/><span><b>{postseasonCandidate.displayLabel} IS READY</b><small>{clean(postseasonCandidate.opponent).toUpperCase()} · Postseason / Playoff</small></span></div>
            <button type="button" onClick={activatePostseason} disabled={busy}>{busy ? 'ACTIVATING…' : `START ${postseasonCandidate.displayLabel}`}</button>
          </div>
        ) : entries.length && !nextGame && !hasPostseason ? (
          <div className="oa-postseason-wait"><ShieldCheck size={14}/><span>POSTSEASON: Awaiting the next CFB 27 matchup. Use Update Schedule when it appears.</span></div>
        ) : null}
        <footer>
          <button type="button" className="oa-schedule-link" onClick={() => go?.('gamehub')}>VIEW FULL SCHEDULE <ChevronRight size={14}/></button>
          <small>Schedule updates merge into Season {activeSeason}; completed weeks stay intact.</small>
        </footer>
      </section>
    ) : (
      <section className="oa-full-schedule" aria-label="Full season schedule">
        <header>
          <div>
            <span><CalendarDays size={14}/> SEASON {displaySeason}</span>
            <h2>FULL SEASON SCHEDULE</h2>
            <p>{statusText}</p>
          </div>
          {canUpdate ? <div className="oa-schedule-header-actions">
            {playoffEntries.length ? <button type="button" className="oa-edit-playoff" onClick={openDetails}><Trophy size={14}/> PLAYOFF DETAILS</button> : null}
            <button type="button" onClick={openImporter}>
              {entries.length ? <><RefreshCw size={14}/> UPDATE SCHEDULE</> : <><CloudUpload size={14}/> IMPORT SCHEDULE</>}
            </button>
          </div> : null}
        </header>
        {disconnected ? (
          <div className="oa-schedule-empty oa-schedule-disconnected">
            <strong>Connect your live career to open the real Season {displaySeason} schedule.</strong>
            <span>The preview is currently showing sample data because this Vercel address has not been signed into your DynastyHQ account yet.</span>
            <button type="button" className="oa-connect-live" onClick={connectLive}>CONNECT LIVE CAREER</button>
          </div>
        ) : entries.length ? (
          <div className="oa-full-schedule-board">
            {scheduleColumns.map((column, columnIndex) => (
              <div className="oa-full-schedule-column" key={columnIndex}>
                {column.map((entry) => <ScheduleRow key={`${entry.week}-${entry.opponent}`} entry={entry} currentWeek={highlightedWeek} />)}
              </div>
            ))}
          </div>
        ) : (
          <div className="oa-schedule-empty">
            <strong>No schedule has been imported for Season {displaySeason}.</strong>
            <span>{canUpdate ? 'Import the CFB 27 schedule to power the Road Ahead, team record, and upcoming opponent context.' : 'This archived season does not have saved schedule rows.'}</span>
          </div>
        )}
      </section>
    )}

    {detailsOpen ? <div className="oa-schedule-modal" role="dialog" aria-modal="true" aria-label="Edit playoff round and bowl details" data-playoff-details>
      <button className="oa-schedule-backdrop" type="button" aria-label="Close playoff details" onClick={() => !busy && setDetailsOpen(false)}/>
      <section className="oa-schedule-modal-card">
        <button className="oa-schedule-close" type="button" onClick={() => !busy && setDetailsOpen(false)} aria-label="Close"><X size={18}/></button>
        <span className="oa-schedule-eyebrow"><Trophy size={14}/> SEASON {activeSeason} PLAYOFF DETAILS</span>
        <h2>Give every postseason game its real name.</h2>
        <p>Choose the round and enter the actual bowl name when College Football 27 confirms them. A Bowl 1/2/3 calendar slot does not prove the playoff round. Unknown details can stay blank until the bracket reveals them.</p>
        <div className="oa-playoff-detail-grid">
          {postseasonDraft.map((entry) => <div className="oa-playoff-detail-card" key={entry.week}>
            <header>
              <small>{entry.slot.toUpperCase()} · INTERNAL WEEK {entry.week}</small>
              <strong>{clean(entry.opponent).toUpperCase()}</strong>
            </header>
            <div className="oa-playoff-detail-fields">
              <label>PLAYOFF ROUND
                <select value={entry.postseasonRound} onChange={(event) => editPostseasonDetail(entry.week, {postseasonRound: event.target.value})}>
                  <option value="">Not confirmed yet</option>
                  <option value="first-round">CFP First Round</option>
                  <option value="quarterfinal">CFP Quarterfinal</option>
                  <option value="semifinal">CFP Semifinal</option>
                  <option value="national-championship">CFP National Championship</option>
                  <option value="bowl">Other Bowl Game</option>
                </select>
              </label>
              <label>BOWL NAME
                <input value={entry.bowlName} maxLength={90} list="oa-playoff-bowl-suggestions" placeholder="If confirmed, e.g. Rose Bowl" onChange={(event) => editPostseasonDetail(entry.week, {bowlName: event.target.value})}/>
              </label>
              <label>GAME LOCATION
                <select value={entry.homeAway} onChange={(event) => editPostseasonDetail(entry.week, {homeAway: event.target.value})}>
                  <option value="unknown">Not confirmed yet</option>
                  <option value="home">Home — our stadium</option>
                  <option value="away">Away — opponent's stadium</option>
                  <option value="neutral">Neutral site</option>
                </select>
              </label>
            </div>
            <div className="oa-playoff-detail-preview"><span>WILL DISPLAY</span><b>{scheduleDisplayLabel({...entry, label: entry.slot})}</b><small>{entry.homeAway === 'home' ? 'HOME GAME' : entry.homeAway === 'away' ? 'AWAY GAME' : entry.homeAway === 'neutral' ? 'NEUTRAL SITE' : 'LOCATION UNCONFIRMED'}</small></div>
          </div>)}
        </div>
        <datalist id="oa-playoff-bowl-suggestions">
          <option value="Rose Bowl"/><option value="Sugar Bowl"/><option value="Orange Bowl"/>
          <option value="Cotton Bowl"/><option value="Fiesta Bowl"/><option value="Peach Bowl"/>
        </datalist>
        {error ? <div className="oa-schedule-error">{error}</div> : null}
        <div className="oa-schedule-safety"><ShieldCheck size={15}/><span>Playoff titles and verified game locations are updated. Opponents, scores, player stats, completed weeks and internal calendar slots remain unchanged.</span></div>
        <div className="oa-schedule-actions">
          <button className="secondary" type="button" onClick={() => setDetailsOpen(false)} disabled={busy}>CANCEL</button>
          <button className="primary" type="button" onClick={saveDetails} disabled={busy}>{busy ? <><Loader2 className="spin" size={15}/> SAVING…</> : 'SAVE PLAYOFF DETAILS'}</button>
        </div>
      </section>
    </div> : null}

    {open ? <div className="oa-schedule-modal" role="dialog" aria-modal="true" aria-label="Update season schedule" data-schedule-importer>
      <button className="oa-schedule-backdrop" type="button" aria-label="Close schedule importer" onClick={() => !busy && setOpen(false)}/>
      <section className="oa-schedule-modal-card">
        <button className="oa-schedule-close" type="button" onClick={() => !busy && setOpen(false)} aria-label="Close"><X size={18}/></button>
        <span className="oa-schedule-eyebrow"><CalendarDays size={14}/> SEASON {activeSeason} SCHEDULE</span>
        <h2>{schedule?.entries?.length ? 'Update the road ahead.' : 'Import the road ahead.'}</h2>
        <p>Upload the CFB 27 schedule screen. You can add up to {MAX_FILES} screenshots if the regular season or postseason takes multiple screens. New rows merge into the existing season; saved games are not erased.</p>

        {!draftSchedule ? <>
          <button className="oa-schedule-drop" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
            <CloudUpload size={28}/>
            <strong>{files.length ? `${files.length} screenshot${files.length === 1 ? '' : 's'} ready` : 'Choose schedule screenshot'}</strong>
            <small>PNG, JPEG, or WebP · regular season, conference championship, bowl, or CFP</small>
          </button>
          <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }}/>
          {files.length ? <div className="oa-schedule-files">{files.map((file) => <span key={`${file.name}-${file.size}`}>{file.name}</span>)}</div> : null}
        </> : <div className="oa-schedule-review">
          <div className="oa-schedule-review-head">
            <span>REVIEW MERGED SCHEDULE</span>
            <button type="button" onClick={() => { setDraftSchedule(null); setMessage(''); }} disabled={busy}>CHOOSE DIFFERENT SCREENSHOTS</button>
          </div>
          <div className="oa-schedule-review-list">
            {draftSchedule.entries.map((entry) => <ScheduleRow key={`${entry.week}-${entry.opponent}`} entry={entry} currentWeek={career.currentWeek} />)}
          </div>
        </div>}

        {error ? <div className="oa-schedule-error">{error}</div> : null}
        {message ? <div className="oa-schedule-success"><Check size={14}/>{message}</div> : null}
        <div className="oa-schedule-safety"><ShieldCheck size={15}/><span>Schedule rows are calendar context only. Weekly Game Data remains the authority for scores, player stats, and career production.</span></div>
        <div className="oa-schedule-actions">
          <button type="button" className="secondary" onClick={() => setOpen(false)} disabled={busy}>CANCEL</button>
          {draftSchedule ? (
            <button type="button" className="primary" onClick={confirmSchedule} disabled={busy}>{busy ? <><Loader2 className="spin" size={15}/> SAVING…</> : 'SAVE SCHEDULE UPDATE'}</button>
          ) : (
            <button type="button" className="primary" onClick={inspectSchedule} disabled={busy || !files.length}>{busy ? <><Loader2 className="spin" size={15}/> READING…</> : 'READ SCHEDULE'}</button>
          )}
        </div>
      </section>
    </div> : null}
  </>;
};

export default ScheduleExperience;
