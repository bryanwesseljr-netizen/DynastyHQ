import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CheckCircle2, FileSearch, Loader2, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { appId, auth, db } from '../firebase';
import { compressImage } from '../services/imageCompression';
import { analyzeRtgStatusScreenshot } from '../services/rtgStatusScannerClient';

const SCREEN_LABELS = {
  rtg_overview: 'Coach / Overview',
  rtg_academics: 'Academics',
  rtg_leadership: 'Leadership',
  rtg_health: 'Health',
  rtg_fitness: 'Fitness',
  rtg_brand: 'Brand',
  unknown: 'Unclassified',
};

const TARGET_SCREENS = ['rtg_overview', 'rtg_academics', 'rtg_leadership', 'rtg_health', 'rtg_fitness', 'rtg_brand'];

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

const StatusCard = ({ title, primary, secondary }) => (
  <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/45 p-3">
    <p className="text-[10px] font-black uppercase tracking-[0.09em] text-slate-500">{title}</p>
    <p className="mt-1 truncate text-sm font-black text-white">{primary || 'Not scanned'}</p>
    <p className="mt-1 min-h-8 text-[10px] leading-relaxed text-slate-500">{secondary || 'Upload the matching CFB 27 screen to establish this status.'}</p>
  </div>
);

const statusFromCareer = (career = {}) => {
  const rtg = career.rtg || {};
  return {
    overview: `${shortValue(career.player?.overall)} OVR · ${shortValue(rtg.rank, 'Role —')}`,
    overviewDetail: [rtg.coachHappiness, rtg.draftProjection, valuePresent(rtg.weeklyPoints) ? `${rtg.weeklyPoints} weekly pts` : ''].filter(Boolean).join(' · '),
    academics: [valuePresent(rtg.gpa) ? `${Number(rtg.gpa).toFixed(1)} GPA` : '', rtg.academicsStanding].filter(Boolean).join(' · '),
    academicsDetail: [rtg.academicsAbility, valuePresent(rtg.examWeeks) ? `Exam in ${rtg.examWeeks} weeks` : ''].filter(Boolean).join(' · '),
    leadership: rtg.leadershipLevel || '',
    leadershipDetail: [rtg.leadershipAbility, rtg.leadershipTeamXpMultiplier ? `Team XP ${rtg.leadershipTeamXpMultiplier}` : ''].filter(Boolean).join(' · '),
    health: rtg.healthLevel || '',
    healthDetail: [rtg.injuryRisk ? `${rtg.injuryRisk} injury risk` : '', rtg.healthWearImpact ? `Wear impact: ${rtg.healthWearImpact}` : ''].filter(Boolean).join(' · '),
    fitness: rtg.fitnessLevel || '',
    fitnessDetail: [rtg.fitnessTeamXpMultiplier ? `XP ${rtg.fitnessTeamXpMultiplier}` : '', rtg.fitnessWearImpact ? `Wear impact: ${rtg.fitnessWearImpact}` : ''].filter(Boolean).join(' · '),
    brand: [rtg.brandTier, valuePresent(rtg.followers) ? `${Number(rtg.followers).toLocaleString()} fans` : ''].filter(Boolean).join(' · '),
    brandDetail: [rtg.dealTier ? `${rtg.dealTier} deals` : '', rtg.brandAbility].filter(Boolean).join(' · '),
  };
};

