export const RTG_FIELDS = Object.freeze([
  { key: 'gpa', label: 'GPA', kind: 'number' },
  { key: 'energy', label: 'Energy', kind: 'number' },
  { key: 'coachTrust', label: 'Coach Trust', kind: 'number' },
  { key: 'trustToNext', label: 'Next Trust Threshold', kind: 'number' },
  { key: 'rank', label: 'Depth Chart', kind: 'text' },
  { key: 'skillPoints', label: 'Skill Points', kind: 'number' },
  { key: 'followers', label: 'Followers', kind: 'number' },
  { key: 'valuation', label: 'NIL Valuation', kind: 'number' },
  { key: 'sponsorships', label: 'Sponsorships', kind: 'text' },
]);

const hasValue = (value) => value !== '' && value !== null && value !== undefined;

const normalizedValue = (value, kind) => {
  if (!hasValue(value)) return undefined;
  if (kind !== 'number') return String(value).trim();
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const createRtgSnapshot = (rtg = {}) => {
  const snapshot = RTG_FIELDS.reduce((result, field) => {
    const value = normalizedValue(rtg[field.key], field.kind);
    if (hasValue(value) && value !== '') result[field.key] = value;
    return result;
  }, {});
  const wear = Object.fromEntries(
    Object.entries(rtg.wear || {}).filter(([, value]) => hasValue(value) && String(value).trim()),
  );
  if (Object.keys(wear).length) snapshot.wear = wear;
  return snapshot;
};

export const hasRtgSnapshot = (snapshot = {}) => {
  const safeSnapshot = snapshot && typeof snapshot === 'object' ? snapshot : {};
  return RTG_FIELDS.some((field) => hasValue(safeSnapshot[field.key]))
    || Object.keys(safeSnapshot.wear || {}).length > 0;
};

export const diffRtgSnapshots = (current = {}, previous = {}) => {
  const changes = RTG_FIELDS.flatMap((field) => {
    const currentValue = normalizedValue(current[field.key], field.kind);
    const previousValue = normalizedValue(previous[field.key], field.kind);
    if (!hasValue(currentValue) || !hasValue(previousValue) || currentValue === previousValue) return [];
    return [{
      key: field.key,
      label: field.label,
      previous: previousValue,
      current: currentValue,
      delta: field.kind === 'number' ? currentValue - previousValue : null,
      kind: field.kind,
    }];
  });

  const bodyParts = new Set([...Object.keys(previous.wear || {}), ...Object.keys(current.wear || {})]);
  bodyParts.forEach((part) => {
    const previousValue = previous.wear?.[part];
    const currentValue = current.wear?.[part];
    if (!hasValue(previousValue) || !hasValue(currentValue) || previousValue === currentValue) return;
    changes.push({
      key: `wear.${part}`,
      label: `${part.charAt(0).toUpperCase()}${part.slice(1)} Wear`,
      previous: previousValue,
      current: currentValue,
      delta: null,
      kind: 'text',
    });
  });
  return changes;
};

const chronological = (left, right) => (
  Number(left.season || 1) - Number(right.season || 1)
  || Number(left.week ?? 1) - Number(right.week ?? 1)
  || String(left.publishedAt || '').localeCompare(String(right.publishedAt || ''))
);

export const buildRtgProgress = (state = {}) => {
  const snapshots = (state.weeklyUpdates || [])
    .filter((update) => hasRtgSnapshot(update.rtgSnapshot))
    .sort(chronological)
    .map((update, index, ordered) => ({
      id: update.id,
      season: Number(update.season || 1),
      week: Number(update.week ?? 1),
      careerPhase: update.careerPhase || 'Player',
      game: update.game || null,
      snapshot: update.rtgSnapshot,
      changes: update.rtgChanges || diffRtgSnapshots(update.rtgSnapshot, ordered[index - 1]?.rtgSnapshot || {}),
    }));
  const first = snapshots[0]?.snapshot || {};
  const current = createRtgSnapshot(state.rtg || {});
  const latest = hasRtgSnapshot(current) ? current : (snapshots[snapshots.length - 1]?.snapshot || {});
  return {
    snapshots,
    first,
    latest,
    careerChanges: diffRtgSnapshots(latest, first),
  };
};

export const formatRtgValue = (key, value) => {
  if (!hasValue(value)) return '—';
  if (key === 'gpa') return Number(value).toFixed(1);
  if (key === 'valuation') return `$${Number(value).toLocaleString()}`;
  if (['followers', 'coachTrust', 'trustToNext', 'skillPoints', 'energy'].includes(key)) {
    return Number(value).toLocaleString();
  }
  return String(value);
};

export const formatRtgDelta = (change) => {
  if (!change) return '';
  if (change.kind !== 'number') return `${change.previous} → ${change.current}`;
  const magnitude = Math.abs(change.delta);
  const formatted = change.key === 'gpa' ? magnitude.toFixed(1) : magnitude.toLocaleString();
  const prefix = change.delta > 0 ? '+' : '−';
  return `${prefix}${formatted}`;
};
