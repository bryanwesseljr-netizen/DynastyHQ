const arrayOf = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

export const enrichPayloadWithStorylines = (payload = {}) => {
  const builder = globalThis.__dhqBuildStorylineContext;
  if (typeof builder !== 'function') return payload;

  let continuity;
  try {
    continuity = builder(payload.publicationId || payload.id || '');
  } catch {
    return payload;
  }
  if (!continuity?.editorialThreads?.length) return payload;

  const byKey = new Map();
  arrayOf(continuity.editorialThreads).forEach((thread) => {
    if (thread?.key) byKey.set(thread.key, thread);
  });
  arrayOf(payload.storylineThreads).forEach((thread) => {
    if (thread?.key) byKey.set(thread.key, thread);
  });
  const storylineThreads = [...byKey.values()].slice(0, 12);

  const storylineKeys = [...new Set([
    ...arrayOf(payload.coverageDecision?.storylineKeys),
    ...arrayOf(continuity.storylineKeys),
    ...storylineThreads.map((thread) => thread.key).filter(Boolean),
  ])].slice(0, 16);

  return {
    ...payload,
    storylineThreads,
    coverageDecision: payload.coverageDecision ? {
      ...payload.coverageDecision,
      storylineKeys,
    } : payload.coverageDecision,
    continuity: {
      engineVersion: continuity.version || 2,
      leadKey: continuity.lead?.key || '',
      activeStorylineKeys: storylineKeys,
    },
  };
};