const RtgStatusScanner = ({ user, career }) => {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [rows, setRows] = useState([]);
  const [screens, setScreens] = useState([]);
  const [message, setMessage] = useState(null);
  const status = useMemo(() => statusFromCareer(career), [career]);
  const detected = useMemo(() => new Set(screens.map((entry) => entry.screenType)), [screens]);
  const missingScreens = TARGET_SCREENS.filter((type) => !detected.has(type));

  const scanFiles = async (files) => {
    const selected = [...files].slice(0, 8);
    if (!selected.length || !user) return;
    setBusy(true);
    setRows([]);
    setScreens([]);
    setMessage(null);
    const factMap = new Map();
    const nextScreens = [];
    try {
      const idToken = await user.getIdToken();
      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index];
        setProgress(`Analyzing ${index + 1} of ${selected.length}: ${file.name}`);
        const imageDataUrl = await compressImage(file, 2400, 0.9);
        const result = await analyzeRtgStatusScreenshot({
          idToken,
          imageDataUrl,
          fileName: file.name,
          player: career.player,
        });
        const analysis = result.analysis || {};
        nextScreens.push({
          fileName: file.name,
          screenType: analysis.screenType || 'unknown',
          summary: analysis.summary || '',
        });
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
            sourceName: file.name,
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
        text: factMap.size
          ? `${factMap.size} RTG facts extracted. Review every value before applying.`
          : 'No reliable RTG facts were found. Try tighter, straight-on screenshots.',
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
    if (!user || !db) return;
    const approved = rows.filter((row) => row.selected && valuePresent(row.value));
    if (!approved.length) {
      setMessage({ type: 'error', text: 'Select at least one verified fact to apply.' });
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
        const revision = (Number(remote?._sync?.revision) || 0) + 1;
        transaction.set(careerRef, {
          ...remote,
          player: { ...(remote.player || {}), ...playerPatch },
          rtg: {
            ...(remote.rtg || {}),
            ...rtgPatch,
            lastStatusScan: {
              scannedAt: new Date().toISOString(),
              screenTypes: [...new Set(screens.map((entry) => entry.screenType).filter((type) => type !== 'unknown'))],
              factCount: approved.length,
            },
          },
          _sync: {
            revision,
            deviceId: 'rtg-status-scanner',
            updatedAt: new Date().toISOString(),
          },
        });
      });
      setRows([]);
      setScreens([]);
      setMessage({ type: 'success', text: `${approved.length} verified RTG facts saved. Week Setup will use the updated career values automatically.` });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'The verified RTG facts could not be saved.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-white/10 px-5 pb-6 pt-5 md:px-6" data-rtg-status-inline-panel>
      <div className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.04] p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-blue-300">
              <Camera size={15} /> RTG Status Scanner
            </div>
            <h3 className="mt-1 text-base font-black text-white">Upload the five Weekly Agenda meters + Coach overview</h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
              Upload Academics, Leadership, Health, Fitness, Brand, and the Coach/Overview screen together. DynastyHQ extracts current status only—it never guesses how you spent your weekly points.
            </p>
          </div>
          <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[10px] font-black uppercase tracking-wider ${busy ? 'cursor-not-allowed bg-slate-800 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            {busy ? 'Scanning…' : 'Upload RTG Screens'}
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} className="hidden" onChange={(event) => {
              scanFiles(event.target.files);
              event.target.value = '';
            }} />
          </label>
        </div>

        {progress ? <div className="mt-3 rounded-lg border border-blue-400/20 bg-slate-950/50 px-3 py-2 text-xs font-bold text-blue-200">{progress}</div> : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <StatusCard title="Coach / Overview" primary={status.overview} secondary={status.overviewDetail} />
          <StatusCard title="Academics" primary={status.academics} secondary={status.academicsDetail} />
          <StatusCard title="Leadership" primary={status.leadership} secondary={status.leadershipDetail} />
          <StatusCard title="Health" primary={status.health} secondary={status.healthDetail} />
          <StatusCard title="Fitness" primary={status.fitness} secondary={status.fitnessDetail} />
          <StatusCard title="Brand" primary={status.brand} secondary={status.brandDetail} />
        </div>

        {screens.length ? (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500"><FileSearch size={12} /> Detected</span>
              {TARGET_SCREENS.map((type) => (
                <span key={type} className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${detected.has(type) ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-500'}`}>
                  {detected.has(type) ? '✓ ' : ''}{SCREEN_LABELS[type]}
                </span>
              ))}
            </div>
            {missingScreens.length ? <p className="mt-2 text-[10px] leading-relaxed text-amber-300">Missing: {missingScreens.map((type) => SCREEN_LABELS[type]).join(', ')}. You can still apply the verified facts that were found.</p> : <p className="mt-2 text-[10px] font-bold text-emerald-300">All six recommended RTG screens were recognized.</p>}
          </div>
        ) : null}

        {rows.length ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/45">
            <div className="border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white"><ShieldCheck size={14} className="text-emerald-300" /> Review extracted facts</div>
              <p className="mt-1 text-[10px] text-slate-500">Uncheck anything questionable or edit a value before applying. Nothing below is saved until you press Apply Verified RTG Facts.</p>
            </div>
            <div className="max-h-[420px] divide-y divide-slate-800 overflow-y-auto">
              {rows.map((row) => (
                <div key={row.key} className="grid gap-2 px-4 py-3 md:grid-cols-[auto_minmax(0,1fr)_minmax(150px,0.7fr)] md:items-center">
                  <input type="checkbox" checked={row.selected} onChange={(event) => updateRow(row.key, { selected: event.target.checked })} className="h-4 w-4 accent-emerald-500" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-white">{row.label}</span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[8px] font-black uppercase text-slate-400">{Math.round(row.confidence * 100)}%</span>
                      {row.conflict ? <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-300">Conflicting scans · verify</span> : null}
                    </div>
                    <p className="mt-1 truncate text-[9px] text-slate-500">{row.evidence} · {row.sourceName}</p>
                  </div>
                  <input className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-400" value={row.value} onChange={(event) => updateRow(row.key, { value: event.target.value })} />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-800 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] leading-relaxed text-slate-500">The lightning-bolt resource is stored as Weekly Points, never as Energy. NIL Weekly Cost is also kept separate from NIL Valuation.</p>
              <button type="button" disabled={busy} onClick={applyFacts} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-emerald-500 disabled:opacity-50">
                <CheckCircle2 size={14} /> Apply Verified RTG Facts
              </button>
            </div>
          </div>
        ) : null}

        {message ? (
          <div className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${message.type === 'error' ? 'border-red-400/20 bg-red-500/10 text-red-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>
            {message.type === 'error' ? <ShieldCheck size={14} className="mt-0.5 shrink-0" /> : <Sparkles size={14} className="mt-0.5 shrink-0" />}
            <span>{message.text}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const RtgStatusScannerPortal = () => {
  const [user, setUser] = useState(auth.currentUser);
  const [career, setCareer] = useState(null);
  const [target, setTarget] = useState(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user || !db) {
      setCareer(null);
      return undefined;
    }
    const careerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    return onSnapshot(careerRef, (snapshot) => setCareer(snapshot.exists() ? snapshot.data() : null));
  }, [user]);

  useEffect(() => {
    let ownedNode = null;
    const syncTarget = () => {
      const row = document.querySelector('.dhq-agenda-v3-rtg-row');
      if (!row?.parentElement) {
        setTarget(null);
        return;
      }

      let node = document.getElementById('dhq-rtg-status-inline-host');
      if (!node) {
        node = document.createElement('div');
        node.id = 'dhq-rtg-status-inline-host';
        ownedNode = node;
      }

      if (node.parentElement !== row.parentElement || row.nextElementSibling !== node) {
        row.insertAdjacentElement('afterend', node);
      }

      node.style.display = row.classList.contains('is-open') ? 'block' : 'none';
      node.style.marginTop = '10px';
      setTarget((current) => current === node ? current : node);
    };

    syncTarget();
    const observer = new MutationObserver(syncTarget);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => {
      observer.disconnect();
      if (ownedNode?.parentElement) ownedNode.remove();
    };
  }, []);

  const careerPhase = String(career?.careerPhase || 'Player');
  const isCoach = ['OC', 'HC'].includes(careerPhase);
  const isCollegePlayer = Boolean(career?.player?.isCommitted) && !isCoach;

  if (!target || !user || !career || !isCollegePlayer) return null;
  return createPortal(<RtgStatusScanner user={user} career={career} />, target);
};

export default RtgStatusScannerPortal;
