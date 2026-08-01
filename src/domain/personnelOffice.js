import { CAREER_STAGES, deriveCareerStage } from './commandCenter.js';

const OFFENSIVE_POSITIONS = new Set([
  'QB', 'RB', 'HB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT', 'OL', 'ATH',
]);

const clean = (value) => String(value ?? '').trim();

const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const numberOrZero = (value) => numberOrNull(value) ?? 0;

const latestVerifiedFact = (ledger = [], key) => [...ledger]
  .reverse()
  .find((entry) => entry.verified && entry.key === key) || null;

const verifiedNumber = (state, key, fallback) => {
  const fact = latestVerifiedFact(state.factLedger || [], key);
  if (!fact) return { value: null, fact: null, fallback: numberOrNull(fallback) };
  return { value: numberOrNull(fact.value), fact, fallback: numberOrNull(fallback) };
};

const formatPoints = (value) => {
  const numeric = numberOrNull(value);
  return numeric === null ? 'Not verified' : `${numeric.toLocaleString()} pts`;
};

const offenseTarget = (entry = {}) => {
  const position = clean(entry.position).toUpperCase();
  return entry.assignedTo === 'OC' || OFFENSIVE_POSITIONS.has(position);
};

const verifiedRecruitingEntry = (state, entry) => {
  const baseKey = `recruiting.${entry.id}`;
  const interestFact = latestVerifiedFact(state.factLedger || [], `${baseKey}.interest`);
  const offerFact = latestVerifiedFact(state.factLedger || [], `${baseKey}.offer`);
  const positionFact = latestVerifiedFact(state.factLedger || [], `${baseKey}.position`);
  const starsFact = latestVerifiedFact(state.factLedger || [], `${baseKey}.stars`);
  const statusFact = latestVerifiedFact(state.factLedger || [], `${baseKey}.status`);
  const hasVerifiedFact = Boolean(interestFact || offerFact || positionFact || starsFact || statusFact);

  return {
    ...entry,
    interest: interestFact ? numberOrZero(interestFact.value) : numberOrNull(entry.interest),
    offered: offerFact
      ? (offerFact.value === true || /^(true|yes|offered|offer)$/i.test(clean(offerFact.value)))
      : Boolean(entry.offered),
    position: clean(positionFact?.value || entry.position),
    stars: starsFact ? numberOrNull(starsFact.value) : numberOrNull(entry.stars),
    status: clean(statusFact?.value || entry.status || entry.level),
    verified: hasVerifiedFact,
  };
};

const priorityScore = (target) => (
  (target.offered ? 20 : 0)
  + numberOrZero(target.interest)
  + numberOrZero(target.stars) * 6
);

