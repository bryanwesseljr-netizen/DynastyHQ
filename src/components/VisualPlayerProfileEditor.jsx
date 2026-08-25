import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, UserRoundCog } from 'lucide-react';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { appId, auth, db } from '../firebase';
import {
  DEFAULT_PLAYER_VISUAL_PROFILE,
  normalizePlayerVisualProfile,
} from '../domain/playerVisualProfile.js';

const FIELD_GROUPS = [
  [
    { key: 'skinTone', label: 'Skin tone', placeholder: 'e.g. medium brown' },
    { key: 'hairDescription', label: 'Hair', placeholder: 'e.g. short curls, black hair' },
    { key: 'helmetStyle', label: 'Helmet style', placeholder: 'e.g. modern shell, black facemask' },
    { key: 'visor', label: 'Visor', placeholder: 'e.g. clear, dark, none' },
  ],
  [
    { key: 'leftArm', label: 'Left arm', placeholder: 'e.g. white compression sleeve' },
    { key: 'rightArm', label: 'Right arm', placeholder: 'e.g. bare arm' },
    { key: 'leftHand', label: 'Left hand', placeholder: 'e.g. no glove' },
    { key: 'rightHand', label: 'Right hand', placeholder: 'e.g. black receiver glove' },
  ],
  [
    { key: 'legAccessories', label: 'Leg accessories', placeholder: 'e.g. white calf bands' },
    { key: 'cleats', label: 'Cleats', placeholder: 'e.g. black low-cut cleats' },
    { key: 'towel', label: 'Towel', placeholder: 'e.g. white waist towel' },
  ],
];

