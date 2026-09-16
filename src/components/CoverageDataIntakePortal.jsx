import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, FileText, Loader2, UploadCloud, XCircle } from 'lucide-react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, db } from '../firebase';
import { coverageReferenceFor, replaceCoverageReferences } from '../domain/coverageReferences.js';
import { resolveWeeklyWorkContext } from '../domain/weeklyWorkContext.js';
import { analyzeCoverageReference } from '../services/coverageReferenceClient.js';
import { compressImage } from '../services/imageCompression.js';
import { reportSessionLaneResult } from '../services/sessionImportTelemetry.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const MAX_REFERENCE_SCREENSHOTS = 30;
const DEVICE_ID = 'coverage-data-intake';
const TRANSIENT_PROVIDER_STATUSES = new Set([429, 502, 503, 504]);

const usefulCoverageAnalysis = (analysis) => (
  analysis
  && analysis.screenType !== 'unknown'
  && Array.isArray(analysis.facts)
  && analysis.facts.length > 0
);

const CoverageDataScanner = ({ user, career }) => {
  const inputRef = useRef(null);
  const previewUrlsRef = useRef(new Set());
  const context = useMemo(() => resolveWeeklyWorkContext(career), [career]);
  const saved = coverageReferenceFor(career, context.publicationId);
  const [busy, setBusy] = useState(false);
  const [facts, setFacts] = useState([]);
  const [sourceCount, setSourceCount] = useState(0);
  const [failedFiles, setFailedFiles] = useState([]);
  const [expandedFailure, setExpandedFailure] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const releaseFailurePreviews = () => {
    previewUrlsRef.current.forEach((url) => {
      try { URL.revokeObjectURL(url); } catch { /* browser cleanup only */ }
    });
    previewUrlsRef.current.clear();
  };

  const failureFor = (file, message, sourceIndex, total) => {
    let previewUrl = '';
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);
    }
    return {
      fileName: file.name,
      message,
      sourceNumber: sourceIndex + 1,
      total,
      previewUrl,
    };
  };

  useEffect(() => {
    releaseFailurePreviews();
    setFacts([]);
    setSourceCount(0);
    setFailedFiles([]);
    setExpandedFailure(null);
    setMessage('');
  }, [context.publicationId]);

  useEffect(() => () => releaseFailurePreviews(), []);

  const scanFiles = async (fileList) => {
    const incoming = [...(fileList || [])];
    const files = incoming.slice(0, MAX_REFERENCE_SCREENSHOTS);
    if (!files.length || !user) return;
    releaseFailurePreviews();
    setExpandedFailure(null);
    setBusy(true);
    setFacts([]);
    setSourceCount(files.length);
    setFailedFiles([]);
    setMessage('Analyzing editorial-only player, scoring, and official in-game media context…');
    setMessageType('success');

    const extracted = [];
    const failures = [];
    const consumeAnalysis = (fileName, analysis, sourceIndex) => {
      const sourceId = `coverage-${Date.now()}-${sourceIndex + 1}`;
      (analysis?.facts || []).forEach((fact, factIndex) => extracted.push({
        ...fact,
        id: `${sourceId}-${factIndex + 1}`,
        sourceId,
        sourceName: fileName,
        selected: Number(fact.confidence) >= 0.65,
      }));
    };

    try {
      const idToken = await user.getIdToken();
      const school = career?.player?.college || career?.player?.school || '';

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const analyzeFile = async ({ rescue = false } = {}) => {
          const imageDataUrl = await compressImage(file, rescue ? 2600 : 2200, rescue ? 0.94 : 0.9);
          const result = await analyzeCoverageReference({ idToken, imageDataUrl, fileName: file.name, school });
          const analysis = result?.analysis || {};
          if (!usefulCoverageAnalysis(analysis)) {
            throw new Error('Coverage scanner returned no usable facts for this screenshot.');
          }
          return analysis;
        };

        setMessage(`Analyzing Coverage screenshot ${index + 1} of ${files.length}: ${file.name}…`);
        let analysis = null;
        let firstError = null;

        try {
          analysis = await analyzeFile();
        } catch (error) {
          firstError = error;
        }

        if (!analysis && TRANSIENT_PROVIDER_STATUSES.has(Number(firstError?.status))) {
          const failureMessage = firstError?.message || 'Coverage analysis could not reach the vision provider after automatic retries.';
          failures.push(failureFor(file, failureMessage, index, files.length));
          reportSessionLaneResult({
            fileName: file.name,
            lane: 'coverage',
            status: 'failed',
            message: failureMessage,
          });
          console.warn(`Coverage Data provider remained unavailable for ${file.name} after automatic queue retries`, firstError);
          continue;
        }

        if (!analysis) {
          setMessage(`Retrying Coverage screenshot ${index + 1} of ${files.length} at higher text quality: ${file.name}…`);
          try {
            analysis = await analyzeFile({ rescue: true });
          } catch (error) {
            const failureMessage = error?.message || firstError?.message || 'Coverage analysis failed.';
            failures.push(failureFor(file, failureMessage, index, files.length));
            reportSessionLaneResult({
              fileName: file.name,
              lane: 'coverage',
              status: 'failed',
              message: error?.message || firstError?.message || 'Coverage analysis failed after automatic retry.',
            });
            console.warn(`Coverage Data could not analyze ${file.name} after automatic retry`, error || firstError);
            continue;
          }
        }

        consumeAnalysis(file.name, analysis, index);
      }

      setFacts(extracted);
      setFailedFiles(failures);

      if (incoming.length > MAX_REFERENCE_SCREENSHOTS) {
        setMessageType('error');
        setMessage(`DynastyHQ received ${incoming.length} Coverage screenshots, but this scanner currently supports ${MAX_REFERENCE_SCREENSHOTS} in one pass. Split the Coverage set before saving so no screenshot is silently omitted.`);
      } else if (extracted.length && !failures.length) {
        setMessageType('success');
        setMessage(`All ${files.length} Coverage screenshots analyzed successfully. ${extracted.length} coverage fact${extracted.length === 1 ? '' : 's'} found. Review before saving.`);
      } else if (extracted.length) {
        setMessageType('error');
        setMessage(`${extracted.length} coverage fact${extracted.length === 1 ? '' : 's'} found, but ${failures.length} screenshot${failures.length === 1 ? '' : 's'} still failed after automatic retries. Coverage cannot be saved until every screenshot passes.`);
      } else if (failures.length) {
        setMessageType('error');
        setMessage(`${failures.length} Coverage screenshot${failures.length === 1 ? '' : 's'} could not be analyzed after automatic retries. Nothing was saved.`);
      } else {
        setMessage('No reliable coverage facts were found. Nothing was saved.');
      }
    } catch (error) {
      setMessageType('error');
      setMessage(error?.message || 'Coverage Data could not be analyzed. Nothing was saved.');
    } finally {
      setBusy(false);
    }
  };

  const updateFact = (id, patch) => setFacts((current) => current.map((fact) => fact.id === id ? { ...fact, ...patch } : fact));

  const saveFacts = async () => {
    if (!user || !db || busy) return;
    if (failedFiles.length) {
      setMessageType('error');
      setMessage(`Coverage is incomplete. ${failedFiles.length} screenshot${failedFiles.length === 1 ? '' : 's'} still failed analysis, so DynastyHQ will not save a partial Coverage set.`);
      return;
    }
    const selectedFacts = facts.filter((fact) => fact.selected && String(fact.value || '').trim());
    if (!selectedFacts.length) {
      setMessageType('error');
      setMessage('Select at least one verified coverage fact before saving.');
      return;
    }
    setBusy(true);
    setMessage('Saving editorial-only Coverage Data…');
    setMessageType('success');
    try {
      const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new Error('Your DynastyHQ career could not be loaded.');
        const remote = snapshot.data();
        const next = replaceCoverageReferences(remote, {
          publicationId: context.publicationId,
          season: context.season,
          week: context.week,
          facts: selectedFacts,
          sourceCount,
        });
        transaction.set(ref, {
          ...next,
          _sync: { revision: (Number(remote?._sync?.revision) || 0) + 1, deviceId: DEVICE_ID, updatedAt: new Date().toISOString() },
        });
      });
      releaseFailurePreviews();
      setFacts([]);
      setSourceCount(0);
      setFailedFiles([]);
      setExpandedFailure(null);
      setMessage(`Saved ${selectedFacts.length} Coverage Data fact${selectedFacts.length === 1 ? '' : 's'} for Season ${context.season} · Week ${context.week}. Newsroom and Podcast can use them; your RTG stats and career totals cannot.`);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.message || 'Coverage Data could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-coverage-intake-scanner>
      <div className="dhq-coverage-intake-top">
        <p>Optional: upload teammate/opponent Player Stats, Scoring Summary, and EA SPORTS Network article screenshots. These references are editorial-only and never write into your player stat line, RTG data, or verified game totals. EA SPORTS Network article facts are official in-game media context for Newsroom and Podcast.</p>
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="dhq-coverage-intake-upload">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />} {busy ? 'Working…' : saved ? 'Replace Coverage' : 'Upload Coverage'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(event) => { scanFiles(event.target.files); event.target.value = ''; }} />
      </div>
      {saved && !facts.length ? <p className="dhq-intake-message"><CheckCircle2 size={12} className="mr-1 inline" /> {saved.factCount} coverage fact{saved.factCount === 1 ? '' : 's'} currently saved from {saved.sourceCount} screenshot{saved.sourceCount === 1 ? '' : 's'}.</p> : null}
      {message ? <p className={`dhq-intake-message ${messageType === 'error' ? 'is-error' : ''}`}>{message}</p> : null}
      {failedFiles.length ? (
        <div className="dhq-intake-message is-error" style={{ padding: 10 }}>
          <strong style={{ display: 'block', marginBottom: 8 }}>Still unresolved</strong>
          <div style={{ display: 'grid', gap: 8 }}>
            {failedFiles.map((entry) => (
              <div key={`${entry.fileName}-${entry.sourceNumber}`} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0,1fr)', gap: 10, alignItems: 'center', border: '1px solid rgba(248,113,113,.2)', borderRadius: 10, background: 'rgba(69,10,10,.14)', padding: 8 }}>
                <button type="button" onClick={() => setExpandedFailure(entry)} disabled={!entry.previewUrl} aria-label={`Open Coverage screenshot ${entry.sourceNumber} preview`} style={{ display: 'grid', placeItems: 'center', width: 92, height: 112, overflow: 'hidden', borderRadius: 8, border: '1px solid rgba(248,113,113,.28)', background: '#020617', padding: 0, cursor: entry.previewUrl ? 'zoom-in' : 'default' }}>
                  {entry.previewUrl ? <img src={entry.previewUrl} alt={`Coverage screenshot ${entry.sourceNumber} of ${entry.total}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <FileText size={24} />}
                </button>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#fecaca', fontSize: 10, fontWeight: 900 }}>Coverage screenshot {entry.sourceNumber} of {entry.total}</div>
                  <div style={{ marginTop: 2, color: '#f8fafc', fontSize: 9, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.fileName}</div>
                  <div style={{ marginTop: 5, color: '#fca5a5', fontSize: 8, lineHeight: 1.4 }}>{entry.message || 'Coverage analysis failed.'}</div>
                  {entry.previewUrl ? <button type="button" onClick={() => setExpandedFailure(entry)} style={{ marginTop: 7, minHeight: 28, borderRadius: 6, border: '1px solid rgba(248,113,113,.3)', background: 'rgba(127,29,29,.18)', padding: '0 9px', color: '#fecaca', fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.06em' }}>View screenshot</button> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {facts.length ? (
        <div className="dhq-intake-review">
          <div className="dhq-intake-review__header">Review editorial-only Coverage Data</div>
          <div className="dhq-intake-review__rows">
            {facts.map((fact) => (
              <div key={fact.id} className="dhq-intake-review__row">
                <button type="button" onClick={() => updateFact(fact.id, { selected: !fact.selected })} className={fact.selected ? 'text-emerald-300' : 'text-slate-600'} aria-label={fact.selected ? 'Use coverage fact' : 'Ignore coverage fact'}>{fact.selected ? <CheckCircle2 size={16} /> : <XCircle size={16} />}</button>
                <div>
                  <strong>{fact.label || 'Coverage fact'}</strong>
                  <small>{[fact.category, fact.team, fact.subject].filter(Boolean).join(' · ') || fact.evidence || `${Math.round((Number(fact.confidence) || 0) * 100)}% confidence`}</small>
                  {fact.evidence ? <small><FileText size={9} className="mr-1 inline" />{fact.evidence}</small> : null}
                </div>
                <input type="text" value={fact.value || ''} onChange={(event) => updateFact(fact.id, { value: event.target.value, selected: true })} />
              </div>
            ))}
          </div>
          <div className="dhq-intake-review__footer"><button type="button" disabled={busy || failedFiles.length > 0} onClick={saveFacts}><CheckCircle2 size={13} className="mr-1 inline" /> Save Verified Coverage Data</button></div>
        </div>
      ) : null}
      {expandedFailure?.previewUrl ? (
        <div role="dialog" aria-modal="true" aria-label={`Coverage screenshot ${expandedFailure.sourceNumber} preview`} onClick={() => setExpandedFailure(null)} style={{ position: 'fixed', inset: 0, zIndex: 12050, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.88)', padding: 16 }}>
          <div onClick={(event) => event.stopPropagation()} style={{ width: 'min(94vw, 760px)', maxHeight: '92vh', overflow: 'auto', borderRadius: 12, border: '1px solid rgba(248,113,113,.32)', background: '#020617', padding: 10, boxShadow: '0 24px 80px rgba(0,0,0,.55)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', color: '#fff', fontSize: 11 }}>Coverage screenshot {expandedFailure.sourceNumber} of {expandedFailure.total}</strong>
                <span style={{ display: 'block', marginTop: 2, color: '#94a3b8', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{expandedFailure.fileName}</span>
              </div>
              <button type="button" onClick={() => setExpandedFailure(null)} style={{ flex: '0 0 auto', minHeight: 32, borderRadius: 7, border: '1px solid rgba(148,163,184,.28)', background: 'rgba(15,23,42,.9)', padding: '0 10px', color: '#f8fafc', fontSize: 9, fontWeight: 900 }}>CLOSE</button>
            </div>
            <img src={expandedFailure.previewUrl} alt={`Full preview of Coverage screenshot ${expandedFailure.sourceNumber} of ${expandedFailure.total}`} style={{ display: 'block', width: '100%', maxHeight: '78vh', objectFit: 'contain', borderRadius: 8, background: '#000' }} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

const CoverageDataIntakePortal = () => {
  const { user, career } = useOwnerCareer();
  const [host, setHost] = useState(null);
  useEffect(() => {
    const appRoot = document.getElementById('root');
    if (!appRoot) return undefined;
    const ensure = () => {
      const next = appRoot.querySelector('[data-session-import-coverage-review-host]') || appRoot.querySelector('#dhq-weekly-coverage-data-host');
      setHost((current) => current === next ? current : next);
    };
    ensure();
    const observer = new MutationObserver(ensure);
    observer.observe(appRoot, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  if (!host || !user || !career) return null;
  return createPortal(<CoverageDataScanner user={user} career={career} />, host);
};

export default CoverageDataIntakePortal;
