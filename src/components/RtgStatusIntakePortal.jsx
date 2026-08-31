import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Loader2, UploadCloud } from 'lucide-react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, db } from '../firebase';
import { resolveWeeklyWorkContext } from '../domain/weeklyWorkContext.js';
import { compressImage } from '../services/imageCompression';
import { analyzeRtgStatusScreenshot } from '../services/rtgStatusScannerClient';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const SCREEN_LABELS = {
  rtg_overview: 'Coach / Overview',
  rtg_academics: 'Academics',
  rtg_leadership: 'Leadership',
  rtg_health: 'Health',
  rtg_fitness: 'Fitness',
  rtg_brand: 'Brand',
};

const TARGET_SCREENS = Object.keys(SCREEN_LABELS);

const NUMERIC_KEYS = new Set([
  'player.overall',
  'rtg.coachTrust',
  'rtg.trustToNext',
  'rtg.skillPoints',
  'rtg.weeklyPoints',
  'rtg.gpa',
  'rtg.examWeeks',
  'rtg.academicsCoachHappinessBonus',
  'rtg.leadershipCoachHappinessBonus',
  'rtg.leadershipComposureBonus',
  'rtg.fitnessCoachHappinessBonus',
  'rtg.fitnessComposureBonus',
  'rtg.fitnessWeightBonus',
  'rtg.followers',
  'rtg.nextFanMilestone',
  'rtg.nilWeeklyCost',
  'rtg.openNilSlots',
]);

const valuePresent = (value) => value !== '' && value !== null && value !== undefined;

