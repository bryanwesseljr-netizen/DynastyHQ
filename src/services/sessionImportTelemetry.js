const laneKey = ({ fileName, lane }) => `${String(fileName || '')}::${String(lane || '')}`;

const canReport = () => (
  typeof window !== 'undefined'
  && Boolean(window.__dhqSessionRoutingBusy || window.__dhqSessionRouteSummary)
);

export const resetSessionImportTelemetry = () => {
  if (typeof window === 'undefined') return;
  window.__dhqSessionLaneResults = {};
};

export const reportSessionLaneResult = ({
  fileName,
  lane,
  status,
  factCount = 0,
  screenType = '',
  message = '',
}) => {
  if (!canReport() || !fileName || !lane) return;

  const result = {
    fileName: String(fileName),
    lane: String(lane),
    status: status === 'failed' ? 'failed' : 'analyzed',
    factCount: Math.max(0, Number(factCount) || 0),
    screenType: String(screenType || ''),
    message: String(message || ''),
    reportedAt: new Date().toISOString(),
  };

  window.__dhqSessionLaneResults = {
    ...(window.__dhqSessionLaneResults || {}),
    [laneKey(result)]: result,
  };

  window.dispatchEvent(new CustomEvent('dynastyhq:session-lane-result', { detail: result }));
};

export const readSessionImportTelemetry = () => (
  typeof window === 'undefined' ? {} : { ...(window.__dhqSessionLaneResults || {}) }
);
