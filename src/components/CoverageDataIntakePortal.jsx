import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, FileText, Loader2, UploadCloud, XCircle } from 'lucide-react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, db } from '../firebase';
import { coverageReferenceFor, replaceCoverageReferences } from '../domain/coverageReferences.js';
import { resolveWeeklyWorkContext } from '../domain/weeklyWorkContext.js';
import { analyzeCoverageReference } from '../services/coverageReferenceClient.js';
import { compressImage } from '../services/imageCompression.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const MAX_REFERENCE_SCREENSHOTS = 12;
const DEVICE_ID = 'coverage-data-intake';

const CoverageDataScanner = ({ user, career }) => {
  const inputRef = useRef(null);
  const context = useMemo(() => resolveWeeklyWorkContext(career), [career]);
  const saved = coverageReferenceFor(career, context.publicationId);
  const [busy, setBusy] = useState(false);
  const [facts, setFacts] = useState([]);
  const [sourceCount, setSourceCount] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  useEffect(() => {
    setFacts([]);
    setSourceCount(0);
    setMessage('');
  }, [context.publicationId]);

  const scanFiles = async (fileList) => {
    const files = [...(fileList || [])].slice(0, MAX_REFERENCE_SCREENSHOTS);
    if (!files.length || !user) return;
    setBusy(true);
    setFacts([]);
    setSourceCount(files.length);
    setMessage('Analyzing editorial-only teammate, opponent, and scoring data…');
    setMessageType('success');
    try {
      const idToken = await user.getIdToken();
      const school = career?.player?.college || career?.player?.school || '';
      const extracted = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const imageDataUrl = await compressImage(file, 2000, 0.88);
        const result = await analyzeCoverageReference({ idToken, imageDataUrl, fileName: file.name, school });
        const sourceId = `coverage-${Date.now()}-${index + 1}`;
        (result?.analysis?.facts || []).forEach((fact, factIndex) => extracted.push({
          ...fact,
          id: `${sourceId}-${factIndex + 1}`,
          sourceId,
          sourceName: file.name,
          selected: Number(fact.confidence) >= 0.65,
        }));
      }
      setFacts(extracted);
      setMessage(extracted.length
        ? `${extracted.length} coverage fact${extracted.length === 1 ? '' : 's'} found. Review before saving.`
        : 'No reliable coverage facts were found. Nothing was saved.');
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
          _sync: {
            revision: (Number(remote?._sync?.revision) || 0) + 1,
            deviceId: DEVICE_ID,
            updatedAt: new Date().toISOString(),
          },
        });
      });
      setFacts([]);
      setSourceCount(0);
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
        <p>Optional: upload teammate/opponent Player Stats and Scoring Summary screenshots. These facts are editorial-only and never write into your player stat line.</p>
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="dhq-coverage-intake-upload">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />} {busy ? 'Working…' : saved ? 'Replace Coverage' : 'Upload Coverage'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(event) => {
          scanFiles(event.target.files);
          event.target.value = '';
        }} />
      </div>

      {saved && !facts.length ? <p className="dhq-intake-message"><CheckCircle2 size={12} className="mr-1 inline" /> {saved.factCount} coverage fact{saved.factCount === 1 ? '' : 's'} currently saved from {saved.sourceCount} screenshot{saved.sourceCount === 1 ? '' : 's'}.</p> : null}
      {message ? <p className={`dhq-intake-message ${messageType === 'error' ? 'is-error' : ''}`}>{message}</p> : null}

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
          <div className="dhq-intake-review__footer"><button type="button" disabled={busy} onClick={saveFacts}><CheckCircle2 size={13} className="mr-1 inline" /> Save Verified Coverage Data</button></div>
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
      const next = appRoot.querySelector('#dhq-weekly-coverage-data-host');
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
