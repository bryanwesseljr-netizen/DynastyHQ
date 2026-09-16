import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Clock3, Route, ShieldCheck, XCircle } from 'lucide-react';
import { readSessionImportTelemetry } from '../services/sessionImportTelemetry.js';

const LANE_NAMES = {
  game: 'Game Data',
  rtg: 'RTG Status',
  coverage: 'Coverage',
  high_school: 'High School',
};

const laneLabel = (route = {}) => {
  const lanes = route.lanes || [];
  if (!lanes.length) return 'Unclassified';
  return lanes.map((lane) => LANE_NAMES[lane] || lane).join(' + ');
};

const resultKey = (result = {}) => `${String(result.fileName || '')}::${String(result.lane || '')}`;
const routeIsClassified = (route = {}) => Boolean((route.lanes || []).length && route.screenType !== 'unknown');

const overallStatus = (route, results) => {
  if (!routeIsClassified(route)) return { key: 'unclassified', label: 'Unclassified', color: '#fbbf24' };
  const expected = route.lanes || [];
  const reported = new Map(results.map((result) => [result.lane, result]));
  const pending = expected.filter((lane) => !reported.has(lane));
  if (pending.length) return { key: 'processing', label: 'Processing', color: '#93c5fd' };
  const outcomes = expected.map((lane) => reported.get(lane)).filter(Boolean);
  const failed = outcomes.filter((outcome) => outcome.status === 'failed').length;
  const analyzed = outcomes.filter((outcome) => outcome.status === 'analyzed').length;
  if (failed && analyzed) return { key: 'partial', label: 'Partial', color: '#fbbf24' };
  if (failed && !analyzed) return { key: 'failed', label: 'Failed', color: '#fca5a5' };
  return { key: 'analyzed', label: 'Analyzed', color: '#86efac' };
};

const resultBadge = (result) => {
  if (!result) return null;
  const failed = result.status === 'failed';
  return (
    <span
      key={`${result.fileName}:${result.lane}`}
      title={result.message || ''}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        border: `1px solid ${failed ? 'rgba(248,113,113,.28)' : 'rgba(74,222,128,.24)'}`,
        borderRadius: 999,
        background: failed ? 'rgba(127,29,29,.16)' : 'rgba(6,78,59,.14)',
        padding: '3px 6px',
        color: failed ? '#fca5a5' : '#86efac',
        fontSize: 8,
        fontWeight: 900,
        whiteSpace: 'nowrap',
      }}
    >
      {failed ? <XCircle size={9} /> : <CheckCircle2 size={9} />}
      {LANE_NAMES[result.lane] || result.lane} {failed ? 'failed' : `analyzed · ${result.factCount} fact${result.factCount === 1 ? '' : 's'}`}
    </span>
  );
};

