const clean = (value, max = 240) => String(value ?? '').trim().slice(0, max);

const slug = (value, fallback = 'item') => clean(value, 80)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 48) || fallback;

const hashText = (value) => {
  let hash = 2166136261;
  const input = String(value || '');
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const COVERAGE_REFERENCE_SOURCE = 'coverage-reference';

export const coverageFactKey = (fact = {}, index = 0) => {
  const category = slug(fact.category || 'note', 'note');
  const subject = slug(fact.subject || fact.team || fact.label || `item-${index + 1}`, `item-${index + 1}`);
  const fingerprint = [fact.category, fact.team, fact.subject, fact.label, fact.value].map((entry) => clean(entry, 500)).join('|');
  return `program.coverage.${category}.${subject}.${hashText(fingerprint)}`;
};

export const buildCoverageLedgerFacts = ({ publicationId, facts = [] } = {}) => facts
  .filter((fact) => clean(fact?.value, 1200))
  .map((fact, index) => {
    const team = clean(fact.team, 100);
    const subject = clean(fact.subject, 120);
    const label = clean(fact.label, 160) || clean(fact.category, 80) || 'Coverage reference';
    const value = clean(fact.value, 1200);
    const key = coverageFactKey(fact, index);
    return {
      id: `${publicationId}:${key}`,
      key,
      label: [team, subject, label].filter(Boolean).join(' · '),
      value,
      confidence: Math.max(0, Math.min(1, Number(fact.confidence) || 0)),
      evidence: clean(fact.evidence, 500),
      sourceId: clean(fact.sourceId, 120) || `${COVERAGE_REFERENCE_SOURCE}-${index + 1}`,
      sourceType: COVERAGE_REFERENCE_SOURCE,
      verified: true,
      editorialOnly: true,
      editorialUse: 'primary',
      publicationId,
    };
  });

const matchesPublication = (entry, publicationId) => (
  entry?.publicationId === publicationId || entry?.id === publicationId || entry?.weekKey === publicationId
);

export const replaceCoverageReferences = (state = {}, {
  publicationId,
  season,
  week,
  facts = [],
  sourceCount = 0,
} = {}) => {
  const ledgerFacts = buildCoverageLedgerFacts({ publicationId, facts });
  const preservedLedger = (state.factLedger || []).filter((entry) => !(
    entry?.publicationId === publicationId
    && entry?.editorialOnly === true
    && entry?.sourceType === COVERAGE_REFERENCE_SOURCE
  ));
  const now = new Date().toISOString();
  const references = (state.coverageReferences || []).filter((entry) => entry?.publicationId !== publicationId);
  const nextReferences = ledgerFacts.length
    ? [...references, {
        publicationId,
        season: Number(season) || 1,
        week: Math.max(0, Number(week) || 0),
        sourceCount: Math.max(0, Number(sourceCount) || 0),
        factCount: ledgerFacts.length,
        factKeys: ledgerFacts.map((entry) => entry.key),
        updatedAt: now,
      }]
    : references;

  return {
    ...state,
    factLedger: [...preservedLedger, ...ledgerFacts],
    coverageReferences: nextReferences,
    newsroomIssues: (state.newsroomIssues || []).map((issue) => matchesPublication(issue, publicationId)
      ? {
          ...issue,
          ...(issue.editorialStatus === 'generated' ? { editorialStatus: 'needs-regeneration' } : {}),
          coverageReferencesUpdatedAt: now,
        }
      : issue),
    podcastEpisodes: (state.podcastEpisodes || []).map((episode) => matchesPublication(episode, publicationId)
      ? {
          ...episode,
          ...(episode.status === 'scripted' || episode.status === 'ready' || episode.status === 'published'
            ? { status: 'needs-regeneration' }
            : {}),
          ...(episode.audioStatus === 'ready' ? { audioStatus: 'stale' } : {}),
          coverageReferencesUpdatedAt: now,
        }
      : episode),
  };
};

export const coverageReferenceFor = (state = {}, publicationId = '') => (
  (state.coverageReferences || []).find((entry) => entry?.publicationId === publicationId) || null
);
