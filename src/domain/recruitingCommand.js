import { buildPersonnelOffice } from './personnelOffice.js';

const clean = (value) => String(value ?? '').trim();
const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const latestVerifiedFact = (ledger = [], keys = []) => [...ledger]
  .reverse()
  .find((entry) => entry?.verified && keys.includes(entry.key)) || null;

const verifiedMetric = (state, label, keys, fallback) => {
  const fact = latestVerifiedFact(state.factLedger || [], keys);
  return {
    label,
    value: fact ? numberOrNull(fact.value) : null,
    fallback: numberOrNull(fallback),
    fact,
    verified: Boolean(fact),
  };
};

const POSITION_ALIASES = Object.freeze({
  QB: ['QB'],
  RB: ['RB', 'HB', 'FB'],
  WR: ['WR'],
  TE: ['TE'],
  OL: ['LT', 'LG', 'C', 'RG', 'RT', 'OL'],
  DL: ['LE', 'RE', 'DT', 'DE', 'DL'],
  LB: ['LOLB', 'MLB', 'ROLB', 'LB'],
  CB: ['CB'],
  S: ['FS', 'SS', 'S'],
  ST: ['K', 'P', 'K/P'],
});

const positionNeedFacts = (state) => {
  const ledger = state.factLedger || [];
  return Object.entries(POSITION_ALIASES).map(([group, aliases]) => {
    const priorityKeys = aliases.flatMap((pos) => [
      `coach.rosterNeeds.${pos}.priority`,
      `coach.rosterNeed.${pos}.priority`,
      `rosterNeeds.${pos}.priority`,
    ]);
    const countKeys = aliases.flatMap((pos) => [
      `coach.rosterNeeds.${pos}.targetCount`,
      `coach.rosterNeeds.${pos}.need`,
      `rosterNeeds.${pos}.targetCount`,
    ]);
    const reasonKeys = aliases.flatMap((pos) => [
      `coach.rosterNeeds.${pos}.reason`,
      `rosterNeeds.${pos}.reason`,
    ]);
    const priorityFact = latestVerifiedFact(ledger, priorityKeys);
    const countFact = latestVerifiedFact(ledger, countKeys);
    const reasonFact = latestVerifiedFact(ledger, reasonKeys);
    if (!priorityFact && !countFact && !reasonFact) return null;
    return {
      group,
      priority: clean(priorityFact?.value || 'Verified need'),
      targetCount: numberOrNull(countFact?.value),
      reason: clean(reasonFact?.value),
      verified: true,
    };
  }).filter(Boolean);
};

const targetAction = (target) => {
  const interest = numberOrNull(target.interest);
  if (!target.verified) return { label: 'Verify', tone: 'neutral', detail: 'Confirm current board data before making a recommendation.' };
  if (target.offered && interest !== null && interest >= 75) return { label: 'Protect', tone: 'success', detail: 'Verified offer plus strong interest makes this a leverage position worth protecting.' };
  if (interest !== null && interest >= 60) return { label: 'Maintain', tone: 'info', detail: 'Interest is meaningful; keep the target active while roster need is evaluated.' };
  if (target.offered) return { label: 'Monitor', tone: 'warning', detail: 'An offer is verified, but the current interest level does not justify stronger guidance yet.' };
  return { label: 'Evaluate', tone: 'neutral', detail: 'Board data is verified, but there is not enough leverage to recommend a harder push.' };
};

export const buildRecruitingCommand = (state = {}) => {
  const office = buildPersonnelOffice(state);
  const coach = state.coach || {};
  const rosterMetrics = [
    verifiedMetric(state, 'Roster size', ['coach.rosterSize'], coach.rosterSize),
    verifiedMetric(state, 'Scholarships used', ['coach.scholarshipsUsed'], coach.scholarshipsUsed),
    verifiedMetric(state, 'Open scholarships', ['coach.openScholarships'], coach.openScholarships),
    verifiedMetric(state, 'Portal departures', ['coach.portalDepartures'], coach.portalDepartures),
    verifiedMetric(state, 'Class commits', ['coach.classCommits'], coach.classCommits),
    verifiedMetric(state, 'Portal additions', ['coach.portalAdditions'], coach.portalAdditions),
  ];
  const verifiedRosterMetrics = rosterMetrics.filter((entry) => entry.verified).length;
  const positionNeeds = positionNeedFacts(state);
  const targets = office.targets.map((target) => ({
    ...target,
    action: targetAction(target),
  }));

  const readiness = verifiedRosterMetrics === rosterMetrics.length
    ? 'ready'
    : verifiedRosterMetrics >= 3
      ? 'partial'
      : 'needs-data';

  const nextAction = !verifiedRosterMetrics
    ? {
        title: 'Capture the roster picture',
        detail: 'Upload the current roster or scholarship-management screen before DynastyHQ sets class-size or retention priorities.',
      }
    : !positionNeeds.length
      ? {
          title: 'Add position-room context',
          detail: 'Roster totals are starting to come together. Position priorities will stay blank until a roster/depth screen verifies where the actual holes are.',
        }
      : !office.targetSummary.verified
        ? {
            title: 'Verify the recruiting board',
            detail: 'Position needs are available, but the active prospect board still needs a current scan before target guidance is useful.',
          }
        : {
            title: 'Work the verified board',
            detail: 'Roster context and board data are available. Use the position priorities to decide where limited recruiting resources matter most.',
          };

  return {
    ...office,
    rosterMetrics,
    verifiedRosterMetrics,
    rosterReadiness: readiness,
    positionNeeds,
    targets,
    nextAction,
  };
};