export const buildPersonnelOffice = (state = {}) => {
  const stage = deriveCareerStage(state);
  const isOC = stage === CAREER_STAGES.OC;
  const isHC = stage === CAREER_STAGES.HC;
  const isRetired = stage === CAREER_STAGES.RETIRED;
  const hasOffice = isOC || isHC || isRetired;
  const coach = state.coach || {};
  const ledger = state.factLedger || [];
  const budgetFields = {
    total: verifiedNumber(state, 'coach.dynastyPoints', coach.dynastyPoints),
    recruiting: verifiedNumber(state, 'coach.recruitingNIL', coach.recruitingNIL),
    retention: verifiedNumber(state, 'coach.rosterNIL', coach.rosterNIL),
    staff: verifiedNumber(state, 'coach.staffBudget', coach.staffBudget),
    facilities: verifiedNumber(state, 'coach.facilitiesBudget', coach.facilitiesBudget),
  };
  const allocationValues = ['recruiting', 'retention', 'staff', 'facilities']
    .map((key) => budgetFields[key].value)
    .filter((value) => value !== null);
  const allocations = allocationValues.reduce((total, value) => total + value, 0);
  const total = budgetFields.total.value;
  const remaining = total === null || allocationValues.length < 4 ? null : total - allocations;
  const overBudget = remaining !== null && remaining < 0;
  const budgetVerifiedCount = Object.values(budgetFields).filter((entry) => entry.fact).length;

  const roster = {
    size: verifiedNumber(state, 'coach.rosterSize', coach.rosterSize),
    scholarshipsUsed: verifiedNumber(state, 'coach.scholarshipsUsed', coach.scholarshipsUsed),
    portalDepartures: verifiedNumber(state, 'coach.portalDepartures', coach.portalDepartures),
  };

  const allTargets = (state.recruiting || [])
    .map((entry) => verifiedRecruitingEntry(state, entry))
    .filter((entry) => clean(entry.name));
  const visibleTargets = (isOC ? allTargets.filter(offenseTarget) : allTargets)
    .sort((left, right) => priorityScore(right) - priorityScore(left));
  const verifiedTargets = visibleTargets.filter((entry) => entry.verified);
  const offeredTargets = verifiedTargets.filter((entry) => entry.offered);
  const highInterestTargets = verifiedTargets.filter((entry) => numberOrZero(entry.interest) >= 75);

  const alerts = [];
  const addAlert = (tone, title, text) => alerts.push({ tone, title, text });
  if (!hasOffice) {
    addAlert('info', 'Office locked', 'The personnel and finance office opens after the verified offensive-coordinator hiring milestone.');
  } else if (isRetired) {
    addAlert('info', 'Historical view', 'The retired career can review its final personnel and budget snapshot, but cannot change program decisions.');
  } else {
    if (!budgetVerifiedCount) addAlert('info', 'Budget screen needed', 'Upload the current Dynasty Points or NIL budget screen before the office recommends an allocation.');
    else if (budgetVerifiedCount < 5) addAlert('warning', 'Partial budget picture', `${budgetVerifiedCount} of 5 budget fields are verified. Missing categories remain unallocated—not zero.`);
    else if (overBudget) addAlert('danger', 'Allocation exceeds resources', `Verified allocations exceed the available total by ${Math.abs(remaining).toLocaleString()} points.`);
    else addAlert('success', 'Budget reconciled', `${remaining.toLocaleString()} verified Dynasty Points remain unallocated.`);

    if (!verifiedTargets.length) addAlert('info', 'Recruiting scan needed', 'Upload the current coach recruiting board so the office can rank verified targets.');
    else if (!offeredTargets.length) addAlert('warning', 'Offer review', `${verifiedTargets.length} verified target${verifiedTargets.length === 1 ? '' : 's'} are visible, but no scholarship offer is verified.`);
    else addAlert('success', 'Board leverage', `${offeredTargets.length} verified offer${offeredTargets.length === 1 ? '' : 's'} and ${highInterestTargets.length} high-interest target${highInterestTargets.length === 1 ? '' : 's'} are on the active board.`);

    if (roster.size.value === null && roster.scholarshipsUsed.value === null) {
      addAlert('info', 'Roster snapshot needed', 'Add the roster or scholarship-management screen before setting class-size and retention priorities.');
    }
    if (isOC) addAlert('info', 'Coordinator authority', 'You may evaluate offensive needs and assigned targets. Final offers, retention spending, staff spending, and roster decisions remain with the head coach.');
    if (isHC) addAlert('info', 'Head-coach authority', 'You hold final authority over recruiting, retention, staff, facilities, and Dynasty Points allocation.');
  }

  return {
    stage,
    hasOffice,
    readOnly: !isHC,
    roleLabel: isOC ? 'Offensive Coordinator' : (isHC ? 'Head Coach' : (isRetired ? 'Retired Head Coach' : 'Player')),
    authorityLabel: isHC ? 'Final program authority' : (isOC ? 'Offensive advisory authority' : (isRetired ? 'Historical view only' : 'Office not yet unlocked')),
    description: isOC
      ? 'Your personnel department filters the board to offensive and assigned targets while the head coach retains final program authority.'
      : (isHC
        ? 'Your program office reconciles recruiting, roster retention, staff, facilities, and the in-game Dynasty Points budget from verified screenshots.'
        : 'This office preserves the final personnel and finance record after the coaching career ends.'),
    budget: {
      ...budgetFields,
      allocations,
      remaining,
      overBudget,
      verifiedCount: budgetVerifiedCount,
      rows: [
        { key: 'recruiting', label: 'Recruiting NIL', ...budgetFields.recruiting },
        { key: 'retention', label: 'Roster NIL / retention', ...budgetFields.retention },
        { key: 'staff', label: 'Staff', ...budgetFields.staff },
        { key: 'facilities', label: 'Facilities', ...budgetFields.facilities },
      ],
      formattedTotal: formatPoints(total),
      formattedRemaining: remaining === null ? 'Not reconciled' : formatPoints(remaining),
    },
    roster,
    targets: visibleTargets.slice(0, 12),
    targetSummary: {
      visible: visibleTargets.length,
      verified: verifiedTargets.length,
      offered: offeredTargets.length,
      highInterest: highInterestTargets.length,
    },
    alerts: alerts.slice(0, 5),
    latestBudgetFactAt: Object.values(budgetFields)
      .map((entry) => entry.fact?.publishedAt || entry.fact?.occurredAt || '')
      .filter(Boolean)
      .sort()
      .pop() || '',
    hasAnyVerifiedCoachFact: ledger.some((entry) => entry.verified && entry.key.startsWith('coach.')),
  };
};

export const canManageTarget = (state, target = {}) => {
  const stage = deriveCareerStage(state);
  if (stage === CAREER_STAGES.HC) return true;
  if (stage !== CAREER_STAGES.OC) return false;
  return offenseTarget(target);
};