const SessionImportAuditPortal = () => {
  const [summary, setSummary] = useState(() => globalThis.window?.__dhqSessionRouteSummary || null);
  const [laneResults, setLaneResults] = useState(() => readSessionImportTelemetry());
  const [host, setHost] = useState(null);

  useEffect(() => {
    const onStart = () => {
      setSummary(null);
      setLaneResults({});
    };
    const onSummary = (event) => setSummary(event?.detail || globalThis.window?.__dhqSessionRouteSummary || null);
    const onLaneResult = (event) => {
      const result = event?.detail;
      if (!result?.fileName || !result?.lane) return;
      setLaneResults((current) => ({ ...current, [resultKey(result)]: result }));
    };
    const onError = () => {
      setSummary(globalThis.window?.__dhqSessionRouteSummary || null);
      setLaneResults(readSessionImportTelemetry());
    };
    window.addEventListener('dynastyhq:session-routing-start', onStart);
    window.addEventListener('dynastyhq:session-routing-classified', onSummary);
    window.addEventListener('dynastyhq:session-routing-complete', onSummary);
    window.addEventListener('dynastyhq:session-lane-result', onLaneResult);
    window.addEventListener('dynastyhq:session-routing-error', onError);
    return () => {
      window.removeEventListener('dynastyhq:session-routing-start', onStart);
      window.removeEventListener('dynastyhq:session-routing-classified', onSummary);
      window.removeEventListener('dynastyhq:session-routing-complete', onSummary);
      window.removeEventListener('dynastyhq:session-lane-result', onLaneResult);
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

      // The RTG and Coverage scanners retain their own React state. Give those live
      // scanner components dedicated hosts inside the visible Session Import review
      // instead of leaving their verification panels hidden elsewhere in Weekly Agenda.
      let rtgHost = review.querySelector('[data-session-import-rtg-review-host]');
      if (!rtgHost) {
        rtgHost = document.createElement('div');
        rtgHost.dataset.sessionImportRtgReviewHost = 'true';
        review.insertBefore(rtgHost, nextHost.nextSibling);
      }

      let coverageHost = review.querySelector('[data-session-import-coverage-review-host]');
      if (!coverageHost) {
        coverageHost = document.createElement('div');
        coverageHost.dataset.sessionImportCoverageReviewHost = 'true';
        review.insertBefore(coverageHost, rtgHost.nextSibling);
      }

      setHost((current) => current === nextHost ? current : nextHost);
    };
    ensureHost();
    const observer = new MutationObserver(ensureHost);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const receipt = useMemo(() => {
    const routes = summary?.routes || [];
    const results = Object.values(laneResults || {});
    const rows = routes.map((route) => {
      const fileResults = results.filter((result) => result.fileName === route.fileName);
      const status = overallStatus(route, fileResults);
      return { route, results: fileResults, status };
    });
    const classified = rows.filter(({ route }) => routeIsClassified(route)).length;
    const unclassified = rows.length - classified;
    const analyzed = rows.filter(({ status }) => status.key === 'analyzed').length;
    const partial = rows.filter(({ status }) => status.key === 'partial').length;
    const failed = rows.filter(({ status }) => status.key === 'failed').length;
    const processing = rows.filter(({ status }) => status.key === 'processing').length;
    return {
      total: Number(summary?.total) || rows.length,
      classified,
      unclassified,
      analyzed,
      partial,
      failed,
      processing,
      rows,
      clean: Boolean(rows.length && !unclassified && !failed && !partial && !processing),
    };
  }, [laneResults, summary]);

  if (!host || !summary) return null;

  const attentionCount = receipt.unclassified + receipt.failed + receipt.partial + receipt.processing;

  return createPortal(
    <section
      style={{
        margin: '14px 14px 0',
        padding: 14,
        borderRadius: 12,
        border: `1px solid ${attentionCount ? 'rgba(251,191,36,.45)' : 'rgba(74,222,128,.35)'}`,
        background: 'rgba(2,8,14,.9)',
        color: '#e2e8f0',
      }}
      data-session-import-audit
      data-session-import-receipt
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: attentionCount ? '#fbbf24' : '#86efac', fontSize: 10, fontWeight: 950, letterSpacing: '.12em', textTransform: 'uppercase' }}>
            {attentionCount ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />} Session Import processing receipt
          </div>
          <p style={{ margin: '5px 0 0', maxWidth: 720, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
            Received means the file reached DynastyHQ. Classified means the router identified its lane. Analyzed means that lane actually returned a usable response. Nothing below is applied to your career until you approve the verification controls.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {[
            ['Received', receipt.total],
            ['Classified', receipt.classified],
            ['Analyzed', receipt.analyzed],
            ['Partial', receipt.partial],
            ['Failed', receipt.failed],
            ['Unclassified', receipt.unclassified],
          ].map(([label, value]) => (
            <span key={label} style={{ border: '1px solid rgba(148,163,184,.22)', borderRadius: 8, background: 'rgba(15,23,42,.72)', padding: '6px 8px', fontSize: 9, fontWeight: 900 }}>
              <b style={{ color: '#fff' }}>{value}</b> {label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, color: receipt.clean ? '#86efac' : '#fcd34d', fontWeight: 850 }}>
        {receipt.clean ? <CheckCircle2 size={13} /> : receipt.processing ? <Clock3 size={13} /> : <Route size={13} />}
        {receipt.clean
          ? `All ${receipt.total} screenshots were classified and every routed analyzer reported back. Review the extracted facts before applying.`
          : `${attentionCount} screenshot${attentionCount === 1 ? '' : 's'} still need attention: ${receipt.unclassified} unclassified, ${receipt.failed} failed, ${receipt.partial} partial, ${receipt.processing} still processing.`}
      </div>

      <div style={{ marginTop: 8, borderRadius: 8, border: '1px solid rgba(96,165,250,.16)', background: 'rgba(30,64,175,.06)', padding: '8px 10px', color: '#93c5fd', fontSize: 9, lineHeight: 1.45 }}>
        Lane totals may overlap when one Player Stats screenshot legitimately feeds both Game Data and Coverage. Analyzed with 0 facts means the scanner completed safely but found nothing new to extract; Failed means the analyzer itself did not produce a usable result.
      </div>

      <details open style={{ marginTop: 10 }}>
        <summary style={{ cursor: 'pointer', color: '#93c5fd', fontSize: 9, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {receipt.total}-file processing ledger · show/hide screenshot details
        </summary>
        <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
          {receipt.rows.map(({ route, results, status }) => {
            const expected = route.lanes || [];
            const reportedLanes = new Set(results.map((result) => result.lane));
            const pending = expected.filter((lane) => !reportedLanes.has(lane));
            const extras = results.filter((result) => !expected.includes(result.lane));
            const failedMessages = results.filter((result) => result.status === 'failed' && result.message);
            return (
              <div key={route.fileName} style={{ borderTop: '1px solid rgba(51,65,85,.55)', paddingTop: 7 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8, alignItems: 'start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e2e8f0', fontSize: 9 }}>{route.fileName}</strong>
                      <span style={{ color: routeIsClassified(route) ? '#94a3b8' : '#fbbf24', fontSize: 8, fontWeight: 800 }}>{laneLabel(route)} · {route.screenType || 'unknown'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                      {results.map(resultBadge)}
                      {pending.map((lane) => (
                        <span key={`${route.fileName}:${lane}:pending`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid rgba(96,165,250,.22)', borderRadius: 999, padding: '3px 6px', color: '#93c5fd', fontSize: 8, fontWeight: 900 }}>
                          <Clock3 size={9} /> {LANE_NAMES[lane] || lane} pending
                        </span>
                      ))}
                      {!routeIsClassified(route) && !extras.length ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid rgba(251,191,36,.22)', borderRadius: 999, padding: '3px 6px', color: '#fbbf24', fontSize: 8, fontWeight: 900 }}>
                          <Route size={9} /> Needs classification
                        </span>
                      ) : null}
                    </div>
                    {failedMessages.length ? (
                      <div style={{ marginTop: 4, color: '#fca5a5', fontSize: 8, lineHeight: 1.35 }}>
                        {failedMessages.map((result) => `${LANE_NAMES[result.lane] || result.lane}: ${result.message}`).join(' · ')}
                      </div>
                    ) : null}
                    {!routeIsClassified(route) && extras.length ? (
                      <div style={{ marginTop: 4, color: '#94a3b8', fontSize: 8, lineHeight: 1.35 }}>
                        Router could not safely classify this screenshot; the extra analyzer result shown above came from the Game Data fallback and does not change its Unclassified status.
                      </div>
                    ) : null}
                  </div>
                  <span style={{ color: status.color, fontSize: 8, fontWeight: 950, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{status.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </section>,
    host,
  );
};

export default SessionImportAuditPortal;
