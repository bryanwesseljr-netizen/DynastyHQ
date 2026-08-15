const clean = (value) => String(value || '').trim();

const normalize = (value) => clean(value).toLowerCase().replace(/\s+/g, ' ');

const chronology = (entry = {}, index = 0) => ({
  season: Number(entry.season) || 0,
  week: Number(entry.week) || 0,
  occurredAt: String(entry.occurredAt || entry.publishedAt || ''),
  index,
});

const compareChronology = (left, right) => (
  left.season - right.season
  || left.week - right.week
  || left.occurredAt.localeCompare(right.occurredAt)
  || left.index - right.index
);

const inferredCommitmentInstitution = (entry = {}) => {
  const explicit = clean(entry.institution || entry.college || entry.school);
  if (explicit) return explicit;

  const title = clean(entry.title || entry.achievement);
  const titleMatch = title.match(/\bcommits?\s+to\s+(.+?)(?:[.!]|$)/i);
  if (titleMatch?.[1]) return clean(titleMatch[1]);

  const summary = clean(entry.summary);
  const summaryMatch = summary.match(/\bcommitment\s+to\s+(.+?)(?:\s+was\b|\s+is\b|\s+has\b|[.!]|$)/i);
  return clean(summaryMatch?.[1]);
};

export const commitmentIdentity = (entry = {}) => {
  if (entry?.type !== 'commitment') return '';
  const institution = normalize(inferredCommitmentInstitution(entry));
  return institution ? `commitment:${institution}` : '';
};

const milestoneIdentity = (entry = {}) => (
  commitmentIdentity(entry)
  || (clean(entry.milestoneKey) ? `milestone-key:${clean(entry.milestoneKey)}` : '')
);

export const dedupeCareerMilestones = (entries = []) => {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const winners = new Map();

  safeEntries.forEach((entry, index) => {
    const identity = milestoneIdentity(entry);
    if (!identity) return;
    const candidate = { entry, index, chronology: chronology(entry, index) };
    const existing = winners.get(identity);
    if (!existing || compareChronology(candidate.chronology, existing.chronology) > 0) {
      winners.set(identity, candidate);
    }
  });

  return safeEntries.filter((entry, index) => {
    const identity = milestoneIdentity(entry);
    if (!identity) return true;
    return winners.get(identity)?.index === index;
  });
};

export const findExistingCommitment = (entries = [], institution = '') => {
  const target = normalize(institution);
  if (!target) return null;
  return dedupeCareerMilestones(entries).find((entry) => (
    entry?.type === 'commitment'
    && normalize(inferredCommitmentInstitution(entry)) === target
  )) || null;
};
