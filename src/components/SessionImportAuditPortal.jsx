import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Route, ShieldCheck } from 'lucide-react';

const laneLabel = (route = {}) => {
  const lanes = route.lanes || [];
  if (!lanes.length) return 'Unclassified';
  return lanes.map((lane) => ({
    game: 'Game Data',
    rtg: 'RTG Status',
    coverage: 'Coverage',
    high_school: 'High School',
  }[lane] || lane)).join(' + ');
};

const SessionImportAuditPortal = () => {
  const [summary, setSummary] = useState(() => globalThis.window?.__dhqSessionRouteSummary || null);
  const [host, setHost] = useState(null);

  useEffect(() => {
    const onStart = () => setSummary(null);
    const onSummary = (event) => setSummary(event?.detail || globalThis.window?.__dhqSessionRouteSummary || null);
    const onError = () => setSummary(null);
    window.addEventListener('dynastyhq:session-routing-start', onStart);
    window.addEventListener('dynastyhq:session-routing-classified', onSummary);
    window.addEventListener('dynastyhq:session-routing-complete', onSummary);
    window.addEventListener('dynastyhq:session-routing-error', onError);
    return () => {
      window.removeEventListener('dynastyhq:session-routing-start', onStart);
      window.removeEventListener('dynastyhq:session-routing-classified', onSummary);
      window.removeEventListener('dynastyhq:session-routing-complete', onSummary);
      window.removeEventListener('dynastyhq:session-routing-error', onError);
    };
  }, []);

  useEffect(() => {
    const root = document.getElementById('root') || document.body;
    const ensureHost = () => {
      const review = document.querySelector('.dhq-postgame-review');
      if (!review) {
        setHost(null);
        return;
      }
      let nextHost = review.querySelector('[data-session-import-audit-host]');
      if (!nextHost) {
        nextHost = document.createElement('div');
        nextHost.dataset.sessionImportAuditHost = 'true';
        review.insertBefore(nextHost, review.firstChild);
      }
      setHost((current) => current === nextHost ? current : nextHost);
    };
    ensureHost();
    const observer = new MutationObserver(ensureHost);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const accounting = useMemo(() => {
    const routes = summary?.routes || [];
    const classified = routes.filter((route) => (route.lanes || []).length && route.screenType !== 'unknown').length;
    const unclassified = routes.length - classified;
    return {
      total: Number(summary?.total) || routes.length,
      classified,
      unclassified,
      complete: Boolean(routes.length && unclassified === 0),
    };
  }, [summary]);

  if (!host || !summary) return null;

  return createPortal(
    <section style={{ margin: '14px 14px 0', padding: 14, borderRadius: 12, border: `1px solid ${accounting.unclassified ? 'rgba(251,191,36,.45)' : 'rgba(74,222,128,.35)'}`, background: 'rgba(2,8,14,.88)', color: '#e2e8f0' }} data-session-import-audit>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: accounting.unclassified ? '#fbbf24' : '#86efac', fontSize: 10, fontWeight: 950, letterSpacing: '.12em', textTransform: 'uppercase' }}>
            {accounting.unclassified ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />} Session Import batch audit
          </div>
          <p style={{ margin: '5px 0 0', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
            The Game Data review below counts only screenshots routed to the game scanner. This audit accounts for the entire original batch.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {[['Uploaded', accounting.total], ['Game', summary.game || 0], ['RTG', summary.rtg || 0], ['Coverage', summary.coverage || 0], ['Unclassified', accounting.unclassified]].map(([label, value]) => (
            <span key={label} style={{ border: '1px solid rgba(148,163,184,.22)', borderRadius: 8, background: 'rgba(15,23,42,.72)', padding: '6px 8px', fontSize: 9, fontWeight: 900 }}><b style={{ color: '#fff' }}>{value}</b> {label}</span>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, color: accounting.unclassified ? '#fcd34d' : '#86efac', fontWeight: 850 }}>
        {accounting.unclassified ? <Route size={13} /> : <CheckCircle2 size={13} />}
        {accounting.unclassified
          ? `${accounting.unclassified} screenshot${accounting.unclassified === 1 ? '' : 's'} still need a safe classification before the session is complete.`
          : `All ${accounting.total} uploaded screenshots received an explicit route. Lane counts can exceed the total when one Player Stats screen legitimately feeds both Game Data and Coverage.`}
      </div>
      <details style={{ marginTop: 10 }}>
        <summary style={{ cursor: 'pointer', color: '#93c5fd', fontSize: 9, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>Show screenshot-by-screenshot routing</summary>
        <div style={{ marginTop: 8, display: 'grid', gap: 5 }}>
          {(summary.routes || []).map((route) => (
            <div key={route.fileName} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8, borderTop: '1px solid rgba(51,65,85,.55)', paddingTop: 5, fontSize: 9 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#cbd5e1' }}>{route.fileName}</span>
              <span style={{ color: (route.lanes || []).length ? '#86efac' : '#fbbf24', fontWeight: 900 }}>{laneLabel(route)} · {route.screenType || 'unknown'}</span>
            </div>
          ))}
        </div>
      </details>
    </section>,
    host,
  );
};

export default SessionImportAuditPortal;
