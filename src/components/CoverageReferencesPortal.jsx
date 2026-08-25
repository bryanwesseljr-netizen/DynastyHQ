import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { doc, runTransaction } from 'firebase/firestore';
import { CheckCircle2, FileText, Loader2, Newspaper, UploadCloud, XCircle } from 'lucide-react';
import { appId, db } from '../firebase';
import { coverageReferenceFor, replaceCoverageReferences } from '../domain/coverageReferences.js';
import { resolveWeeklyWorkContext } from '../domain/weeklyWorkContext.js';
import { analyzeCoverageReference } from '../services/coverageReferenceClient.js';
import { compressImage } from '../services/imageCompression.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const MAX_REFERENCE_SCREENSHOTS = 12;
const DEVICE_ID = globalThis.crypto?.randomUUID?.() || 'coverage-references-v1';

const CoverageReferencesCard = ({ user, career }) => {
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
    setMessage('Analyzing editorial-only player stats and scoring references…');
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
        ? `${extracted.length} editorial fact${extracted.length === 1 ? '' : 's'} found. Review them before saving.`
        : 'No reliable player-stat or scoring references were found. Nothing was saved.');
    } catch (error) {
      setMessageType('error');
      setMessage(error?.message || 'Coverage references could not be analyzed. Nothing was saved.');
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
      setMessage('Select at least one verified editorial fact before saving.');
      return;
    }
    setBusy(true);
    setMessage('Saving editorial-only references…');
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
      setMessage(`Saved ${selectedFacts.length} coverage reference${selectedFacts.length === 1 ? '' : 's'} for Season ${context.season} · Week ${context.week}. Newsroom and Podcast can use them, but Bryan's RTG data cannot.`);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.message || 'Coverage references could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-3 overflow-hidden rounded-xl border border-cyan-400/20 bg-slate-950/90 shadow-lg" data-coverage-references>
      <div className="flex flex-col gap-3 border-b border-slate-800/80 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cyan-400/20 bg-cyan-400/5 text-cyan-300"><Newspaper size={17} /></span>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">Coverage References · Optional</p>
            <h3 className="mt-1 text-sm font-black text-white">Player stats + scoring summary for richer coverage</h3>
            <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-slate-400">Upload teammate/opponent Player Stats or Scoring Summary screenshots. These facts are stored as editorial-only program context for the Newsroom and Podcast and are blocked from RTG stats, career totals, recruiting, and game-log player fields.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-slate-400">S{context.season} · W{context.week}{saved ? ` · ${saved.factCount} saved` : ''}</span>
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-4 text-[9px] font-black uppercase tracking-wider text-cyan-100 hover:bg-cyan-400/15 disabled:cursor-wait disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />} {busy ? 'Working…' : saved ? 'Replace References' : 'Upload References'}
          </button>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(event) => {
            scanFiles(event.target.files);
            event.target.value = '';
          }} />
        </div>
      </div>

      {message ? <p className={`mx-4 mt-3 rounded-lg border px-3 py-2 text-[9px] font-bold ${messageType === 'error' ? 'border-red-500/25 bg-red-500/10 text-red-300' : 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300'}`}>{message}</p> : null}

      {facts.length ? (
        <div className="space-y-2 p-4">
          <div className="flex items-center justify-between gap-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-300">Verify editorial facts</p><p className="text-[8px] text-slate-500">Unchecked facts are ignored.</p></div>
          {facts.map((fact) => (
            <div key={fact.id} className={`rounded-lg border p-3 ${fact.selected ? 'border-cyan-400/20 bg-cyan-400/[0.035]' : 'border-slate-800 bg-slate-950/50 opacity-65'}`}>
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => updateFact(fact.id, { selected: !fact.selected })} className={`mt-0.5 shrink-0 ${fact.selected ? 'text-emerald-300' : 'text-slate-600'}`} aria-label={fact.selected ? 'Use fact' : 'Ignore fact'}>{fact.selected ? <CheckCircle2 size={17} /> : <XCircle size={17} />}</button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-[8px] font-black uppercase tracking-wider text-cyan-300">{fact.category}</span><span className="text-[8px] text-slate-500">{[fact.team, fact.subject].filter(Boolean).join(' · ') || fact.label}</span><span className="text-[7px] text-slate-600">{Math.round((Number(fact.confidence) || 0) * 100)}%</span></div>
                  <label className="mt-2 block text-[8px] font-bold uppercase tracking-wider text-slate-500">{fact.label || 'Editorial fact'}</label>
                  <input value={fact.value || ''} onChange={(event) => updateFact(fact.id, { value: event.target.value, selected: true })} className="mt-1 min-h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-[10px] text-white outline-none focus:border-cyan-400/60" />
                  {fact.evidence ? <p className="mt-1.5 text-[8px] leading-relaxed text-slate-500"><FileText size={10} className="mr-1 inline" />{fact.evidence}</p> : null}
                </div>
              </div>
            </div>
          ))}
          <button type="button" disabled={busy} onClick={saveFacts} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 text-[9px] font-black uppercase tracking-wider text-slate-950 hover:bg-cyan-400 disabled:cursor-wait disabled:opacity-50"><CheckCircle2 size={15} /> Save Verified Coverage References</button>
        </div>
      ) : saved ? (
        <div className="flex items-center gap-2 px-4 py-3 text-[9px] font-bold text-slate-400"><CheckCircle2 size={14} className="text-emerald-300" /> {saved.factCount} editorial fact{saved.factCount === 1 ? '' : 's'} saved from {saved.sourceCount} screenshot{saved.sourceCount === 1 ? '' : 's'}.</div>
      ) : null}
    </section>
  );
};

const CoverageReferencesPortal = () => {
  const { user, career } = useOwnerCareer();
  const [host, setHost] = useState(null);
  const eligible = Boolean(career?.player?.college || career?.player?.isCommitted)
    && !['OC', 'HC', 'Retired'].includes(String(career?.careerPhase || ''));

  useEffect(() => {
    const appRoot = document.getElementById('root');
    if (!appRoot) return undefined;
    const ensure = () => {
      const agenda = appRoot.querySelector('.dhq-weekly-agenda-workspace');
      if (!agenda) {
        setHost(null);
        return;
      }
      let nextHost = agenda.querySelector('#dhq-coverage-references-host');
      if (!nextHost) {
        nextHost = document.createElement('div');
        nextHost.id = 'dhq-coverage-references-host';
      }
      if (nextHost.parentElement !== agenda) {
        const shellHost = agenda.querySelector('#dhq-weekly-agenda-v3-shell-host');
        if (shellHost?.parentElement === agenda) shellHost.after(nextHost);
        else agenda.prepend(nextHost);
      }
      setHost((current) => current === nextHost ? current : nextHost);
    };
    ensure();
    const observer = new MutationObserver(ensure);
    observer.observe(appRoot, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (!user || !career || !eligible || !host) return null;
  return createPortal(<CoverageReferencesCard user={user} career={career} />, host);
};

export default CoverageReferencesPortal;
