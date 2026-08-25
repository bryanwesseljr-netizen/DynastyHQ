import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, auth, db } from '../firebase';
import {
  NEWSROOM_REFERENCE_ROLE_OPTIONS,
  getNewsroomReferenceRole,
  normalizeNewsroomReferenceRole,
} from '../domain/newsroomReferenceRoles.js';

const NewsroomReferenceRoleSelect = ({ asset, disabled = false }) => {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  if (!asset?.isReference) return null;

  const saveRole = async (nextRole) => {
    const owner = auth?.currentUser;
    if (!owner || !db || !asset?.id) {
      setMessage('Sign in as owner to tag references.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const referenceRole = normalizeNewsroomReferenceRole(nextRole);
      const masterRef = doc(db, 'artifacts', appId, 'users', owner.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(masterRef);
        if (!snapshot.exists()) throw new Error('The DynastyHQ master save could not be found.');
        const data = snapshot.data();
        const library = Array.isArray(data.newsroomMediaLibrary) ? data.newsroomMediaLibrary : [];
        const nextLibrary = library.map((entry) => (
          entry.id !== asset.id || !entry.isReference ? entry : { ...entry, referenceRole }
        ));
        const remoteRevision = Number(data?._sync?.revision) || 0;
        transaction.update(masterRef, {
          newsroomMediaLibrary: nextLibrary,
          '_sync.revision': remoteRevision + 1,
          '_sync.deviceId': data?._sync?.deviceId || 'newsroom-reference-role',
          '_sync.updatedAt': new Date().toISOString(),
        });
      });
      setMessage('Saved');
    } catch (error) {
      setMessage(error?.message || 'Could not save role.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <label className="block text-[8px] font-black uppercase tracking-wider text-amber-300/80">
      Reference role
      <div className="relative mt-1">
        <select
          value={getNewsroomReferenceRole(asset)}
          disabled={disabled || saving}
          onChange={(event) => saveRole(event.target.value)}
          className="w-full rounded border border-amber-500/30 bg-slate-900 px-2 py-1.5 pr-7 text-[9px] font-bold normal-case tracking-normal text-amber-100 outline-none focus:border-amber-400 disabled:opacity-50"
        >
          {NEWSROOM_REFERENCE_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {saving && <Loader2 size={11} className="absolute right-2 top-2 animate-spin text-amber-300" />}
      </div>
      {message && <span className="mt-1 block text-[7px] font-bold normal-case tracking-normal text-slate-500">{message}</span>}
    </label>
  );
};

export default NewsroomReferenceRoleSelect;