const VisualPlayerProfileEditor = ({ mediaLibrary = [] }) => {
  const [profile, setProfile] = useState(() => normalizePlayerVisualProfile(DEFAULT_PLAYER_VISUAL_PROFILE));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const approvedReferenceIds = useMemo(() => (
    [...new Set(mediaLibrary.filter((asset) => asset?.isReference && asset?.id).map((asset) => String(asset.id)))].slice(0, 16)
  ), [mediaLibrary]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const owner = auth?.currentUser;
      if (!owner || !db) {
        if (!cancelled) {
          setMessage('Sign in as the DynastyHQ owner to edit the visual player profile.');
          setMessageType('error');
          setLoading(false);
        }
        return;
      }
      try {
        const masterRef = doc(db, 'artifacts', appId, 'users', owner.uid, 'hq_data', 'main');
        const snapshot = await getDoc(masterRef);
        if (!cancelled && snapshot.exists()) {
          setProfile(normalizePlayerVisualProfile(snapshot.data()?.player?.visualProfile || {}));
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error?.message || 'The visual player profile could not be loaded.');
          setMessageType('error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const updateField = (key, value) => setProfile((current) => ({ ...current, [key]: value }));

  const save = async () => {
    const owner = auth?.currentUser;
    if (!owner || !db) {
      setMessage('Sign in as the DynastyHQ owner to save the visual player profile.');
      setMessageType('error');
      return;
    }
    setSaving(true);
    setMessage('');
    setMessageType('');
    try {
      const normalized = normalizePlayerVisualProfile({
        ...profile,
        referenceAssetIds: approvedReferenceIds,
      });
      const masterRef = doc(db, 'artifacts', appId, 'users', owner.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(masterRef);
        if (!snapshot.exists()) throw new Error('The DynastyHQ master save could not be found.');
        const data = snapshot.data();
        const remoteRevision = Number(data?._sync?.revision) || 0;
        transaction.update(masterRef, {
          'player.visualProfile': normalized,
          '_sync.revision': remoteRevision + 1,
          '_sync.deviceId': data?._sync?.deviceId || 'newsroom-visual-profile',
          '_sync.updatedAt': new Date().toISOString(),
        });
      });
      setProfile(normalized);
      setMessage(`Visual profile saved. ${approvedReferenceIds.length} approved reference ${approvedReferenceIds.length === 1 ? 'photo is' : 'photos are'} linked.`);
      setMessageType('success');
    } catch (error) {
      setMessage(error?.message || 'The visual player profile could not be saved.');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4" aria-labelledby="visual-player-profile-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300"><UserRoundCog size={14} /> AI Photo Identity</p>
          <h3 id="visual-player-profile-title" className="mt-1 text-sm font-black uppercase text-white">Visual Player Profile</h3>
          <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-slate-500">Permanent appearance and equipment details for editorial AI photos. Leave anything unknown blank—DynastyHQ should not turn an empty field into a specific visual claim.</p>
        </div>
        <div className="shrink-0 rounded-lg border border-cyan-500/20 bg-slate-950/60 px-3 py-2 text-[9px] font-bold text-cyan-100">
          {approvedReferenceIds.length} approved {approvedReferenceIds.length === 1 ? 'reference' : 'references'}
        </div>
      </div>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400"><Loader2 size={13} className="animate-spin" /> Loading visual profile…</p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <label className="block text-[8px] font-black uppercase tracking-wider text-slate-500">
              Throwing hand
              <select
                value={profile.throwingHand}
                onChange={(event) => updateField('throwingHand', event.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-[10px] font-bold normal-case tracking-normal text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="">Unknown / not applicable</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </label>
            {FIELD_GROUPS[0].map((field) => (
              <label key={field.key} className="block text-[8px] font-black uppercase tracking-wider text-slate-500">
                {field.label}
                <input value={profile[field.key]} onChange={(event) => updateField(field.key, event.target.value)} placeholder={field.placeholder} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-[10px] font-medium normal-case tracking-normal text-slate-200 outline-none placeholder:text-slate-700 focus:border-cyan-500" />
              </label>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {FIELD_GROUPS[1].map((field) => (
              <label key={field.key} className="block text-[8px] font-black uppercase tracking-wider text-slate-500">
                {field.label}
                <input value={profile[field.key]} onChange={(event) => updateField(field.key, event.target.value)} placeholder={field.placeholder} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-[10px] font-medium normal-case tracking-normal text-slate-200 outline-none placeholder:text-slate-700 focus:border-cyan-500" />
              </label>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {FIELD_GROUPS[2].map((field) => (
              <label key={field.key} className="block text-[8px] font-black uppercase tracking-wider text-slate-500">
                {field.label}
                <input value={profile[field.key]} onChange={(event) => updateField(field.key, event.target.value)} placeholder={field.placeholder} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-[10px] font-medium normal-case tracking-normal text-slate-200 outline-none placeholder:text-slate-700 focus:border-cyan-500" />
              </label>
            ))}
          </div>

          <label className="mt-3 block text-[8px] font-black uppercase tracking-wider text-slate-500">
            Additional appearance details
            <textarea value={profile.additionalDetails} onChange={(event) => updateField('additionalDetails', event.target.value)} rows={2} placeholder="Any durable visual detail not covered above. Do not enter weekly stats or story facts here." className="mt-1 w-full resize-y rounded border border-slate-700 bg-slate-950 px-3 py-2 text-[10px] font-medium normal-case tracking-normal text-slate-200 outline-none placeholder:text-slate-700 focus:border-cyan-500" />
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" disabled={saving} onClick={save} className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:bg-cyan-500 disabled:cursor-wait disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              {saving ? 'Saving…' : 'Save Visual Profile'}
            </button>
            <p className="text-[9px] leading-relaxed text-slate-600">Approved Reference Locker photos are linked when you save; Stage 3 will decide which typed references belong in a specific generation request.</p>
          </div>
        </>
      )}

      {message && <p className={`mt-3 rounded-lg border px-3 py-2 text-[10px] font-bold ${messageType === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>{message}</p>}
    </section>
  );
};

export default VisualPlayerProfileEditor;