const normalizeNumeric = (value) => {
  const raw = String(value ?? '').trim().toLowerCase().replace(/,/g, '');
  const suffix = raw.endsWith('k') ? 1000 : raw.endsWith('m') ? 1000000 : 1;
  const cleaned = raw.replace(/[km]$/, '').replace(/[$%+]/g, '').replace(/\s*lbs?$/i, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed * suffix : '';
};

const normalizeFactValue = (key, value) => NUMERIC_KEYS.has(key) ? normalizeNumeric(value) : String(value ?? '').trim();
const shortValue = (value, fallback = '—') => valuePresent(value) ? String(value) : fallback;

const statusFromCareer = (career = {}) => {
  const rtg = career.rtg || {};
  return [
    ['Coach / Overview', `${shortValue(career.player?.overall)} OVR · ${shortValue(rtg.rank, 'Role —')}`, valuePresent(rtg.coachTrust) ? `${rtg.coachTrust} Coach Trust` : 'Role, OVR, Coach Trust'],
    ['Academics', valuePresent(rtg.gpa) ? `${Number(rtg.gpa).toFixed(1)} GPA` : (rtg.academicsStanding || 'Not scanned'), rtg.academicsAbility || 'Academics status'],
    ['Leadership', rtg.leadershipLevel || 'Not scanned', rtg.leadershipAbility || 'Leadership status'],
    ['Health', rtg.healthLevel || 'Not scanned', rtg.injuryRisk ? `${rtg.injuryRisk} injury risk` : 'Health status'],
    ['Fitness', rtg.fitnessLevel || 'Not scanned', rtg.fitnessWearImpact ? `Wear: ${rtg.fitnessWearImpact}` : 'Fitness status'],
    ['Brand', [rtg.brandTier, valuePresent(rtg.followers) ? `${Number(rtg.followers).toLocaleString()} fans` : ''].filter(Boolean).join(' · ') || 'Not scanned', rtg.brandAbility || 'Brand status'],
  ];
};

const RtgStatusIntakeScanner = ({ user, career }) => {
  const work = useMemo(() => resolveWeeklyWorkContext(career), [career]);
  const statusCards = useMemo(() => statusFromCareer(career), [career]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [rows, setRows] = useState([]);
  const [screens, setScreens] = useState([]);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setRows([]);
    setScreens([]);
    setMessage(null);
    setProgress('');
  }, [work.publicationId]);

  const scanFiles = async (fileList) => {
    const files = [...(fileList || [])].slice(0, 8);
    if (!files.length || !user) return;
    setBusy(true);
    setRows([]);
    setScreens([]);
    setMessage(null);
    const factMap = new Map();
    const nextScreens = [];
    try {
      const idToken = await user.getIdToken();
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setProgress(`Analyzing ${index + 1} of ${files.length}: ${file.name}`);
        const imageDataUrl = await compressImage(file, 2400, 0.9);
        const result = await analyzeRtgStatusScreenshot({
          idToken,
          imageDataUrl,
          fileName: file.name,
          player: career.player,
        });
        const analysis = result.analysis || {};
        nextScreens.push({ fileName: file.name, screenType: analysis.screenType || 'unknown' });
        (analysis.facts || []).forEach((fact) => {
          const key = String(fact.key || '');
          if (!key) return;
          const value = normalizeFactValue(key, fact.value);
          if (!valuePresent(value)) return;
          const next = {
            key,
            label: fact.label || key,
            value,
            confidence: Number(fact.confidence) || 0,
            evidence: fact.evidence || '',
            selected: true,
            conflict: false,
          };
          const existing = factMap.get(key);
          if (!existing) {
            factMap.set(key, next);
            return;
          }
          if (String(existing.value) === String(next.value)) {
            if (next.confidence > existing.confidence) factMap.set(key, next);
            return;
          }
          const preferred = next.confidence > existing.confidence ? next : existing;
          factMap.set(key, { ...preferred, conflict: true });
        });
      }
      setScreens(nextScreens);
      setRows([...factMap.values()].sort((a, b) => a.key.localeCompare(b.key)));
      setMessage({
        type: 'success',
        text: factMap.size ? `${factMap.size} RTG facts extracted. Review before applying.` : 'No reliable RTG facts were found. Nothing was saved.',
      });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'RTG scan failed. Your career data was not changed.' });
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const updateRow = (key, patch) => setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));

  const applyFacts = async () => {
    if (!user || !db || busy) return;
    const approved = rows.filter((row) => row.selected && valuePresent(row.value));
    if (!approved.length) {
      setMessage({ type: 'error', text: 'Select at least one verified RTG fact before saving.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const careerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(careerRef);
        if (!snapshot.exists()) throw new Error('Career save was not found. Reload DynastyHQ and try again.');
        const remote = snapshot.data();
        const rtgPatch = {};
        const playerPatch = {};
        approved.forEach((row) => {
          const value = normalizeFactValue(row.key, row.value);
          if (!valuePresent(value)) return;
          if (row.key === 'player.overall') playerPatch.overall = value;
          else if (row.key.startsWith('rtg.')) rtgPatch[row.key.slice(4)] = value;
        });
        transaction.set(careerRef, {
          ...remote,
          player: { ...(remote.player || {}), ...playerPatch },
          rtg: {
            ...(remote.rtg || {}),
            ...rtgPatch,
            lastStatusScan: {
              scannedAt: new Date().toISOString(),
              publicationId: work.publicationId,
              season: work.season,
              week: work.week,
              screenTypes: [...new Set(screens.map((entry) => entry.screenType).filter((type) => TARGET_SCREENS.includes(type)))],
              factCount: approved.length,
            },
          },
          _sync: {
            revision: (Number(remote?._sync?.revision) || 0) + 1,
            deviceId: 'rtg-status-intake',
            updatedAt: new Date().toISOString(),
          },
        });
      });
      setRows([]);
      setScreens([]);
      setMessage({ type: 'success', text: `${approved.length} verified RTG facts saved for Season ${work.season} · Week ${work.week}.` });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'The verified RTG facts could not be saved.' });
    } finally {
      setBusy(false);
    }
  };

  const detected = new Set(screens.map((entry) => entry.screenType));

  return (
    <div data-rtg-intake-scanner>
      <div className="dhq-rtg-intake-top">
        <p>Recommended screens: Coach / Overview, Academics, Leadership, Health, Fitness, and Brand. Nothing is saved until you approve the extracted facts.</p>
        <label className={`dhq-rtg-intake-upload ${busy ? 'opacity-50' : ''}`}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />} {busy ? 'Scanning…' : 'Upload RTG Screens'}
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} className="hidden" onChange={(event) => {
            scanFiles(event.target.files);
            event.target.value = '';
          }} />
        </label>
      </div>

      {progress ? <div className="dhq-intake-message">{progress}</div> : null}

      <div className="dhq-intake-status-grid">
        {statusCards.map(([title, primary, secondary]) => (
          <div key={title} className="dhq-intake-status-card"><span>{title}</span><strong>{primary}</strong><small>{secondary}</small></div>
        ))}
      </div>

      {screens.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TARGET_SCREENS.map((type) => <span key={type} className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase ${detected.has(type) ? 'border-emerald-400/20 bg-emerald-500/5 text-emerald-300' : 'border-slate-700 text-slate-500'}`}>{detected.has(type) ? '✓ ' : ''}{SCREEN_LABELS[type]}</span>)}
        </div>
      ) : null}

      {rows.length ? (
        <div className="dhq-intake-review">
          <div className="dhq-intake-review__header">Review extracted RTG facts</div>
          <div className="dhq-intake-review__rows">
            {rows.map((row) => (
              <div key={row.key} className="dhq-intake-review__row">
                <input type="checkbox" checked={row.selected} onChange={(event) => updateRow(row.key, { selected: event.target.checked })} className="h-4 w-4 accent-emerald-500" />
                <div><strong>{row.label}</strong><small>{row.conflict ? 'Conflicting readings — verify this value.' : row.evidence || `${Math.round(row.confidence * 100)}% confidence`}</small></div>
                <input type="text" value={row.value} onChange={(event) => updateRow(row.key, { value: event.target.value, selected: true })} />
              </div>
            ))}
          </div>
          <div className="dhq-intake-review__footer"><button type="button" disabled={busy} onClick={applyFacts}><CheckCircle2 size={13} className="mr-1 inline" /> Apply Verified RTG Facts</button></div>
        </div>
      ) : null}

      {message ? <p className={`dhq-intake-message ${message.type === 'error' ? 'is-error' : ''}`}>{message.text}</p> : null}
    </div>
  );
};

const RtgStatusIntakePortal = () => {
  const { user, career } = useOwnerCareer();
  const [host, setHost] = useState(null);

  useEffect(() => {
    const appRoot = document.getElementById('root');
    if (!appRoot) return undefined;
    const ensure = () => {
      const next = appRoot.querySelector('#dhq-weekly-rtg-data-host');
      setHost((current) => current === next ? current : next);
    };
    ensure();
    const observer = new MutationObserver(ensure);
    observer.observe(appRoot, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (!host || !user || !career) return null;
  return createPortal(<RtgStatusIntakeScanner user={user} career={career} />, host);
};

export default RtgStatusIntakePortal;
