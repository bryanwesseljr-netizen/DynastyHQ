import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { appId, db, isPreviewDeployment } from '../firebase.js';
import { clearWeeklyDraftRecord } from '../services/weeklyDraftStorage.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const PREVIEW_SESSION_KEYS = [
  'dhq-session-applied-week',
  'dhq-session-import-state',
];

const clearPreviewBrowserState = (userId) => {
  clearWeeklyDraftRecord(userId);
  PREVIEW_SESSION_KEYS.forEach((key) => {
    try { window.sessionStorage?.removeItem(key); } catch { /* browser storage is best-effort */ }
  });
};

const PreviewReseedControl = () => {
  const { user } = useOwnerCareer();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!isPreviewDeployment || typeof document === 'undefined' || !user) return null;

  const reseed = async () => {
    setBusy(true);
    setError('');
    try {
      clearPreviewBrowserState(user.uid);
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main'));
      window.setTimeout(() => window.location.reload(), 800);
    } catch (nextError) {
      setError(nextError?.message || 'Preview refresh failed.');
      setBusy(false);
    }
  };

  return createPortal(
    <div style={{ position: 'fixed', left: 12, bottom: 12, zIndex: 10020, maxWidth: 420, padding: 12, borderRadius: 10, background: 'rgba(2,8,14,.96)', border: '1px solid rgba(251,191,36,.35)', color: '#f8fafc' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 900, fontSize: 11, letterSpacing: '.08em' }}><ShieldCheck size={14} /> SAFE PREVIEW</div>
      <p style={{ margin: '6px 0 10px', fontSize: 12, lineHeight: 1.4 }}>Refresh this sandbox from your current DynastyHQ career. Production is not changed.</p>
      <button type="button" onClick={reseed} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 36, padding: '0 12px', borderRadius: 7, border: '1px solid rgba(251,191,36,.5)', background: '#fbbf24', color: '#111827', fontWeight: 900 }}>
        <RefreshCw size={14} /> {busy ? 'REFRESHING…' : 'SYNC CURRENT CAREER'}
      </button>
      {error ? <div style={{ marginTop: 8, color: '#fca5a5', fontSize: 11 }}>{error}</div> : null}
    </div>,
    document.body,
  );
};

export default PreviewReseedControl;
